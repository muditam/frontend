import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  TablePagination,
  Chip,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import axios from "axios";

const API_BASE_URL = "https://muditamleads-14f32a10d7f7.herokuapp.com";

const BankYesCcTejasv = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [page, setPage] = useState(0); // 0-based
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const fetchData = async (pageArg = page, rowsArg = rowsPerPage) => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `${API_BASE_URL}/api/bank-reconciliation/yes-cc-tejasv`,
        {
          params: {
            page: pageArg + 1, // backend 1-based
            limit: rowsArg,
          },
        }
      );
      setRows(data?.data || []);
      setTotal(data?.total || 0);
      setPage(pageArg);
      setRowsPerPage(rowsArg);
    } catch (err) {
      console.error("Error fetching Yes CC Tejasv txns:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(0, rowsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      await axios.post(
        `${API_BASE_URL}/api/bank-reconciliation/yes-cc-tejasv/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      await fetchData(0, rowsPerPage);
    } catch (err) {
      console.error("Upload error:", err);
      alert("Error uploading CSV");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleChangePage = (event, newPage) => {
    fetchData(newPage, rowsPerPage);
  };

  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10) || 50;
    fetchData(0, newRowsPerPage);
  };

  const formatDate = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleDateString("en-IN");
  };

  const formatNumber = (value) => {
    if (value == null) return "";
    return Number(value).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const fromIndex = total === 0 ? 0 : page * rowsPerPage + 1;
  const toIndex = Math.min(total, (page + 1) * rowsPerPage);

  return (
    <Box
      sx={{
        p: 3,
        bgcolor: "#f5f7fb",
        minHeight: "100vh",
        boxSizing: "border-box",
      }}
    >
      {/* Header card */}
      <Paper
        elevation={0}
        sx={{
          mb: 2,
          px: 3,
          py: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderRadius: 2,
          border: "1px solid #e0e3ef",
          background:
            "linear-gradient(135deg, rgba(0,122,255,0.06), rgba(0,0,0,0))",
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Yes CC – Tejasv
          </Typography> 
        </Box> 

        <Button
          variant="contained"
          component="label"
          startIcon={<CloudUploadIcon />}
          disabled={uploading}
          sx={{
            textTransform: "none",
            borderRadius: 999,
            px: 2.5,
            py: 0.75,
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
          }}
        >
          {uploading ? "Uploading..." : "Upload CSV"}
          <input
            type="file"
            accept=".csv"
            hidden
            onChange={handleFileChange}
          />
        </Button>
      </Paper>

      {/* Table */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 2,
          border: "1px solid #e0e3ef",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <Box
            sx={{
              py: 6,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <CircularProgress size={28} />
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: "70vh" }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      Amount
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Dr</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Remarks</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No records available. Upload a CSV to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow
                        key={row._id}
                        hover
                        sx={{
                          "&:nth-of-type(odd)": {
                            backgroundColor: "#fafbff",
                          },
                        }}
                      >
                        <TableCell>{formatDate(row.date)}</TableCell>
                        <TableCell>{row.type}</TableCell>
                        <TableCell align="right">
                          {row.amount ? formatNumber(row.amount) : ""}
                        </TableCell>
                        <TableCell>{row.dr}</TableCell>
                        <TableCell>{row.remarks}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[25, 50, 100, 200]}
              sx={{
                "& .MuiTablePagination-toolbar": {
                  justifyContent: "flex-end",
                  px: 2,
                },
                "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
                  {
                    fontSize: 12,
                  },
              }}
            />
          </>
        )}
      </Paper>
    </Box>
  );
};

export default BankYesCcTejasv;
