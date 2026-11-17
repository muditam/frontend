import React, { useRef, useState } from 'react';
import axios from 'axios';

const fields = [
  ['dietType', 'Diet type', ['Vegetarian', 'Non-vegetarian', 'Eggetarian', 'Vegan']],
  ['foodPreferences', 'Meal / food preferences', 'text', 'North Indian, South Indian, etc.'],
  ['allergies', 'Food allergies or restrictions', 'text', 'List or None'],
  ['wakeTime', 'Wake-up time', 'time'], ['sleepTime', 'Sleep time', 'time'],
  ['mealTimings', 'Typical meal timings', 'text', '8 AM, 1 PM, 8 PM'],
  ['activity', 'Activity level', ['Sedentary', 'Light', 'Moderate', 'High']],
  ['cooking', 'Cooking preference', ['Home-cooked', 'Mixed', 'Mostly outside']],
  ['schedule', 'Daily schedule', ['Regular', 'Shift work', 'Irregular']],
  ['goal', 'Nutrition goal', ['Balanced daily routine', 'Meal consistency', 'Weight management support', 'Improve food quality']],
  ['notes', 'Other preferences / notes', 'textarea', 'Taste, budget, kitchen access, barriers'],
];
export default function DietAssessment({ lead, onSaved }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map(([key]) => [key, lead.healthExpertDietAssessment?.[key] || ''])));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const busy = useRef(false);
  async function save(event) {
    event.preventDefault();
    if (busy.current || !lead.workspaceAccess?.canViewDiet) return;
    busy.current = true; setSaving(true); setMessage(''); setError('');
    try {
      const { data } = await axios.put(`${(process.env.REACT_APP_API_BASE_URL || '').replace(/\/+$/, '')}/api/health-expert/leads/${lead._id}/diet-assessment`, values, { withCredentials: true });
      onSaved(data.item); setMessage('Assessment saved');
    } catch (err) { setError(err.response?.data?.message || 'Could not save assessment. Please retry.'); }
    finally { busy.current = false; setSaving(false); }
  }
  return <form className="he-subpanel he-block" onSubmit={save}>
    <div className="he-between"><div><h3>1. Diet assessment questionnaire</h3><p className="he-help">Food preferences and routines are stored here so the dietitian does not need to ask twice.</p></div><span className="he-pill">Structured inputs</span></div>
    <fieldset className="he-outreach-fields" disabled={saving || !lead.workspaceAccess?.canViewDiet}><div className="he-fields">{fields.map(([key, label, type, placeholder]) => {
      const props = { value: values[key], onChange: (event) => { setValues({ ...values, [key]: event.target.value }); setMessage(''); }, placeholder };
      return <label key={key}>{label}{Array.isArray(type) ? <select {...props}><option value="">Select…</option>{type.map((option) => <option key={option}>{option}</option>)}</select> : type === 'textarea' ? <textarea {...props} rows={3} maxLength={4000} /> : <input {...props} type={type} maxLength={500} />}</label>;
    })}</div><div className="he-actionstrip"><button className="he-button" type="submit">{saving ? 'Saving…' : 'Save assessment'}</button></div></fieldset>
    {error && <div className="he-error" role="alert">{error}</div>}{message && <p className="he-save-success" role="status">{message}</p>}
  </form>;
}

export function MedicalAssessment({ details }) {
  const entries = [
    ['Age (years)', details.age], ['Gender', details.gender, ['', 'Female', 'Male', 'Other', 'Prefer not to say']],
    ['Diabetes duration', details.durationOfDiabetes], ['HbA1c (%)', details.hba1c],
    ['Fasting glucose (mg/dL)', details.fastingSugar], ['Post-meal glucose (mg/dL)', details.ppSugar],
    ['Current medicines / doses', details.currentMedications, 'textarea'],
    ['Drug / supplement allergies', '', ['', 'Unknown', 'No', 'Yes']],
    ['Kidney or liver issues', '', ['', 'Unknown', 'No', 'Yes']],
    ['Pregnant / breastfeeding', '', ['', 'Not applicable', 'Unknown', 'No', 'Yes']],
    ['Other medical conditions', details.comorbidities], ['Current symptoms / concerns', details.symptoms, 'textarea'],
    ['Doctor consultation notes', '', 'textarea'],
  ];
  return <div className="he-subpanel he-block"><h3>Medical assessment questionnaire</h3><p className="he-help">Read-only clinical details. Doctor consultation editing is not enabled for this login.</p><div className="he-fields">{entries.map(([label, value, type]) => {
    const text = Array.isArray(value) ? value.join(', ') : value ?? '';
    return <label key={label}>{label}{Array.isArray(type) ? <select disabled value={text}>{!type.includes(text) && <option>{text}</option>}{type.map((option) => <option key={option} value={option}>{option || 'Not recorded'}</option>)}</select> : type === 'textarea' ? <textarea readOnly rows={3} value={text} placeholder="Not recorded" /> : <input readOnly value={text} placeholder="Not recorded" />}</label>;
  })}</div></div>;
}
