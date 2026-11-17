import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function HealthExpertActivity({ leadId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setItems([]);
    axios.get(`${(process.env.REACT_APP_API_BASE_URL || '').replace(/\/+$/, '')}/api/health-expert/leads/${leadId}/activity`, { withCredentials: true, signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setItems(data.items); })
      .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Could not load workspace activity'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [leadId, attempt]);
  return <>
    {loading && <p role="status">Loading saved workspace activity…</p>}
    {error && <p role="alert">{error} <button type="button" className="he-button he-outline" onClick={() => setAttempt(value => value + 1)}>Retry</button></p>}
    {items.map((item, index) => <article key={`${item._id || item.at}-${index}`}>
      <span className="he-pill">{new Date(item.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</span>
      <h3>{item.action}</h3><p>{item.by || 'User not recorded'}{item.role ? ` · ${item.role}` : ''}</p>
    </article>)}
  </>;
}
