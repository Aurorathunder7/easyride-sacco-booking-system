const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const text = await response.text();
    try {
      // Try to parse as JSON
      const data = JSON.parse(text);
      throw new Error(data.message || 'Request failed');
    } catch {
      // If not JSON, it's probably HTML error
      console.error('Received HTML instead of JSON:', text.substring(0, 200));
      throw new Error('Server returned HTML instead of JSON. Check ngrok headers.');
    }
  }

  return response.json();
};

export default apiFetch;