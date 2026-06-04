import React from "react";
import { Navigate } from "react-router-dom";
import { canAccessCallingCenterManagerDashboard } from "../utils/managerRoles";

const ManagerRoute = ({ children }) => {
  const storedUser = sessionStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;


  if (!user) {
    return <Navigate to="/login" replace />;
  }


  if (!canAccessCallingCenterManagerDashboard(user)) {
    return <Navigate to="/403" replace />;
  }


  return children;
};


export default ManagerRoute;
