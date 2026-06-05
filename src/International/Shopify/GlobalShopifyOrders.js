// src/pages/GlobalShopifyOrders.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
} from "@mui/material";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// Use the same base URL style as rest of your app 
const API_BASE_URL = "http://localhost:5001";

const PRODUCT_CONDITION_MAP = [
  { match: "karela jamun fizz", condition: "Diabetes" },
  { match: "sugar defend pro", condition: "Diabetes" },
  { match: "liver fix", condition: "Liver" },
  { match: "heart defend pro", condition: "Cholesterol" },
  { match: "thyroid defend pro", condition: "Thyroid" },
];

const deriveConditionsFromProducts = (productsOrdered = "") => {
  const text = String(productsOrdered || "").toLowerCase();
  if (!text.trim()) return ["Others"];

  const rawItems = String(productsOrdered || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const conditions = new Set();

  rawItems.forEach((item) => {
    const normalizedItem = item.toLowerCase();
    const found = PRODUCT_CONDITION_MAP.find(({ match }) =>
      normalizedItem.includes(match)
    );

    if (found) {
      conditions.add(found.condition);
    } else {
      conditions.add("Others");
    }
  });

  if (!rawItems.length && text) {
    const foundAnyMapped = PRODUCT_CONDITION_MAP.some(({ match }) =>
      text.includes(match)
    );
    if (foundAnyMapped) {
      PRODUCT_CONDITION_MAP.forEach(({ match, condition }) => {
        if (text.includes(match)) conditions.add(condition);
      });
    } else {
      conditions.add("Others");
    }
  }

  return Array.from(conditions);
};

const GlobalShopifyOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(0); // MUI TablePagination is 0-based
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [agents, setAgents] = useState([]);
  const [selectedAgentByOrder, setSelectedAgentByOrder] = useState({});

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await axios.get(
        `${API_BASE_URL}/api/global-shopify-orders`,
        {
          params: {
            page: page + 1, // backend is 1-based
            limit: rowsPerPage,
          },
        }
      );

      setOrders(res.data.orders || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("Error fetching global Shopify orders:", err);
      setError(
        err.response?.data?.message ||
          "Failed to load global Shopify orders."
      );
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/employees`);
        const employees = Array.isArray(res.data) ? res.data : [];
        const internationalAgents = employees.filter((employee) => {
          const role = String(employee?.role || "").trim().toLowerCase();
          const status = String(employee?.status || "").trim().toLowerCase();
          return role === "international agent" && status === "active";
        });
        setAgents(internationalAgents);
      } catch (err) {
        console.error("Error fetching international agents:", err);
      }
    };

    fetchAgents();
  }, []);

  const handleChangePage = (_event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (amount) => {
    if (amount == null || amount === "") return "";
    const value = Number(amount);
    if (Number.isNaN(value)) return `$${amount}`;
    return `$${value}`;
  };

  const handleAssignAgent = (order, agentId) => {
    setSelectedAgentByOrder((prev) => ({ ...prev, [order.id]: agentId }));
    if (!agentId) return;

    const conditions = deriveConditionsFromProducts(order.productsOrdered);

    navigate("/global-retention-leads", {
      state: {
        openAddDialog: true,
        prefillLead: {
          name: order.customerName || "",
          number: order.contactNumber || "",
          age: "",
          lookingFor: conditions,
          sourceOrderId: order.id,
          sourceOrderName: order.orderName || "",
          assignedAgentId: agentId,
        },
      },
    });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold" }}>
        Global Shopify Orders
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: "70vh" }}>
          {loading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "200px",
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Order Name</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Contact Number</TableCell>
                  <TableCell>Order Date</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Mode of Payment</TableCell>
                  <TableCell>Products Ordered</TableCell>
                  <TableCell>Channel Name</TableCell>
                  <TableCell>Assign</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      No orders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.orderName}</TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>{order.contactNumber}</TableCell>
                      <TableCell>{formatDate(order.orderDate)}</TableCell>
                      <TableCell>{formatAmount(order.amount)}</TableCell>
                      <TableCell>{order.modeOfPayment}</TableCell>
                      <TableCell>{order.productsOrdered}</TableCell>
                      <TableCell>{order.channelName}</TableCell>
                      <TableCell sx={{ minWidth: 240 }}>
                        <TextField
                          select
                          size="small"
                          fullWidth
                          value={selectedAgentByOrder[order.id] || ""}
                          onChange={(e) => handleAssignAgent(order, e.target.value)}
                          SelectProps={{ displayEmpty: true }}
                        >
                          <MenuItem value="">Select International Agent</MenuItem>
                          {agents.map((agent) => (
                            <MenuItem key={agent._id} value={agent._id}>
                              {agent.fullName}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 20, 50, 100]}
        />
      </Paper>
    </Box>
  );
};

export default GlobalShopifyOrders;
