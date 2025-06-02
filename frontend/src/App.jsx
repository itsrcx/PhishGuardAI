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


const MY_API_NAME = 'PhisGuardApis';


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
// Main App component for the PhishGuard AI application
function App({ signOut, user }) {
  // State for URL input and list of URLs
  const [currentUrlInput, setCurrentUrlInput] = useState('');
  const [urlsToScan, setUrlsToScan] = useState([]);

  // State for Email input
  const [emailText, setEmailText] = useState('');

  // State for analysis results, errors, and loading
  const [analysisResults, setAnalysisResults] = useState([]);
  const [analysisError, setAnalysisError] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // State variables for email and phone number subscriptions
  const [subscriptionEmail, setSubscriptionEmail] = useState(''); // Renamed to avoid conflict
  const [phoneNumber, setPhoneNumber] = useState('');
  const [subscribeMessage, setSubscribeMessage] = useState(null);
  const [subscribeError, setSubscribeError] = useState(null);
  const [subscribingEmail, setSubscribingEmail] = useState(false);
  const [subscribingSms, setSubscribingSms] = useState(false);

  const API_BASE_URL = Amplify.getConfig().API.REST[MY_API_NAME].endpoint;


  // Helper function to get the authentication token
  const getAuthToken = async () => {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString();
    } catch (error) {
      console.error("Error fetching auth session:", error);
      throw new Error("Failed to retrieve authentication session.");
    }
  };

  // Generalized Helper function to handle API calls
  const makeApiCall = async (path, data) => {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("Authentication token not found. Please sign in again.");
    }

    try {
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
      return res.data;
    } catch (err) {
      console.error("API call error details:", err);
      if (err.response) {
        throw new Error(`Error ${err.response.status}: ${err.response.data?.message || err.response.statusText || 'Unknown API error'}`);
      } else if (err.request) {
        throw new Error("Network error: No response from API.");
      } else {
        throw new Error(`An unexpected error occurred: ${err.message}`);
      }
    }
  };

  // Function to add URL to the list
  const handleAddUrl = () => {
    if (!currentUrlInput.trim()) {
      setAnalysisError("URL cannot be empty.");
      return;
    }
    // Basic URL validation (starts with http or https)
    if (!/^https?:\/\/.+/i.test(currentUrlInput.trim())) {
        setAnalysisError("Please enter a valid URL (e.g., http://example.com or https://example.com).");
        return;
    }
    setUrlsToScan([...urlsToScan, currentUrlInput.trim()]);
    setCurrentUrlInput('');
    setAnalysisError(null); // Clear error if any
  };

  // Function to remove URL from the list
  const handleRemoveUrl = (indexToRemove) => {
    setUrlsToScan(urlsToScan.filter((_, index) => index !== indexToRemove));
  };

  // Function to handle scanning URLs and Email Text
  const handleAnalyzeContent = async () => {
    if (urlsToScan.length === 0 && !emailText.trim()) {
      setAnalysisError("Please add at least one URL or enter email text to analyze.");
      setAnalysisResults([]);
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResults([]); // Clear previous results
    const newResults = [];

    // Analyze URLs
    for (let i = 0; i < urlsToScan.length; i++) {
      const url = urlsToScan[i];
      try {
        const data = await makeApiCall('/scan/url', { url });
        newResults.push({ id: `url-${i}`, type: 'URL', input: url, status: 'success', data });
      } catch (err) {
        newResults.push({ id: `url-${i}`, type: 'URL', input: url, status: 'error', error: err.message });
      }
    }

    // Analyze Email Text
    if (emailText.trim()) {
      try {
        // Assuming a new endpoint '/analyze/email' for email text
        const data = await makeApiCall('/scan/email', { text: emailText.trim() });
        newResults.push({ id: 'email-1', type: 'Email', status: 'success', data });
      } catch (err) {
        newResults.push({ id: 'email-1', type: 'Email', status: 'error', error: err.message });
      }
    }

    setAnalysisResults(newResults);
    setUrlsToScan([]); // <-- ADD THIS LINE
    setEmailText('');   // <-- ADD THIS LINE
    setIsAnalyzing(false);
  };


  // Function to handle email subscription
  const subscribeEmail = async () => {
    if (!subscriptionEmail) {
      setSubscribeError("Email is required for subscription.");
      return;
    }
    setSubscribingEmail(true);
    setSubscribeMessage(null);
    setSubscribeError(null);
    try {
      const response = await makeApiCall('/subscribe/email', { email: subscriptionEmail });
      setSubscribeMessage(response.message || "Subscription successful!");
      setSubscriptionEmail('');
    } catch (err) {
      setSubscribeError(err.message);
    } finally {
      setSubscribingEmail(false);
    }
  };

  // Function to handle SMS subscription
  const subscribeSms = async () => {
    if (!phoneNumber) {
      setSubscribeError("Phone number is required for SMS subscription.");
      return;
    }
    setSubscribingSms(true);
    setSubscribeMessage(null);
    setSubscribeError(null);
    try {
      const response = await makeApiCall('/subscribe/sms', { phoneNumber });
      setSubscribeMessage(response.message || "Subscription successful!");
      setPhoneNumber('');
    } catch (err) {
      setSubscribeError(err.message);
    } finally {
      setSubscribingSms(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 font-inter p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-xl mt-10"> {/* Increased max-w-xl */}
        <h1 className="text-3xl font-bold mb-4 text-gray-800 text-center">PhishGuard AI</h1>
        <p className="text-gray-600 mb-6 text-center">
          Welcome, <span className="font-semibold text-blue-700">{user?.username || user?.signInDetails?.loginId || 'User'}</span>!
        </p>

        {/* Content Analysis Section */}
        <div className="mb-8 p-4 border border-gray-200 rounded-md bg-gray-50">
          <h2 className="text-xl font-semibold mb-3 text-gray-800">Analyze Content</h2>

          {/* URL Input Section */}
          <div className="mb-4">
            <label htmlFor="urlInput" className="block text-gray-700 text-sm font-bold mb-1">Add URL(s) for Phishing Scan:</label>
            <div className="flex flex-col sm:flex-row gap-2 mb-2">
              <input
                type="text"
                id="urlInput"
                value={currentUrlInput}
                onChange={e => setCurrentUrlInput(e.target.value)}
                placeholder="Enter URL (e.g., https://example.com)"
                className="flex-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              />
              <button
                onClick={handleAddUrl}
                disabled={!currentUrlInput.trim()}
                className={`py-3 px-4 rounded-md font-bold transition duration-300 ease-in-out ${
                  !currentUrlInput.trim() ? 'bg-gray-300 cursor-not-allowed text-gray-500' : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm'
                }`}
              >
                Add URL
              </button>
            </div>
            {urlsToScan.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-600">URLs to scan:</p>
                <ul className="list-disc list-inside pl-2 max-h-28 overflow-y-auto bg-gray-100 p-2 rounded-md">
                  {urlsToScan.map((url, index) => (
                    <li key={index} className="text-sm text-gray-700 flex justify-between items-center">
                      <span>{url}</span>
                      <button
                        onClick={() => handleRemoveUrl(index)}
                        className="text-red-500 hover:text-red-700 text-xs ml-2"
                        title="Remove URL"
                      >
                        ✖
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Email Text Input Section */}
          <div className="mb-4">
            <label htmlFor="emailTextInput" className="block text-gray-700 text-sm font-bold mb-1">Analyze Email Text:</label>
            <textarea
              id="emailTextInput"
              value={emailText}
              onChange={e => setEmailText(e.target.value)}
              placeholder="Paste the full email text here for analysis..."
              rows="5"
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            />
          </div>
          
          <button
            onClick={handleAnalyzeContent}
            disabled={isAnalyzing || (urlsToScan.length === 0 && !emailText.trim())}
            className={`py-3 px-6 rounded-md font-bold transition duration-300 ease-in-out w-full ${
              isAnalyzing || (urlsToScan.length === 0 && !emailText.trim()) ? 'bg-gray-400 cursor-not-allowed text-gray-600' : 'bg-green-600 hover:bg-green-700 text-white shadow-md'
            }`}
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Content'}
          </button>

          {analysisError && (
            <p className="text-red-600 text-center mt-4 p-3 bg-red-100 border border-red-300 rounded-md">
              {analysisError}
            </p>
          )}

          {analysisResults.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Analysis Results:</h3>
              {analysisResults.map((item) => (
                <div key={item.id} className={`p-4 rounded-md border ${item.status === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <h4 className="font-semibold text-gray-800">{item.type} Analysis: {item.input || 'Email Body'}</h4>
                  {item.status === 'success' ? (
                    <pre className="whitespace-pre-wrap break-words text-sm bg-gray-100 p-3 mt-2 rounded-md overflow-x-auto text-gray-700">
                      {JSON.stringify(item.data, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-red-700 mt-1">Error: {item.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SNS Subscription Section */}
        <div className="mb-8 p-4 border border-gray-200 rounded-md bg-gray-50">
          <h2 className="text-xl font-semibold mb-3 text-gray-800">Subscribe to Phishing Alerts</h2>
          
          <div className="mb-4">
            <label htmlFor="emailSubInput" className="block text-gray-700 text-sm font-bold mb-2">Email Subscription:</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                id="emailSubInput"
                value={subscriptionEmail}
                onChange={e => setSubscriptionEmail(e.target.value)}
                placeholder="Enter email for alerts"
                className="flex-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              />
              <button
                onClick={subscribeEmail}
                disabled={!subscriptionEmail || subscribingEmail}
                className={`py-2 px-4 rounded-md font-bold transition duration-300 ease-in-out ${
                  !subscriptionEmail || subscribingEmail ? 'bg-gray-400 cursor-not-allowed text-gray-600' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                }`}
              >
                {subscribingEmail ? 'Subscribing...' : 'Subscribe Email'}
              </button>
            </div>
          </div>

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
            onClick={signOut}
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
