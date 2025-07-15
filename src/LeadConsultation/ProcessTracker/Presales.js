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
  Tooltip,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import axios from "axios";

// Fixed cell width style for form fields
const cellStyle = { minWidth: "220px", maxWidth: "220px" };

const Presales = ({ customerId, parentLeadStatus  }) => {
  // State for presales fields; note that "notes" will be saved manually.
  const [formData, setFormData] = useState({
    leadStatus: "New Lead",
    hba1c: "",
    lastTestDone: "",
    fastingSugar: "",
    ppSugar: "",
    durationOfDiabetes: "",
    gender: "",
    dietType: "",
    weight: "",
    sittingTime: "",
    exerciseRoutine: "",
    outsideMeals: "",
    timeOfSleep: "",
    notes: "",
    assignExpert: "",
    doctorCons: "",
    file: null,
  });

  const leadStatusOptions = [
    "New Lead",
    "CONS Scheduled",
    "CONS Done",
    "Call Back Later",
    "Sales Done",
    "On Follow Up",
    "CNP",
    "Switch Off",
    "General Query",
    "Fake Lead",
    "Invalid Number",
    "Not Interested",
    "Ordered from Other Sources",
    "language barrier",
    "Budget issue",
  ];

  // State for file preview URL.
  const [filePreviewUrl, setFilePreviewUrl] = useState("");

  // State for call checklist.
  const [checklist, setChecklist] = useState({
    confirmedCustomerIdentity: false,
    confirmedLeadInquiry: false,
    introducedSelfAndCompany: false,
    explainedConsultationProcess: false,
    mentionedFreeDoctorConsultation: false,
    explainedAllRoundApproach: false,
    discussedLifestyleChanges: false,
    mentionedPriceRange: false,
    gotCustomerAgreement: false,
    callTransferPitch: false,
    introduceDoctor: false,
  });

  // Checklist items with tooltips.
  const checklistItems = [
    {
      label: "Confirmed customer identity",
      name: "confirmedCustomerIdentity",
      tooltip:
        "Namaste Sir, I hope meri baat Manish ji se ho rahi hai. Aapne hamari website/Facebook pr form fill kiya tha jisme bataya tha ki aap Noida se hain, umar 45 saal hai aur aapke sugar levels 250 chal rahe hain.",
    },
    {
      label: "Confirmed Lead Inquiry",
      name: "confirmedLeadInquiry",
      tooltip:
        "Aapne hamari website/Facebook pr form fill kiya tha... (This confirms that the lead has previously expressed interest.)",
    },
    {
      label: "Introduced self and company",
      name: "introducedSelfAndCompany",
      tooltip:
        "Main Neeraj hoon, Muditam Ayurveda se, hum diabetes management mei help karte hain, and diabetes ki root cause pr kaam karte hain.",
    },
    {
      label: "Explained consultation process",
      name: "explainedConsultationProcess",
      tooltip:
        "Sabse pehle, main aapse kuch sawaal karunga, aur aapki file prepare karunga... phir aapki call mein hamare doctor ko transfer kar dunga...",
    },
    {
      label: "Mentioned free doctor consultation",
      name: "mentionedFreeDoctorConsultation",
      tooltip: "Doctor consultation free hai, iski koi cost nahi hai.",
    },
    {
      label: "Explained all-round approach",
      name: "explainedAllRoundApproach",
      tooltip:
        "Hum ek all round approach follow karte hain, jisme aapko required supplements denge aur blood test karwayenge.",
    },
    {
      label: "Discussed lifestyle changes",
      name: "discussedLifestyleChanges",
      tooltip:
        "Hum strict diets nahi dete, but lifestyle changes batayenge jo aapko follow karne padenge.",
    },
    {
      label: "Mentioned price range (₹3,000-3,500)",
      name: "mentionedPriceRange",
      tooltip:
        "Apki monthly cost Rs.3000 se Rs.3500 ke beech hogi, aur doctor ke assessment ke baad final confirmation hoga.",
    },
    {
      label: "Got customer agreement to proceed",
      name: "gotCustomerAgreement",
      tooltip:
        "Agar aap agree hain, to hum aage badh sakte hain... Okay sir, mujhe bataye.",
    },
    {
      label: "Call transfer pitch",
      name: "callTransferPitch",
      tooltip:
        "Maine aapki details le li hain aur system mein update kar di hain. Ab main aapki call ko hold par daal raha hoon aur doctor ke paas transfer kar raha hoon.",
    },
    {
      label: "Introduce Doctor",
      name: "introduceDoctor",
      tooltip:
        "Main line par hi rahunga, aur call transfer ke baad doctor aapki baat karenge.",
    },
  ];

  // State for "Assign Expert" options.
  const [assignExpertOptions, setAssignExpertOptions] = useState([]);

  // When customerId changes, fetch existing presales data and assign expert options.
  useEffect(() => {
    if (customerId) {
      axios
        .get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/consultation-details?customerId=" + customerId)
        .then((response) => {
          if (response.data && response.data.length > 0) {
            const savedPresales = response.data[0].presales;
            if (savedPresales) {
              setFormData((prev) => ({ ...prev, ...savedPresales }));
              if (savedPresales.checklist) {
                setChecklist(savedPresales.checklist);
              }
            }
          }
        })
        .catch((error) =>
          console.error("Error fetching consultation details:", error)
        );
    }
    // Fetch assign expert options (active Retention Agents).
    axios
      .get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees")
      .then((response) => {
        const filteredEmployees = response.data.filter(
          (emp) => emp.status === "active" && emp.role === "Retention Agent"
        );
        setAssignExpertOptions(filteredEmployees);
      })
      .catch((error) => console.error("Error fetching employees:", error));
  }, [customerId]);

  useEffect(() => { 
     setFormData(prev => ({
       ...prev,
        leadStatus: parentLeadStatus
     }));
    }, [parentLeadStatus]);

  // Updated auto-save function that converts fields as needed.
  const autoSavePresales = (updatedFormData, updatedChecklist) => {
    if (!customerId) return;

    // Build payload excluding notes.
    const dataToSave = {
      ...updatedFormData,
      file: updatedFormData.file ? updatedFormData.file.name : "",
      checklist: updatedChecklist,
    };

    // Remove "notes" so that they aren't overwritten unintentionally.
    delete dataToSave.notes;

    // Convert "weight" to a number if provided; if empty, remove it.
    if (dataToSave.weight === "") {
      delete dataToSave.weight;
    } else {
      dataToSave.weight = Number(dataToSave.weight);
    }

    // For "assignExpert": if it's an empty string, remove it.
    if (dataToSave.assignExpert === "") {
      delete dataToSave.assignExpert;
    }

    const payload = {
      customerId,
      presales: dataToSave,
    };

    axios
      .post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/consultation-details", payload)
      .catch((error) =>
        console.error("Error auto-saving presales data:", error)
      );
  };

  // Handle field change events (except for notes) to compute updated state and auto-save.
  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedFormData = { ...formData, [name]: value };
    setFormData(updatedFormData);
    if (name !== "notes") {
      autoSavePresales(updatedFormData, checklist);
    }
  };

  // File handling: update file and auto-save.
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("File size should be less than 1MB.");
        return;
      }
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
      const updatedFormData = { ...formData, file };
      setFormData(updatedFormData);
      autoSavePresales(updatedFormData, checklist);
    }
  };

  // Open file preview.
  const handleFileButtonClick = () => {
    if (filePreviewUrl) {
      window.open(filePreviewUrl, "_blank");
    }
  };

  // Handle checklist changes and auto-save.
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    const updatedChecklist = { ...checklist, [name]: checked };
    setChecklist(updatedChecklist);
    autoSavePresales(formData, updatedChecklist);
  };

  // Save Notes button handler – sends only the "notes" field.
  const handleSaveNotes = () => {
    if (!customerId) return;
    const payload = {
      customerId,
      presales: {
        notes: formData.notes,
      },
    };
    axios
      .post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/consultation-details", payload)
      .then(() => {
        // Optionally, refresh data after saving notes.
      })
      .catch((error) =>
        console.error("Error saving notes:", error)
      );
  };

  // Determine if "Assign Expert" should be editable.
  const isAssignExpertEditable =
  parentLeadStatus  === "CONS Scheduled" || formData.leadStatus === "CONS Done";

  return (
    <Box sx={{ display: "flex", height: "100%" }}>
      {/* Left Section (80%) - Presales Form */}
      <Box sx={{ width: "80%", p: 2 }}>
        <form>
          <Grid container spacing={2}>
          <Grid item xs={6} sx={cellStyle}>
            <TextField
            name="doctorCons"
            label="Doctor Consultation By"
            size="small"
            fullWidth
            value={formData.doctorCons}
            onChange={handleChange}
            />
          </Grid>

            {/* Assign Expert dropdown – wrapped in Tooltip if disabled */}
            {/* <Grid item xs={6} sx={cellStyle}>
              <Tooltip
                title={!isAssignExpertEditable ? "Update Lead Status First" : ""}
                arrow
              >
                <span>
                  <FormControl
                    fullWidth
                    size="small"
                    disabled={!isAssignExpertEditable}
                  >
                    <InputLabel>Retention Agent</InputLabel> 
                    <Select
                      name="assignExpert"
                      value={formData.assignExpert || ""}
                      onChange={(e) => {
                        const updatedFormData = {
                          ...formData,
                          assignExpert: e.target.value,
                        };
                        setFormData(updatedFormData);
                        autoSavePresales(updatedFormData, checklist);
                      }}
                      label="Assign Expert"
                    >
                      {assignExpertOptions.map((option) => (
                        <MenuItem key={option._id} value={option._id}>
                          {option.fullName ||
                            option.agentName ||
                            `${option.firstName} ${option.lastName}`}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </span>
              </Tooltip>
            </Grid> */}

            {/* Row 1: HbA1c, Last Test Done, Fasting Sugar, PP Sugar */}
            <Grid item xs={3} sx={cellStyle}>
              <TextField
                name="hba1c"
                label="HbA1c (%)"
                type="number"
                size="small"
                fullWidth
                value={formData.hba1c}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={3} sx={cellStyle}>
              <FormControl fullWidth size="small">
                <InputLabel>Last Test Done</InputLabel>
                <Select
                  name="lastTestDone"
                  value={formData.lastTestDone}
                  label="Last Test Done"
                  onChange={handleChange}
                >
                  <MenuItem value="Within the last month">
                    Within the last month
                  </MenuItem>
                  <MenuItem value="Within the last 3 months">
                    Within the last 3 months
                  </MenuItem>
                  <MenuItem value="Within the last 6 months">
                    Within the last 6 months
                  </MenuItem>
                  <MenuItem value="Within the last year">
                    Within the last year
                  </MenuItem>
                  <MenuItem value="More than a year ago">
                    More than a year ago
                  </MenuItem>
                  <MenuItem value="Never">Never</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={3} sx={cellStyle}>
              <TextField
                name="fastingSugar"
                label="Fasting Sugar Levels"
                type="number"
                size="small"
                fullWidth
                value={formData.fastingSugar}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={3} sx={cellStyle}>
              <TextField
                name="ppSugar"
                label="PP Sugar Levels"
                type="number"
                size="small"
                fullWidth
                value={formData.ppSugar}
                onChange={handleChange}
              />
            </Grid>

            {/* Row 2: Duration of Diabetes, Gender, Diet Type, Weight */}
            <Grid item xs={3} sx={cellStyle}>
              <FormControl fullWidth size="small">
                <InputLabel>Duration of Diabetes</InputLabel>
                <Select
                  name="durationOfDiabetes"
                  value={formData.durationOfDiabetes}
                  label="Duration of Diabetes"
                  onChange={handleChange}
                >
                  <MenuItem value="Less than 1 year">
                    Less than 1 year
                  </MenuItem>
                  <MenuItem value="1-3 years">1-3 years</MenuItem>
                  <MenuItem value="4-5 years">4-5 years</MenuItem>
                  <MenuItem value="6-10 years">6-10 years</MenuItem>
                  <MenuItem value="More than 10 years">
                    More than 10 years
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={3} sx={cellStyle}>
              <FormControl fullWidth size="small">
                <InputLabel>Gender</InputLabel>
                <Select
                  name="gender"
                  value={formData.gender}
                  label="Gender"
                  onChange={handleChange}
                >
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={3} sx={cellStyle}>
              <FormControl fullWidth size="small">
                <InputLabel>Diet Type</InputLabel>
                <Select
                  name="dietType"
                  value={formData.dietType}
                  label="Diet Type"
                  onChange={handleChange}
                >
                  <MenuItem value="Vegetarian">Vegetarian</MenuItem>
                  <MenuItem value="Non-vegetarian">Non-vegetarian</MenuItem>
                  <MenuItem value="Vegan">Vegan</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={3} sx={cellStyle}>
              <TextField
                name="weight"
                label="Weight (kg)"
                type="number"
                size="small"
                fullWidth
                value={formData.weight}
                onChange={handleChange}
              />
            </Grid>

            {/* Row 3: Sitting Time, Exercise Routine, Outside Meals, Time of Sleep */}
            <Grid item xs={3} sx={cellStyle}>
              <FormControl fullWidth size="small">
                <InputLabel>Sitting Time</InputLabel>
                <Select
                  name="sittingTime"
                  value={formData.sittingTime}
                  label="Sitting Time"
                  onChange={handleChange}
                >
                  <MenuItem value="Less than 1 hour">
                    Less than 1 hour
                  </MenuItem>
                  <MenuItem value="1-2 hours">1-2 hours</MenuItem>
                  <MenuItem value="3-4 hours">3-4 hours</MenuItem>
                  <MenuItem value="5-6 hours">5-6 hours</MenuItem>
                  <MenuItem value="7-8 hours">7-8 hours</MenuItem>
                  <MenuItem value="9-10 hours">9-10 hours</MenuItem>
                  <MenuItem value="More than 10 hours">
                    More than 10 hours
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={3} sx={cellStyle}>
              <FormControl fullWidth size="small">
                <InputLabel>Exercise Routine</InputLabel>
                <Select
                  name="exerciseRoutine"
                  value={formData.exerciseRoutine}
                  label="Exercise Routine"
                  onChange={handleChange}
                >
                  <MenuItem value="Daily">Daily</MenuItem>
                  <MenuItem value="4-5 times a week">
                    4-5 times a week
                  </MenuItem>
                  <MenuItem value="2-3 times a week">
                    2-3 times a week
                  </MenuItem>
                  <MenuItem value="Once a week">Once a week</MenuItem>
                  <MenuItem value="Rarely">Rarely</MenuItem>
                  <MenuItem value="Never">Never</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={3} sx={cellStyle}>
              <FormControl fullWidth size="small">
                <InputLabel>Outside Meals</InputLabel>
                <Select
                  name="outsideMeals"
                  value={formData.outsideMeals}
                  label="Outside Meals"
                  onChange={handleChange}
                >
                  <MenuItem value="Daily">Daily</MenuItem>
                  <MenuItem value="4-5 times a week">
                    4-5 times a week
                  </MenuItem>
                  <MenuItem value="2-3 times a week">
                    2-3 times a week
                  </MenuItem>
                  <MenuItem value="Once a week">
                    Once a week
                  </MenuItem>
                  <MenuItem value="Rarely">Rarely</MenuItem>
                  <MenuItem value="Never">Never</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={3} sx={cellStyle}>
              <FormControl fullWidth size="small">
                <InputLabel>Time of Sleep</InputLabel>
                <Select
                  name="timeOfSleep"
                  value={formData.timeOfSleep}
                  label="Time of Sleep"
                  onChange={handleChange}
                >
                  <MenuItem value="6-7 hours">6-7 hours</MenuItem>
                  <MenuItem value="7-8 hours">7-8 hours</MenuItem>
                  <MenuItem value="8-9 hours">8-9 hours</MenuItem>
                  <MenuItem value="9-10 hours">9-10 hours</MenuItem>
                  <MenuItem value="More than 10 hours">
                    More than 10 hours
                  </MenuItem>
                  <MenuItem value="Less than 6 hours">
                    Less than 6 hours
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Row 4: Notes (full width) - Only saved with the Save Notes button */}
            <Grid item xs={6}>
              <TextField
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                fullWidth
                size="small"
                multiline
                rows={3}
              />
            </Grid>

            {/* Row 5: Upload File */}
            <Grid item xs={6} sx={cellStyle}>
              <Button
                variant="outlined"
                size="small"
                component="label"
                fullWidth
                sx={{ borderColor: "black", color: "black" }}
              >
                Upload File
                <input type="file" hidden onChange={handleFileChange} />
              </Button>
              {formData.file && (
                <Button
                  variant="text"
                  size="small"
                  onClick={handleFileButtonClick}
                >
                  Preview File
                </Button>
              )}
            </Grid>

            {/* Save Notes Button */}
            <Grid item xs={12}>
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                <Button
                  variant="contained"
                  size="small"
                  sx={{ background: "black", color: "#fff" }}
                  onClick={handleSaveNotes}
                >
                  Save Notes
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Box>

      {/* Right Section (20%) - Call Checklist */}
      <Box
        sx={{
          width: "20%",
          p: 2,
          bgcolor: "#e0e0e0",
          borderLeft: "1px solid #ccc",
        }}
      >
        <Typography
          variant="h6"
          align="center"
          sx={{ fontSize: "0.9rem", fontWeight: "bold", color: "black" }}
        >
          Call Checklist
        </Typography>
        {checklistItems.map((item) => (
          <Tooltip key={item.name} title={item.tooltip} placement="right" arrow>
            <FormControlLabel
              control={
                <Checkbox
                  name={item.name}
                  checked={checklist[item.name] || false}
                  onChange={handleCheckboxChange}
                  sx={{ "& .MuiTypography-root": { fontSize: "0.7rem" },
                  p: "6px",
                }}
                />
              }
              label={item.label}
              sx={{
                "& .MuiFormControlLabel-label": {
                  fontSize: "0.7rem",
                  color: "black",
                },
                margin: "1px 0",
              }}
            />
          </Tooltip>
        ))}
      </Box>
    </Box>
  );
};

export default Presales;
