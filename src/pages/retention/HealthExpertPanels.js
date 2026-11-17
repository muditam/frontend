import React, { useState } from 'react';
import OutreachForm, { CallTracker } from './HealthExpertOutreach';

export const workspaceTabs = ['☎ Sales', '✚ Doctor', '♧ Dietitian', '◷ Activity timeline'];
export function Journey({ lead }) {
  const milestones = lead?.workspaceMilestones || {};
  const coachPurchased = Boolean(lead?.healthExpertCoachPurchase?.confirmedAt);
  const doctor = lead?.healthExpertDoctor?.data;
  const decision = doctor?.decision || milestones.clinicalDecision;
  const steps = [
    { title: 'Sales · Coach', completed: coachPurchased, status: coachPurchased ? 'Purchased' : 'Not recorded' },
    { title: 'Doctor', completed: decision === 'Approved', status: decision === 'Approved' ? 'Kit approved'
      : decision === 'Not suitable' ? 'No kit recommended'
        : (doctor ? Boolean(doctor.doctorNote) : milestones.doctorConsultationRecorded) ? 'Consultation recorded' : 'Not recorded' },
    // Existing orders and a saved assessment are not proof of kit payment or a shared diet plan.
    { title: 'Sales · Kit sale', completed: false, status: 'Not recorded' },
    { title: 'Dietitian', completed: false, status: lead?.healthExpertDietAssessment?.updatedAt || milestones.dietAssessmentCompleted ? 'Assessment recorded' : 'Not recorded' },
  ];
  return <div className="he-journey">{steps.map((step, index) => (
    <div className={`he-journey-step${step.completed ? ' he-journey-complete' : ''}`} key={step.title}>
      <small>{step.completed ? '✓ COMPLETE' : `STEP 0${index + 1}`}</small>
      <b>{step.title}</b><span>{step.status}</span>
    </div>
  ))}</div>;
}
export function Pitch({ type = 'sales' }) {
  const [message, setMessage] = useState('');
  const content = {
    sales: { pill: '01 · Guided call pitch', title: 'Sugar Control Coach — sales conversation', lines: [
      ['Opening', 'Hello, I’m calling from Sugar Control about your recent online order. Is this a convenient time for a short conversation?'],
      ['Understand', 'What is your biggest challenge with managing your diabetes day to day?'],
      ['Introduce', 'Our Sugar Control Coach helps bring your doctor consultation and personalized food guidance into a coordinated journey, making diabetes management easier.'],
      ['Close', 'Would you like me to explain the program and help you get started?'],
    ] },
    doctor: { pill: '02 · Doctor consultation guide', title: 'Standardized doctor opening', lines: [
      ['', 'With your permission I’ll review your medical history, current treatment and recent blood reports to understand your needs.'],
      ['', 'Please share your latest HbA1c, fasting and after-meal readings if available. I’ll also check your ongoing medication, allergies and medical conditions that may affect product suitability.'],
      ['', 'Please continue prescribed treatment unless your treating clinician advises otherwise.'],
    ] },
    diet: { pill: '04 · Dietitian consultation guide', title: 'Personalized diet consultation', lines: [
      ['', 'I’ll help create a practical food routine based on your preferences, schedule, eating habits and your doctor’s advice.'],
      ['', 'May I ask about your regular meals, allergies, food choices, physical activity and any challenges in following a meal plan?'],
      ['', 'I’ll review the proposed routine with you and share the final version after personalizing it.'],
    ] },
  }[type];
  const copy = async () => {
    try { await navigator.clipboard.writeText(content.lines.map(([label, text]) => `${label ? `${label}: ` : ''}${text}`).join('\n\n')); setMessage('Copied'); }
    catch { setMessage('Could not copy. Select the text to copy it.'); }
  };
  return <div className={`he-pitch he-pitch-${type}`}><div className="he-between"><div><span className="he-pill he-blue">{content.pill}</span><h3>{content.title}</h3></div><button className="he-button he-outline he-small" onClick={copy}>Copy pitch</button></div>{content.lines.map(([label, text], index) => <p key={index}>{label && <b>{label}: </b>}{text}</p>)}{type === 'sales' && <small>Do not promise a cure, guaranteed glucose outcomes, or replace the customer’s existing medical care.</small>}<span role="status">{message}</span></div>;
}
export function SalesPanel({ lead, display, onSaved }) {
  const doctor = lead.healthExpertDoctor;
  const approvedKit = doctor?.data
    ? (doctor.data.decision === 'Approved' ? { items: doctor.data.kit || [], approvedBy: doctor.by, approvedAt: doctor.updatedAt } : null)
    : lead.healthExpertApprovedKit;
  const decision = doctor?.data?.decision || lead.workspaceMilestones?.clinicalDecision || (approvedKit ? 'Approved' : 'Pending');
  const kitApproved = decision === 'Approved' && Boolean(approvedKit);
  const decisionLabel = kitApproved ? '✓ Doctor approved' : decision === 'Not suitable' ? 'Kit not clinically suitable' : 'Awaiting doctor sign-off';
  return <>
    <div className="he-section-title he-between"><div><h2>Sales workspace</h2><p>Owner: {display(lead.agentAssigned)} · First conversion + doctor-approved kit closing</p></div><span className="he-pill he-blue">{lead.workspaceAccess?.canLogCalls ? 'Assigned Sales Expert' : 'Read only'}</span></div>
    {!lead.workspaceAccess?.canLogCalls && <div className="he-note he-warning">Sales outreach can only be edited by the assigned Sales Agent.</div>}
    <div className="he-grid"><Pitch /><CallTracker lead={lead} /></div>
    <OutreachForm key={lead._id} lead={lead} onSaved={onSaved} readOnly={!lead.workspaceAccess?.canLogCalls} />
    <section className="he-subpanel he-block"><div className="he-between"><div><h3>2. Supplement pricing & closure</h3><p className="he-help">Sales takes over after the doctor has reviewed and approved the product selection.</p></div><span className={`he-pill ${kitApproved ? 'he-green' : 'he-amber'}`}>{decisionLabel}</span></div>{!kitApproved && <div className="he-note he-warning">{decision === 'Not suitable' ? 'The doctor has marked this kit as not clinically suitable.' : 'Waiting for the doctor to approve the product selection.'}</div>}<div className="he-grid he-block"><div className="he-subpanel"><h3>Doctor-approved kit</h3>{kitApproved ? <>
      {approvedKit.approvedBy && <p className="he-help">Approved by {approvedKit.approvedBy}{approvedKit.approvedAt && ` · ${new Date(approvedKit.approvedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`}</p>}
      {approvedKit.items.map((item, index) => <div className="he-subpanel he-block" key={index}><div className="he-between"><strong>{item.name}</strong><span className="he-pill">Qty {item.quantity}</span></div>{item.instructions && <p className="he-help" style={{ whiteSpace: 'pre-wrap' }}>{item.instructions}</p>}</div>)}
      {!approvedKit.items.length && <p className="he-empty">No approved kit items recorded.</p>}
    </> : <div className="he-empty">{decision === 'Not suitable' ? 'No kit approved for this customer.' : 'Waiting for doctor’s decision'}</div>}<div className="he-help">Latest ordered products: {display(lead.productsOrdered)}</div></div><div><div className="he-fields"><label>Latest order amount<input readOnly value={lead.amountPaid == null ? 'Not recorded' : `₹${Number(lead.amountPaid).toLocaleString('en-IN')}`} /></label><label>Payment method<input readOnly value={display(lead.modeOfPayment)} /></label><label>Offer / discount<select disabled defaultValue=""><option value="">{kitApproved ? 'Not selected' : 'Awaiting doctor sign-off'}</option>{[0, 5, 10, 15, 20].map((discount) => <option key={discount} value={discount}>{discount}%</option>)}</select></label><label>Customer quote<input readOnly value="Not recorded" /></label><label>Kit payment status<input readOnly value="Not recorded" /></label></div><div className="he-actionstrip"><button className="he-button he-light" disabled>Send quote</button><button className="he-button" disabled>✓ Confirm payment</button></div></div></div></section>
  </>;
}

