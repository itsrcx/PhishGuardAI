import { useState } from 'react';
import axios from 'axios';
import { Amplify } from 'aws-amplify';
import { withAuthenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import '@aws-amplify/ui-react/styles.css';


Amplify.configure({
  Auth: {
    Cognito: {
      userPoolClientId: "6vvh4hcarjstddi3qtbp01ju9m",
      userPoolId: "us-east-1_K00Q7Ztpo",
    },
  },
  API: {
    REST: {
      PhisGuardApis: {
        endpoint: 'https://429qv9l0ib.execute-api.us-east-1.amazonaws.com/api',
        region: 'us-east-1',
        authorizationType: 'AMAZON_COGNITO_USER_POOLS'
      }
    }
  }
});


const formFields = {
  signUp: {
    name: { // Corresponds to 'name.formatted' in your error
      order: 1,
      label: 'Full Name',
      placeholder: 'Enter your full name',
      type: 'text',
      required: true,
    },
    email: { // Corresponds to 'emails' in your error, using the standard Cognito attribute name
      order: 2,
      label: 'Email',
      placeholder: 'Enter your email',
      type: 'email',
      required: true,
    },
    zoneinfo: { // Corresponds to 'timezone' in your error, standard Cognito attribute name is 'zoneinfo'
      order: 7,
      label: 'Timezone',
      placeholder: 'e.g., America/New_York',
      type: 'text', // Could also be a select with timezone options
      required: true,
    },
    // Amplify's Authenticator usually handles username and password fields automatically
    // You might also need to configure 'username' if you are not using email/phone as username alias
  },
};


// Main App component for the PhishGuard AI application
function App({ signOut, user }) { // Props passed by withAuthenticator
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
  const [subscribingEmail, setSubscribingEmail] = useState(false);
  const [subscribingSms, setSubscribingSms] = useState(false);

  // Base URL for your API Gateway endpoint
  // This can also be accessed via Amplify.API.REST.YourAPIName.endpoint
  const API_BASE_URL = 'https://429qv9l0ib.execute-api.us-east-1.amazonaws.com/api';


  // Helper function to get the authentication token
  const getAuthToken = async () => {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString();
  };

  // Helper function to handle API calls consistently
  const makeApiCall = async (path, data, setOperationLoading) => {
    setSubscribeMessage(null); // Clear previous success messages
    setSubscribeError(null);   // Clear previous error messages
    setOperationLoading(true);
    try {
      // Amplify's API category automatically handles signing requests with the authenticated user's credentials
      // You can also get the session token using Auth.currentSession() if needed for manual axios calls
      const token = await getAuthToken();

      if (!token) {
        throw new Error("Authentication token not found. Please sign in again.");
      }

      const res = await axios.post(
        `${API_BASE_URL}${path}`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`, // Use the ID token for authorization
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
      throw err;
    } finally {
      setOperationLoading(false);
    }
  };

  // Function to handle scanning the entered URL
  const scanUrl = async () => {
    if (!url) {
      setError("Please enter a URL to scan.");
      setResult(null); // Clear previous results
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await makeApiCall('/scan', { url }, setLoading);
      setResult(data);
    } catch (err) {
      // Error is already set by makeApiCall
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
      await makeApiCall('/subscribe/email', { email }, setSubscribingEmail);
      setEmail(''); // Clear email input on success
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
      await makeApiCall('/subscribe/sms', { phoneNumber }, setSubscribingSms);
      setPhoneNumber(''); // Clear phone number input on success
    } catch (err) {
      // Error is already set by makeApiCall
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 font-inter p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md mt-10">
        <h1 className="text-3xl font-bold mb-4 text-gray-800 text-center">PhishGuard AI</h1>
        <p className="text-gray-600 mb-6 text-center">
          Welcome, <span className="font-semibold text-blue-700">{user?.username || user?.attributes?.email || 'User'}</span>!
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
                disabled={!email || subscribingEmail}
                className={`py-2 px-4 rounded-md font-bold transition duration-300 ease-in-out ${
                  !email || subscribingEmail ? 'bg-gray-400 cursor-not-allowed text-gray-600' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                }`}
              >
                {subscribingEmail ? 'Subscribing...' : 'Subscribe Email'}
              </button>
            </div>
          </div>

          {/* SMS Subscription */}
          <div>
            <label htmlFor="phoneInput" className="block text-gray-700 text-sm font-bold mb-2">SMS Subscription:</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="tel"
                id="phoneInput"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                placeholder="Enter phone number (e.g., +12065550100)"
                className="flex-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              />
              <button
                onClick={subscribeSms}
                disabled={!phoneNumber || subscribingSms}
                className={`py-2 px-4 rounded-md font-bold transition duration-300 ease-in-out ${
                  !phoneNumber || subscribingSms ? 'bg-gray-400 cursor-not-allowed text-gray-600' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                }`}
              >
                {subscribingSms ? 'Subscribing...' : 'Subscribe SMS'}
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

        {/* Sign Out Button */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={signOut} // Use signOut provided by withAuthenticator
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300 ease-in-out flex-1"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export default withAuthenticator(App, { formFields });
