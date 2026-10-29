import React, { useCallback, useEffect, useState } from "react";
import "./CustomerActionQueuePage.css";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || `Request failed (${response.status})`);
  return body;
}

export default function CustomerActionQueuePage() {
  const [items, setItems] = useState([]);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [persistenceEnabled, setPersistenceEnabled] = useState(false);

  const loadQueue = useCallback(async () => {
    try {
      const body = await api("/api/customer-actions?status=pending_approval&limit=100");
      setItems(body.items || []);
      setPersistenceEnabled(Boolean(body.persistenceEnabled));
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  const analyze = async (persist) => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const body = await api("/api/customer-actions/analyze", {
        method: "POST",
        body: JSON.stringify({ limit: 50, lookbackDays: 120, persist }),
      });
      setPreview(body.recommendations || []);
      setMessage(
        persist
          ? `${body.persistence.inserted} new actions added; ${body.persistence.existing} already existed.`
          : `Dry run analyzed ${body.analyzedCustomers} customers and found ${body.recommendations.length} recommendations.`
      );
      if (persist) await loadQueue();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const review = async (id, decision) => {
    setError("");
    try {
      await api(`/api/customer-actions/${id}/review`, {
        method: "PATCH",
        body: JSON.stringify({ decision }),
      });
      setItems((current) => current.filter((item) => item._id !== id));
      setMessage(`Action ${decision}. Nothing was sent or executed.`);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const cards = items.length ? items : preview;
  const isPreview = !items.length && preview.length > 0;

  return (
    <main className="customer-actions-page">
      <header className="customer-actions-header">
        <div>
          <p className="customer-actions-eyebrow">Local automation lab</p>
          <h1>Recommended customer actions</h1>
          <p>Rule-based drafts only. No WhatsApp message or follow-up is executed from this page.</p>
        </div>
        <div className="customer-actions-buttons">
          <button disabled={loading} onClick={() => analyze(false)}>{loading ? "Analyzing…" : "Run dry analysis"}</button>
          <button className="primary" disabled={loading || !persistenceEnabled} onClick={() => analyze(true)}>Save recommendations</button>
        </div>
      </header>

      {!persistenceEnabled && <div className="customer-actions-warning">Persistence is off. Set CUSTOMER_ACTIONS_ALLOW_PERSIST=true in the local backend only when you are ready to test approvals.</div>}
      {message && <div className="customer-actions-message">{message}</div>}
      {error && <div className="customer-actions-error">{error}</div>}
      {isPreview && <h2>Dry-run preview</h2>}

      <section className="customer-actions-grid">
        {cards.map((item) => (
          <article className="customer-action-card" key={item._id || item.fingerprint}>
            <div className="customer-action-topline">
              <span className={`action-type ${item.type}`}>{item.type.replaceAll("_", " ")}</span>
              <span className={`priority ${item.priority}`}>{item.priority}</span>
            </div>
            <h3>{item.customerName || "Unnamed customer"}</h3>
            <p>{item.reason}</p>
            <dl>
              <div><dt>Order</dt><dd>{item.sourceOrder?.orderId || "—"}</dd></div>
              <div><dt>Order age</dt><dd>{item.evidence?.orderAgeDays ?? "—"} days</dd></div>
              <div><dt>Confidence</dt><dd>{Math.round((item.confidence || 0) * 100)}%</dd></div>
              <div><dt>Suggested</dt><dd>{item.proposedAction?.templateIntent?.replaceAll("_", " ") || "—"}</dd></div>
            </dl>
            {!isPreview && (
              <div className="customer-action-controls">
                <button onClick={() => review(item._id, "rejected")}>Reject</button>
                <button className="primary" onClick={() => review(item._id, "approved")}>Approve draft</button>
              </div>
            )}
          </article>
        ))}
        {!cards.length && !loading && <div className="customer-actions-empty">No recommendations yet. Run a dry analysis to preview candidates.</div>}
      </section>
    </main>
  );
}
