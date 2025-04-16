import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  TextField,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  Select,
  Typography,
  Autocomplete,
  FormControlLabel,
  Checkbox,
  Tooltip,
} from "@mui/material";
import axios from "axios";

// Options for the consultation form
const currentMedicationsOptions = [
  "Metformin",
  "Glimepiride",
  "Glipizide",
  "Sitagliptin",
  "Liraglutide",
  "Pioglitazone",
  "Canagliflozin",
  "Empagliflozin",
  "Dapagliflozin",
  "Exenatide",
];
const sideEffectsOptions = ["Yes", "No"];
const suddenSugarFluctuationsOptions = ["Yes", "No"];
const symptomsOptions = [
  "Frequent urination",
  "Increased thirst",
  "Increased hunger",
  "Fatigue",
  "Blurred vision",
  "Slow-healing wounds",
  "Unexplained weight loss",
  "Numbness or tingling",
  "Frequent infections",
  "Darkened skin",
];
const familyHistoryOptions = [
  "parents have diabetes",
  "siblings have diabetes",
  "grandparents have diabetes",
  "other relatives have diabetes",
  "no family history of diabetes",
  "Not sure",
];
const otherConditionsOptions = [
  "High Blood Pressure",
  "Diabetes",
  "Thyroid Problems",
  "High Cholesterol",
  "PCOS",
  "Heart Disease",
  "Asthma",
  "Stomach Problems",
  "Joint Pain",
  "Migraines or Headaches",
  "Weight Gain or Obesity",
  "Sleep Problems",
  "Depression or Anxiety",
  "Skin Problems",
  "Kidney Problems",
];
const stressLevelOptions = ["Low", "Medium", "High"];
const monitorBloodSugarOptions = ["Daily", "Weekly", "Monthly", "No"];
const painInLiverOptions = ["Yes", "No"];
const gutIssuesOptions = ["Yes", "No"];
const energyLevelsOptions = ["High", "Moderate", "Low"];
const sleepQualityOptions = ["Good", "Fair", "Poor"];
const sugarCravingsOptions = ["Yes", "No"];
const durationOfDiabetesOptions = [
  "Less than 1 year",
  "1-3 years",
  "4-5 years",
  "6-10 years",
  "More than 10 years",
];

// Checklist items for the call section with tooltips
const checklistItems = [
  {
    label: "Opening & Customer Details",
    key: "openingCustomerDetails",
    tooltip:
      "Namaste Sir, main Dr. Abhay hoon from Muditam Ayurveda. Kaise hai aap. Aapki file dekhi maine “Madhur ji”.",
  },
  {
    label: "Symptom Analysis",
    key: "symptomAnalysis",
    tooltip: "Ask questions as shown in the form.",
  },
  {
    label: "Problem Explanation",
    key: "problemExplanation",
    tooltip:
      "Dekhiye, jo aap abhi medicines le rahe hai usse aapki sugar levels to kam ho jaati hai, par long-term mein side effects ho sakte hai.",
  },
  {
    label: "Solution Explanation",
    key: "solutionExplanation",
    tooltip:
      "Hamara ek diabetes management solution hai. Aapka blood test karwayenge aur supplements ki details share karenge.",
  },
  {
    label: "Diet & Lifestyle Guidance",
    key: "dietLifestyleGuidance",
    tooltip:
      "Aapke liye ek simple diet plan banwa ke share kiya ja sakta hai, ya lifestyle habits suggest kiye ja sakte hai.",
  },
  {
    label: "Closing & Assurance",
    key: "closingAssurance",
    tooltip:
      "Shayan aapke saath touch mein rahega. Kabhi bhi doubt ho to unse sampark karein.",
  },
];

