import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  CircularProgress,
  TablePagination,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");

const headers = [
  "Upload Date",
  "Merchant Id",
  "Transaction Type",
  "Merchant Order Id",
  "Merchant Reference Id",
  "PhonePe Reference Id",
  "PhonePe Transaction Reference Id",
  "PhonePe Attempt Reference Id",
  "Transaction UTR",
  "Total Transaction Amount",
  "Transaction Date",
  "Transaction Status",
  "UPI Amount",
  "Wallet Amount",
  "Credit card Amount",
  "Debit card Amount",
  "External Wallet Amount",
  "EGV Amount",
  "Store Id",
  "Terminal Id",
  "Store Name",
  "Terminal Name",
  "Error Code",
  "Detailed Error Code",
  "Error Description",
  "Error Source",
  "Error Stage",
];

const PhonePeUpload = () => {
  const [file, setFile] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalRecords, setTotalRecords] = useState(0);

  const fetchRecords = async (pageNum = 0, limit = rowsPerPage) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/phonepe/data?page=${pageNum + 1}&limit=${limit}`,
        {
          credentials: "include",
        }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to fetch data");
      }

      setRecords(json.data || []);
      setTotalRecords(json.totalCount || 0);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(page, rowsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage]);

  const handleFileChange = (e) => setFile(e.target.files?.[0] || null);

  const handleUpload = async () => {
    if (uploading) return;
    if (!file) {
      alert("Please select a CSV file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);

    try {
      const res = await fetch(`${API_BASE}/api/phonepe/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        alert(json.error || "Upload failed.");
      } else {
        setFile(null);
        setPage(0);
        fetchRecords(0, rowsPerPage);
      }
    } catch (err) {
      console.error(err);
      alert("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" sx={{ color: "black", mb: 3 }}>
        📄 Upload PhonePe Settlement CSV
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <input type="file" accept=".csv" onChange={handleFileChange} />
        <Button
          variant="contained"
          startIcon={
            uploading ? (
              <CircularProgress size={18} sx={{ color: "#fff" }} />
            ) : (
              <CloudUploadIcon />
            )
          }
          onClick={handleUpload}
          disabled={uploading || !file}
          sx={{ bgcolor: "black", color: "#fff", "&:hover": { bgcolor: "#333" } }}
        >
          {uploading ? "Uploading..." : "Upload"}
        </Button>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        <>
          <TableContainer component={Paper} sx={{ border: "1px solid #ccc" }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: "black" }}>
                <TableRow>
                  {headers.map((head) => (
                    <TableCell key={head} sx={{ color: "#fff", fontWeight: 600 }}>
                      {head}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={headers.length} align="center">
                      No records found
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((row, idx) => (
                    <TableRow key={row._id || idx}>
                      <TableCell>
                        {row.uploadDate ? new Date(row.uploadDate).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell>{row.merchantId || "-"}</TableCell>
                      <TableCell>{row.transactionType || "-"}</TableCell>
                      <TableCell>{row.merchantOrderId || "-"}</TableCell>
                      <TableCell>{row.merchantReferenceId || "-"}</TableCell>
                      <TableCell>{row.phonePeReferenceId || "-"}</TableCell>
                      <TableCell>{row.phonePeTransactionReferenceId || "-"}</TableCell>
                      <TableCell>{row.phonePeAttemptReferenceId || "-"}</TableCell>
                      <TableCell>{row.transactionUTR || "-"}</TableCell>
                      <TableCell>₹{row.totalTransactionAmount || 0}</TableCell>
                      <TableCell>{row.transactionDate || "-"}</TableCell>
                      <TableCell>{row.transactionStatus || "-"}</TableCell>
                      <TableCell>{row.upiAmount || 0}</TableCell>
                      <TableCell>{row.walletAmount || 0}</TableCell>
                      <TableCell>{row.creditCardAmount || 0}</TableCell>
                      <TableCell>{row.debitCardAmount || 0}</TableCell>
                      <TableCell>{row.externalWalletAmount || 0}</TableCell>
                      <TableCell>{row.egvAmount || 0}</TableCell>
                      <TableCell>{row.storeId || "-"}</TableCell>
                      <TableCell>{row.terminalId || "-"}</TableCell>
                      <TableCell>{row.storeName || "-"}</TableCell>
                      <TableCell>{row.terminalName || "-"}</TableCell>
                      <TableCell>{row.errorCode || "-"}</TableCell>
                      <TableCell>{row.detailedErrorCode || "-"}</TableCell>
                      <TableCell>{row.errorDescription || "-"}</TableCell>
                      <TableCell>{row.errorSource || "-"}</TableCell>
                      <TableCell>{row.errorStage || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={totalRecords}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 30, 50, 100]}
            sx={{ mt: 2 }}
          />
        </>
      )}
    </Box>
  );
};

export default PhonePeUpload;