export function ClinicalSummary({ type, lead }) {
  const diet = type === 'diet';
  const cards = diet ? [
    ['Diet assessment', lead.workspaceMilestones?.dietAssessmentCompleted ? 'Completed' : 'Pending'],
    ['Diet plan', 'Not recorded'],
    ['Shared with customer', 'Not recorded'],
  ] : [
    ['Consultation', lead.workspaceMilestones?.doctorConsultationRecorded ? 'Recorded' : 'Pending'],
    ['Blood reports', lead.workspaceMilestones?.reportStatus || 'Not requested'],
    ['Clinical decision', lead.workspaceMilestones?.clinicalDecision || 'Pending'],
  ];
  return <section className="he-inner">
    <div className="he-section-title he-between he-summary-heading"><div><h2>{diet ? 'Dietitian workspace' : 'Doctor workspace'}</h2><p>{diet ? 'Diet pitch · assessment · personalized plan · sharing' : 'Medical consultation · lab reports · kit sign-off'}</p></div><span className={`he-pill ${diet ? 'he-green' : 'he-blue'}`}>{diet ? 'Dietitian' : 'Doctor'}</span></div>
    <div className="he-milestone-grid">{cards.map(([label, status], index) => <div className={`he-milestone-card ${diet ? 'he-diet-card' : ''} ${status === 'Completed' ? 'he-completed' : ''}`} key={label}><span className="he-milestone-number">0{index + 1}</span><p>{label}</p><h2>{status}</h2></div>)}</div>
  </section>;
}
