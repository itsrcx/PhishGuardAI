import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);

  const scanUrl = async () => {
    const res = await axios.post('https://429qv9l0ib.execute-api.us-east-1.amazonaws.com/api', { url });
    setResult(res.data);
  };

  return (
    <div style={{ padding: 30 }}>
      <h1>PhishGuard AI</h1>
      <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Enter URL" />
      <button onClick={scanUrl}>Scan</button>
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
