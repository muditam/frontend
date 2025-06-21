import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  TextField,
  MenuItem,
  Button,
  FormControl,
  FormGroup, 
  FormControlLabel, 
  InputLabel,
  Select,
  Checkbox,
  Typography,
  IconButton,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import axios from "axios";
import pincodeData from "./pincodeData"; // import the pin code information


const expectedResultsOptions = [
  { id: 1, label: "Only Supplements (Drop of 0.8%)", improvement: "0.8" },
  { id: 2, label: "Diet + Supplements (Drop of 1.5%)", improvement: "1.5" },
  { id: 3, label: "Lifestyle + Diet + Supp. (Drop 2.5%)", improvement: "2.5" },
];

// Options for Preferred Diet
const preferredDietOptions = ["Vegetarian", "Non vegetarian", "Eggetarian", "Vegan"];

// Options for Preferred Course Duration
const courseDurationOptions = ["1 month", "2 months", "3 months", "4 months"];

// Options for Freebies (now multi-select)
const freebiesOptions = ["Dumbbells", "Glucometer +10 strips", "Diet Plan", "Glucometer +25 strips"];

// Options for Blood Test Recommended
const bloodTestOptions = ["Full Body", "Hba1c", "Lipid + HbA1c + Liver Panel"];

const discountOptions = [
  { label: "₹100 off", code: "DOCTORSPECIAL100" },
  { label: "₹500 off", code: "DOCTORSPECIAL500" },
  { label: "₹1000 off", code: "DOCTORSPECIAL1000" },
  { label: "5% off", code: "DOCTORSPECIAL5" },
  { label: "10% off", code: "DOCTORSPECIAL10" },
  { label: "12% off", code: "DOCTORSPECIAL12" },
];

const priceMap = {
  "Karela Jamun Fizz": {
    "1 month": 990,
    "2 months": 1960,
    "3 months": 2910,
    "4 months": 4500,
  },
  "Sugar Defend Pro": {
    "1 month": 1495,
    "2 months": 2700,
    "3 months": 3500,
    "4 months": 4200,
  },
  "Vasant Kusmakar Ras": {
    "1 month": 2995,
    "2 months": 2995,
    "3 months": 2995,
    "4 months": 5800,
  },
  "Liver Fix": {
    "1 month": 995,
    "2 months": 1970,
    "3 months": 2925,
    "4 months": 6400,
  },
  "Stress & Sleep": {
    "1 month": 799,
    "2 months": 1395,
    "3 months": 2200,
    "4 months": 2750,
  },
  "Chandraprabha Vati": {
    "1 month": 525,
    "2 months": 999,
    "3 months": 1350,
    "4 months": 1600,
  },
  "Power Gut": {
    "1 month": 1515,
    "2 months": 2695,
    "3 months": 3595,
    "4 months": 4200,
  },
  "Heart Defend Pro": {
    "1 month": 1950,
    "2 months": 3600,
    "3 months": 4500,
    "4 months": 5400,
  },
  "Performance Forever": {
    "1 month": 249,
    "2 months": 479,
    "3 months": 729,
    "4 months": 3199,
  },
  "Shilajit with Gold": {
    "1 month": 1295,
    "2 months": 2495,
    "3 months": 3495,
    "4 months": 4495,
  },
  "HbA1c - Blood Test": {
    "1 month": 300,
    "2 months": 300,
    "3 months": 300,
    "4 months": 300,
  },
  "Full Body Checkup": {
    "1 month": 900,
    "2 months": 900,
    "3 months": 900,
    "4 months": 900,
  },
  "Lipid + HbA1c + Liver": {
    "1 month": 650,
    "2 months": 650,
    "3 months": 650,
    "4 months": 650,
  },
};

