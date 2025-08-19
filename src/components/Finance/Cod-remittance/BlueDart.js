import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  TablePagination,
  CircularProgress,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

const BluedartUpload = () => {
  const [file, setFile] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [total, setTotal] = useState(0);

  const fetchData = async (pageNum = 0, limit = rowsPerPage) => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://muditamleads-14f32a10d7f7.herokuapp.com/api/bluedart/data?page=${pageNum + 1}&limit=${limit}`
      );
      const json = await res.json();
      setRecords(json.data || []);
      setTotal(json.totalCount || 0);
    } catch {
      alert("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(page, rowsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage]);

  const handleUpload = async () => {
    if (!file) return alert("Select a file first");
    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const res = await fetch("https://muditamleads-14f32a10d7f7.herokuapp.com/api/bluedart/upload", {
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
    } catch {
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const fmtINR = (n) =>
    n == null ? "" : `₹${Number(n).toLocaleString("en-IN")}`;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold", color: "black" }}>
        📦 Bluedart Settlement Upload
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} />
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={handleUpload}
          sx={{ bgcolor: "black", color: "#fff", "&:hover": { bgcolor: "#222" } }}
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
                    "AWB No",
                    "DPU Date",
                    "Process Date",
                    "Order ID",
                    "Portal Name",
                    "Customer Pay Amount",
                    "UTR",
                    "Settled Date",
                  ].map((head) => (
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
                    <TableCell>{row.awbNo}</TableCell>
                    <TableCell>{row.dpuDate}</TableCell>
                    <TableCell>{row.processDate}</TableCell>
                    <TableCell>{row.orderId}</TableCell>
                    <TableCell>{row.portalName}</TableCell>
                    <TableCell>{fmtINR(row.customerPayAmt)}</TableCell>
                    <TableCell>{row.utr}</TableCell>
                    <TableCell>{row.settledDate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={total}
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

export default BluedartUpload;
