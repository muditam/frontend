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
      const response = await axios.post("https://www.60brands.com/api/bulk-upload", formData, {
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
    <Box sx={{ maxWidth: 600, margin: "auto", mt: 5, p: 3, border: "1px solid lightgray", borderRadius: 2 }}>
      <Typography variant="h5" gutterBottom>
        Bulk Data Upload
      </Typography>
      <TextField
        type="file"
        fullWidth
        onChange={handleFileChange}
        inputProps={{ accept: ".csv, .xlsx" }}
        sx={{ mb: 2 }}
      />
      <Button
        variant="contained"
        color="primary"
        onClick={handleFileUpload}
        disabled={loading}
        fullWidth
        sx={{ mb: 2 }}
      >
        {loading ? <CircularProgress size={24} /> : "Upload Leads in Bulk"}
      </Button>
      {error && <Alert severity="error">{error}</Alert>}
      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={() => setSuccess(false)}
        message="File uploaded successfully!"
      />
    </Box>
  );
};

export default BulkDataUpload;
