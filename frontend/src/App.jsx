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

  // State for Email input
  const [emailText, setEmailText] = useState('');
  const emailInputRef = useRef(null);

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
      if (session.tokens && session.tokens.idToken) {
        return session.tokens.idToken.toString();
      }
      throw new Error("ID token not found in session.");
    } catch (error) {
      console.error("Error fetching auth session:", error);
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
      const api_path = `${API_BASE_URL}${path}`;
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
      return res.data;
    } catch (err) {
      console.error("API call error details:", err);
      if (err.response) {
        throw new Error(`Error ${err.response.status}: ${err.response.data?.message || err.response.statusText || 'Unknown API error'}`);
      } else if (err.request) {
        throw new Error("Network error: No response from API. Please check your connection.");
      } else {
        throw new Error(`An unexpected error occurred: ${err.message}`);
      }
    }
  };

  // Helper function to extract URLs from HTML content
  const extractUrlsFromHtml = (htmlContent) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    const urls = [];
    
    // Extract URLs from anchor tags
    const links = tempDiv.querySelectorAll('a[href]');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        urls.push(href);
      }
    });
    
    // Also extract plain text URLs using regex
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
    const textUrls = textContent.match(urlRegex) || [];
    urls.push(...textUrls);
    
    // Remove duplicates and return
    return [...new Set(urls)];
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
    setCurrentUrlInput('');
    setAnalysisError(null);
  };

  // Function to remove URL from the list
  const handleRemoveUrl = (indexToRemove) => {
    setUrlsToScan(urlsToScan.filter((_, index) => index !== indexToRemove));
  };

  // Function to extract URLs from email and add to URL list
  const handleExtractUrlsFromEmail = () => {
    if (!emailText.trim()) {
      setAnalysisError("Please enter email content first.");
      return;
    }

    // Get the HTML content from the contentEditable div
    const htmlContent = emailInputRef.current ? emailInputRef.current.innerHTML : emailText;
    const extractedUrls = extractUrlsFromHtml(htmlContent);
    
    if (extractedUrls.length === 0) {
      setAnalysisError("No URLs found in the email content.");
      return;
    }

    // Add extracted URLs to the existing URL list (avoiding duplicates)
    const allUrls = [...urlsToScan, ...extractedUrls];
    const uniqueUrls = [...new Set(allUrls)];
    
    setUrlsToScan(uniqueUrls);
    setAnalysisError(null);
    
    // Clear the email input after extraction
    setEmailText('');
    if (emailInputRef.current) {
      emailInputRef.current.innerHTML = '';
    }
    
    // Show success message
    const newUrlsCount = uniqueUrls.length - urlsToScan.length;
    if (newUrlsCount > 0) {
      console.log(`Extracted ${newUrlsCount} URLs from email content`);
    }
  };

  // Function to handle scanning all URLs
  const handleAnalyzeContent = async () => {
    if (urlsToScan.length === 0) {
      setAnalysisError("Please add at least one URL to analyze.");
      setAnalysisResults([]);
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResults([]);

    try {
      // Single API call with all URLs
      const data = await makeApiCall('/scan/urls', { urls: urlsToScan });
      setAnalysisResults([{ 
        id: `urls-${Date.now()}`, 
        type: 'URLs', 
        status: 'success', 
        data,
        urlCount: urlsToScan.length 
      }]);
    } catch (err) {
      setAnalysisResults([{ 
        id: `urls-${Date.now()}`, 
        type: 'URLs', 
        status: 'error', 
        error: err.message,
        urlCount: urlsToScan.length 
      }]);
    }

    // Clear inputs after analysis
    setUrlsToScan([]);
    setEmailText('');
    if (emailInputRef.current) {
      emailInputRef.current.innerHTML = '';
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

          {/* Email Text Input Section */}
          <div className="mb-4">
  <label htmlFor="emailTextInput" className="block text-gray-700 text-sm font-bold mb-1">
    Email Content (paste HTML content to extract URLs):
  </label>
  <div
    ref={emailInputRef}
    contentEditable="true"
    onInput={e => setEmailText(e.currentTarget.innerHTML)} // use innerHTML to keep links
    onPaste={e => {
      e.preventDefault();
      const clipboardData = e.clipboardData || window.clipboardData;
      const pastedHtml = clipboardData.getData('text/html');
      const pastedText = clipboardData.getData('text/plain');

      if (pastedHtml) {
        document.execCommand('insertHTML', false, pastedHtml);
        setTimeout(() => {
          setEmailText(e.currentTarget.innerHTML);
        }, 0);
      } else {
        // fallback for plain text with possible URLs
        const urlRegex = /https?:\/\/[^\s]+/g;
        const htmlWithLinks = pastedText.replace(urlRegex, url => `<a href="${url}" target="_blank">${url}</a>`);
        document.execCommand('insertHTML', false, htmlWithLinks);
        setTimeout(() => {
          setEmailText(e.currentTarget.innerHTML);
        }, 0);
      }
    }}
    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 min-h-[120px] overflow-y-auto"
    style={{ whiteSpace: 'pre-wrap' }}
    data-placeholder="Paste email content here (HTML with hyperlinks will be preserved)..."
  />
  <style jsx>{`
    div[contenteditable]:empty:before {
      content: attr(data-placeholder);
      color: #9CA3AF;
      pointer-events: none;
    }
    a {
      color: #2563eb;
      text-decoration: underline;
    }
  `}</style>

  <button
    onClick={handleExtractUrlsFromEmail}
    disabled={!emailText.trim()}
    className={`mt-2 py-2 px-4 rounded-md font-bold transition duration-300 ease-in-out ${
      !emailText.trim()
        ? 'bg-gray-300 cursor-not-allowed text-gray-500'
        : 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm'
    }`}
  >
    Extract URLs from Email
  </button>
</div>

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
                <p className="text-sm text-gray-600">URLs to scan ({urlsToScan.length}):</p>
                <ul className="list-disc list-inside pl-2 max-h-32 overflow-y-auto bg-gray-100 p-2 rounded-md">
                  {urlsToScan.map((url, index) => (
                    <li key={index} className="text-sm text-gray-700 flex justify-between items-center">
                      <span className="break-all">{url}</span>
                      <button
                        onClick={() => handleRemoveUrl(index)}
                        className="text-red-500 hover:text-red-700 text-xs ml-2 flex-shrink-0"
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
          
          <button
            onClick={handleAnalyzeContent}
            disabled={isAnalyzing || urlsToScan.length === 0}
            className={`py-3 px-6 rounded-md font-bold transition duration-300 ease-in-out w-full ${
              isAnalyzing || urlsToScan.length === 0 ? 'bg-gray-400 cursor-not-allowed text-gray-600' : 'bg-green-600 hover:bg-green-700 text-white shadow-md'
            }`}
          >
            {isAnalyzing ? 'Analyzing...' : `Analyze ${urlsToScan.length} URL${urlsToScan.length !== 1 ? 's' : ''}`}
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
                  <h4 className="font-semibold text-gray-800">
                    {item.type} Analysis ({item.urlCount} URLs scanned)
                  </h4>
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
