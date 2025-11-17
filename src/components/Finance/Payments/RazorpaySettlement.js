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
  TablePagination,
  CircularProgress,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DownloadIcon from "@mui/icons-material/Download";

const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";

const RazorpayUpload = () => {
  const [file, setFile] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalRecords, setTotalRecords] = useState(0);

  const fetchRecords = async (pg = 0, limit = 50) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/razorpay/data?page=${pg + 1}&limit=${limit}`
      );
      const json = await res.json();
      setRecords(json.data || []);
      setTotalPages(json.totalPages || 1);
      setTotalRecords(json.totalRecords || 0);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(page, rowsPerPage);
  }, [page, rowsPerPage]);

  const handleUpload = async () => {
    if (!file) return alert("Please select a CSV file.");
    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/razorpay/upload`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.error) {
        alert(json.error || "Upload failed");
      } else {
        alert(json.message || "Upload successful");
        setPage(0);
        fetchRecords(0, rowsPerPage);
      }
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSample = () => {
    window.open(`${API_BASE}/api/razorpay/sample`, "_blank");
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" sx={{ color: "black", mb: 3 }}>
        📄 Upload Razorpay Settlement CSV
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={handleUpload}
          sx={{
            bgcolor: "black",
            color: "#fff",
            "&:hover": { bgcolor: "#333" },
          }}
        >
          Upload
        </Button>

        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleDownloadSample}
          sx={{
            borderColor: "black",
            color: "black",
            "&:hover": { borderColor: "#333" },
          }}
        >
          Download Sample CSV
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
                  {[
                    "Upload Date",
                    "Transaction Entity",
                    "Entity ID",
                    "Amount",
                    "Currency",
                    "Fee",
                    "Tax",
                    "Debit",
                    "Credit",
                    "Payment Method",
                    "Card Type",
                    "Issuer Name",
                    "Created At",
                    "Order ID",
                    "Settlement ID",
                    "Settlement UTR",
                    "Settled At",
                    "Settled By",
                  ].map((h) => (
                    <TableCell key={h} sx={{ color: "#fff", fontWeight: 600 }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={18} align="center">
                      No records found
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((row, idx) => (
                    <TableRow key={row._id || idx}>
                      <TableCell>
                        {row.uploadDate
                          ? new Date(row.uploadDate).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>{row.transaction_entity || "-"}</TableCell>
                      <TableCell>{row.entity_id || "-"}</TableCell>
                      <TableCell>
                        {row.amount != null ? `₹${row.amount}` : "-"}
                      </TableCell>
                      <TableCell>{row.currency || "-"}</TableCell>
                      <TableCell>{row.fee != null ? row.fee : "-"}</TableCell>
                      <TableCell>{row.tax != null ? row.tax : "-"}</TableCell>
                      <TableCell>
                        {row.debit != null ? row.debit : "-"}
                      </TableCell>
                      <TableCell>
                        {row.credit != null ? row.credit : "-"}
                      </TableCell>
                      <TableCell>{row.payment_method || "-"}</TableCell>
                      <TableCell>{row.card_type || "-"}</TableCell>
                      <TableCell>{row.issuer_name || "-"}</TableCell>
                      <TableCell>{row.entity_created_at || "-"}</TableCell>
                      <TableCell>{row.order_id || "-"}</TableCell>
                      <TableCell>{row.settlement_id || "-"}</TableCell>
                      <TableCell>{row.settlement_utr || "-"}</TableCell>
                      <TableCell>{row.settled_at || "-"}</TableCell>
                      <TableCell>{row.settled_by || "-"}</TableCell>
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
          />
        </>
      )}
    </Box>
  );
};

export default RazorpayUpload;
