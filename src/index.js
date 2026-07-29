import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios'; 
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { Provider } from 'react-redux';
import store from './app/store';

axios.defaults.withCredentials = true;

const originalFetch = window.fetch.bind(window);
const configuredApiBase = (process.env.REACT_APP_API_BASE_URL || "").trim();
const configuredApiOrigin = (() => {
  try {
    return configuredApiBase ? new URL(configuredApiBase).origin : "";
  } catch {
    return "";
  }
})();

const redirectAuthenticatedUserOnForbidden = (status) => {
  if (
    status === 403 &&
    sessionStorage.getItem("user") &&
    window.location.pathname !== "/403"
  ) {
    window.location.assign("/403");
  }
};

window.fetch = (input, init = {}) => {
  try {
    const requestUrl =
      typeof input === "string" || input instanceof URL ? String(input) : input.url;
    const target = new URL(requestUrl, window.location.origin);
    const isConfiguredApi = configuredApiOrigin && target.origin === configuredApiOrigin;
    const isMuditamHerokuApi =
      target.protocol === "https:" &&
      /^muditamleads(?:-[a-z0-9]+)?\.herokuapp\.com$/i.test(target.hostname);

    if (isConfiguredApi || isMuditamHerokuApi) {
      return originalFetch(input, {
        ...init,
        credentials: init.credentials || "include",
      }).then((response) => {
        redirectAuthenticatedUserOnForbidden(response.status);
        return response;
      });
    }
  } catch {
    // Preserve the browser's normal fetch behavior for non-URL inputs.
  }

  return originalFetch(input, init);
};

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    redirectAuthenticatedUserOnForbidden(error?.response?.status);

    return Promise.reject(error);
  }
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);

reportWebVitals();
