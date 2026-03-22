import { API_URL } from '../config';

/**
 * A secure wrapper around the fetch API that automatically handles:
 * 1. Attaching the JWT access token to requests
 * 2. Transparently refreshing tokens when a 401 is encountered
 * 3. Consistent error handling
 */
export const authFetch = async (url, options = {}) => {
  const getStorage = () => localStorage.getItem('refresh_token') ? localStorage : sessionStorage;
  const storage = getStorage();
  
  let accessToken = storage.getItem('access_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
    ...options.headers,
  };

  try {
    let response = await fetch(url, { ...options, headers });

    // Handle token expiry (401 Unauthorized)
    if (response.status === 401) {
      const refreshToken = storage.getItem('refresh_token');
      
      if (refreshToken) {
        // Attempt to refresh
        const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          // Save new tokens
          storage.setItem('access_token', data.access_token);
          storage.setItem('refresh_token', data.refresh_token);
          
          // Retry the original request with the new token
          headers['Authorization'] = `Bearer ${data.access_token}`;
          return fetch(url, { ...options, headers });
        } else {
          // Refresh failed - logout (clear storage and redirect)
          storage.removeItem('access_token');
          storage.removeItem('refresh_token');
          storage.removeItem('medilink_user');
          window.location.href = '/login';
        }
      }
    }

    return response;
  } catch (error) {
    console.error('[authFetch] Error:', error);
    throw error;
  }
};
