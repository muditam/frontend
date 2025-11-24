// src/pages/UnassignedDeliveredOrders.jsx
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


// 🔹 Change if needed
const API_BASE_URL = "https://muditamleads-14f32a10d7f7.herokuapp.com";
const START_DATE = "2025-01-01";


/* ----------------------- NORMALIZER (UI) ------------------------ */
function normalizeTo10(str = "") {
  const digits = String(str).replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(-10);
  return digits.slice(-10) || "";
}


/* ---------------------- MEMOIZED ROW COMPONENT ---------------------- */
const MemoRow = React.memo(function Row({ row }) {
  return (
    <TableRow>
      <TableCell>{row.order_id}</TableCell>
           <TableCell>{row.full_name || "-"}</TableCell>
      <TableCell>{row.shipment_status}</TableCell>
      <TableCell>{normalizeTo10(row.contact_number)}</TableCell>
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


  /* ------------------- FETCH COUNT (FAST) ------------------- */
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


  /* ------------------- FETCH LIST (FAST + STABLE) ------------------- */
  const fetchList = useCallback(
    async (currentPage = page, limit = rowsPerPage) => {
      try {
        setLoading(true);
        setError("");


        const res = await axios.get(
          `${API_BASE_URL}/api/orders-un/unassigned-delivered`,
          {
            params: {
              page: currentPage + 1,
              limit,
              startDate: START_DATE,
            },
          }
        );


        setRows(res.data.data || []);
        setTotal(res.data.total || 0);
      } catch (err) {
        console.error("List error:", err);
        setError("Unable to load data.");
      } finally {
        setLoading(false);
      }
    },
    [page, rowsPerPage]
  );


  /* ------------------- INITIAL LOAD ------------------- */
  useEffect(() => {
    fetchList(0, rowsPerPage);
    fetchCount();
  }, []);


  /* ------------------- MEMOIZED ROWS ------------------- */
  const memoizedRows = useMemo(() => rows, [rows]);


  /* ------------------- PAGE CHANGE ------------------- */
  const handleChangePage = useCallback(
    (event, newPage) => {
      setPage(newPage);
      fetchList(newPage, rowsPerPage);
    },
    [rowsPerPage, fetchList]
  );


  /* ------------------- ROW-PER-PAGE CHANGE ------------------- */
  const handleChangeRowsPerPage = useCallback(
    (event) => {
      const newLimit = parseInt(event.target.value, 10);
      setRowsPerPage(newLimit);
      setPage(0);
      fetchList(0, newLimit);
    },
    [fetchList]
  );


  /* ------------------- REFRESH ------------------- */
  const handleRefresh = useCallback(() => {
    fetchList(0, rowsPerPage);
    fetchCount();
  }, [rowsPerPage]);


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


        {/* ------------ LOADING ------------ */}
        {loading ? (
          <Box justifyContent="center" alignItems="center" py={5} display="flex">
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
            {/* ------------ TABLE ------------ */}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Order ID</TableCell>
                       <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Shipment Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Contact Number</TableCell>
                  </TableRow>
                </TableHead>


                <TableBody>
                  {memoizedRows.map((row, idx) => (
                    <MemoRow key={`${row.order_id}-${idx}`} row={row} />
                   
                  ))}
                </TableBody>
              </Table>
            </TableContainer>


            {/* ---------- PAGINATION ---------- */}
            <TablePagination
              component="div"
              count={total}
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



