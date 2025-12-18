

import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  CircularProgress,
  TablePagination,
  IconButton,
  Tooltip,
  Stack,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import axios from "axios";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";


const API_BASE_URL = "https://muditamleads-14f32a10d7f7.herokuapp.com";
const START_DATE = "2025-01-01";


function formatDate(d) {
  if (!d) return "-";
  const date = new Date(d);
  return isNaN(date)
    ? "-"
    : date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
}


function normalizeTo10(str = "") {
  const digits = String(str).replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : "";
}
function normalizeStrict10(str = "") {
  const digits = String(str).replace(/\D/g, "");
  return digits.length === 10 ? digits : null;
}


const MemoRow = React.memo(function Row({ row, employees, onAssign }) {
  return (
    <TableRow>
      <TableCell>{row.order_id}</TableCell>
      <TableCell>{formatDate(row.order_date)}</TableCell>
      <TableCell>{row.full_name || "-"}</TableCell>
      <TableCell>{row.shipment_status}</TableCell>
      <TableCell>{normalizeStrict10(row.contact_number)}</TableCell>


      <TableCell sx={{ minWidth: 260 }}>
        <Autocomplete
          size="small"
          options={employees}
          getOptionLabel={(o) => o.fullName}
          sx={{ width: "50%" }}
          onChange={(e, val) => {
            if (!val) return;
            onAssign(row, val);   // ✅ correct
          }}
          renderInput={(params) => (
            <TextField {...params} label="Assign Employee" />
          )}
        />
      </TableCell>
    </TableRow>
  );
});






export default function UnassignedDeliveredOrders() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [count, setCount] = useState(null);


  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);


  const [loading, setLoading] = useState(false);
  const [loadingCount, setLoadingCount] = useState(false);
  const [error, setError] = useState("");
  const [employees, setEmployees] = useState([]);




  const fetchCount = useCallback(async () => {
    try {
      setLoadingCount(true);
      const res = await axios.get(
        `${API_BASE_URL}/api/orders-un/unassigned-delivered-count`,
        { params: { startDate: START_DATE } }
      );
      setCount(res.data.count ?? 0);
    } catch (err) {
      console.error("Count error:", err);
    } finally {
      setLoadingCount(false);
    }
  }, []);


  const fetchList = useCallback(
    async (pageNo = page, limit = rowsPerPage, force = false) => {
      const res = await axios.get(
        `${API_BASE_URL}/api/orders-un/unassigned-delivered`,
        {
          params: {
            page: pageNo + 1,
            limit,
            startDate: START_DATE,
            refresh: force ? "1" : undefined,
          },
        }
      );
      setRows(res.data.data || []);
    },
    [page, rowsPerPage]
  );


  const handleAssign = async (row, employee) => {
    try {
      await axios.post(
        `${API_BASE_URL}/api/orders-un/update-lead-from-unassigned`,
        {
          name: row.full_name,
          contactNumber: row.contact_number,
          orderId: row.order_id,
          orderDate: row.order_date,
          assignedName: employee.fullName,
        }
      );


      setRows(prev =>
        prev.filter(r => r.contact_number !== row.contact_number)
      );


      setCount(prev => (prev !== null ? prev - 1 : prev));
    } catch (err) {
      console.error("Assignment failed", err);
    }
  };






  const fetchEmployees = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/employees`);
      setEmployees(
        (res.data || []).filter(e =>
          e.status === "active" &&
          e.role?.toLowerCase().includes("retention")
        )
      );


    } catch (err) {
      console.error("Employee fetch failed", err);
    }
  }, []);


  useEffect(() => {
    fetchList(0, rowsPerPage);
    fetchCount();
    fetchEmployees();
  }, []);


  const handleChangePage = (e, newPage) => {
    setPage(newPage);
    fetchList(newPage, rowsPerPage);
  };


  const handleChangeRowsPerPage = (e) => {
    const newLimit = parseInt(e.target.value, 10);
    setRowsPerPage(newLimit);
    setPage(0);
    fetchList(0, newLimit);
  };


  const handleRefresh = () => {
    setPage(0);
    fetchList(0, rowsPerPage);
    fetchCount(true);
  };


  const memoizedRows = useMemo(() => {
    return rows.filter((row) => {
      const n = normalizeStrict10(row.contact_number);
      return Boolean(n);
    });
  }, [rows]);




  return (
    <Box p={3}>
      <Paper elevation={2} sx={{ p: 2 }}>
        {/* ---------- HEADER ---------- */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Typography variant="h6" fontWeight={600}>
            Unassigned Delivered Orders
          </Typography>


          <Stack direction="row" spacing={2} alignItems="center">
            {count !== null && (
              <Typography variant="body2" color="text.secondary">
                Total Unassigned:{" "}
                <strong>{loadingCount ? "…" : count}</strong>
              </Typography>
            )}
            <Tooltip title="Refresh">
              <IconButton onClick={handleRefresh}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>


        {loading ? (
          <Box display="flex" justifyContent="center" py={5}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : memoizedRows.length === 0 ? (
          <Typography align="center" py={4} color="text.secondary">
            No unassigned delivered orders found.
          </Typography>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Order ID</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Order Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      Shipment Status
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      Contact Number
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      Assigned To
                    </TableCell>
                  </TableRow>
                </TableHead>


                <TableBody>
                  {memoizedRows.map((row, idx) => (
                    <MemoRow key={`${row.order_id}-${idx}`} row={row} employees={employees}
                      onAssign={handleAssign} />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>


            <TablePagination
              component="div"
              count={count ?? memoizedRows.length}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </>
        )}
      </Paper>
    </Box>
  );
}



