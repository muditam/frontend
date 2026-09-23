import React from "react";
import { Navigate } from "react-router-dom";

const PermissionRoute = ({ permissionKey, children, fallback = "/403" }) => {
  const storedUser = sessionStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const menubarPerms = user?.permissions?.menubar || {};
  const role = String(user?.role || "").trim().toLowerCase().replace(/[\s_]+/g, "-");
  const roleAllowed =
    permissionKey === "retentionOverviewCombined" &&
    ["retention-agent", "team-leader"].includes(role);
  const allowed = roleAllowed || Boolean(menubarPerms?.[permissionKey]);

  if (!allowed) {
    return <Navigate to={fallback} replace />;
  }

  return children;
};

export default PermissionRoute;
