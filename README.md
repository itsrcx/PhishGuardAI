# PhishGuardAI

PhishGuardAI is a web application that helps users detect potential phishing URLs using AI-powered backend logic. The project consists of a React frontend and an AWS Lambda backend, with integration to DynamoDB and SNS for alerting.

## Features

- **Scan URLs** for phishing indicators using a simple web interface.
- **AI-based detection** (simulated, can be replaced with a real ML model).
- **Stores scan results** in DynamoDB.
- **Sends alerts** via SNS for high-risk URLs.
- **User-friendly frontend** built with React.

## Getting Started

### Prerequisites

- Node.js and npm
- AWS account with DynamoDB and SNS set up
- Amplify CLI (optional, for deployment)

### Frontend

1. Install dependencies:

    ```sh
    cd frontend
    npm install
    ```

2. Start the development server:

    ```sh
    npm start
    ```

3. Open [http://localhost:3000](http://localhost:3000) to use the app.

### Backend

- The backend is an AWS Lambda function ([`backend/lambda_function.py`](backend/lambda_function.py)) that:
  - Receives POST requests with a URL.
  - Checks for phishing indicators.
  - Stores results in DynamoDB (`PhishScans` table).
  - Sends SNS alerts for high-risk URLs.

#### Environment Variables

- `SNS_TOPIC_ARN`: ARN of the SNS topic for alerts.

### Deployment

- The project uses Amplify for CI/CD. See [`config/amplify.yml`](config/amplify.yml) for build steps.

## Usage

1. Enter a URL in the input field.
2. Click "Scan".
3. View the risk assessment and details.

## License

MIT License

---

*PhishGuardAI – Protect yourself from phishing threats!*
