import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "react-oidc-context";

// Define your Cognito User Pool details as constants for clarity and maintainability.
// These values should match your AWS Cognito User Pool and App Client settings.
const USER_POOL_ID = "us-east-1_K00Q7Ztpo"; // Your Cognito User Pool ID
const CLIENT_ID = "6vvh4hcarjstddi3qtbp01ju9m"; // Your Cognito User Pool App Client ID
const REDIRECT_URI = "[https://frontend.d2b6jum2293iep.amplifyapp.com/](https://frontend.d2b6jum2293iep.amplifyapp.com/)"; // The URL your application is hosted at and where Cognito redirects after login/logout.
// This URL MUST be configured as a "Callback URL" and "Sign-out URL" in your Cognito User Pool App Client settings.

// Configuration object for react-oidc-context's AuthProvider
const cognitoAuthConfig = {
  // The 'authority' is the URL of your OpenID Connect issuer.
  // For AWS Cognito User Pools, it follows the format:
  // https://cognito-idp.{region}[.amazonaws.com/](https://.amazonaws.com/){userPoolId}
  // react-oidc-context will use this to discover other OIDC endpoints (e.g., /authorize, /token, /jwks).
  authority: `https://cognito-idp.us-east-1.amazonaws.com/${USER_POOL_ID}`,
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  // 'response_type: "code"' indicates the Authorization Code Flow with PKCE,
  // which is the recommended and most secure OAuth 2.0 flow for SPAs.
  response_type: "code",
  // 'response_mode: "fragment"' means that the authorization response parameters
  // (like 'code' and 'state') will be returned in the URL fragment (#).
  // This is common for Single Page Applications (SPAs). If you still face
  // "No state in response" issues, sometimes changing this to "query" can help,
  // but ensure your Cognito App Client also supports it.
  response_mode: "fragment",
  // 'scope' defines the permissions your application is requesting from the user.
  // 'openid' is required for OIDC.
  // 'email' requests access to the user's email address.
  // 'profile' requests access to standard profile claims (like name, picture, etc.).
  scope: "openid email",
  // Optional: URL where the user is redirected after a full logout from the OIDC provider.
  // This should also be configured in your Cognito App Client's "Sign-out URLs".
  post_logout_redirect_uri: REDIRECT_URI,
  // Optional: Configuration for silent token renewal.
  // This helps keep the user's session active without requiring a full redirect.
  // silent_redirect_uri: window.location.origin + '/silent-renew.html', // You might need a dedicated silent-renew.html file
  // automaticSilentRenew: true,
  // Optional: Specifies where to store the user's session data.
  // Using localStorage can help persist the session across browser tabs/reloads.
  // userStore: new WebStorageStateStore({ store: window.localStorage }),
};

// Create a React root for rendering the application
const root = ReactDOM.createRoot(document.getElementById("root"));

// Render the App component wrapped in AuthProvider to provide authentication context
root.render(
  <AuthProvider {...cognitoAuthConfig}>
    <App />
  </AuthProvider>
);
