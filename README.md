# PHISHGUARDAI

*Empower Your Safety, Outsmart Phishing Threats Today*

![last commit](https://img.shields.io/badge/last%20commit-today-2ea44f)
![notebook](https://img.shields.io/badge/jupyter%20notebook-20.3%25-blue)
![languages](https://img.shields.io/badge/languages-4-blue)

---

## Built with the tools and technologies:

![JSON](https://img.shields.io/badge/-JSON-black?logo=json&logoColor=white)
![Markdown](https://img.shields.io/badge/-Markdown-white?logo=markdown&logoColor=black)
![npm](https://img.shields.io/badge/-npm-red?logo=npm&logoColor=white)
![AWS Amplify](https://img.shields.io/badge/-AWS%20Amplify-orange?logo=awsamplify&logoColor=white)
![JavaScript](https://img.shields.io/badge/-JavaScript-yellow?logo=javascript&logoColor=black)

![React](https://img.shields.io/badge/-React-61dafb?logo=react&logoColor=black)
![Python](https://img.shields.io/badge/-Python-3776AB?logo=python&logoColor=white)
![Vite](https://img.shields.io/badge/-Vite-646cff?logo=vite&logoColor=white)
![ESLint](https://img.shields.io/badge/-ESLint-4B32C3?logo=eslint&logoColor=white)
![Axios](https://img.shields.io/badge/-Axios-5A29E4?logo=axios&logoColor=white)

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
    npm run dev
    ```

3. Open [http://localhost:5173](http://localhost:5173) to use the app.

### Backend (Custom creation on aws console for now ... Automation InProgress!)

- The backend is an AWS Lambda function ([`backend/lambda_function.py`](backend/lambda_function.py)) that:
  - Receives POST requests with a URL.
  - Checks for phishing indicators.
  - Stores results in DynamoDB (`PhishScans` table).
  - Sends SNS alerts for high-risk URLs.

#### Environment Variables

- `SNS_TOPIC_ARN`: ARN of the SNS topic for alerts.

### Deployment

- The project uses Amplify for CI/CD. See [`frontend/amplify_yml/buildspec.yml`](frontend/amplify_yml/buildspec.yml) for build steps.

## Usage

1. Enter a URL in the input field.
2. Click "Scan".
3. View the risk assessment and details.

## License

....

---

*PhishGuardAI – Protect yourself from phishing threats!*
