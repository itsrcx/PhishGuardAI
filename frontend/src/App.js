import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from 'react-oidc-context';

function App() {
  const auth = useAuth();

  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const scanUrl = async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    setResult(null);
    
    console.log("Sending token:", auth.user?.access_token);
    try {
      const res = await axios.post(
        'https://429qv9l0ib.execute-api.us-east-1.amazonaws.com/api',
        { url },
        {
          headers: {
            Authorization: `${auth.user?.access_token}`,
          },
        }
      );
      setResult(res.data);
    } catch (err) {
      setError('Failed to scan URL. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const signOutRedirect = () => {
    const clientId = "6vvh4hcarjstddi3qtbp01ju9m";
    const logoutUri = "<logout uri>";
    const cognitoDomain = "https://us-east-1k00q7ztpo.auth.us-east-1.amazoncognito.com";
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
  };

  if (auth.isLoading) return <div>Loading authentication...</div>;

  if (auth.error) return <div>Error: {auth.error.message}</div>;

  if (!auth.isAuthenticated) {
    console.log("User Object:", auth.user);
    console.log("Access Token:", auth.user?.access_token);
    console.log("ID Token:", auth.user?.id_token);
    return (
      <div style={{ padding: 30 }}>
        <h1>PhishGuard AI</h1>
        <button onClick={() => auth.signinRedirect()}>Sign In with Cognito</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 30 }}>
      <h1>PhishGuard AI</h1>
      <p>Welcome, {auth.user?.profile.email}</p>

      <input
        type="text"
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="Enter URL"
      />
      <button onClick={scanUrl} disabled={!url || loading}>
        {loading ? 'Scanning...' : 'Scan'}
      </button>
      <button onClick={() => auth.removeUser()}>Sign out (Local)</button>
      <button onClick={signOutRedirect}>Sign out (Cognito)</button>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {result && (
        <div>
          <h3>Result:</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default App;
