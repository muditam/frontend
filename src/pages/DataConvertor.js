import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import DownloadIcon from "@mui/icons-material/Download";
import * as XLSX from "xlsx";

const OUTPUT_COLUMNS = ["phone", "email", "firstName", "lastName", "name"];

const normalizeHeader = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getValue = (row, names) => {
  const normalizedMap = Object.entries(row).reduce((acc, [key, value]) => {
    acc[normalizeHeader(key)] = value;
    return acc;
  }, {});

  for (const name of names) {
    const value = normalizedMap[normalizeHeader(name)];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim().replace(/^'+/, "");
    }
  }

  return "";
};

const normalizePhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  if (digits.length > 12) return digits.slice(-12);
  return digits.padStart(12, "0");
};

const buildCleanRows = (rows) =>
  rows
    .map((row) => {
      const phone = normalizePhone(
        getValue(row, ["Phone", "Default Address Phone", "phone", "Mobile"])
      );
      const email = getValue(row, ["Email", "email"]);
      const firstName = getValue(row, ["First Name", "firstName", "FirstName"]);
      const lastName = getValue(row, ["Last Name", "lastName", "LastName"]);
      const fullName =
        getValue(row, ["Name", "Customer Name", "Full Name"]) ||
        [firstName, lastName].filter(Boolean).join(" ");

      return {
        phone,
        email,
        firstName,
        lastName,
        name: fullName,
      };
    })
    .filter((row) => row.phone || row.email || row.firstName || row.lastName || row.name);

const getOutputFileName = (originalName, format) => {
  const safeName = String(originalName || "converted-data").replace(/\.[^.]+$/, "");
  return `${safeName}.${format}`;
};

const downloadRows = (cleanRows, fileName, format) => {
  const outputSheet = XLSX.utils.json_to_sheet(cleanRows, { header: OUTPUT_COLUMNS });
  const outputWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(outputWorkbook, outputSheet, "Clean Data");
  XLSX.writeFile(outputWorkbook, getOutputFileName(fileName, format), {
    bookType: format,
  });
};

const parseRowsFromFile = async (selectedFile) => {
  const buffer = await selectedFile.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", raw: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
};

const DataConvertor = () => {
  const [file, setFile] = useState(null);
  const [duplicateFile, setDuplicateFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [duplicateSummary, setDuplicateSummary] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState("csv");

  const previewRows = useMemo(() => rows.slice(0, 10), [rows]);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    setFile(selectedFile || null);
    setRows([]);
    setDuplicateSummary(null);
    setError("");
  };

  const handleDuplicateFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    setDuplicateFile(selectedFile || null);
    setRows([]);
    setDuplicateSummary(null);
    setError("");
  };

  const handleConvert = async () => {
    if (!file) {
      setError("Please upload a CSV or Excel file first.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const parsedRows = await parseRowsFromFile(file);
      const cleanRows = buildCleanRows(parsedRows);

      if (!cleanRows.length) {
        setRows([]);
        setDuplicateSummary(null);
        setError("No usable rows found in this file.");
        return;
      }

      let finalRows = cleanRows;
      let summary = null;

      if (duplicateFile) {
        const duplicateParsedRows = await parseRowsFromFile(duplicateFile);
        const duplicateRows = buildCleanRows(duplicateParsedRows);
        const duplicatePhones = new Set(
          duplicateRows.map((row) => row.phone).filter(Boolean)
        );

        if (!duplicatePhones.size) {
          setRows([]);
          setDuplicateSummary(null);
          setError("No usable phone numbers found in the duplicate data sheet.");
          return;
        }

        finalRows = cleanRows.filter(
          (row) => !row.phone || !duplicatePhones.has(row.phone)
        );
        summary = {
          originalCount: cleanRows.length,
          duplicatePhoneCount: duplicatePhones.size,
          removedCount: cleanRows.length - finalRows.length,
        };
      }

      if (!finalRows.length) {
        setRows([]);
        setDuplicateSummary(summary);
        setError("All rows were removed after checking the duplicate data sheet.");
        return;
      }

      setRows(finalRows);
      setDuplicateSummary(summary);
      downloadRows(finalRows, file.name, exportFormat);
    } catch (err) {
      setError("Could not convert this file. Please upload a valid CSV or Excel file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", p: { xs: 2, md: 4 } }}>
      <Paper
        elevation={0}
        sx={{
          border: "1px solid #e2e8f0",
          borderRadius: 2,
          p: { xs: 2.5, md: 4 },
          background: "#fff",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 3 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#0f172a" }}>
              Data Convertor
            </Typography>
            <Typography variant="body2" sx={{ color: "#64748b", mt: 0.75 }}>
              Upload Shopify CSV or Excel data and download a clean sheet.
            </Typography>
          </Box>
          <Chip label="phone, email, firstName, lastName, name" variant="outlined" />
        </Box>

        <Box
          sx={{
            border: "1.5px dashed #94a3b8",
            borderRadius: 2,
            p: 3,
            background: "#f8fafc",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
              <UploadFileIcon sx={{ color: "#2563eb" }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600, color: "#0f172a" }}>
                  {file ? file.name : "Upload CSV or Excel file"}
                </Typography>
              </Box>
            </Box>

            <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
              Upload File
              <input hidden type="file" accept=".csv,.xls,.xlsx" onChange={handleFileChange} />
            </Button>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
              <CleaningServicesIcon sx={{ color: "#0f766e" }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600, color: "#0f172a" }}>
                  {duplicateFile ? duplicateFile.name : "Upload duplicate data sheet"}
                </Typography>
                <Typography variant="body2" sx={{ color: "#64748b" }}>
                  Matching phone numbers will be removed before conversion.
                </Typography>
              </Box>
            </Box>

            <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
              Upload Duplicate
              <input hidden type="file" accept=".csv,.xls,.xlsx" onChange={handleDuplicateFileChange} />
            </Button>
          </Box>

          <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end" }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="export-format-label">Convert To</InputLabel>
              <Select
                labelId="export-format-label"
                value={exportFormat}
                label="Convert To"
                onChange={(event) => setExportFormat(event.target.value)}
              >
                <MenuItem value="csv">CSV</MenuItem>
                <MenuItem value="xlsx">Excel</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <CleaningServicesIcon />}
              onClick={handleConvert}
              disabled={loading}
              sx={{ backgroundColor: "#1d4ed8", textTransform: "none" }}
            >
              Convert
            </Button>
          </Box>
        </Box>

        {duplicateSummary && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Removed {duplicateSummary.removedCount} duplicate rows from {duplicateSummary.originalCount} rows.
            Checked {duplicateSummary.duplicatePhoneCount} phone numbers from the duplicate sheet.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {rows.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
              <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>
                Preview ({rows.length} rows converted)
              </Typography>
              <Button
                size="small"
                startIcon={<DownloadIcon />}
                onClick={() => downloadRows(rows, file?.name, exportFormat)}
                disabled={loading}
                sx={{ textTransform: "none" }}
              >
                Download Again
              </Button>
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {OUTPUT_COLUMNS.map((column) => (
                      <TableCell key={column} sx={{ fontWeight: 700 }}>
                        {column}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewRows.map((row, index) => (
                    <TableRow key={`${row.phone}-${row.email}-${index}`}>
                      {OUTPUT_COLUMNS.map((column) => (
                        <TableCell key={column}>{row[column]}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default DataConvertor;