const Closing = ({ presalesHba1c = "8", customerId }) => {
  const [expectedResult, setExpectedResult] = useState("");
  const [preferredDiet, setPreferredDiet] = useState("");
  const [courseDuration, setCourseDuration] = useState("");
  const [freebies, setFreebies] = useState([]);
  const [bloodTest, setBloodTest] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [availabilityResult, setAvailabilityResult] = useState("");
  const [bloodTestDetails, setBloodTestDetails] = useState({
    address: "",
    preferredTimeSlot: "",
    preferredDate1: "",
    preferredDate2: "",
  });
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [currentHba1c, setCurrentHba1c] = useState(presalesHba1c);
  const [generatedLink, setGeneratedLink] = useState("");
  const [discountCodes, setDiscountCodes] = useState([]); 

  // Styling for sections
  const sectionStyle = { mb: 3, p: 1, borderBottom: "1px solid #ccc" };

  const totalPrice = selectedProducts.reduce((sum, prod) => {
    const price = priceMap[prod]?.[courseDuration] ?? 0;
    return sum + price;
  }, 0);
  
  // Apply each coupon in order: flat ₹ off or % off
  const discountedPrice = discountCodes.reduce((current, code) => {
    const opt = discountOptions.find((d) => d.code === code);
    if (!opt) return current;
    if (opt.label.includes("%")) {
      const pct = parseFloat(opt.label);
      return current - (current * pct) / 100;
    } else {
      const amt = parseInt(opt.label.replace(/[^\d]/g, ""), 10);
      return current - amt;
    }
  }, totalPrice);
  
  // Never go below zero, round to integer
  const finalDiscounted = Math.max(0, Math.round(discountedPrice));

  // Handler functions
  const handleExpectedResultSelect = (option) => {
       setExpectedResult(option.id);
       autoSaveClosing({
         expectedResult: option.id,
         preferredDiet,
         courseDuration,
         freebie: freebies,
         bloodTest,
         bloodTestDetails,
         discountCodes,
       });
     }

     const handlePreferredDietSelect = (option) => {
         setPreferredDiet(option);
         autoSaveClosing({
           expectedResult,
           preferredDiet: option,
           courseDuration,
           freebie: freebies,
           bloodTest,
           bloodTestDetails,
           discountCodes,
         });
       }

       const handleCourseDurationSelect = (option) => {
           setCourseDuration(option);
           autoSaveClosing({
             expectedResult,
             preferredDiet,
             courseDuration: option,
             freebie: freebies,
             bloodTest,
             bloodTestDetails,
             discountCodes,
           });
         };

  // Toggle selection for Freebies
  const handleFreebieSelect = (option) => {
       const updated = freebies.includes(option)
         ? freebies.filter((f) => f !== option)
         : [...freebies, option];
       setFreebies(updated);
       autoSaveClosing({
         expectedResult,
         preferredDiet,
         courseDuration,
         freebie: updated,
         bloodTest,
         bloodTestDetails,
         discountCodes,
       });
     }

     const handleBloodTestSelect = (e) => {
         const val = e.target.value;
         setBloodTest(val);
         autoSaveClosing({
           expectedResult,
           preferredDiet,
           courseDuration,
           freebie: freebies,
           bloodTest: val,
           bloodTestDetails,
           discountCodes,
         });
       }

  const handleServiceCheck = () => {
    const availableLabs = [];
    if (pincodeData.Redcliff.includes(pinCode)) {
      availableLabs.push("Redcliff");
    }
    if (pincodeData.Lalpathlab.includes(pinCode)) {
      availableLabs.push("Lalpathlab");
    }
    if (pincodeData.PathKind.includes(pinCode)) {
      availableLabs.push("PathKind");
    }
    if (pincodeData.Tataonemg.includes(pinCode)) {
      availableLabs.push("TATA 1 MG");
    }
    if (pincodeData.Healthians.includes(pinCode)) {
      availableLabs.push("Healthians");
    }
    if (availableLabs.length > 0) {
      setAvailabilityResult(`Available on: ${availableLabs.join(" ")}`);
    } else {
      setAvailabilityResult("Not available on any location.");
    }
  };

  const handleBloodTestDetailsChange = (e) => {
       const { name, value } = e.target;
       const updated = { ...bloodTestDetails, [name]: value };
       setBloodTestDetails(updated);
       autoSaveClosing({
         expectedResult,
         preferredDiet,
         courseDuration,
         freebie: freebies,
         bloodTest,
         bloodTestDetails: updated,
         discountCodes,
       });
     }

  const handleCreatePlanLink = () => {
    const baseUrl = "https://muditam.com/apps/consultation";
    const planLink = `${baseUrl}/${customerId}`;
    setGeneratedLink(planLink);
  };

  const handleGetPaymentLink = () => {
    alert("Payment link generated!");
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
    }
  };

  const handleDiscountToggle = (code) => {
       const updated = discountCodes.includes(code)
         ? discountCodes.filter((c) => c !== code)
         : [...discountCodes, code];
       setDiscountCodes(updated);
       autoSaveClosing({
         expectedResult,
         preferredDiet,
         courseDuration,
         freebie: freebies,
         bloodTest,
         bloodTestDetails,
         discountCodes: updated,
       });
     }

  useEffect(() => {
    if (customerId) {
      axios
        .get(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/consultation-details?customerId=${customerId}`)
        .then((response) => {
          if (response.data && response.data.length > 0) {
            const savedClosing = response.data[0].closing;
            const savedConsultation = response.data[0].consultation;
            const savedPresales = response.data[0].presales;
            if (savedPresales && savedPresales.hba1c) {
              setCurrentHba1c(savedPresales.hba1c);
            }
            if (savedClosing) {
              if (savedClosing.expectedResult) {
                setExpectedResult(savedClosing.expectedResult);
              }
              if (savedClosing.preferredDiet) {
                setPreferredDiet(savedClosing.preferredDiet);
              }
              if (savedClosing.courseDuration) {
                setCourseDuration(savedClosing.courseDuration);
              }
              if (savedClosing.freebie) {
                setFreebies(
                  Array.isArray(savedClosing.freebie)
                    ? savedClosing.freebie
                    : [savedClosing.freebie]
                );
              }
              if (savedClosing.bloodTest) {
                setBloodTest(savedClosing.bloodTest);
              }
              if (savedClosing.bloodTestDetails) {
                setBloodTestDetails(savedClosing.bloodTestDetails);
              }
              if (savedClosing.discountCodes) {
                setDiscountCodes(savedClosing.discountCodes);
              }
            }
            if (savedConsultation && savedConsultation.selectedProducts) {
              setSelectedProducts(savedConsultation.selectedProducts);
            }
          }
        })
        .catch((error) =>
          console.error("Error fetching closing details:", error)
        );
    }
  }, [customerId]);

  const autoSaveClosing = (updatedFields) => {
    if (!customerId) return;
    axios
      .post(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/consultation-details",
        { customerId, closing: updatedFields }
      )
      .catch((err) =>
        console.error("Error auto-saving closing details:", err)
      );
  };

  const calculateAchievableHba1c = (improvement) => {
    const current = parseFloat(currentHba1c);
    const drop = parseFloat(improvement);
    if (isNaN(current) || isNaN(drop)) return "-";
    return (current - drop).toFixed(1);
  };
  
  return (
    <Box sx={{ p: 2 }}>

      {/* Combined Options Section: Expected Results, Preferred Diet, Course Duration, Freebies */}
      <Box sx={sectionStyle}>
        <Grid container spacing={2}>
          {/* Expected Results */}
          <Grid item xs={3}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: "bold", color: "black" }}>
              Expected Results (HbA1c: {currentHba1c})
            </Typography>
            <Grid container spacing={1}>
              {expectedResultsOptions.map((opt) => (
                <Grid item xs={12} key={opt.id}>
                  <Button
                    variant={expectedResult === opt.id ? "contained" : "outlined"}
                    fullWidth
                    onClick={() => handleExpectedResultSelect(opt)}
                    sx={{
                      backgroundColor: expectedResult === opt.id ? "black" : "inherit",
                      color: expectedResult === opt.id ? "white" : "black",
                      fontSize: "0.8rem",
                    }}
                  >
                    {opt.label}
                  </Button>
                  <Typography variant="caption" display="block" align="center">
                    Can Achieve: {calculateAchievableHba1c(opt.improvement)}
                  </Typography>
                </Grid>
              ))}
            </Grid>
          </Grid>

          {/* Preferred Diet */}
          <Grid item xs={3}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: "bold", color: "black", textAlign: "center" }}>
              Preferred Diet
            </Typography>
            <Grid container spacing={1}>
              {preferredDietOptions.map((diet) => (
                <Grid item xs={12} key={diet}>
                  <Button
                    variant={preferredDiet === diet ? "contained" : "outlined"}
                    fullWidth
                    onClick={() => handlePreferredDietSelect(diet)}
                    sx={{
                      backgroundColor: preferredDiet === diet ? "black" : "inherit",
                      color: preferredDiet === diet ? "white" : "black",
                      fontSize: "0.8rem",
                    }}
                  >
                    {diet}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Grid>

          {/* Preferred Course Duration */}
          <Grid item xs={3}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: "bold", color: "black", textAlign: "center" }}>
              Preferred Course Duration
            </Typography>
            <Grid container spacing={1}>
              {courseDurationOptions.map((duration) => (
                <Grid item xs={12} key={duration}>
                  <Button
                    variant={courseDuration === duration ? "contained" : "outlined"}
                    fullWidth
                    onClick={() => handleCourseDurationSelect(duration)}
                    sx={{
                      backgroundColor: courseDuration === duration ? "black" : "inherit",
                      color: courseDuration === duration ? "white" : "black",
                      fontSize: "0.8rem",
                    }}
                  >
                    {duration}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Grid>

          {/* Freebies */}
          <Grid item xs={3}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: "bold", color: "black", textAlign: "center" }}>
              Freebies
            </Typography>
            <Grid container spacing={1}>
              {freebiesOptions.map((freebieOption) => (
                <Grid item xs={12} key={freebieOption}>
                  <Button
                    variant={freebies.includes(freebieOption) ? "contained" : "outlined"}
                    fullWidth
                    onClick={() => handleFreebieSelect(freebieOption)}
                    sx={{
                      backgroundColor: freebies.includes(freebieOption) ? "black" : "inherit",
                      color: freebies.includes(freebieOption) ? "white" : "black",
                      fontSize: "0.8rem",
                    }}
                  >
                    {freebieOption}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </Box>

      {/* Combined Consultation Details Section: Products Recommended, Blood Test Recommended, Details for Blood Test */}
      <Box sx={sectionStyle}>
        <Grid container spacing={2}>
          {/* Products Recommended */}
          <Grid item xs={4}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: "bold", color: "black" }}>
              Products Recommended
            </Typography>
            {selectedProducts && selectedProducts.length > 0 ? (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {selectedProducts.map((prod) => (
                  <Box
                    key={prod}
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      bgcolor: "black",
                      color: "white",
                      borderRadius: 1,
                      fontSize: "0.8rem",
                    }}
                  >
                    {prod}
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                No products selected.
              </Typography>
            )}
          </Grid>

          {/* Blood Test Recommended */}
          <Grid item xs={4}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: "bold", color: "black" }}>
              Blood Test Recommended
            </Typography>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Choose an Option</InputLabel>
              <Select name="bloodTest" value={bloodTest} label="Choose an Option" onChange={handleBloodTestSelect}>
                {bloodTestOptions.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <TextField
                label="Enter Pin Code"
                size="small"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleServiceCheck}
                sx={{ background: "black" }}
              >
                Check
              </Button>
            </Box>
            {availabilityResult && (
              <Box sx={{ border: "1px solid", borderColor: "black", p: 1, borderRadius: 1 }}>
                <Typography variant="caption" display="block" align="center">
                  {availabilityResult}
                </Typography>
              </Box>
            )}
          </Grid>

          {/* Details for Blood Test */}
          <Grid item xs={4}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: "bold", color: "black" }}>
              Details for Blood Test
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Address"
                  name="address"
                  value={bloodTestDetails.address || ""}
                  onChange={handleBloodTestDetailsChange}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Preferred Time Slot"
                  name="preferredTimeSlot"
                  value={bloodTestDetails.preferredTimeSlot || ""}
                  onChange={handleBloodTestDetailsChange}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Preferred Date 1"
                  name="preferredDate1"
                  type="date"
                  value={bloodTestDetails.preferredDate1 || ""}
                  onChange={handleBloodTestDetailsChange}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Preferred Date 2"
                  name="preferredDate2"
                  type="date"
                  value={bloodTestDetails.preferredDate2 || ""}
                  onChange={handleBloodTestDetailsChange}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Box>

      {/* Price Breakup & Link Generation */}
      <Box sx={sectionStyle}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold", color: "black" }}>
          Price Breakup
        </Typography>

        {selectedProducts.length > 0 && courseDuration ? (
          <Grid container spacing={1}>
            {selectedProducts.map((prod) => (
              <Grid item xs={12} sm={6} key={prod}>
                <Typography variant="body2">
                  {prod}: ₹
                  {priceMap[prod] && priceMap[prod][courseDuration]
                    ? priceMap[prod][courseDuration]
                    : "—"}
                </Typography>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography variant="body2" sx={{ fontStyle: "italic" }}>
            {selectedProducts.length === 0
              ? "No products selected."
              : "Select a course duration to see prices."}
          </Typography>
        )}

      <Box sx={{ ...sectionStyle, pt: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "black" }}>
                Total Price: ₹{totalPrice}
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "black" }}>
                Discounted Price: ₹{finalDiscounted}
              </Typography>
            </Box>

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Button
              variant="contained"
              fullWidth
              size="small"
              sx={{ background: "black", color: "white", fontSize: "0.8rem" }}
              onClick={handleCreatePlanLink}
            >
              Create Plan Link
            </Button>
          </Grid>
          <Grid item xs={6}>
            <Button
              variant="contained"
              fullWidth
              size="small"
              sx={{ background: "black", color: "white", fontSize: "0.8rem" }}
              onClick={handleGetPaymentLink}
            >
              Get Payment Link
            </Button>
          </Grid>
        </Grid>
        {generatedLink && (
          <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1 }}>
            <TextField fullWidth value={generatedLink} size="small" InputProps={{ readOnly: true }} />
            <IconButton onClick={handleCopyLink}>
              <ContentCopyIcon />
            </IconButton>
          </Box>
        )}
      </Box>


      <Box sx={sectionStyle}>
        <Typography variant="h6" sx={{ mb: 1, fontWeight: "bold" }}>
          Discount Codes
        </Typography>
        <FormGroup row>
          {discountOptions.map(({ label, code }) => (
            <FormControlLabel
              key={code}
              control={
                <Checkbox
                  checked={discountCodes.includes(code)}
                  onChange={() => handleDiscountToggle(code)}
                />
              }
              label={label}
            />
          ))}
        </FormGroup>
      </Box>
 
      
    </Box>
  );
};

export default Closing;
