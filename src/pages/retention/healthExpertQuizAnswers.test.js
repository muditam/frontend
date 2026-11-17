import { buildQuizSubmission } from './healthExpertQuizAnswers';

const questions = [
  { key: 'diagnosis', type: 'single_select' },
  { key: 'duration', type: 'single_select', conditions: [{ field: 'diagnosis', operator: 'equals', value: 'Type 2 Diabetes' }] },
  { key: 'hba1cKnown', type: 'single_select' },
  { key: 'hba1cValue', type: 'number', conditions: [{ field: 'hba1cKnown', operator: 'equals', value: 'Yes' }] },
  { key: 'glucose', type: 'glucose_metrics', conditions: [{ field: 'hba1cKnown', operator: 'equals', value: 'No' }] },
  { key: 'gestational', type: 'single_select', conditions: [{ field: 'gender', operator: 'equals', value: 'Female' }] },
];
const profile = { name: 'Example', age: 45, gender: 'Male' };
test('sends only active quiz branch answers and drops obsolete fields', () => {
  const result = buildQuizSubmission(questions, { diagnosis: 'Prediabetes', duration: '3–5 years', hba1cKnown: 'No', hba1cValue: 7, fbsValue: 120, ppbsValue: 180, gestational: 'Yes', obsolete: 'old value' }, profile, 'v1');
  expect(result).toMatchObject({ fbsValue: 120, ppbsValue: 180, profile });
  for (const key of ['duration', 'hba1cValue', 'gestational', 'obsolete']) expect(result).not.toHaveProperty(key);
});
test('uses current gender and switches to the HbA1c branch', () => {
  const result = buildQuizSubmission(questions, { hba1cKnown: 'Yes', hba1cValue: 7, fbsValue: 120, ppbsValue: 180, gestational: 'No' }, { ...profile, gender: 'Female' }, 'v1');
  expect(result.hba1cValue).toBe(7);
  expect(result.gestational).toBe('No');
  expect(result).not.toHaveProperty('fbsValue');
  expect(result).not.toHaveProperty('ppbsValue');
});
