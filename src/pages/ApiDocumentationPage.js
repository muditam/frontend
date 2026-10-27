import React, { useEffect, useMemo, useState } from "react";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import "./ApiDocumentationPage.css";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");
const WRITE_METHODS_ENABLED =
  String(process.env.REACT_APP_API_DOCS_ALLOW_WRITES || "false").toLowerCase() === "true";

function ApiDocumentationPage() {
  const [specification, setSpecification] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadSpecification() {
      try {
        setError("");
        const response = await fetch(`${API_BASE}/api/api-docs/openapi.json`, {
          credentials: "include",
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body.message || body.error || "Unable to load API documentation.");
        }
        const runtimeBackendUrl = API_BASE || window.location.origin;
        setSpecification({
          ...body,
          servers: [
            {
              url: runtimeBackendUrl,
              description: API_BASE ? "Configured LMS backend" : "Current LMS origin",
            },
          ],
        });
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setError(requestError.message || "Unable to load API documentation.");
        }
      }
    }

    loadSpecification();
    return () => controller.abort();
  }, []);

  const supportedSubmitMethods = useMemo(
    () =>
      WRITE_METHODS_ENABLED
        ? ["get", "post", "put", "patch", "delete"]
        : ["get"],
    []
  );

  const requestInterceptor = (request) => {
    request.credentials = "include";
    return request;
  };

  return (
    <main className="api-docs-page">
      <section className="api-docs-banner">
        <div>
          <p className="api-docs-eyebrow">Engineering reference</p>
          <h1>LMS API Documentation</h1>
          <p>
            OpenAPI 3.1 documentation generated from the current Express routes.
            Operations marked <strong>skeleton</strong> still need field-level contract review.
          </p>
        </div>
        <div className={`api-docs-mode ${WRITE_METHODS_ENABLED ? "write" : "safe"}`}>
          {WRITE_METHODS_ENABLED ? "Write testing enabled" : "Safe mode: GET testing only"}
        </div>
      </section>

      {error && (
        <section className="api-docs-error" role="alert">
          <h2>Documentation unavailable</h2>
          <p>{error}</p>
          <p>Run <code>npm run docs:generate</code> in the backend and refresh this page.</p>
        </section>
      )}

      {!error && !specification && (
        <section className="api-docs-loading">Loading the OpenAPI specification...</section>
      )}

      {specification && (
        <section className="api-docs-swagger">
          <SwaggerUI
            spec={specification}
            deepLinking
            displayRequestDuration
            docExpansion="none"
            filter
            persistAuthorization={false}
            requestInterceptor={requestInterceptor}
            supportedSubmitMethods={supportedSubmitMethods}
            tryItOutEnabled={false}
          />
        </section>
      )}
    </main>
  );
}

export default ApiDocumentationPage;
