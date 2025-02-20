import React from "react";
import { Navigate } from "react-router-dom";

const PrivateRoute = ({ children }) => {
  // Check for the authenticated user in session storage
  const user = sessionStorage.getItem("user");

  // If user is not authenticated, redirect to login page
  return user ? children : <Navigate to="/login" />;
};

export default PrivateRoute;
