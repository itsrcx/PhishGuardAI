import { useState, useRef } from 'react';
import axios from 'axios';
import { Amplify } from 'aws-amplify';
import { withAuthenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import '@aws-amplify/ui-react/styles.css';

// Configure Amplify
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID
    },
  },
  API: {
    REST: {
      PhisGuardApis: {
        endpoint: import.meta.env.VITE_APIGATEWAY_BASE_URL,
        region: import.meta.env.VITE_APIGATEWAY_REGION,
        authorizationType: 'AMAZON_COGNITO_USER_POOLS'
      }
    }
  }
});

// API Name constant
const MY_API_NAME = 'PhisGuardApis';


function App({ signOut, user }) {
  // State for URL input and list of URLs
  const [currentUrlInput, setCurrentUrlInput] = useState('');
  const [urlsToScan, setUrlsToScan] = useState([]);

  // State for Email input (stores HTML content from contenteditable div)
  const [emailText, setEmailText] = useState('');
  const emailTextInputRef = useRef(null); // Ref to access the contenteditable div

  // State for analysis results, errors, and loading
  const [analysisResults, setAnalysisResults] = useState([]);
  const [analysisError, setAnalysisError] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Get API Base URL from Amplify configuration
  const API_BASE_URL = Amplify.getConfig().API.REST[MY_API_NAME].endpoint;

  // Helper function to get the authentication token
  const getAuthToken = async () => {
    try {
      const session = await fetchAuthSession();
      // Ensure tokens exist and idToken is present
      if (session.tokens && session.tokens.idToken) {
        return session.tokens.idToken.toString();
      }
      throw new Error("ID token not found in session.");
    } catch (error) {
      console.error("Error fetching auth session:", error);
      // It's good practice to inform the user or handle this more gracefully
      setAnalysisError("Failed to retrieve authentication session. Please try signing out and in again.");
      throw new Error("Failed to retrieve authentication session.");
    }
  };

  // Generalized Helper function to handle API calls
  const makeApiCall = async (path, data) => {
    let token;
    try {
      token = await getAuthToken();
    } catch (authError) {
      throw authError;
    }

    try {
      const api_path = `${API_BASE_URL}${path}`
      const res = await axios.post(
        api_path,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return res.data; // Return response data
    } catch (err) {
      console.error("API call error details:", err);
      if (err.response) {
        // Handle API errors (e.g., 4xx, 5xx)
        throw new Error(`Error ${err.response.status}: ${err.response.data?.message || err.response.statusText || 'Unknown API error'}`);
      } else if (err.request) {
        // Handle network errors (request made but no response)
        throw new Error("Network error: No response from API. Please check your connection.");
      } else {
        // Handle other errors
        throw new Error(`An unexpected error occurred: ${err.message}`);
      }
    }
  };

  // Function to add URL to the list
  const handleAddUrl = () => {
    const trimmedUrl = currentUrlInput.trim();

    if (!trimmedUrl) {
      setAnalysisError("URL cannot be empty.");
      return;
    }

    // Disallow comma-separated URLs
    if (trimmedUrl.includes(',')) {
      setAnalysisError("Please enter only one URL at a time (no commas).");
      return;
    }

    // Disallow spaces
    if (trimmedUrl.includes(' ')) {
      setAnalysisError("URL should not contain spaces.");
      return;
    }

    // Basic URL validation (starts with http or https)
    if (!/^https?:\/\/.+/i.test(trimmedUrl)) {
      setAnalysisError("Please enter a valid URL (e.g., http://example.com or https://example.com).");
      return;
    }

    setUrlsToScan([...urlsToScan, trimmedUrl]);
    setCurrentUrlInput(''); // Clear input field
    setAnalysisError(null); // Clear any previous error
  };

  // Function to remove URL from the list
  const handleRemoveUrl = (indexToRemove) => {
    setUrlsToScan(urlsToScan.filter((_, index) => index !== indexToRemove));
  };

  // Function to handle scanning URLs and Email Text
  const handleAnalyzeContent = async () => {
    // Frontend sanitization could be done here if needed using a library like DOMPurify
    // const sanitizedEmailText = DOMPurify.sanitize(emailText.trim());

    if (urlsToScan.length === 0 && !emailText.trim()) {
      setAnalysisError("Please add at least one URL or enter email text to analyze.");
      setAnalysisResults([]); // Clear any previous results
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResults([]); // Clear previous results before new analysis
    const newResults = [];

    // Analyze URLs
    if (urlsToScan.length > 0) {
        for (let i = 0; i < urlsToScan.length; i++) {
          const url = urlsToScan[i];
          try {
            const data = await makeApiCall('/scan/url', { url });
            newResults.push({ id: `url-${i}-${Date.now()}`, type: 'URL', input: url, status: 'success', data });
          } catch (err) {
            newResults.push({ id: `url-${i}-${Date.now()}`, type: 'URL', input: url, status: 'error', error: err.message });
          }
        }
    }

    // Analyze Email Text (HTML content)
    if (emailText.trim()) {
      try {
        // Send the HTML emailText to the backend
        // The backend needs to be capable of parsing HTML and extracting links for analysis
        const data = await makeApiCall('/scan/email', { email: emailText.trim() /* or sanitizedEmailText */ });
        newResults.push({ id: `email-1-${Date.now()}`, type: 'Email', status: 'success', data });
      } catch (err) {
        newResults.push({ id: `email-1-${Date.now()}`, type: 'Email', status: 'error', error: err.message });
      }
    }

    setAnalysisResults(newResults);
    setUrlsToScan([]); // Clear scanned URLs
    setEmailText('');   // Clear email text
    if (emailTextInputRef.current) {
        emailTextInputRef.current.innerHTML = ''; // Clear contenteditable div directly
    }
    setIsAnalyzing(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 font-inter p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-xl mt-10">
        <h1 className="text-3xl font-bold mb-4 text-center flex items-center justify-center gap-2 text-[#007F91]">
          <img src="/phisGuardAi.svg" alt="Logo" className="h-8 w-8" />
          PhishGuard AI
        </h1>
        <p className="text-gray-600 mb-6 text-center">
          Welcome, <span className="font-semibold text-blue-700">{user?.username || 'User'}</span>!
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

          {/* Email Text Input Section (now uses contenteditable div) */}
          <div className="mb-4">
            <label htmlFor="emailTextInputDiv" className="block text-gray-700 text-sm font-bold mb-1">Analyze Email Content (hyper link will be retained):</label>
            <div
              id="emailTextInputDiv"
              ref={emailTextInputRef}
              contentEditable="true"
              onInput={e => setEmailText(e.currentTarget.innerHTML)}
              // ONLY use dangerouslySetInnerHTML IF emailText has content
              // Otherwise, we'll show the placeholder
              {...(!emailText.trim() && { dangerouslySetInnerHTML: { __html: '<span class="text-gray-400">Paste the full email content here (HTML will be retained)...</span>' }})}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 min-h-[120px] overflow-y-auto"
            >
              {/* No direct children here */}
            </div>
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
                    // Display raw JSON for now, your backend should return structured data
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

        {/* Sign Out Button */}
        <div className="flex flex-col items-center mt-8">
          <button
            onClick={signOut}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:shadow-lg transition duration-150 ease-in-out "
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

// Export the App component with AWS Amplify's withAuthenticator HOC for handling user authentication.
// The formFields configuration here customizes the sign-up form.
export default withAuthenticator(App, {
  formFields: {
    signUp: {
      email: {
        order: 1,
        label: 'Email',
        placeholder: 'Enter your email',
        type: 'email',
        required: true,
      },
    },
  },
});
