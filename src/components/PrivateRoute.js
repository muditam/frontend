import React from "react";
import { Navigate } from "react-router-dom";

const PrivateRoute = ({ children }) => {
  // Primary auth source: current tab session
  let user = sessionStorage.getItem("user");

  // New-tab session bridge (short-lived, same-origin only)
  if (!user) {
    try {
      const raw = localStorage.getItem("session:user:bridge");
      if (raw) {
        const payload = JSON.parse(raw);
        const ts = Number(payload?.ts || 0);
        const bridgedUser = payload?.user;
        const ageMs = Date.now() - ts;
        if (bridgedUser && ageMs >= 0 && ageMs <= 2 * 60 * 1000) {
          sessionStorage.setItem("user", JSON.stringify(bridgedUser));
          window.dispatchEvent(new Event("session:user:set"));
          user = sessionStorage.getItem("user");
        }
      }
    } catch {
      // no-op; fall through to login redirect
    }
  }

  // If user is not authenticated, redirect to login page
  return user ? children : <Navigate to="/login" />;
};

export default PrivateRoute;
