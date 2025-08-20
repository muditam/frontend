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
  "S. No.",
  "Transaction Type",
  "Payment Id",
  "Order Id",
  "Amount",
  "Currency",
  "Tax",
  "Fee",
  "Additional Fees",
  "Additional Tax",
  "Debit",
  "gokwik Deduction",
  "Credit",
  "Payment Method",
  "Transaction Date",
  "Transaction RRN",
  "Merchant Order Id",
  "Shopify Order Id",
  "Shopify Transaction Id",
  "Settlement UTR",
  "Settlement Date",
  "Settled By",
  "Payment Mode",
  "Bank Code",
  "Card Network",
];

const EasebuzzUpload = () => {
  const [file, setFile] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  const fetchData = async (pageNum = 0, limit = rowsPerPage) => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://muditamleads-14f32a10d7f7.herokuapp.com/api/easebuzz/data?page=${pageNum + 1}&limit=${limit}`
      );
      const json = await res.json();
      setRecords(json.data || []);
      setTotalCount(json.totalCount || 0);
    } catch (err) {
      alert("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(page, rowsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage]);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleUpload = async () => {
    if (!file) return alert("Please select a CSV file.");

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const res = await fetch("https://muditamleads-14f32a10d7f7.herokuapp.com/api/easebuzz/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.error) {
        alert(json.error);
      } else {
        alert(`Upload successful (${json.inserted || 0} rows)`);
        setPage(0);
        fetchData(0, rowsPerPage);
      }
    } catch (err) {
      alert("Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const fmtINR = (n) =>
    n == null ? "" : `₹${Number(n).toLocaleString("en-IN")}`;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" sx={{ color: "black", mb: 3 }}>
        📥 Upload Easebuzz Transactions
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
          <TableContainer component={Paper}>
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
                  <TableRow key={row._id || idx}>
                    <TableCell>
                      {row.uploadDate ? new Date(row.uploadDate).toLocaleDateString() : ""}
                    </TableCell>
                    <TableCell>{row.serialNo}</TableCell>
                    <TableCell>{row.transactionType}</TableCell>
                    <TableCell>{row.paymentId}</TableCell>
                    <TableCell>{row.orderId}</TableCell>
                    <TableCell>{fmtINR(row.amount)}</TableCell>
                    <TableCell>{row.currency}</TableCell>
                    <TableCell>{row.tax}</TableCell>
                    <TableCell>{row.fee}</TableCell>
                    <TableCell>{row.additionalFees}</TableCell>
                    <TableCell>{row.additionalTax}</TableCell>
                    <TableCell>{row.debit}</TableCell>
                    <TableCell>{row.gokwikDeduction}</TableCell>
                    <TableCell>{row.credit}</TableCell>
                    <TableCell>{row.paymentMethod}</TableCell>
                    <TableCell>{row.transactionDate}</TableCell>
                    <TableCell>{row.transactionRRN}</TableCell>
                    <TableCell>{row.merchantOrderId}</TableCell>
                    <TableCell>{row.shopifyOrderId}</TableCell>
                    <TableCell>{row.shopifyTransactionId}</TableCell>
                    <TableCell>{row.settlementUTR}</TableCell>
                    <TableCell>{row.settlementDate}</TableCell>
                    <TableCell>{row.settledBy}</TableCell>
                    <TableCell>{row.paymentMode}</TableCell>
                    <TableCell>{row.bankCode}</TableCell>
                    <TableCell>{row.cardNetwork}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 30, 50, 100]}
          />
        </>
      )}
    </Box>
  );
};

export default EasebuzzUpload;
