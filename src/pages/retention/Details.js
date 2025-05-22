import React, { useState, useEffect } from "react";
import {
    Grid,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Autocomplete,
    Typography,
    Box,
} from "@mui/material";
import axios from "axios";

const Details = ({ contactNumber }) => {
    const [formData, setFormData] = useState({
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
        currentMedications: [],
        sideEffects: "",
        suddenSugarFluctuations: "",
        familyHistory: "",
        monitorBloodSugar: "",
        sugarCravings: "",
        symptoms: [],
        otherConditions: [],
        stressLevel: "",
        painInLiver: "",
        gutIssues: "",
        energyLevels: "",
        sleepQuality: "",
    });

    useEffect(() => {
        if (!contactNumber) return;
    
        const fetchDetails = async () => {
            try {
                const { data } = await axios.get(
                    `https://muditamleads-14f32a10d7f7.herokuapp.com/api/details/get-details/${contactNumber}`
                );
                if (data?.details) {
                    setFormData(data.details);  
                } else { 
                    setFormData(initialFormState);
                }
            } catch (error) {
                console.log("No previous data found or error:", error);
                setFormData(initialFormState); 
            }
        };
    
        fetchDetails();
    }, [contactNumber]);

    const initialFormState = {
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
        currentMedications: [],
        sideEffects: "",
        suddenSugarFluctuations: "",
        familyHistory: "",
        monitorBloodSugar: "",
        sugarCravings: "",
        symptoms: [],
        otherConditions: [],
        stressLevel: "",
        painInLiver: "",
        gutIssues: "",
        energyLevels: "",
        sleepQuality: "",
    };

    const autoSave = async (updatedData) => {
    try {
        await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/details/save-details", {
            contactNumber,
            details: updatedData,
        });
        console.log("Details saved successfully!");
    } catch (error) {
        console.error("Auto-save failed:", error);
    }
};

