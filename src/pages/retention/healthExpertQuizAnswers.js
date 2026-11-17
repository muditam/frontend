export const quizQuestionVisible = (question, answers) => (question.conditions || []).every(
  condition => condition.operator === 'equals' && answers[condition.field] === condition.value
);
export function buildQuizSubmission(questions, answers, profile, version) {
  const result = { firstName: profile.name, age: profile.age, gender: profile.gender, profile, assessmentVersion: version };
  for (const question of questions) {
    if (!quizQuestionVisible(question, result)) continue;
    const keys = question.type === 'body_metrics' ? ['heightCm', 'weightKg'] : question.type === 'glucose_metrics' ? ['fbsValue', 'ppbsValue'] : [question.key];
    for (const key of keys) if (answers[key] !== undefined && answers[key] !== '') result[key] = answers[key];
  }
  return result;
}
