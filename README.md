# PHISHGUARDAI

*Empower Your Safety, Outsmart Phishing Threats Today*

![last commit](https://img.shields.io/badge/last%20commit-today-2ea44f)
![notebook](https://img.shields.io/badge/jupyter%20notebook-54.3%25-blue)
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
- AWS account
- Amplify CLI (optional, for deployment)

### Backend Deployment

1. **Package Lambda:**
   - Zip your Lambda code (`lambda_function.py` and dependencies) as `lambda_function.zip`.

2. **Upload Lambda to S3:**
   - Upload `lambda_function.zip` to an S3 bucket in your AWS account.
   > **Important:**  
   > The Lambda function and the S3 bucket **must be in the same AWS region** for successful deployment.

3. **Deploy AWS Resources:**
   - Use the provided `resource.yml` CloudFormation template to deploy all backend resources (DynamoDB, SNS, Lambda, API Gateway, Cognito).
   - Pass your project name and the S3 bucket/key for the Lambda zip as parameters.
   - Example command:
     ```sh
     aws cloudformation deploy \
       --template-file resource.yml \
       --stack-name <your-stack-name> \
       --parameter-overrides ProjectName=<your-project-name> CodeBucket=<your-s3-bucket> CodeObjectKey=<your-lambda-zip-path> \
       --capabilities CAPABILITY_NAMED_IAM
     ```
   - **Parameters:**
     - `ProjectName`: Name prefix for all resources (e.g., phishguardai)
     - `CodeBucket`: S3 bucket name where Lambda code is stored
     - `CodeObjectKey`: S3 key (object path) to the Lambda zip file

   - After deployment, note the output values for:
     - API Gateway URL
     - Cognito User Pool ID
     - Cognito User Pool Client ID
     - Region

### Frontend

1. **Set Environment Variables:**
   - Before deploying with Amplify or running locally, set the following environment variables:
     - `VITE_APIGATEWAY_BASE_URL` (API Gateway endpoint from CloudFormation output)
     - `VITE_APIGATEWAY_REGION` (AWS region)
     - `VITE_COGNITO_USER_POOL_CLIENT_ID` (from CloudFormation output)
     - `VITE_COGNITO_USER_POOL_ID` (from CloudFormation output)

   - **For Amplify deployment:**  
     Add these variables in the Amplify Console under "Environment variables" before deploying.

   - **For local development:**  
     Create a `.env` file in the `frontend` directory:
     ```
     VITE_APIGATEWAY_BASE_URL=...
     VITE_APIGATEWAY_REGION=...
     VITE_COGNITO_USER_POOL_CLIENT_ID=...
     VITE_COGNITO_USER_POOL_ID=...
     ```

2. **Install dependencies:**
    ```sh
    cd frontend
    npm install
    ```

3. **Start the development server:**
    ```sh
    npm run dev
    ```

4. **Open [http://localhost:5173](http://localhost:5173) to use the app.**

### Usage

1. Enter URLs or emails in the input field.
2. Click "Scan".
3. View the risk assessment and details.

## License

....

---

*PhishGuardAI – Protect yourself from phishing threats!*
