// frontend/src/utils/api.js

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    // Get response text first
    const text = await response.text();
    
    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      // If not JSON, it might be HTML
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        console.error('Received HTML instead of JSON:', text.substring(0, 200));
        throw new Error('Server returned HTML instead of JSON. Check ngrok headers.');
      }
      throw new Error(`Invalid response format: ${text.substring(0, 100)}`);
    }

    // If response is not OK (including 409 Conflict), throw the message from server
    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
    
  } catch (error) {
    console.error('API fetch error:', error);
    throw error;
  }
};

export default apiFetch;