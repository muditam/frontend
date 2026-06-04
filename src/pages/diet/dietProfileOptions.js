export const HEALTH_CONDITION_OPTIONS = [
  { value: 'hypertension', label: 'High blood pressure' },
  { value: 'anemia', label: 'Anemia' },
  { value: 'thyroid', label: 'Hypothyroidism' },
  { value: 'liverDisease', label: 'Fatty Liver' },
  { value: 'inflammation', label: 'Inflammation' },
  { value: 'calciumDeficiency', label: 'Calcium Deficiency' },
  { value: 'proteinDeficiency', label: 'Protein Deficiency' },
  { value: 'vitaminDDeficiency', label: 'Vitamin D Deficiency' },
  { value: 'vitaminB12Deficiency', label: 'Vitamin B12 Deficiency' },
  { value: 'uricAcid', label: 'Uric Acid Problem' },
  { value: 'pcos', label: 'PCOS' },
  { value: 'cholesterolHeart', label: 'High Cholestrol/ Heart' },
  { value: 'diabetes', label: 'Diabetes' },
  { value: 'digestionAcidityConstipation', label: 'Digestion / Acidity / Constipation' },
  { value: 'sleepDisorder', label: 'Sleep disorder' },
  { value: 'ironDeficiency', label: 'Iron Deficiency' },
  { value: 'prediabetes', label: 'Prediabetes' },
];

export const HEALTH_CONDITION_LABELS = Object.fromEntries(
  HEALTH_CONDITION_OPTIONS.map(option => [option.value, option.label]),
);

export const ALLERGY_OPTIONS = [
  { value: 'G', label: 'Gluten Allergy' },
  { value: 'N', label: 'Nut allergy' },
  { value: 'E', label: 'Eggs Allergy' },
  { value: 'FI', label: 'Fish Allergy' },
  { value: 'ML', label: 'Milk/Lactose Allergy' },
  { value: 'SY', label: 'Soya Allergy' },
  { value: 'SF', label: 'Sea Food Allergy' },
];

export const ALLERGY_LABELS = Object.fromEntries(
  ALLERGY_OPTIONS.map(option => [option.value, option.label]),
);
