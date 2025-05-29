import os
import json
import boto3
from datetime import datetime
import uuid

dynamodb = boto3.resource('dynamodb')
sns = boto3.client('sns')
table = dynamodb.Table('PhishScans')
SNS_TOPIC_ARN = os.getenv('SNS_TOPIC_ARN')

def lambda_handler(event, context):
    body = json.loads(event['body'])
    url = body.get('url', '')
    
    # Simulated ML model (replace with SageMaker later)
    is_phishing = "login" in url or "secure" in url

    result = {
        # ScanID
        "id": str(uuid.uuid4()),
        "URL": url,
        "RiskLevel": "HIGH" if is_phishing else "LOW",
        "Timestamp": datetime.utcnow().isoformat()
    }

    table.put_item(Item=result)

    if result["RiskLevel"] == "HIGH":
        sns.publish(
            TopicArn=SNS_TOPIC_ARN,
            Message=f"Phishing alert for URL: {url}",
            Subject="⚠️ PhishGuard Alert"
        )

    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps(result)
    }