const Consultation = ({ customerId }) => {
  // Form state for consultation fields
  const [formData, setFormData] = useState({
    currentMedications: [],
    sideEffects: "",
    suddenSugarFluctuations: "",
    symptoms: [],
    familyHistory: "",
    otherConditions: [],
    stressLevel: "",
    monitorBloodSugar: "",
    painInLiver: "",
    gutIssues: "",
    energyLevels: "",
    sleepQuality: "",
    sugarCravings: "",
    durationOfDiabetes: "",
  });

  // Call Checklist state
  const [callChecklist, setCallChecklist] = useState({
    openingCustomerDetails: false,
    symptomAnalysis: false,
    problemExplanation: false,
    solutionExplanation: false,
    dietLifestyleGuidance: false,
    closingAssurance: false,
  });

  // State for products recommended (from Closing section)
  const [selectedProducts, setSelectedProducts] = useState([]);

  // Handler for text/select fields
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handler for multi-select fields
  const handleMultiSelectChange = (field, newValue) => {
    setFormData((prev) => ({ ...prev, [field]: newValue }));
  };

  // Handler for checklist changes
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setCallChecklist((prev) => ({ ...prev, [name]: checked }));
  };

  // Handler for product selection toggling
  const handleProductClick = (product) => {
    setSelectedProducts((prev) =>
      prev.includes(product)
        ? prev.filter((p) => p !== product)
        : [...prev, product]
    );
  };

  // On mount, fetch existing consultation data (if available) for the specific customerId
  useEffect(() => {
    if (customerId) {
      axios
        .get(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/consultation-details?customerId=${customerId}`)
        .then((response) => {
          if (response.data && response.data.length > 0) {
            const savedConsultation = response.data[0].consultation;
            if (savedConsultation) {
              setFormData((prev) => ({
                ...prev,
                ...savedConsultation,
              }));
              if (savedConsultation.checklist) {
                setCallChecklist(savedConsultation.checklist);
              }
              if (savedConsultation.selectedProducts) {
                setSelectedProducts(savedConsultation.selectedProducts);
              }
            }
          }
        })
        .catch((error) =>
          console.error("Error fetching consultation details:", error)
        );
    }
  }, [customerId]);

  // Save handler: builds payload with the consultation section and posts to backend
  const handleSubmit = () => {
    if (!customerId) {
      alert("No customer selected. Please select a customer first.");
      return;
    }
    const payload = {
      customerId,
      consultation: {
        ...formData,
        checklist: callChecklist,
        selectedProducts: selectedProducts,
      },
    };

    axios
      .post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/consultation-details", payload)
      .then((response) => { 
        // Refresh consultation data from the backend
        axios
          .get(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/consultation-details?customerId=${customerId}`)
          .then((res) => {
            if (res.data && res.data.length > 0) {
              const savedConsultation = res.data[0].consultation;
              if (savedConsultation) {
                setFormData((prev) => ({ ...prev, ...savedConsultation }));
                if (savedConsultation.checklist) {
                  setCallChecklist(savedConsultation.checklist);
                }
                if (savedConsultation.selectedProducts) {
                  setSelectedProducts(savedConsultation.selectedProducts);
                }
              }
            }
          })
          .catch((err) =>
            console.error("Error refreshing consultation details:", err)
          );
      })
      .catch((error) => {
        console.error("Error saving consultation data:", error);
      });
  };

  const products = [
    "Karela Jamun Fizz",
    "Sugar Defend Pro",
    "Vasant Kusmakar Ras",
    "Liver Fix",
    "Stress & Sleep",
    "Chandraprabha Vati",
    "Heart Defend Pro",
    "Performance Forever",
    "Power Gut",
    "Shilajit with Gold",
    "Nerve Fix",
    "Blood Test",
    "Glucometer",
    "Dumbbells",
  ];

  return (
    <Box sx={{ display: "flex", height: "100%" }}>
      {/* Left Section (80%) – Consultation Form */}
      <Box sx={{ width: "80%", p: 2 }}>
        <Grid container spacing={4}>
          {/* Row 1: Current Medications (Multi-select) */}
          <Grid item xs={4}>
            <Autocomplete
              multiple
              freeSolo
              options={currentMedicationsOptions}
              value={formData.currentMedications}
              onChange={(event, newValue) =>
                handleMultiSelectChange("currentMedications", newValue)
              }
              renderInput={(params) => (
                <TextField {...params} label="Current Medications" size="small" />
              )}
            />
          </Grid>
          <Grid item xs={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Duration of Diabetes</InputLabel>
              <Select
                name="durationOfDiabetes"
                value={formData.durationOfDiabetes}
                label="Duration of Diabetes"
                onChange={handleChange}
              >
                {durationOfDiabetesOptions.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {/* Row 2: Side Effects, Sudden Sugar Fluctuations, Family History */}
          <Grid item xs={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Side Effects</InputLabel>
              <Select
                name="sideEffects"
                value={formData.sideEffects}
                label="Side Effects"
                onChange={handleChange}
              >
                {sideEffectsOptions.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Sudden Sugar Fluctuations</InputLabel>
              <Select
                name="suddenSugarFluctuations"
                value={formData.suddenSugarFluctuations}
                label="Sudden Sugar Fluctuations"
                onChange={handleChange}
              >
                {suddenSugarFluctuationsOptions.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Family History of Diabetes</InputLabel>
              <Select
                name="familyHistory"
                value={formData.familyHistory}
                label="Family History of Diabetes"
                onChange={handleChange}
              >
                {familyHistoryOptions.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Monitor Blood Sugar</InputLabel>
              <Select
                name="monitorBloodSugar"
                value={formData.monitorBloodSugar}
                label="Monitor Blood Sugar"
                onChange={handleChange}
              >
                {monitorBloodSugarOptions.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Row 3: Symptoms (Multi-select) */}
          <Grid item xs={6}>
            <Autocomplete
              multiple
              freeSolo
              options={symptomsOptions}
              value={formData.symptoms}
              onChange={(event, newValue) =>
                handleMultiSelectChange("symptoms", newValue)
              }
              renderInput={(params) => (
                <TextField {...params} label="Symptoms" size="small" />
              )}
            />
          </Grid>
          {/* Row 4: Other Conditions (Multi-select) */}
          <Grid item xs={6}>
            <Autocomplete
              multiple
              freeSolo
              options={otherConditionsOptions}
              value={formData.otherConditions}
              onChange={(event, newValue) =>
                handleMultiSelectChange("otherConditions", newValue)
              }
              renderInput={(params) => (
                <TextField {...params} label="Other Conditions" size="small" />
              )}
            />
          </Grid>
          {/* Row 5: Stress Level, Pain in Liver, Gut Issues */}
          <Grid item xs={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Stress Level</InputLabel>
              <Select
                name="stressLevel"
                value={formData.stressLevel}
                label="Stress Level"
                onChange={handleChange}
              >
                {stressLevelOptions.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Pain in Liver</InputLabel>
              <Select
                name="painInLiver"
                value={formData.painInLiver}
                label="Pain in Liver"
                onChange={handleChange}
              >
                {painInLiverOptions.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Gut Issues</InputLabel>
              <Select
                name="gutIssues"
                value={formData.gutIssues}
                label="Gut Issues"
                onChange={handleChange}
              >
                {gutIssuesOptions.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {/* Row 6: Energy Levels, Sleep Quality, Sugar Cravings */}
          <Grid item xs={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Energy Levels</InputLabel>
              <Select
                name="energyLevels"
                value={formData.energyLevels}
                label="Energy Levels"
                onChange={handleChange}
              >
                {energyLevelsOptions.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Sleep Quality</InputLabel>
              <Select
                name="sleepQuality"
                value={formData.sleepQuality}
                label="Sleep Quality"
                onChange={handleChange}
              >
                {sleepQualityOptions.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Sugar Cravings</InputLabel>
              <Select
                name="sugarCravings"
                value={formData.sugarCravings}
                label="Sugar Cravings"
                onChange={handleChange}
              >
                {sugarCravingsOptions.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Products Recommended */}
          <Grid item xs={12}>
            <Typography
              variant="subtitle1"
              sx={{ mb: 1, fontSize: "0.9rem", fontWeight: "bold", color: "black" }}
            >
              Products Recommended:
            </Typography>
            <Grid container spacing={1}>
              {products.map((product) => (
                <Grid item xs={2} key={product}>
                  <Button
                    variant={selectedProducts.includes(product) ? "contained" : "outlined"}
                    size="small"
                    onClick={() => handleProductClick(product)}
                    sx={{
                      backgroundColor: selectedProducts.includes(product) ? "green" : "inherit",
                      color: selectedProducts.includes(product) ? "white" : "black",
                      borderColor: "black",
                      fontSize: "0.60rem",
                      width: "100%",
                    }}
                  >
                    {product}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Grid>

          {/* Save Button */}
          <Grid item xs={12}>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Button
                variant="contained"
                size="small"
                sx={{ background: "black", color: "#fff" }}
                onClick={handleSubmit}
              >
                Save
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Right Section – Call Checklist */}
      <Box sx={{ width: "20%", p: 2, bgcolor: "#e0e0e0", borderLeft: "1px solid #ccc" }}>
        <Typography
          variant="h6"
          align="center"
          sx={{ fontSize: "0.9rem", fontWeight: "bold", color: "black" }}
        >
          Call Checklist
        </Typography>
        {checklistItems.map((item) => (
          <Tooltip key={item.key} title={item.tooltip} placement="right" arrow>
            <FormControlLabel
              control={
                <Checkbox
                  name={item.key}
                  checked={callChecklist[item.key] || false}
                  onChange={handleCheckboxChange}
                  sx={{ "& .MuiTypography-root": { fontSize: "0.7rem" } }}
                />
              }
              label={item.label}
              sx={{ "& .MuiFormControlLabel-label": { fontSize: "0.7rem", color: "black" } }}
            />
          </Tooltip>
        ))}
      </Box>
    </Box>
  );
};

export default Consultation;
