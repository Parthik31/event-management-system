/* eslint react-refresh/only-export-components: off */
import React, { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import api, { getCachedApi } from '../utils/Axios';

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
  userCity: localStorage.getItem('eventbook_city') || 'Mumbai',
};

const AuthContext = createContext(initialState);

const authReducer = (state, action) => {
  switch (action.type) {
    case 'USER_LOADED':
      return { ...state, user: action.payload, isAuthenticated: true, loading: false };
    case 'LOGIN_SUCCESS':
    case 'REGISTER_SUCCESS':
      return { ...state, user: action.payload, isAuthenticated: true, loading: false, error: null };
    case 'AUTH_ERROR':
    case 'LOGIN_FAIL':
    case 'REGISTER_FAIL':
    case 'LOGOUT':
      return { ...state, user: null, isAuthenticated: false, loading: false, error: action.payload || null };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SET_CITY':
      localStorage.setItem('eventbook_city', action.payload);
      return { ...state, userCity: action.payload };
    case 'UPDATE_ROLE':
      return { ...state, user: { ...state.user, role: action.payload } };
    case 'SET_USER':
      return { ...state, user: action.payload, isAuthenticated: true, loading: false, error: null };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const bootstrapRef = useRef(false);
  const loadUserPromiseRef = useRef(null);

  const loadUser = async () => {
    if (loadUserPromiseRef.current) {
      return loadUserPromiseRef.current;
    }

    loadUserPromiseRef.current = (async () => {
      try {
        const res = await getCachedApi(
          '/auth/me',
          { skipAuthRedirect: true },
          { cacheTTL: 0, dedupe: true, preferCacheOnError: false }
        );
        dispatch({ type: 'USER_LOADED', payload: res.data.data });
        return { success: true, user: res.data.data };
      } catch {
        dispatch({ type: 'AUTH_ERROR' });
        return { success: false };
      } finally {
        loadUserPromiseRef.current = null;
      }
    })();

    try {
      return await loadUserPromiseRef.current;
    } finally {
      loadUserPromiseRef.current = null;
    }
  };

  useEffect(() => {
    if (bootstrapRef.current) {
      return undefined;
    }

    bootstrapRef.current = true;
    loadUser();

    return undefined;
  }, []);

  const clearError = () => dispatch({ type: 'CLEAR_ERROR' });

  const register = async (formData) => {
    clearError();
    try {
      const { data } = await api.post('/auth/register', formData, { skipAuthRedirect: true });
      dispatch({ type: 'REGISTER_SUCCESS', payload: data.user });
      return { success: true, user: data.user };
    } catch (error) {
      const msg = error.response?.data?.message || 'Registration failed';
      dispatch({ type: 'REGISTER_FAIL', payload: msg });
      return { success: false, message: msg };
    }
  };

  const login = async (formData) => {
    clearError();
    try {
      const { data } = await api.post('/auth/login', formData, { skipAuthRedirect: true });
      dispatch({ type: 'LOGIN_SUCCESS', payload: data.user });
      return { success: true, user: data.user };
    } catch (error) {
      const msg = error.response?.data?.message || 'Invalid credentials';
      dispatch({ type: 'LOGIN_FAIL', payload: msg });
      return { success: false, message: msg };
    }
  };

  const logout = async () => {
    try {
      await api.get('/auth/logout');
    } catch (error) {
      console.error('Logout Error', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        register,
        login,
        logout,
        loadUser,
        clearError,
        setUserCity: (city) => dispatch({ type: 'SET_CITY', payload: city }),
        updateUserRole: (role) => dispatch({ type: 'UPDATE_ROLE', payload: role }),
        setAuthUser: (user) => dispatch({ type: 'SET_USER', payload: user })
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
