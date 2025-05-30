import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "react-oidc-context";

const cognitoAuthConfig = {
  authority: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_K00Q7Ztpo",
  client_id: "6vvh4hcarjstddi3qtbp01ju9m",
  redirect_uri: "https://frontend.d2b6jum2293iep.amplifyapp.com/",
  response_type: "code",
  response_mode: "fragment",
  scope: "openid email"
};


const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <AuthProvider {...cognitoAuthConfig}>
    <App />
  </AuthProvider>
);

