import os
import json
import boto3
from datetime import datetime, timezone
import uuid

dynamodb = boto3.resource('dynamodb')
sns = boto3.client('sns')

SNS_TOPIC_ARN = os.getenv('SNS_TOPIC_ARN', 'arn:aws:sns:us-east-1:610251783037:PhishGuardAlerts')
TABLE_NAME = os.getenv('PHISHSCAN_TABLE_NAME', 'PhishScans')

table = dynamodb.Table(TABLE_NAME)



def is_phishing_url(url):
    # Placeholder phishing logic — replace with actual ML call later
    return "login" in url or "secure" in url


def build_scan_result(url, is_phishing):
    return {
        "ScanID": str(uuid.uuid4()),
        "URL": url,
        "RiskLevel": "HIGH" if is_phishing else "LOW",
        "Timestamp": datetime.now(tz=timezone.utc).isoformat(),
        "Details": {
            "is_phishing": is_phishing,
            "reason": "Contains 'login' or 'secure'" if is_phishing else "No phishing indicators detected"
        }
    }


def save_to_dynamodb(item):
    table.put_item(Item=item)


def send_sns_alert(url):
    message = {
        "default": f"⚠️ Phishing alert: {url}",
        "email": f"""
            ⚠️ PhishGuard Alert

            A suspicious URL has been detected:
            🔗 {url}

            Please take immediate action to verify and block if necessary.

            – PhishGuard AI Security System
            """,
        "sms": f"⚠️ Phishing alert: {url}"
    }

    sns.publish(
        TopicArn=SNS_TOPIC_ARN,
        Message=json.dumps(message),
        MessageStructure='json',
        Subject="⚠️ PhishGuard Alert"
    )


def lambda_handler(event, context):
    body = json.loads(event.get('body', '{}'))
    url = body.get('url', '')

    is_phish = is_phishing_url(url)
    result = build_scan_result(url, is_phish)

    save_to_dynamodb(result)

    if result["RiskLevel"] == "HIGH":
        send_sns_alert(url)

    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(result)
    }
