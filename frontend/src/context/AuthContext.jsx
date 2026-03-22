import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import { API_URL } from '../config'

// Set base URL once so all relative-path axios calls hit the correct backend
axios.defaults.baseURL = API_URL

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('medilink_user') || sessionStorage.getItem('medilink_user')
    return savedUser ? JSON.parse(savedUser) : null
  })
  
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
    if (savedToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`
    }
    return savedToken
  })

  // Set base URL once so all relative-path axios calls hit the correct backend
  useEffect(() => {
    axios.defaults.baseURL = API_URL
    
    // Axios response interceptor for refresh token logic
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          const storage = localStorage.getItem('refresh_token') ? localStorage : sessionStorage;
          const refreshToken = storage.getItem('refresh_token');
          
          if (refreshToken) {
            try {
              const res = await axios.post('/auth/refresh', { refresh_token: refreshToken });
              const { access_token, refresh_token } = res.data;
              
              storage.setItem('access_token', access_token);
              storage.setItem('refresh_token', refresh_token);
              setToken(access_token);
              
              axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
              originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
              return axios(originalRequest);
            } catch (refreshErr) {
              logout();
              return Promise.reject(refreshErr);
            }
          } else {
            logout();
          }
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
  }, [token])

  const login = (tokenData, userData, rememberMe = false) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    
    setToken(tokenData.access_token)
    setUser(userData)
    
    storage.setItem('access_token', tokenData.access_token)
    storage.setItem('refresh_token', tokenData.refresh_token)
    storage.setItem('medilink_user', JSON.stringify(userData))
    
    axios.defaults.headers.common['Authorization'] = `Bearer ${tokenData.access_token}`
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('medilink_user')
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('refresh_token')
    sessionStorage.removeItem('medilink_user')
    delete axios.defaults.headers.common['Authorization']
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
