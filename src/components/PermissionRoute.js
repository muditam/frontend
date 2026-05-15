import React from "react";
import { Navigate } from "react-router-dom";

const PermissionRoute = ({ permissionKey, children, fallback = "/" }) => {
  const storedUser = sessionStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const menubarPerms = user?.permissions?.menubar || {};
  const allowed = Boolean(menubarPerms?.[permissionKey]);

  if (!allowed) {
    return <Navigate to={fallback} replace />;
  }

  return children;
};

export default PermissionRoute;
