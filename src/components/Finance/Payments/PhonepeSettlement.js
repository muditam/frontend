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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalRecords, setTotalRecords] = useState(0);

  const fetchRecords = async (pageNum = 0, limit = rowsPerPage) => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://muditamleads-14f32a10d7f7.herokuapp.com/api/phonepe/data?page=${pageNum + 1}&limit=${limit}`
      );
      const json = await res.json();
      setRecords(json.data);
      setTotalRecords(json.totalCount || 0);
    } catch {
      alert("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(page, rowsPerPage);
  }, [page, rowsPerPage]);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleUpload = async () => {
    if (!file) return alert("Please select a CSV file.");

    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);

    try {
      const res = await fetch("https://muditamleads-14f32a10d7f7.herokuapp.com/api/phonepe/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (json.error) {
        alert(json.error);
      } else {
        fetchRecords(0, rowsPerPage); 
      }
    } catch {
      alert("Upload failed.");
    } finally {
      setLoading(false);
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
          startIcon={<CloudUploadIcon />}
          onClick={handleUpload}
          sx={{ bgcolor: "black", color: "#fff", "&:hover": { bgcolor: "#333" } }}
        >
          Upload
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
                {records.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{new Date(row.uploadDate).toLocaleDateString()}</TableCell>
                    <TableCell>{row.merchantId}</TableCell>
                    <TableCell>{row.transactionType}</TableCell>
                    <TableCell>{row.merchantOrderId}</TableCell>
                    <TableCell>{row.merchantReferenceId}</TableCell>
                    <TableCell>{row.phonePeReferenceId}</TableCell>
                    <TableCell>{row.phonePeTransactionReferenceId}</TableCell>
                    <TableCell>{row.phonePeAttemptReferenceId}</TableCell>
                    <TableCell>{row.transactionUTR}</TableCell>
                    <TableCell>₹{row.totalTransactionAmount}</TableCell>
                    <TableCell>{row.transactionDate}</TableCell>
                    <TableCell>{row.transactionStatus}</TableCell>
                    <TableCell>{row.upiAmount}</TableCell>
                    <TableCell>{row.walletAmount}</TableCell>
                    <TableCell>{row.creditCardAmount}</TableCell>
                    <TableCell>{row.debitCardAmount}</TableCell>
                    <TableCell>{row.externalWalletAmount}</TableCell>
                    <TableCell>{row.egvAmount}</TableCell>
                    <TableCell>{row.storeId}</TableCell>
                    <TableCell>{row.terminalId}</TableCell>
                    <TableCell>{row.storeName}</TableCell>
                    <TableCell>{row.terminalName}</TableCell>
                    <TableCell>{row.errorCode}</TableCell>
                    <TableCell>{row.detailedErrorCode}</TableCell>
                    <TableCell>{row.errorDescription}</TableCell>
                    <TableCell>{row.errorSource}</TableCell>
                    <TableCell>{row.errorStage}</TableCell>
                  </TableRow>
                ))}
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
