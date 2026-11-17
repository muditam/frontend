import React, { useRef, useState } from 'react';
import axios from 'axios';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert } from '@mui/material';
import { Pitch } from './HealthExpertPanels';
import HealthExpertKitQuiz from './HealthExpertKitQuiz';
import { suggestedKitItems } from './healthExpertQuizAnswers';
const defaults = { reportStatus: 'Not requested', reportUrl: '', reportKey: '', reportName: '', age: '', gender: '', duration: '', hba1c: '', fasting: '', pp: '', medications: '', allergies: 'Unknown', kidney: 'Unknown', pregnancy: 'Not applicable', comorbidities: '', symptoms: '', doctorNote: '', kit: [], kitNote: '', reviewMeds: false, reviewTests: false, reviewContra: false, decision: 'Pending' };
const base = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/+$/, '');
export default function DoctorWorkspace({ lead, onSaved }) {
  const [draft, setDraft] = useState(() => ({ ...defaults, age: lead.details?.age ?? '', gender: lead.details?.gender || '', duration: lead.details?.durationOfDiabetes || '', hba1c: lead.details?.hba1c ?? '', fasting: lead.details?.fastingSugar ?? '', pp: lead.details?.ppSugar ?? '', medications: (lead.details?.currentMedications || []).join(', '), symptoms: (lead.details?.symptoms || []).join(', '), ...lead.healthExpertDoctor?.data,
    ...(lead.healthExpertKitQuiz?.answers ? {
      age: lead.healthExpertKitQuiz.answers.age,
      gender: lead.healthExpertKitQuiz.answers.gender,
      duration: lead.healthExpertKitQuiz.answers.duration || lead.healthExpertKitQuiz.answers.diagnosis || '',
    } : {}),
    // Restore the latest suggestion unless a consultation saved afterwards contains the doctor's edits.
    ...(!lead.healthExpertDoctor?.data?.kit || new Date(lead.healthExpertKitQuiz?.generatedAt || 0) > new Date(lead.healthExpertDoctor?.updatedAt || 0) ? {
      kit: suggestedKitItems(lead.healthExpertKitQuiz?.recommendation), decision: 'Pending',
    } : {}),
  }));
  const [version, setVersion] = useState(lead.healthExpertDoctor?.version || 0);
  const [uploading, setUploading] = useState(false);
  const [viewUrl, setViewUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const busy = useRef(false);
  const eligible = Boolean(lead.healthExpertCoachPurchase?.confirmedAt);
  const change = (key, value) => { setDraft(current => ({ ...current, [key]: value, decision: 'Pending' })); setMessage(''); };
  const save = async (decision = 'Pending', changes = {}, confirmed = false) => {
    if (busy.current || !eligible) return;
    if (decision !== 'Pending' && !confirmed) {
      setError(''); setConfirmation({ decision, changes }); return;
    }
    busy.current = true; setSaving(true); setError(''); setMessage('');
    try {
      const { data } = await axios.put(`${(process.env.REACT_APP_API_BASE_URL || '').replace(/\/+$/, '')}/api/health-expert/leads/${lead._id}/doctor`, { ...draft, ...changes, decision, version }, { withCredentials: true });
      setDraft(data.item.healthExpertDoctor.data); setVersion(data.item.healthExpertDoctor.version); onSaved(data.item); setMessage('Consultation saved.'); setConfirmation(null);
    } catch (err) { setError(err.response?.data?.message || 'Could not save consultation.'); }
    finally { busy.current = false; setSaving(false); }
  };
  const uploadReport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || busy.current) return;
    if (!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 15 * 1024 * 1024) { setError('Choose a PDF, JPG, PNG or WebP report up to 15 MB'); return; }
    busy.current = true; setUploading(true); setError(''); setViewUrl('');
    try {
      const { data } = await axios.post(`${base}/api/health-expert/leads/${lead._id}/report`, { name: file.name, type: file.type, size: file.size }, { withCredentials: true });
      await axios.put(data.uploadUrl, file, { headers: { 'Content-Type': file.type, 'x-amz-acl': 'private' }, withCredentials: false });
      const changes = { reportKey: data.key, reportName: file.name, reportUrl: '', reportStatus: 'Received' };
      setDraft(current => ({ ...current, ...changes, decision: 'Pending' }));
      busy.current = false;
      await save('Pending', changes);
    } catch (err) { setError(err.response?.data?.message || 'Report upload failed. Please retry.'); }
    finally { busy.current = false; setUploading(false); }
  };
  const viewReport = async () => {
    setError('');
    try {
      const { data } = await axios.get(`${base}/api/health-expert/leads/${lead._id}/report`, { withCredentials: true });
      setViewUrl(data.url);
    } catch (err) { setError(err.response?.data?.message || 'Save the uploaded report before viewing it.'); }
  };
  const field = (key, label, type = 'text') => <label key={key}>{label}{Array.isArray(type) ? <select value={draft[key]} onChange={e => change(key, e.target.value)}>{type.map(option => <option key={option} value={option}>{option || 'Select…'}</option>)}</select> : type === 'textarea' ? <textarea rows={3} maxLength={4000} value={draft[key]} onChange={e => change(key, e.target.value)} /> : <input type={type} min={type === 'number' ? '0' : undefined} step="any" maxLength={4000} value={draft[key]} onChange={e => change(key, type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value)} />}</label>;
  const kitChange = (index, key, value) => change('kit', draft.kit.map((item, i) => i === index ? { ...item, [key]: value } : item));
  const assessmentSaved = (item, { applySuggestion = true } = {}) => {
    const answers = item.healthExpertKitQuiz.answers;
    if (applySuggestion) setDraft(current => ({ ...current, age: answers.age, gender: answers.gender,
      duration: answers.duration || answers.diagnosis || '', hba1c: answers.hba1cValue ?? '',
      fasting: answers.fbsValue ?? '', pp: answers.ppbsValue ?? '',
      symptoms: (answers.symptoms || []).join(', '), comorbidities: (answers.conditions || []).join(', '),
      kit: suggestedKitItems(item.healthExpertKitQuiz.recommendation),
      decision: 'Pending',
    }));
    onSaved(item);
  };
  return <section className="he-inner">
    <Dialog open={Boolean(confirmation)} onClose={() => { if (!busy.current) setConfirmation(null); }} disableEscapeKeyDown={saving} fullWidth maxWidth="sm" aria-labelledby="kit-decision-title">
      <DialogTitle id="kit-decision-title">{confirmation?.decision === 'Approved' ? 'Approve kit' : 'Mark kit not suitable'}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <p>{confirmation?.decision === 'Approved' ? 'Are you sure you want to approve this kit for ' : 'Are you sure you want to mark this kit as not clinically suitable for '}<strong>{lead.name || 'this customer'}</strong>?</p>
        {confirmation?.decision === 'Approved' && draft.kit.length > 0 && <ul>{draft.kit.map((item, index) => <li key={index}>{item.name || 'Unnamed product'} · Quantity {item.quantity}</li>)}</ul>}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button disabled={saving} onClick={() => setConfirmation(null)}>Cancel</Button>
        <Button variant="contained" disabled={saving || !eligible || !confirmation} onClick={() => save(confirmation.decision, confirmation.changes, true)}>{saving ? 'Saving…' : confirmation?.decision === 'Approved' ? 'Yes, approve kit' : 'Yes, mark not suitable'}</Button>
      </DialogActions>
    </Dialog>
    <Dialog open={Boolean(viewUrl)} onClose={() => setViewUrl('')} fullWidth maxWidth="lg"><DialogTitle>Blood report</DialogTitle><DialogContent><iframe title="Blood report preview" src={viewUrl || undefined} style={{ width: '100%', height: '70vh', border: 0 }} /></DialogContent><DialogActions><Button component="a" href={viewUrl} target="_blank" rel="noreferrer">Open in new tab</Button><Button onClick={() => setViewUrl('')}>Close</Button></DialogActions></Dialog><div className="he-section-title"><h2>Doctor workspace</h2><p>Reports · consultation · support kit review</p></div><Pitch type="doctor" />
    {!eligible && <div className="he-note he-warning">Consultation editing opens after the coach purchase is confirmed.</div>}
    {error && !confirmation && <div role="alert" className="he-error">{error}</div>}{message && <p role="status" className="he-save-success">{message}</p>}
    <fieldset className="he-outreach-fields" disabled={!eligible || saving || uploading}>
      <section className="he-subpanel he-block"><div className="he-between"><div><h3>1. Blood reports & consultation checklist</h3><p className="he-help">Upload a PDF or image report, then record its review status.</p></div><span className="he-pill he-amber">{draft.reportStatus}</span></div><div className="he-report-row"><span>Report: <strong>{draft.reportName || 'No attachment selected'}</strong></span><div className="he-actions"><input type="file" aria-label="Choose blood report" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={uploadReport} />{draft.reportKey && <button className="he-button he-outline he-small" onClick={viewReport}>View report</button>}{['Requested', 'Received', 'Reviewed'].map(status => <button key={status} className={`he-button he-small ${draft.reportStatus === status ? '' : 'he-outline'}`} onClick={() => save('Pending', { reportStatus: status })}>{status === 'Requested' ? 'Request' : status}</button>)}</div></div>{uploading && <p role="status">Uploading report…</p>}<div className="he-note">Verify patient identity and report dates. Mark Reviewed only after personally checking the report.</div></section>
      <section className="he-subpanel he-block"><div className="he-between"><div><h3>2. Doctor questionnaire</h3><p className="he-help">Complete the Kit Dashboard assessment to suggest a support kit.</p></div><span className="he-pill">Patient assessment</span></div>
        <HealthExpertKitQuiz lead={lead} draft={draft} onProfileChange={change} onSaved={assessmentSaved} />
      </section>
      <section className="he-subpanel he-block"><div className="he-between"><h3>3. Ready-to-review support kit</h3><span className="he-pill">{draft.decision}</span></div><p className="he-help">Review the support kit for this customer before approval.</p><div className="he-grid he-block"><div className="he-subpanel"><h3>Suggested support kit · editable</h3><p className="he-help">Save the assessment above to populate these items automatically. Review and edit quantities and instructions before saving or approving the kit.</p>
        {!draft.kit.length && <p className="he-empty">No kit selected for review yet.</p>}
        {draft.kit.map((item, index) => <div className="he-subpanel he-block" key={`${item.name}-${index}`}><div className="he-fields"><label>Product name<input value={item.name} maxLength={200} onChange={e => kitChange(index, 'name', e.target.value)} /></label><label>Quantity<input type="number" min="1" max="100" value={item.quantity} onChange={e => kitChange(index, 'quantity', Number(e.target.value))} /></label><label>Instructions<textarea rows={2} maxLength={1000} value={item.instructions} onChange={e => kitChange(index, 'instructions', e.target.value)} /></label></div><button className="he-button he-outline he-small" onClick={() => change('kit', draft.kit.filter((_, i) => i !== index))}>Remove item</button></div>)}
        <div className="he-actionstrip"><button className="he-button he-outline" disabled={draft.kit.length >= 20} onClick={() => change('kit', [...draft.kit, { name: '', quantity: 1, instructions: '' }])}>+ Add kit item</button></div>
        </div><div className="he-subpanel"><h3>Clinical safety gate</h3><p className="he-help">All must be reviewed before approval.</p><div className="he-review-checks">{[['reviewMeds', 'Current medicines and interactions reviewed'], ['reviewTests', 'Available reports and health context reviewed'], ['reviewContra', 'Allergies, contraindications and suitability reviewed']].map(([key, label]) => <label key={key}><input type="checkbox" checked={draft[key]} onChange={e => change(key, e.target.checked)} /> {label}</label>)}</div>
        <div className="he-fields">{field('medications', 'Medication history / doses', 'textarea')}{field('allergies', 'Drug / supplement allergies', ['Unknown', 'No', 'Yes'])}{field('kidney', 'Kidney or liver issues', ['Unknown', 'No', 'Yes'])}{field('pregnancy', 'Pregnant / breastfeeding', ['Not applicable', 'Unknown', 'No', 'Yes'])}{field('doctorNote', 'Doctor consultation notes (optional for approval)', 'textarea')}{field('kitNote', 'Clinical rationale and patient-specific instructions', 'textarea')}</div>
        </div></div><p className="he-help">Approval requires age, gender, diabetes duration, medication history, kit rationale, a reviewed blood report, and all review checks. Enter “None” in medication history if the patient reports no medication. Marking a kit not suitable requires consultation notes and kit rationale.</p><div className="he-actionstrip"><button className="he-button he-light" onClick={() => save()}>Save draft kit</button><button className="he-button he-outline" onClick={() => save('Not suitable')}>Kit not clinically suitable</button><button className="he-button" disabled={draft.decision === 'Approved'} onClick={() => save('Approved')}>{draft.decision === 'Approved' ? '✓ Approved' : 'Approve kit'}</button></div>
      </section>
    </fieldset>{saving && <p role="status">Saving consultation…</p>}
  </section>;
}
