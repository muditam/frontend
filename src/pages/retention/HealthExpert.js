import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import PhoneIcon from '@mui/icons-material/Phone';
import { openZoomPhoneDialer } from '../../utils/zoomPhoneDialer';
import './HealthExpert.css';
import { Journey, Pitch, SalesPanel, ClinicalSummary, workspaceTabs } from './HealthExpertPanels';
import DietAssessment from './HealthExpertAssessment';
import DoctorWorkspace from './HealthExpertDoctor';
import { CallHistory } from './HealthExpertOutreach';

const api = axios.create({ baseURL: (process.env.REACT_APP_API_BASE_URL || '').replace(/\/+$/, ''), withCredentials: true });
const CreateDietPlanPopup = lazy(() => import('./CreateDietPlanPopup'));
const tabs = workspaceTabs;
const display = (value) => Array.isArray(value) ? value.join(', ') || 'Not recorded' : value === undefined || value === null || value === '' ? 'Not recorded' : String(value);
const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
const customerStatus = (lead = {}) => {
  const value = String(lead.retentionStatus || '').trim().toLowerCase().replace(/[\s_-]+/g, ' ');
  if (value === 'lost') return 'Lost';
  if (value === 'no call' || value === 'nocall') return 'No Call';
  return 'Active';
};
const customerStage = (lead = {}) => {
  if (lead.workspaceMilestones?.dietAssessmentCompleted) return 'Dietitian · Diet plan';
  if (lead.workspaceMilestones?.clinicalDecision === 'Approved') return 'Sales · Supplement sale';
  if (lead.workspaceMilestones?.clinicalDecision === 'Not suitable') return 'Clinical review · No kit';
  if (lead.healthExpertCoachPurchase?.confirmedAt) return 'Doctor · Consultation';
  const calls = lead.healthExpertOutreach?.calls || [];
  if (calls.length) {
    const started = lead.healthExpertOutreach?.startedAt && new Date(lead.healthExpertOutreach.startedAt);
    const day = started && !Number.isNaN(started.getTime())
      ? Math.max(1, Math.min(7, Math.floor((Date.now() - started.getTime()) / 86400000) + 1))
      : 1;
    return `Day ${day} · ${calls.length} attempt${calls.length === 1 ? '' : 's'}`;
  }
  return 'Sales · Outreach pending';
};
const date = (value) => {
  if (!value) return 'Not set';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
export default function HealthExpert() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const listRef = useRef(null);
  const sentinelRef = useRef(null);
  const loadMoreRef = useRef(() => {});
  const [result, setResult] = useState({ items: [], total: 0, hasMore: false });
  const [selectedId, setSelectedId] = useState('');
  const [dietPlanCustomer, setDietPlanCustomer] = useState(null);
  const [tab, setTab] = useState(tabs[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [calling, setCalling] = useState(false);
  const [callTrackingMessage, setCallTrackingMessage] = useState('');
  const callBusy = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search.trim()); }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const controller = new AbortController();
    let busy = false;
    let nextPage = 1;
    let hasMore = true;
    setResult({ items: [], total: 0, hasMore: false });
    if (listRef.current) listRef.current.scrollTop = 0;
    const load = async () => {
      if (busy || !hasMore || controller.signal.aborted) return;
      busy = true;
      setLoading(true);
      setError('');
      const requestedPage = nextPage;
      try {
        const { data } = await api.get('/api/health-expert/leads', {
          params: { search: query, status, page: requestedPage }, signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        hasMore = data.hasMore;
        nextPage = requestedPage + 1;
        setResult((current) => {
          const existing = requestedPage === 1 ? [] : current.items;
          const ids = new Set(existing.map((item) => item._id));
          return { ...data, items: [...existing, ...data.items.filter((item) => !ids.has(item._id))] };
        });
        if (requestedPage === 1) setSelectedId((current) => data.items.some((item) => item._id === current) ? current : data.items[0]?._id || '');
      } catch (err) {
        if (!controller.signal.aborted) setError(err.response?.data?.message || 'Could not load customers. Please retry.');
      } finally {
        busy = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    loadMoreRef.current = load;
    load();
    return () => controller.abort();
  }, [query, status]);
  useEffect(() => {
    if (loading || error || !result.hasMore || !sentinelRef.current) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadMoreRef.current();
    }, { root: listRef.current, rootMargin: '150px' });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loading, error, result.hasMore, result.items.length]);
  const lead = result.items.find((item) => item._id === selectedId);
  const access = lead?.workspaceAccess || {};
  const defaultTab = access.defaultTab || 0;
  useEffect(() => {
    setTab(tabs[defaultTab]);
    setCallTrackingMessage('');
  }, [selectedId, defaultTab]);
  const notes = [...(lead?.rtSubcells || [])].reverse();
  const callCustomer = async () => {
    const customer = lead;
    const number = String(customer?.contactNumber || '').trim();
    if (!number || callBusy.current) return;
    callBusy.current = true;
    setCalling(true);
    setCallTrackingMessage('');
    let dialNumber = number;
    const intentRequest = api.post('/api/zoom/call-intents', {
        leadId: String(customer._id), phoneNumber: number, sourcePage: '/health-expert',
        sourceContext: { customerName: String(customer.name || ''), retentionStatus: String(customer.retentionStatus || '') },
      });
    const trackerRequest = access.canLogCalls
      ? api.post(`/api/health-expert/leads/${customer._id}/call-starts`, { requestId: window.crypto.randomUUID() })
      : Promise.resolve(null);
    const [intentResult, trackerResult] = await Promise.allSettled([intentRequest, trackerRequest]);
    if (intentResult.status === 'fulfilled') dialNumber = intentResult.value.data?.dialNumberE164 || number;
    if (access.canLogCalls && trackerResult.status === 'fulfilled') {
      const tracked = trackerResult.value.data.item;
      setResult((current) => ({ ...current, items: current.items.map((item) => item._id === customer._id ? { ...item, ...tracked } : item) }));
      setCallTrackingMessage('Call added to the 7-day tracker.');
    } else if (access.canLogCalls) {
      setCallTrackingMessage(trackerResult.reason?.response?.data?.message || 'Zoom opened, but the call tracker could not be updated.');
    }
    try { openZoomPhoneDialer(dialNumber); }
    finally { callBusy.current = false; setCalling(false); }
  };


  return <div className="he-workspace">
    {dietPlanCustomer && <Suspense fallback={<div role="status">Opening diet plan…</div>}><CreateDietPlanPopup
      open
      onClose={() => setDietPlanCustomer(null)}
      prefillCustomer={dietPlanCustomer}
    /></Suspense>}
    {error && <div className="he-error" role="alert">{error}</div>}
    <div className="he-layout">
      <aside className="he-sidebar">
        <div className="he-between"><h2>Customers</h2><span className="he-pill">{loading && !result.items.length ? '…' : result.total.toLocaleString('en-IN')}</span></div>
        <input className="he-search" aria-label="Search customers by name or phone" placeholder="Search name or phone…" value={search} onChange={(event) => setSearch(event.target.value)} />
        <div className="he-filters">{['All', 'Active', 'Lost', 'No Call'].map((value) => <button key={value} aria-pressed={status === value} className={status === value ? 'selected' : ''} onClick={() => setStatus(value)}>{value}</button>)}</div>
        <div className="he-customers" ref={listRef} aria-busy={loading}>
          {result.items.map((item) => <button key={item._id} className={`he-customer ${item._id === selectedId ? 'selected' : ''}`} onClick={() => { setSelectedId(item._id); setTab(tabs[0]); }} aria-pressed={item._id === selectedId}>
            <span className="he-avatar">{initials(item.name)}</span>
            <span className="he-customer-info"><b>{item.name || 'Unnamed customer'}</b><small>{customerStage(item)}</small></span>
            <span className={`he-customer-status he-status-${customerStatus(item).toLowerCase().replace(' ', '-')}`}>{customerStatus(item)}</span>
          </button>)}
          {!loading && !error && !result.items.length && <p className="he-empty">No customers match this view.</p>}
          <div ref={sentinelRef} className="he-scroll-status">
            {loading && <span role="status">Loading customers…</span>}
            {error && <button className="he-button he-outline" onClick={() => loadMoreRef.current()}>Retry loading</button>}
            {!loading && !error && result.items.length > 0 && <span>{result.items.length} of {result.total.toLocaleString('en-IN')} customers{!result.hasMore ? ' · All loaded' : ''}</span>}
          </div>
        </div>
      </aside>
      <main className="he-main">
        {lead ? <>
          <section className="he-panel">
            <div className="he-profile"><div><span className="he-eyebrow">CUSTOMER JOURNEY / {lead.orderId || 'ORDER NOT RECORDED'}</span><div className="he-profile-name"><span className="he-big-avatar">{initials(lead.name)}</span><div><div className="he-name-row"><h2>{lead.name || 'Unnamed customer'}</h2><button type="button" className="he-call-button" onClick={callCustomer} disabled={calling || !lead.contactNumber} aria-label={`Call ${lead.name || 'customer'} using Zoom Phone`} title={calling ? 'Opening Zoom Phone…' : 'Call with Zoom Phone'}><PhoneIcon fontSize="small" /></button></div>{callTrackingMessage && <small className="he-call-tracking-message" role="status">{callTrackingMessage}</small>}<div className="he-badges"><span className="he-pill">{lead.contactNumber || 'No phone recorded'}</span><span className="he-pill">{lead.leadSource || 'Source not recorded'}</span><span className="he-pill">Expert: {display(lead.healthExpertAssigned)}</span></div></div></div></div>
              <div className="he-actions"><span className="he-pill he-blue">{lead.retentionStatus || 'Active'}</span><button className="he-button he-outline" onClick={() => setTab(tabs[3])}>Activity history</button></div>
            </div>
            <Journey lead={lead} /><div className="he-between he-footer"><small>Same customer profile · controlled access</small><span className="he-pill he-green">● Assigned customer records</span></div>
          </section>
          <section className="he-panel he-workspace-panel">
          <div className="he-role-note"><span className="he-pill he-blue">{{ sales: 'Sales Expert view', retention: 'Retention Agent view', doctor: 'Doctor view' }[access.view] || 'Read only'}</span></div>
          <nav className="he-tabs" aria-label="Customer sections">{tabs.map((value) => <button key={value} aria-pressed={tab === value} className={tab === value ? 'selected' : ''} onClick={() => setTab(value)}>{value}</button>)}</nav>
          {tab === tabs[0] && <SalesPanel lead={lead} display={display} onSaved={(item) => setResult((current) => ({ ...current, items: current.items.map((row) => row._id === item._id ? { ...row, ...item } : row) }))} />}
          {tab === tabs[1] && !access.canViewHealth && <ClinicalSummary type="doctor" lead={lead} />}
          {tab === tabs[1] && access.canViewHealth && <DoctorWorkspace key={lead._id} lead={lead} onSaved={(item) => setResult((current) => ({ ...current, items: current.items.map((row) => row._id === item._id ? { ...row, ...item } : row) }))} />}
          {tab === tabs[2] && !access.canViewDiet && <ClinicalSummary type="diet" lead={lead} />}
          {tab === tabs[2] && access.canViewDiet && <section className="he-inner"><div className="he-section-title"><h2>Dietitian workspace</h2><p>Diet pitch · assessment · personalized plan · sharing</p></div><Pitch type="diet" /><DietAssessment key={lead._id} lead={lead} onSaved={(item) => setResult((current) => ({ ...current, items: current.items.map((row) => row._id === item._id ? { ...row, ...item } : row) }))} /><div className="he-subpanel he-block"><h3>2. Ready-to-personalize diet plan</h3><p className="he-help">Open the existing diet-plan workflow to create, review and share a personalized plan.</p><div className="he-actionstrip"><button className="he-button" onClick={() => setDietPlanCustomer({ name: lead.name || '', phone: lead.contactNumber || '', leadId: lead._id })}>Open diet plan</button></div></div></section>}
          {tab === tabs[3] && <section className="he-panel"><div className="he-section-title"><h2>Activity & expert notes</h2><p>Saved retention notes and follow-up records.</p></div><div className="he-timeline"><CallHistory lead={lead} />{notes.map((note, index) => <article key={note._id || index}><span className="he-pill">{date(note.date)}</span><h3>{note.by || 'Expert note'}</h3><p>{display(note.value)}</p></article>)}{(lead.followUps || []).map((followup, index) => <article key={followup._id || `follow-${index}`}><span className="he-pill">{date(followup.date)}</span><h3>Follow-up</h3><p>{display(followup.note)}</p><small>Fasting: {display(followup.currentSugar?.fasting)} · PP: {display(followup.currentSugar?.pp)}</small></article>)}{!lead.healthExpertCoachPurchase?.confirmedAt && !notes.length && !lead.followUps?.length && !lead.healthExpertOutreach?.calls?.length && <p className="he-empty">No notes or follow-ups recorded yet.</p>}</div></section>}
          </section>
        </> : <section className="he-panel he-empty">{loading ? 'Loading customer workspace…' : 'Select a customer to view their details.'}</section>}
      </main>
    </div>
  </div>;
}
