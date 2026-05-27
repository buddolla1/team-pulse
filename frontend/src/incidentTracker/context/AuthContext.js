import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getProfile, login as loginRequest } from '../services/authService';

const IncidentAuthContext = createContext(null);

export const IncidentAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const token = sessionStorage.getItem('incident_tracker_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const profile = await getProfile();
        setUser(profile);
      } catch (error) {
        sessionStorage.removeItem('incident_tracker_token');
        localStorage.removeItem('incident_tracker_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user),
    login: async (payload) => {
      const response = await loginRequest(payload);
      sessionStorage.setItem('incident_tracker_token', response.token);
      setUser(response.user);
      return response.user;
    },
    logout: () => {
      sessionStorage.removeItem('incident_tracker_token');
      localStorage.removeItem('incident_tracker_token');
      setUser(null);
    },
  }), [loading, user]);

  return (
    <IncidentAuthContext.Provider value={value}>
      {children}
    </IncidentAuthContext.Provider>
  );
};

export const useIncidentAuth = () => useContext(IncidentAuthContext);
