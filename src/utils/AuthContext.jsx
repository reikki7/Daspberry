import React, { createContext, useState, useContext, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [tokens, setTokens] = useState(() => {
    const savedTokens = localStorage.getItem("authTokens");
    return savedTokens ? JSON.parse(savedTokens) : null;
  });

  useEffect(() => {
    if (tokens) {
      localStorage.setItem("authTokens", JSON.stringify(tokens));
    } else {
      localStorage.removeItem("authTokens");
    }
  }, [tokens]);

  return (
    <AuthContext.Provider value={{ tokens, setTokens }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
