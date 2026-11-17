import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { buildQuizSubmission } from './healthExpertQuizAnswers';

const api = axios.create({ baseURL: (process.env.REACT_APP_API_BASE_URL || '').replace(/\/+$/, ''), withCredentials: true });
const allowedGender = new Set(['Male', 'Female', 'Other']);

const isVisible = (question, answers) => (question.conditions || []).every((condition) => (
  condition.operator === 'equals' && answers[condition.field] === condition.value
));

function Question({ question, answers, setAnswer }) {
  const value = answers[question.key];
  if (question.type === 'body_metrics') return <div className="he-quiz-pair">
    <label>Height (cm)<input type="number" min={question.validation?.heightMin} max={question.validation?.heightMax} value={answers.heightCm ?? ''} onChange={(event) => setAnswer('heightCm', event.target.value === '' ? '' : Number(event.target.value))} /></label>
    <label>Weight (kg)<input type="number" min={question.validation?.weightMin} max={question.validation?.weightMax} value={answers.weightKg ?? ''} onChange={(event) => setAnswer('weightKg', event.target.value === '' ? '' : Number(event.target.value))} /></label>
  </div>;
  if (question.type === 'glucose_metrics') return <div className="he-quiz-pair">
    <label>Fasting Blood Sugar (mg/dL)<input type="number" min={question.validation?.min} max={question.validation?.max} value={answers.fbsValue ?? ''} onChange={(event) => setAnswer('fbsValue', event.target.value === '' ? '' : Number(event.target.value))} /></label>
    <label>Post-meal Blood Sugar (mg/dL)<input type="number" min={question.validation?.min} max={question.validation?.max} value={answers.ppbsValue ?? ''} onChange={(event) => setAnswer('ppbsValue', event.target.value === '' ? '' : Number(event.target.value))} /></label>
  </div>;
  if (question.type === 'multi_select') {
    const selected = Array.isArray(value) ? value : [];
    const toggle = (option) => {
      if (option === question.exclusiveOption) return setAnswer(question.key, selected.includes(option) ? [] : [option]);
      const withoutExclusive = selected.filter((item) => item !== question.exclusiveOption);
      setAnswer(question.key, withoutExclusive.includes(option) ? withoutExclusive.filter((item) => item !== option) : [...withoutExclusive, option]);
    };
    return <div className="he-quiz-options">{(question.options || []).map((option) => <label key={String(option.value)}><input type="checkbox" checked={selected.includes(option.value)} onChange={() => toggle(option.value)} /><span>{option.label}</span></label>)}</div>;
  }
  if (question.type === 'single_select') return <select value={value ?? ''} onChange={(event) => setAnswer(question.key, event.target.value)}><option value="">Select…</option>{(question.options || []).map((option) => <option key={String(option.value)} value={option.value}>{option.label}</option>)}</select>;
  if (['number', 'slider'].includes(question.type)) return <input type="number" min={question.validation?.min} max={question.validation?.max} step={question.validation?.step || 'any'} value={value ?? ''} onChange={(event) => setAnswer(question.key, event.target.value === '' ? '' : Number(event.target.value))} />;
  return <input value={value ?? ''} maxLength={Math.min(question.validation?.maxLength || 500, 500)} placeholder={question.placeholder || ''} onChange={(event) => setAnswer(question.key, event.target.value)} />;
}

