import React, { useState } from "react";
import {
  Box,
  Button,
  Typography,
  TextField,
  Alert,
  Snackbar,
  CircularProgress,
} from "@mui/material";
import axios from "axios";
import * as XLSX from "xlsx";


const BulkDataUpload = () => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);


  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };


  const handleFileUpload = async () => {
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }


    const formData = new FormData();
    formData.append("file", file);


    try {
      setLoading(true);
      const response = await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/bulk-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });


      if (response.data.success) {
        setSuccess(true);
        setFile(null);
        setError("");
      } else {
        setError(response.data.error || "File validation failed.");
      }
    } catch (err) {
      setError("An error occurred while uploading the file.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <>
      <Box
  sx={{
    maxWidth: 550,
    margin: "auto",
    mt: 5,
    p: 4,
    borderRadius: 3,
    backgroundColor: "#fff",
    boxShadow: "0px 4px 12px rgba(0,0,0,0.1)", // Soft shadow
  }}
>
  <Typography
    variant="h5"
    gutterBottom
    sx={{ textAlign: "center", fontWeight: "bold", color: "#333" }}
  >
    Bulk Data Upload
  </Typography>


  <Box
    sx={{
      height: "2px",
      backgroundColor: "#FFC107",
      width: "100%",
      borderRadius: "2px",
      mb: 4,
    }}
  />


  <Box
    sx={{
      mb: 2,
      p: 2,
      border: "2px dashed #666",
      borderRadius: 2,
      textAlign: "left",
      cursor: "pointer",
      "&:hover": { backgroundColor: "#f9f9f9" },
    }}
    onClick={() => document.getElementById("file-upload").click()}
  >
   
    <input
      type="file"
      id="file-upload"
      accept=".csv, .xlsx"
      onChange={handleFileChange}
    />
  </Box>


  <Button
    variant="contained"
    fullWidth
    sx={{
      mb: 2,
      bgcolor: "#333",
      color: "white",
      borderRadius: 2,
      textTransform: "none",
      fontSize: "1rem",
      "&:hover": { bgcolor: "#222" },
    }}
    onClick={handleFileUpload}
    disabled={loading}
  >
    {loading ? (
      <CircularProgress size={24} sx={{ color: "#FFFFFF" }} />
    ) : (
      "Upload Leads in Bulk"
    )}
  </Button>


  {error && (
    <Alert severity="error" sx={{ bgcolor: "#FFEBEE", mb: 2, borderRadius: 2 }}>
      {error}
    </Alert>
  )}


  <Snackbar
    open={success}
    autoHideDuration={6000}
    onClose={() => setSuccess(false)}
    message="File uploaded successfully!"
  />
</Box>


    </>
  );
};


export default BulkDataUpload;





