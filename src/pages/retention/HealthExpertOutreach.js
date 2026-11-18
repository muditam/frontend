import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import CoachCheckoutDialog from './CoachCheckoutDialog';

const outcomes = ['No answer', 'Connected – interested', 'Connected – not interested', 'Call back requested', 'Wrong number', 'Language'];
const api = axios.create({ baseURL: (process.env.REACT_APP_API_BASE_URL || '').replace(/\/+$/, ''), withCredentials: true });
const dayKey = (value) => new Date(new Date(value).getTime() + 330 * 60000).toISOString().slice(0, 10);

export function CallHistory({ lead }) {
  return <>{lead.healthExpertCoachPurchase?.confirmedAt && <article><span className="he-pill">{new Date(lead.healthExpertCoachPurchase.confirmedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</span><h3>Coach purchase confirmed</h3><p>{lead.healthExpertCoachPurchase.shopifyOrderName ? `Shopify order ${lead.healthExpertCoachPurchase.shopifyOrderName} · Prepaid · ` : 'Manually confirmed · '}{lead.healthExpertCoachPurchase.by}</p></article>}{[...(lead.healthExpertOutreach?.calls || [])].reverse().map((call) => <article key={call.requestId}>
    <span className="he-pill">{new Date(call.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</span><h3>{call.outcome}</h3><p>{call.note || 'No notes added'}</p><small>{call.by} · Next follow-up: {call.nextFollowupDate || 'Not set'}</small>
  </article>)}</>;
}

export function CallTracker({ lead }) {
  const calls = lead.healthExpertOutreach?.calls || [];
  const startedAt = lead.healthExpertOutreach?.startedAt;
  const today = dayKey(new Date());
  const start = startedAt ? dayKey(startedAt) : null;
  const elapsed = start ? Math.floor((Date.parse(today) - Date.parse(start)) / 86400000) : 0;
  return <div className="he-subpanel"><div className="he-between"><div><h3>7-day call tracker</h3><p className="he-help">{start ? `Started ${start} · First logged attempt · IST` : 'Starts with the first logged call attempt'}</p></div><span className="he-pill he-blue">{!start ? 'Not started' : elapsed >= 7 ? 'Window ended' : `Day ${elapsed + 1} of 7`}</span></div>
    <div className="he-seven">{Array.from({ length: 7 }, (_, i) => {
      const key = start ? new Date(Date.parse(start) + i * 86400000).toISOString().slice(0, 10) : null;
      const daily = key ? calls.filter((call) => dayKey(call.createdAt) === key) : [];
      const latest = daily[daily.length - 1];
      const label = latest?.outcome || (!start ? 'Not started' : key > today ? 'Upcoming' : 'No log');
      return <div key={i} className={`${latest ? latest.outcome.startsWith('Connected') ? 'he-call-hit' : 'he-call-attempt' : ''} ${key === today ? 'he-call-today' : ''}`} title={`${key || ''} · ${label} · ${daily.length} attempts`}><b>DAY {i + 1}</b><span>{label.replace('Connected – ', '')}</span>{daily.length > 0 && <small>{daily.length} call{daily.length > 1 ? 's' : ''}</small>}</div>;
    })}</div><div className="he-statrow"><div><small>Total call attempts</small><strong>{calls.length}</strong></div><div><small>Connected calls</small><strong>{calls.filter((call) => call.outcome.startsWith('Connected')).length}</strong></div><div><small>Coach status</small><strong className="he-coach-status">{lead.healthExpertCoachPurchase?.confirmedAt ? 'Purchased' : 'Not recorded'}</strong></div></div>
  </div>;
}

export default function OutreachForm({ lead, onSaved, readOnly = false }) {
  const purchased = Boolean(lead.healthExpertCoachPurchase?.confirmedAt);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [outcome, setOutcome] = useState('No answer');
  const [nextFollowupDate, setNextFollowupDate] = useState(/^\d{4}-\d{2}-\d{2}$/.test(lead.rtNextFollowupDate || '') ? lead.rtNextFollowupDate : '');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingDate, setSavingDate] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const requestId = useRef(null);
  const busy = useRef(false);
  useEffect(() => {
    setNextFollowupDate(/^\d{4}-\d{2}-\d{2}$/.test(lead.rtNextFollowupDate || '') ? lead.rtNextFollowupDate : '');
  }, [lead.rtNextFollowupDate]);
  const saveFollowup = async (event) => {
    const value = event.target.value;
    if (busy.current || readOnly || value === nextFollowupDate) return;
    const previous = nextFollowupDate;
    busy.current = true;
    setNextFollowupDate(value);
    setSavingDate(true); setError(''); setSuccess('');
    requestId.current = null;
    try {
      const { data } = await api.put(`/api/health-expert/leads/${lead._id}/followup`, { nextFollowupDate: value });
      onSaved(data.item);
      setSuccess(value ? 'Follow-up date saved.' : 'Follow-up date cleared.');
    } catch (err) {
      setNextFollowupDate(previous);
      setError(err.response?.data?.message || 'Could not save follow-up date. Please select the date again to retry.');
    } finally { busy.current = false; setSavingDate(false); }
  };
  const change = (setter) => (event) => { setter(event.target.value); requestId.current = null; setSuccess(''); };
  const save = async (event) => {
    event.preventDefault();
    if (busy.current || readOnly) return;
    busy.current = true;
    setSaving(true); setError(''); setSuccess('');
    requestId.current ||= window.crypto.randomUUID();
    try {
      const { data } = await api.post(`/api/health-expert/leads/${lead._id}/calls`, { requestId: requestId.current, outcome, note, nextFollowupDate });
      onSaved(data.item);
      setNote(''); requestId.current = null; setSuccess('Call attempt saved.');
    } catch (err) { setError(err.response?.data?.message || 'Could not save the call attempt. Please retry.'); }
    finally { busy.current = false; setSaving(false); }
  };
  return <form className="he-subpanel he-block" onSubmit={save}><div className="he-between"><div><h3>1. Record sales outreach</h3><p className="he-help">Log every attempt and schedule the next follow-up.</p></div><span className={`he-pill ${purchased ? 'he-green' : 'he-amber'}`}>{purchased ? '✓ Coach purchased' : 'Coach status not recorded'}</span></div><fieldset disabled={saving || savingDate || readOnly} className="he-outreach-fields"><div className="he-fields"><label>Call outcome<select value={outcome} onChange={change(setOutcome)}>{outcomes.map((value) => <option key={value}>{value}</option>)}</select></label><label>Next follow-up date<input type="date" value={nextFollowupDate} onChange={saveFollowup} />{savingDate && <small role="status">Saving follow-up date…</small>}</label><label>Call notes<textarea rows={3} maxLength={4000} value={note} onChange={change(setNote)} placeholder="What did the customer say?" /></label><label>Sugar Control Coach<input readOnly value={purchased ? 'Purchased' : 'Purchase not recorded'} /></label></div><div className="he-actionstrip"><span>Call logs are timestamped and attributed to the logged-in expert.</span><button className="he-button he-light" type="submit">{saving ? 'Saving…' : '+ Log call attempt'}</button><button className="he-button" type="button" disabled={purchased} onClick={() => { setError(''); setConfirmOpen(true); }}>{purchased ? '✓ Coach purchased' : '✓ Confirm coach purchase'}</button></div></fieldset>{error && <div className="he-error" role="alert">{error}</div>}{success && <p className="he-save-success" role="status">{success}</p>}{confirmOpen && <CoachCheckoutDialog key={lead._id} lead={lead} onClose={() => setConfirmOpen(false)} onSaved={onSaved} />}</form>;
}
