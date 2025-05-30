import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from 'react-oidc-context';

// Main App component for the PhishGuard AI application
function App() {
  // Hook to access authentication state and methods from react-oidc-context
  const auth = useAuth();

  // State variables for the URL input, API result, error messages, and loading status
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Define constants for Cognito configuration.
  // These should match your Cognito User Pool App Client settings.
  const CLIENT_ID = "6vvh4hcarjstddi3qtbp01ju9m";
  const COGNITO_DOMAIN = "https://us-east-1k00q7ztpo.auth.us-east-1.amazoncognito.com";
  // This LOGOUT_URI MUST be configured in your Cognito User Pool App Client's "Sign-out URLs".
  // It should typically be the same as your application's redirect_uri or a dedicated logout page.
  const LOGOUT_URI = "https://frontend.d2b6jum2293iep.amplifyapp.com/";

  // Function to handle scanning the entered URL
  const scanUrl = async () => {
    // Prevent scanning if the URL input is empty
    if (!url) return;

    // Set loading state, clear previous results and errors
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Get the Access Token from the authenticated user.
      // API Gateway Cognito Authorizers typically expect the Access Token for resource authorization.
      // The ID Token is primarily for user authentication to the client application.
      const token = auth.user?.id_token; // Changed from id_token to access_token

      // If no token is found, display an error and stop
      if (!token) {
        setError("Authentication token not found. Please sign in again.");
        setLoading(false);
        return;
      }

      // Make a POST request to the API Gateway endpoint
      const res = await axios.post(
        'https://429qv9l0ib.execute-api.us-east-1.amazonaws.com/api',
        { url }, // Request body containing the URL to scan
        {
          headers: {
            // Include the authorization token in the header.
            // Standard practice is to prefix the token with 'Bearer '.
            Authorization: `Bearer ${token}`,
          },
        }
      );
      // Set the API response data to the result state
      setResult(res.data);
    } catch (err) {
      // Log the full error for debugging purposes
      console.error("API call error:", err);
      // Handle different types of errors from the API call
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx (e.g., 401, 403, 500)
        setError(`Failed to scan URL: ${err.response.data?.message || err.response.statusText || 'Unknown error'}`);
      } else if (err.request) {
        // The request was made but no response was received (e.g., network error)
        setError("No response from API. Please check your network connection or API endpoint.");
      } else {
        // Something happened in setting up the request that triggered an Error
        setError("An unexpected error occurred during the request setup. Please try again.");
      }
    } finally {
      // Always set loading to false after the API call completes or fails
      setLoading(false);
    }
  };

  // Function to redirect to Cognito for a full sign-out
  const signOutRedirect = () => {
    // Construct the Cognito logout URL using the defined constants.
    // This URL will initiate the logout process on Cognito's side and then redirect
    // back to the LOGOUT_URI after successful logout.
    window.location.href = `${COGNITO_DOMAIN}/logout?client_id=${CLIENT_ID}&logout_uri=${encodeURIComponent(LOGOUT_URI)}`;
  };

  // Display loading state while authentication is in progress
  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 font-inter">
        <div className="text-xl text-gray-700">Loading authentication...</div>
      </div>
    );
  }

  // Display error state if authentication fails
  if (auth.error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-100 font-inter">
        <div className="text-xl text-red-700">Error: {auth.error.message}</div>
      </div>
    );
  }

  // If not authenticated, display the sign-in button
  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 font-inter p-4">
        <div className="bg-white p-8 rounded-lg shadow-md text-center w-full max-w-sm">
          <h1 className="text-3xl font-bold mb-4 text-gray-800">PhishGuard AI</h1>
          <p className="text-gray-600 mb-6">Please sign in to access the URL scanning service.</p>
          <button
            onClick={() => auth.signinRedirect()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition duration-300 ease-in-out w-full"
          >
            Sign In with Cognito
          </button>
        </div>
      </div>
    );
  }

  // If authenticated, display the main application content
  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 font-inter p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md mt-10">
        <h1 className="text-3xl font-bold mb-4 text-gray-800 text-center">PhishGuard AI</h1>
        <p className="text-gray-600 mb-6 text-center">
          Welcome, <span className="font-semibold text-blue-700">{auth.user?.profile.email || 'User'}</span>!
        </p>

        <div className="flex flex-col gap-4 mb-6">
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="Enter URL to scan (e.g., https://example.com)"
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
          />
          <button
            onClick={scanUrl}
            disabled={!url || loading}
            className={`py-3 px-6 rounded-md font-bold transition duration-300 ease-in-out ${
              !url || loading ? 'bg-gray-400 cursor-not-allowed text-gray-600' : 'bg-green-600 hover:bg-green-700 text-white shadow-md'
            } w-full`}
          >
            {loading ? 'Scanning...' : 'Scan URL'}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
          <button
            onClick={() => auth.removeUser()}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300 ease-in-out flex-1"
          >
            Sign out (Local)
          </button>
          <button
            onClick={signOutRedirect}
            className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300 ease-in-out flex-1"
          >
            Sign out (Cognito)
          </button>
        </div>

        {error && (
          <p className="text-red-600 text-center mt-4 p-3 bg-red-100 border border-red-300 rounded-md">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-6 bg-gray-50 p-4 rounded-md border border-gray-200">
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Scan Result:</h3>
            <pre className="whitespace-pre-wrap break-words text-sm bg-gray-100 p-3 rounded-md overflow-x-auto text-gray-700">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