export default function HealthExpertKitQuiz({ lead, draft, onSaved, onProfileChange }) {
  const savedQuiz = lead.healthExpertKitQuiz;
  const [questions, setQuestions] = useState([]);
  const [version, setVersion] = useState(savedQuiz?.version || 'final-quiz-v1');
  const [answers, setAnswers] = useState(() => ({
    ...(savedQuiz?.answers || {}),
    heightCm: savedQuiz?.answers?.heightCm ?? lead.details?.height ?? '',
    weightKg: savedQuiz?.answers?.weightKg ?? lead.details?.weight ?? '',
    duration: savedQuiz?.answers?.duration ?? draft.duration ?? '',
    hba1cValue: savedQuiz?.answers?.hba1cValue ?? draft.hba1c ?? '',
    fbsValue: savedQuiz?.answers?.fbsValue ?? draft.fasting ?? '',
    ppbsValue: savedQuiz?.answers?.ppbsValue ?? draft.pp ?? '',
  }));
  const [recommendation, setRecommendation] = useState(savedQuiz?.recommendation || null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [questionError, setQuestionError] = useState('');
  const [questionAttempt, setQuestionAttempt] = useState(0);
  const busy = useRef(false);
  const latestInput = useRef('');
  const [suggestionInput, setSuggestionInput] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setQuestionError('');
    api.get('/api/health-expert/kit-quiz', { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(data.questions) || !data.questions.length) throw new Error('No active Kit Dashboard questions are available.');
        setQuestions(data.questions); setVersion(data.version);
      })
      .catch((requestError) => { if (!controller.signal.aborted) setQuestionError(requestError.response?.data?.message || 'Could not load Kit Dashboard questions.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [questionAttempt]);

  const profileAnswers = useMemo(() => buildQuizSubmission(questions, answers, {
    name: lead.name || '', age: draft.age, gender: draft.gender,
  }, version), [questions, answers, draft.age, draft.gender, lead.name, version]);
  const inputKey = JSON.stringify(profileAnswers);
  latestInput.current = inputKey;
  const savedInput = savedQuiz?.answers && buildQuizSubmission(questions, savedQuiz.answers, {
    name: savedQuiz.answers.firstName, age: savedQuiz.answers.age, gender: savedQuiz.answers.gender,
  }, savedQuiz.version);
  const suggestionCurrent = !loading && (suggestionInput || JSON.stringify(savedInput)) === inputKey;
  const visibleQuestions = questions.filter((question) => isVisible(question, profileAnswers));
  const sections = [...new Set(visibleQuestions.map((question) => question.section?.label || 'Assessment'))];
  const result = suggestionCurrent ? recommendation?.recommendation : null;
  const guarded = recommendation?.safety?.blocked || recommendation?.safety?.doctorReferral || recommendation?.constraints?.unsatisfied;

  const setAnswer = (key, value) => { setAnswers((current) => ({ ...current, [key]: value })); setRecommendation(null); setError(''); };
  const generate = async () => {
    if (busy.current || loading || !questions.length) return;
    if (!allowedGender.has(draft.gender)) return setError('Select Male, Female, or Other in the Doctor questionnaire before generating a kit suggestion.');
    busy.current = true;
    const submittedInput = inputKey;
    setGenerating(true); setError('');
    try {
      const { data } = await api.post(`/api/health-expert/leads/${lead._id}/kit-recommendation`, { version, answers: profileAnswers });
      const applySuggestion = latestInput.current === submittedInput;
      onSaved(data.item, { applySuggestion });
      if (applySuggestion) {
        setRecommendation(data.item.healthExpertKitQuiz.recommendation);
        setSuggestionInput(submittedInput);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not generate the kit suggestion.');
    } finally { busy.current = false; setGenerating(false); }
  };

  return <div className="he-kit-quiz">
    <div className="he-fields">
      <label>Age (years)<input type="number" min="1" max="120" value={draft.age} onChange={event => onProfileChange('age', event.target.value === '' ? '' : Number(event.target.value))} /></label>
      <label>Gender<select value={draft.gender} onChange={event => onProfileChange('gender', event.target.value)}><option value="">Select…</option>{['Male', 'Female', 'Other'].map(value => <option key={value}>{value}</option>)}</select></label>
    </div>
    {loading ? <p role="status" className="he-empty">Loading Kit Dashboard questions…</p> : sections.map((section) => <section className="he-quiz-section" key={section}><h4>{section}</h4><div className="he-quiz-grid">{visibleQuestions.filter((question) => (question.section?.label || 'Assessment') === section).map((question) => <div className="he-quiz-question" key={question.key}><span>{question.question}{question.required && ' *'}</span>{question.why && <small>{question.why}</small>}<Question question={question} answers={answers} setAnswer={setAnswer} /></div>)}</div></section>)}
    {questionError && <div className="he-error" role="alert">{questionError} <button type="button" className="he-button he-light" disabled={loading} onClick={() => setQuestionAttempt(attempt => attempt + 1)}>Retry</button></div>}
    {error && <div className="he-error" role="alert">{error}</div>}
    <div className="he-actionstrip"><button type="button" className="he-button" disabled={loading || generating || !questions.length} onClick={generate}>{generating ? 'Saving assessment and finding kit…' : 'Save assessment & suggest kit'}</button></div>
    {recommendation && !suggestionCurrent && <p className="he-help">Generate a new suggestion after changing the assessment answers.</p>}
    {recommendation && suggestionCurrent && <p role="status" className="he-help">{guarded ? (recommendation.safety?.messages?.[0] || 'Clinical review required. No active kit satisfies the current safety and mandatory rules.') : result ? 'Suggested items are ready below in Suggested support kit · editable.' : 'No active kit matched these answers.'}</p>}
  </div>;
}
