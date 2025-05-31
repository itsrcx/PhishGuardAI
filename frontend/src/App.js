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

  // New state variables for email and phone number subscriptions
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [subscribeMessage, setSubscribeMessage] = useState(null);
  const [subscribeError, setSubscribeError] = useState(null);
  const [subscribing, setSubscribing] = useState(false);

  // Define constants for Cognito configuration.
  const CLIENT_ID = "6vvh4hcarjstddi3qtbp01ju9m";
  const COGNITO_DOMAIN = "https://us-east-1k00q7ztpo.auth.us-east-1.amazoncognito.com";
  const LOGOUT_URI = "https://frontend.d2b6jum2293iep.amplifyapp.com/";

  // Base URL for your API Gateway endpoint
  const API_BASE_URL = 'https://429qv9l0ib.execute-api.us-east-1.amazonaws.com/api';

  // Helper function to handle API calls consistently
  const makeApiCall = async (path, data) => {
    setSubscribeMessage(null);
    setSubscribeError(null);
    setSubscribing(true);
    try {
      const token = auth.user?.access_token; // Use access_token for API authorization

      if (!token) {
        throw new Error("Authentication token not found. Please sign in again.");
      }

      const res = await axios.post(
        `${API_BASE_URL}${path}`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      setSubscribeMessage(res.data.message || "Operation successful!");
      return res.data;
    } catch (err) {
      console.error("API call error:", err);
      if (err.response) {
        setSubscribeError(`Error: ${err.response.data?.message || err.response.statusText || 'Unknown error'}`);
      } else if (err.request) {
        setSubscribeError("Network error: No response from API.");
      } else {
        setSubscribeError(`An unexpected error occurred: ${err.message}`);
      }
      throw err; // Re-throw to be caught by specific handlers if needed
    } finally {
      setSubscribing(false);
    }
  };

  // Function to handle scanning the entered URL
  const scanUrl = async () => {
    if (!url) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // API Gateway path for scanning is now '/scan'
      const data = await makeApiCall('/scan', { url });
      setResult(data);
    } catch (err) {
      // Error is already set by makeApiCall, no need to duplicate
    } finally {
      setLoading(false);
    }
  };

  // Function to handle email subscription
  const subscribeEmail = async () => {
    if (!email) {
      setSubscribeError("Email is required for subscription.");
      return;
    }
    try {
      // API Gateway path for email subscription is '/subscribe/email'
      await makeApiCall('/subscribe/email', { email });
      setEmail(''); // Clear input on success
    } catch (err) {
      // Error is already set by makeApiCall
    }
  };

  // Function to handle SMS subscription
  const subscribeSms = async () => {
    if (!phoneNumber) {
      setSubscribeError("Phone number is required for SMS subscription.");
      return;
    }
    try {
      // API Gateway path for SMS subscription is '/subscribe/sms'
      await makeApiCall('/subscribe/sms', { phoneNumber });
      setPhoneNumber(''); // Clear input on success
    } catch (err) {
      // Error is already set by makeApiCall
    }
  };

  // Function to redirect to Cognito for a full sign-out
  const signOutRedirect = () => {
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

        {/* URL Scan Section */}
        <div className="mb-8 p-4 border border-gray-200 rounded-md bg-gray-50">
          <h2 className="text-xl font-semibold mb-3 text-gray-800">Scan URL for Phishing</h2>
          <div className="flex flex-col gap-4">
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
          {error && (
            <p className="text-red-600 text-center mt-4 p-3 bg-red-100 border border-red-300 rounded-md">
              {error}
            </p>
          )}
          {result && (
            <div className="mt-6 bg-gray-100 p-4 rounded-md border border-gray-200">
              <h3 className="text-lg font-semibold mb-2 text-gray-800">Scan Result:</h3>
              <pre className="whitespace-pre-wrap break-words text-sm bg-gray-200 p-3 rounded-md overflow-x-auto text-gray-700">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* SNS Subscription Section */}
        <div className="mb-8 p-4 border border-gray-200 rounded-md bg-gray-50">
          <h2 className="text-xl font-semibold mb-3 text-gray-800">Subscribe to Phishing Alerts</h2>
          
          {/* Email Subscription */}
          <div className="mb-4">
            <label htmlFor="emailInput" className="block text-gray-700 text-sm font-bold mb-2">Email Subscription:</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                id="emailInput"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter email for alerts"
                className="flex-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              />
              <button
                onClick={subscribeEmail}
                disabled={!email || subscribing}
                className={`py-2 px-4 rounded-md font-bold transition duration-300 ease-in-out ${
                  !email || subscribing ? 'bg-gray-400 cursor-not-allowed text-gray-600' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                }`}
              >
                {subscribing ? 'Subscribing...' : 'Subscribe Email'}
              </button>
            </div>
          </div>

          {/* SMS Subscription */}
          <div>
            <label htmlFor="phoneInput" className="block text-gray-700 text-sm font-bold mb-2">SMS Subscription:</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="tel" // Use type="tel" for phone numbers
                id="phoneInput"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                placeholder="Enter phone number (e.g., +12065550100)"
                className="flex-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              />
              <button
                onClick={subscribeSms}
                disabled={!phoneNumber || subscribing}
                className={`py-2 px-4 rounded-md font-bold transition duration-300 ease-in-out ${
                  !phoneNumber || subscribing ? 'bg-gray-400 cursor-not-allowed text-gray-600' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                }`}
              >
                {subscribing ? 'Subscribing...' : 'Subscribe SMS'}
              </button>
            </div>
          </div>
          
          {subscribeError && (
            <p className="text-red-600 text-center mt-4 p-3 bg-red-100 border border-red-300 rounded-md">
              {subscribeError}
            </p>
          )}
          {subscribeMessage && (
            <p className="text-green-600 text-center mt-4 p-3 bg-green-100 border border-green-300 rounded-md">
              {subscribeMessage}
            </p>
          )}
        </div>

        {/* Sign Out Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
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
      </div>
    </div>
  );
}

export default App;