const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedFormData = { ...formData, [name]: value };
    setFormData(updatedFormData);

    // Auto-save on every change
    autoSave(updatedFormData);
};

    const handleMultiSelectChange = (name, value) => {
        const updatedFormData = { ...formData, [name]: value };
        setFormData(updatedFormData);
    
        // Auto-save on every change
        autoSave(updatedFormData);
    };




    const cellStyle = {
        p: 1,
    };

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
    const sideEffectsOptions = ["Nausea", "Weight gain", "None"];
    const suddenSugarFluctuationsOptions = ["Yes", "No"];
    const familyHistoryOptions = ["Yes", "No"];
    const monitorBloodSugarOptions = ["Daily", "Weekly", "Rarely", "Never"];
    const sugarCravingsOptions = ["Often", "Sometimes", "Never"];
    const symptomsOptions = ["Frequent urination",
        "Increased thirst",
        "Increased hunger",
        "Fatigue",
        "Blurred vision",
        "Slow-healing wounds",
        "Unexplained weight loss",
        "Numbness or tingling",
        "Frequent infections",
        "Darkened skin",];
    const otherConditionsOptions = ["Thyroid", "BP", "Cholesterol"];
    const stressLevelOptions = ["Low", "Moderate", "High"];
    const gutIssuesOptions = ["Constipation", "Diarrhea", "Bloating"];
    const energyLevelsOptions = ["Low", "Medium", "High"];
    const sleepQualityOptions = ["Poor", "Average", "Good"];

    return (
        <Box
        sx={{
            mt: 2,
            p: 2,
            borderRadius: 2,
            border: '1px solid #ddd',
            boxShadow: 2,
            backgroundColor: '#fff',
        }}
        >
        <Box sx={{ width: '100%', textAlign: 'center', mt: 2 }}>
            <Typography
            variant="subtitle2"
            color="black"
            sx={{ fontSize: '2rem', fontWeight: 600 }}
            >
            History
            </Typography>
        </Box>
            <Grid container spacing={2}>
                {/* Row 1 */}
                <Grid item xs={2} sx={cellStyle}>
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
                <Grid item xs={2} sx={cellStyle}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Last Test</InputLabel>
                        <Select
                            name="lastTestDone"
                            value={formData.lastTestDone}
                            label="Last Test"
                            onChange={handleChange}
                        >
                            {[
                                "Within the last month",
                                "Within the last 3 months",
                                "Within the last 6 months",
                                "Within the last year",
                                "More than a year ago",
                                "Never",
                            ].map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={1} sx={cellStyle}>
                    <TextField
                        name="fastingSugar"
                        label="FS"
                        type="number"
                        size="small"
                        fullWidth
                        value={formData.fastingSugar}
                        onChange={handleChange}
                        InputProps={{
                            inputProps: {
                                inputMode: "numeric",
                                pattern: "[0-9]*"
                            },
                            sx: {
                                '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                                    WebkitAppearance: 'none',
                                    margin: 0,
                                },
                                '& input[type=number]': {
                                    MozAppearance: 'textfield',
                                },
                            }
                        }}
                    />
                </Grid>
                <Grid item xs={1} sx={cellStyle}>
                    <TextField
                        name="ppSugar"
                        label="PP"
                        type="number"
                        size="small"
                        fullWidth
                        value={formData.ppSugar}
                        onChange={handleChange}
                        InputProps={{
                            inputProps: {
                                inputMode: "numeric",
                                pattern: "[0-9]*"
                            },
                            sx: {
                                '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                                    WebkitAppearance: 'none',
                                    margin: 0,
                                },
                                '& input[type=number]': {
                                    MozAppearance: 'textfield',
                                },
                            }
                        }}
                    />
                </Grid>

                {/* Row 2 */}
                <Grid item xs={2} sx={cellStyle}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Duration</InputLabel>
                        <Select
                            name="durationOfDiabetes"
                            value={formData.durationOfDiabetes}
                            label="Duration"
                            onChange={handleChange}
                        >
                            {[
                                "Less than 1 year",
                                "1-3 years",
                                "4-5 years",
                                "6-10 years",
                                "More than 10 years",
                            ].map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={2} sx={cellStyle}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Gender</InputLabel>
                        <Select
                            name="gender"
                            value={formData.gender}
                            label="Gender"
                            onChange={handleChange}
                        >
                            {["Male", "Female", "Other"].map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={2} sx={cellStyle}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Diet Type</InputLabel>
                        <Select
                            name="dietType"
                            value={formData.dietType}
                            label="Diet Type"
                            onChange={handleChange}
                        >
                            {["Vegetarian", "Non-vegetarian", "Vegan"].map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={1} sx={cellStyle}>
                    <TextField
                        name="weight"
                        label="kg"
                        type="number"
                        size="small"
                        fullWidth
                        value={formData.weight}
                        onChange={handleChange}
                        InputProps={{
                            inputProps: {
                                inputMode: "numeric",
                                pattern: "[0-9]*"
                            },
                            sx: {
                                '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                                    WebkitAppearance: 'none',
                                    margin: 0,
                                },
                                '& input[type=number]': {
                                    MozAppearance: 'textfield',
                                },
                            }
                        }}
                    />
                </Grid>

                {/* Row 3 */}
                <Grid item xs={2} sx={cellStyle}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Sitting Time</InputLabel>
                        <Select
                            name="sittingTime"
                            value={formData.sittingTime}
                            label="Sitting Time"
                            onChange={handleChange}
                        >
                            {[
                                "Less than 1 hour",
                                "1-2 hours",
                                "3-4 hours",
                                "5-6 hours",
                                "7-8 hours",
                                "9-10 hours",
                                "More than 10 hours",
                            ].map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={2} sx={cellStyle}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Exercise</InputLabel>
                        <Select
                            name="exerciseRoutine"
                            value={formData.exerciseRoutine}
                            label="Exercise Routine"
                            onChange={handleChange}
                        >
                            {[
                                "Daily",
                                "4-5 times a week",
                                "2-3 times a week",
                                "Once a week",
                                "Rarely",
                                "Never",
                            ].map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={2} sx={cellStyle}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Outside Meals</InputLabel>
                        <Select
                            name="outsideMeals"
                            value={formData.outsideMeals}
                            label="Outside Meals"
                            onChange={handleChange}
                        >
                            {[
                                "Daily",
                                "4-5 times a week",
                                "2-3 times a week",
                                "Once a week",
                                "Rarely",
                                "Never",
                            ].map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={2} sx={cellStyle}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Time of Sleep</InputLabel>
                        <Select
                            name="timeOfSleep"
                            value={formData.timeOfSleep}
                            label="Time of Sleep"
                            onChange={handleChange}
                        >
                            {[
                                "6-7 hours",
                                "7-8 hours",
                                "8-9 hours",
                                "9-10 hours",
                                "More than 10 hours",
                                "Less than 6 hours",
                            ].map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                <Grid item xs={2}>
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
            </Grid>
            <Grid container spacing={2}>


                <Grid item xs={2}>
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

                <Grid item xs={2}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Family History</InputLabel>
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

                <Grid item xs={2}>
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

                <Grid item xs={2}>
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





                <Grid item xs={2}>
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

                <Grid item xs={2}>
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



                <Grid item xs={2}>
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
                <Grid item xs={5}>
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
                <Grid item xs={3}>
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
            </Grid>
        </Box>
    );
};

export default Details;
