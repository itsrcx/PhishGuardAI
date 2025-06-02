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

def is_phishing_url(url):
    """
    Placeholder phishing detection logic.
    In a real application, this would involve a more sophisticated ML model or API call.
    """
    # Simple check: if "login" or "secure" is in the URL, flag as high risk
    return "login" in url.lower() or "secure" in url.lower()

def extract_urls_from_email(email_text: str) -> List[str]:
    """
    Parses email text and extracts all URLs found within it.

    Args:
        email_text: The raw text content of the email.

    Returns:
        A list of URL strings found in the email text.
        Returns an empty list if no URLs are found.
    """
    if not email_text:
        return []

    # This regex aims to capture common URL patterns:
    # - http:// or https:// protocols
    # - www. domains (without protocol)
    # - Domains with various TLDs
    # - Optional paths, query parameters, and fragments
    # It's a fairly comprehensive regex but might not catch 100% of all theoretical URL formats.
    # Breakdown:
    # (?:https?://|www\.)                       - Matches http://, https://, or www. (non-capturing group)
    # (?:[\w-]+\.)+                             - Matches domain name parts (e.g., example.) one or more times
    # [\w-]+                                    - Matches the top-level domain (e.g., com, org)
    # (?:/[^\s]*)?                              - Optionally matches a path, query params, fragment (anything after / that's not whitespace)
    # The overall regex is designed to be somewhat flexible.
    url_pattern = re.compile(
        r'(?:(?:https?://|ftp://|file://)|www\.)'  # Protocols or www
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+(?:[A-Z]{2,6}\.?|[A-Z0-9-]{2,}\.?)|'  # domain...
        r'localhost|'  # localhost...
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)', re.IGNORECASE) # optional path

    # Find all non-overlapping matches of the pattern in the string
    found_urls = re.findall(url_pattern, email_text)

    # Normalize URLs that start with 'www.' but lack a protocol by adding 'http://'
    # This is a common convention for how such URLs are treated by browsers.
    normalized_urls = []
    for url in found_urls:
        if url.lower().startswith('www.'):
            normalized_urls.append('http://' + url)
        else:
            normalized_urls.append(url)

    return normalized_urls

def build_scan_result(urls, is_phishing, is_email=False):
    """
    Constructs a dictionary representing the URL scan result.
    """
    item_type_str = "Email" if is_email else "URL"
    reason_message = ""
        
    if is_phishing:
        if is_email:
            reason_message = "Email content flagged as phishing based on indicators."
        else:
            reason_message = "URL flagged as phishing based on indicators."
    else:
        reason_message = f"No common phishing indicators detected in the {item_type_str}."

    logger.info(f"Scan result for {item_type_str}: {urls} - Risk Level: {'HIGH' if is_phishing else 'LOW'}")
    return {
        "ScanID": str(uuid.uuid4()),
        "URL": urls,
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

def send_sns_alert(url):
    """
    Publishes a phishing alert message to the configured SNS topic.
    The message is structured for different protocols (default, SMS, email).
    """
    message = {
        "default": f"⚠️ Phishing alert: {url}",
        "sms": f"⚠️ Phishing alert: {url}",
        "email": f"""
⚠️ PhishGuard Alert ⚠️

A suspicious URL has been detected:
🔗 {url}

Please take immediate action to verify and block if necessary.

🛡️ PhishGuard AI Security System 🛡️
"""
    }
    try:
        sns.publish(
            TopicArn=SNS_TOPIC_ARN,
            Message=json.dumps(message),
            MessageStructure='json', # Required when sending different messages for different protocols
            Subject="⚠️ PhishGuard Alert" # Subject for email notifications
        )
        logger.info(f"SNS alert sent for URL: {url}")
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

def subscribe_sms_to_sns(phone_number):
    """
    Subscribes a phone number (for SMS) to the SNS topic.
    Phone numbers should be in E.164 format (e.g., +12065550100).
    """
    try:
        response = sns.subscribe(
            TopicArn=SNS_TOPIC_ARN,
            Protocol='sms',
            Endpoint=phone_number
        )
        logger.info(f"SMS subscription initiated for: {phone_number}. Subscription ARN: {response['SubscriptionArn']}")
        return {"message": f"SMS subscription initiated for {phone_number}."}
    except Exception as e:
        logger.error(f"Error subscribing SMS {phone_number} to SNS: {e}")
        raise

def lambda_handler(event, context):
    """
    Main Lambda function handler.
    Routes requests based on the API Gateway path.
    """
    logger.info(f"Received event: {json.dumps(event)}")

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
        # Matches API Gateway path /scan
        if path == '/scan/url' and http_method == 'POST':
            url = body.get('url', '')
            if not url:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({"message": "URL is required for scanning."})
                }

            is_phish = is_phishing_url(url)
            result = build_scan_result(url, is_phish)
            save_to_dynamodb(result)

            if result["RiskLevel"] == "HIGH":
                send_sns_alert(url)

            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps(result)
            }
        
        # --- Handle URL Scanning for Email ---
        # Matches API Gateway path /scan/email
        elif path == '/scan/email' and http_method == 'POST':
            email_text = body.get('email', '')
            if not email_text:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({"message": "Email is required for scanning."})
                }

            # Placeholder for email scanning logic
            # In a real application, this would involve checking the email content or links
            urls = extract_urls_from_email(email_text)
            if not urls:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({"message": "No URLs found in the email content."})
                }
            is_phish = any(is_phishing_url(url) for url in urls)

            urls = (",").join(urls)  # Join URLs into a single string for the result

            result = build_scan_result(urls, is_phish, is_email=True)
            is_phish = result["Details"]["is_phishing"]
            save_to_dynamodb(result)
            if result["RiskLevel"] == "HIGH":
                send_sns_alert(result.get("URL"))
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps(result)
            }

        # --- Handle Email Subscription ---
        # Matches API Gateway path /subscribe/email
        elif path == '/subscribe/email' and http_method == 'POST':
            email = body.get('email', '')
            if not email:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({"message": "Email is required for subscription."})
                }
            
            response_message = subscribe_email_to_sns(email)
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps(response_message)
            }

        # --- Handle SMS Subscription ---
        # Matches API Gateway path /subscribe/sms
        elif path == '/subscribe/sms' and http_method == 'POST':
            phone_number = body.get('phoneNumber', '') # Use 'phoneNumber' as the key in the request body
            if not phone_number:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({"message": "Phone number is required for SMS subscription."})
                }
            
            response_message = subscribe_sms_to_sns(phone_number)
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps(response_message)
            }

        # --- Handle unsupported paths/methods ---
        else:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({"message": "Not Found or Method Not Allowed"})
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
