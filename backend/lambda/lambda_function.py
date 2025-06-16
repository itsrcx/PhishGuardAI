import os
import re
import json
from typing import List

import boto3
from datetime import datetime, timezone
import uuid
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients and resources
dynamodb = boto3.resource('dynamodb')
sns = boto3.client('sns')

# Environment variables for SNS Topic ARN and DynamoDB Table Name
# Default values are provided for local testing or if not set in Lambda environment
SNS_TOPIC_ARN = os.getenv('SNS_TOPIC_ARN', 'arn:aws:sns:us-east-1:610251783037:PhishGuardAlerts')
TABLE_NAME = os.getenv('PHISHSCAN_TABLE_NAME', 'PhishScans')

# Initialize DynamoDB table resource
table = dynamodb.Table(TABLE_NAME)


def is_phishing_url(url: str) -> bool:
    """
    Enhanced phishing detection logic.
    """
    phishing_indicators = [
        "login", "secure", "account", "verify", 
        "password", "banking", "paypal", "amazon",
        "update", "security", "confirm", "click"
    ]
    url_lower = url.lower()
    return any(indicator in url_lower for indicator in phishing_indicators)


def extract_urls_from_email(email_text: str) -> List[str]:
    """
    Parses email text and extracts all URLs found within it, including paths.

    Args:
        email_text: The raw text content of the email.

    Returns:
        A list of full URL strings found in the email text.
        Returns an empty list if no URLs are found.
    """
    if not email_text:
        return []

    url_pattern = re.compile(
        r'(?:(?:https?|ftp|file)://|www\.)'              # protocol or www
        r'(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+'    # domain name part
        r'(?:[A-Z]{2,6}\.?|[A-Z0-9-]{2,}\.?)'             # TLD
        r'(?::\d+)?'                                      # optional port
        r'(?:/[^\s]*)?',                                  # optional path/query/fragment
        re.IGNORECASE
    )

    matches = re.finditer(url_pattern, email_text)

    normalized_urls = []
    for match in matches:
        url = match.group()
        if url.lower().startswith('www.'):
            normalized_urls.append('http://' + url)
        else:
            normalized_urls.append(url)

    return normalized_urls

def build_scan_result(url, is_phishing):
    """
    Constructs a dictionary representing the URL scan result.
    """ 
    if is_phishing:
            reason_message = "URL flagged as phishing based on indicators."
    else:
        reason_message = f"No common phishing indicators detected during scan."

    logger.info(f"Scan result for {url} - Risk Level: {'HIGH' if is_phishing else 'LOW'}")
    return {
        "ScanID": str(uuid.uuid4()),
        "URL": url,
        "RiskLevel": "HIGH" if is_phishing else "LOW",
        "Timestamp": datetime.now(tz=timezone.utc).isoformat(),
        "Details": {
            "is_phishing": is_phishing,
            "reason": reason_message,
        }
    }

def save_to_dynamodb(item):
    """
    Saves a scan result item to the DynamoDB table.
    """
    try:
        table.put_item(Item=item)
        logger.info(f"Successfully saved scan result to DynamoDB: {item['ScanID']}")
    except Exception as e:
        logger.error(f"Error saving to DynamoDB: {e}")
        raise # Re-raise the exception to indicate failure

def send_sns_alert(high_risk_results):
    """
    Publishes a phishing alert message to the configured SNS topic.
    The message is structured for different protocols (default, SMS, email).
    """
    url_list = "\n".join(f"🔗 {r['URL']}" for r in high_risk_results)

    message = {
        "default": f"⚠️ Phishing alert detected! {len(high_risk_results)} high-risk URLs found. Check email for details.",
        "sms": f"⚠️ ⚠️ {len(high_risk_results)} high-risk phishing URLs detected. Check email for details.",
        "email": f"""
🚨 The following high-risk phishing URLs were detected:
{url_list}

Please investigate and take necessary actions.

🛡️ PhishGuard AI Security System 🛡️
"""
    }
    try:
        sns.publish(
            TopicArn=SNS_TOPIC_ARN,
            Message=json.dumps(message),
            MessageStructure='json', # Required when sending different messages for different protocols
            Subject="⚠️ PhishGuard Alert ⚠️" # Subject for email notifications
        )
        logger.info(f"SNS alert sent for URL: {url_list}")
    except Exception as e:
        logger.error(f"Error sending SNS alert: {e}")
        raise # Re-raise the exception

def subscribe_email_to_sns(email):
    """
    Subscribes an email address to the SNS topic.
    SNS will send a confirmation email to the address.
    """
    try:
        response = sns.subscribe(
            TopicArn=SNS_TOPIC_ARN,
            Protocol='email',
            Endpoint=email
        )
        logger.info(f"Email subscription initiated for: {email}. Subscription ARN: {response['SubscriptionArn']}")
        return {"message": f"Email subscription initiated for {email}. Please check your inbox to confirm."}
    except Exception as e:
        logger.error(f"Error subscribing email {email} to SNS: {e}")
        raise


def lambda_handler(event, context):
    """
    Main Lambda function handler.
    Routes requests based on the API Gateway path.
    """
    logger.info(f"Received event: {json.dumps(event)}")
    
    # Handle Cognito Post Confirmation trigger
    if event.get('triggerSource') == "PostConfirmation_ConfirmSignUp":
        logger.info("Cognito Post Confirmation trigger detected.")
        email = event['request']['userAttributes'].get('email', '')

        subscribe_email_to_sns(email)

        logger.info(f"User {email} subscribed to SNS topic after confirmation.")

        return event


    # Default headers for API Gateway responses, including CORS
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' # Allow requests from any origin
    }

    try:
        # Get the request body and path
        body = json.loads(event.get('body', '{}'))
        # event['path'] contains the resource path from API Gateway (e.g., '/scan', '/subscribe/email')
        path = event.get('path', '')
        http_method = event.get('httpMethod', '')

        # --- Handle URL Scanning ---
        if path == '/scan/urls' and http_method == 'POST':
            urls = body.get('urls', [])
            if not urls:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({"message": "URL is required for scanning."})
                }
            
            scan_results = []
            high_risk_urls = []

            for url in urls:
                is_phish = is_phishing_url(url)
                result = build_scan_result(url, is_phish)
                save_to_dynamodb(result)
                scan_results.append(result)

                if result["RiskLevel"] == "HIGH":
                    high_risk_urls.append(result)

            if high_risk_urls:
                send_sns_alert(high_risk_urls)

            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps(scan_results)
            }

    except json.JSONDecodeError:
        logger.error("Invalid JSON in request body.")
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({"message": "Invalid JSON in request body."})
        }
    except Exception as e:
        logger.error(f"An unexpected error occurred: {e}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({"message": f"Internal server error: {str(e)}"})
        }
