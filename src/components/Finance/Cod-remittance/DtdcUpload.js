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

const DtdcUpload = () => {
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
        `https://muditamleads-14f32a10d7f7.herokuapp.com/api/dtdc/data?page=${pageNum + 1}&limit=${limit}`
      );
      const json = await res.json();
      setRecords(json.data || []);
      setTotalCount(json.totalCount || 0);
    } catch (err) {
      alert("Failed to fetch DTDC data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(page, rowsPerPage);
  }, [page, rowsPerPage]);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleUpload = async () => {
    if (!file) return alert("Please select a CSV file.");

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const res = await fetch("https://muditamleads-14f32a10d7f7.herokuapp.com/api/dtdc/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (json.error) {
        alert(json.error);
      } else {
        alert("Upload successful");
        fetchData(0, rowsPerPage);
      }
    } catch (err) {
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" sx={{ color: "black", mb: 3 }}>
        📦 Upload DTDC Settlement CSV
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
                  {[
                    "Upload Date",
                    "CN Number",
                    "Customer Reference Number",
                    "Booking Date",
                    "Delivery Date",
                    "COD Amount",
                    "Remitted Amount",
                    "Remittance Status",
                    "UTR Number",
                    "Remittance Date",
                  ].map((head) => (
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
                    <TableCell>{row.cnNumber}</TableCell>
                    <TableCell>{row.customerReferenceNumber}</TableCell>
                    <TableCell>{row.bookingDate}</TableCell>
                    <TableCell>{row.deliveryDate}</TableCell>
                    <TableCell>₹{row.codAmount}</TableCell>
                    <TableCell>₹{row.remittedAmount}</TableCell>
                    <TableCell>{row.remittanceStatus}</TableCell>
                    <TableCell>{row.utrNumber}</TableCell>
                    <TableCell>{row.remittanceDate}</TableCell>
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
            sx={{ mt: 2 }}
          />
        </>
      )}
    </Box>
  );
};

export default DtdcUpload;
