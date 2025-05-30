import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const scanUrl = async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await axios.post('https://429qv9l0ib.execute-api.us-east-1.amazonaws.com/api', { url });
      setResult(res.data);
    } catch (err) {
      setError('Failed to scan URL. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 30 }}>
      <h1>PhishGuard AI</h1>
      <input
        type="text"
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="Enter URL"
      />
      <button onClick={scanUrl} disabled={!url || loading}>
        {loading ? 'Scanning...' : 'Scan'}
      </button>

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
