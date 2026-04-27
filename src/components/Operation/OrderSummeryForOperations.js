import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  CircularProgress,
  Chip,
  Stack,
  TextField,
  MenuItem,
  Button,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Divider,
  Card,
  Autocomplete,
} from "@mui/material";
import {
  Phone as PhoneIcon,
  Refresh as RefreshIcon,
  LocalShipping as ShippingIcon,
  FileDownload as DownloadIcon,
  Person as PersonIcon,
  ShoppingBag as OrderIcon,
} from "@mui/icons-material";
import axios from "axios";
import dayjs from "dayjs";
 
const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Ops Remark options (condition-wise)
const OPS_REMARK_OPTIONS = {
  rto: ["New Order Punch", "Fake Remarks", "Ringing", "Consignee dont want the order"],
  undelivered: [
    "Fake Remarks",
    "Delivery Delayed",
    "Ringing",
    "Hold",
    "Consignee dont want the order",
    "Delivered",
    "Forced to share Otp",
  ],
};

// Helper for status chip colors
const getStatusColor = (status) => {
  const s = status?.toLowerCase() || "";
  if (s.includes("delivered")) return "success";
  if (s.includes("out for delivery")) return "info";
  if (s.includes("rto") || s.includes("fail")) return "error";
  if (s.includes("pick")) return "secondary";
  return "default";
};

const UndeliveredOrders = () => {
  const [orders, setOrders] = useState([]);
  const [statusCounts, setStatusCounts] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedCarrier, setSelectedCarrier] = useState("");
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [callingMessage, setCallingMessage] = useState("");
  const [viewTab, setViewTab] = useState(0); // 0 = Pending, 1 = Processed
  const [employees, setEmployees] = useState([]);
  const [orderCounts, setOrderCounts] = useState({}); // contact_number -> count
  const [phoneToAgentMap, setPhoneToAgentMap] = useState({}); // phone -> agentId

  // Only Sales Agent + Retention Agent (Active)
  const assignableAgents = useMemo(() => {
    return (employees || []).filter((e) => {
      const status = String(e.status || "active").toLowerCase();
      const role = String(e.role || "").toLowerCase().trim();
      const allowed = role === "sales agent" || role === "retention agent";
      return status === "active" && allowed;
    });
  }, [employees]);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await api.get("/api/employees");
      const list = res.data || [];
      setEmployees(list);

      // Build phone -> agent map ONLY for active Sales/Retention
      const phoneMap = {};
      list.forEach((emp) => {
        const status = String(emp.status || "active").toLowerCase();
        const role = String(emp.role || "").toLowerCase().trim();
        const allowed = role === "sales agent" || role === "retention agent";

        if (emp.phone && status === "active" && allowed) {
          phoneMap[String(emp.phone).trim()] = emp._id;
        }
      });
      setPhoneToAgentMap(phoneMap);
    } catch (e) {
      console.error("Failed to fetch employees", e);
    }
  }, []);

  const fetchOrderCounts = useCallback(async () => {
    try {
      const res = await api.get("/api/operations/order-counts");
      setOrderCounts(res.data || {});
    } catch (e) {
      console.error("Failed to fetch order counts", e);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const viewTabParam = viewTab === 0 ? "pending" : "processed";

      const res = await api.get("/api/operations/undelivered-orders", {
        params: {
          page: page + 1,
          limit,
          status: selectedStatus || undefined,
          carrier: selectedCarrier || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          viewTab: viewTabParam,
          selectedAgent: viewTab === 1 ? selectedAgent?._id || undefined : undefined,
        },
      });

      setOrders(res.data.orders || []);
      setTotalCount(res.data.totalCount || 0);
      setStatusCounts(res.data.statusCounts || []);
      setCarriers(res.data.carriers || []);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      setCallingMessage("Error loading orders");
      setTimeout(() => setCallingMessage(""), 3000);
    } finally {
      setLoading(false);
    }
  }, [page, limit, selectedStatus, selectedCarrier, startDate, endDate, viewTab, selectedAgent]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchOrderCounts();
  }, [fetchOrderCounts]);

  useEffect(() => {
    setPage(0);
  }, [viewTab, selectedStatus, selectedCarrier, startDate, endDate, selectedAgent]);

  const visibleOrders = orders;
  const visibleCount = totalCount;

  const patchLocalByOrderId = useCallback((order_id, patch) => {
    setOrders((prev) => prev.map((o) => (o.order_id === order_id ? { ...o, ...patch } : o)));
  }, []);

  const saveOpsMeta = useCallback(async (order, patch) => {
    const response = await api.patch("/api/operations/ops-meta/by-order-id", {
      order_id: order.order_id,
      ...patch,
    });
    return response.data;
  }, []);

  // Condition-wise options: RTO vs Undelivered
  const getRemarkOptions = useCallback((shipmentStatus) => {
    const normalized = String(shipmentStatus || "").toLowerCase().trim();
    const isRto = normalized.includes("rto");
    return isRto ? OPS_REMARK_OPTIONS.rto : OPS_REMARK_OPTIONS.undelivered;
  }, []);

  const handleRemarkChange = useCallback(
    async (order, value) => {
      const remark = String(value || "").trim();

      patchLocalByOrderId(order.order_id, {
        opsRemark: remark,
        last_updated_at: new Date().toISOString(),
      });

      try {
        // Auto-fill agent based on phone mapping (only Sales/Retention)
        const agentPatch = { opsRemark: remark };

        if (remark && !order.assignedAgentId && order.contact_number) {
          const mappedAgentId = phoneToAgentMap[String(order.contact_number).trim()];
          if (mappedAgentId) {
            agentPatch.assignedAgentId = mappedAgentId;
            patchLocalByOrderId(order.order_id, { assignedAgentId: mappedAgentId });
          }
        }

        await saveOpsMeta(order, agentPatch);

        setCallingMessage(`Remark ${remark ? "saved" : "removed"} successfully`);
        setTimeout(() => setCallingMessage(""), 2000);
        fetchOrders();
      } catch (e) {
        console.error("Failed to save remark", e);
        setCallingMessage("Error saving remark");
        setTimeout(() => setCallingMessage(""), 3000);
        fetchOrders();
      }
    },
    [patchLocalByOrderId, saveOpsMeta, fetchOrders, phoneToAgentMap]
  );

  const handleAssignAgent = useCallback(
    async (order, agent) => {
      const assignedAgentId = agent?._id || null;

      patchLocalByOrderId(order.order_id, {
        assignedAgentId,
        last_updated_at: new Date().toISOString(),
      });

      try {
        await saveOpsMeta(order, { assignedAgentId });
        setCallingMessage("Agent assigned successfully");
        setTimeout(() => setCallingMessage(""), 2000);
      } catch (e) {
        console.error("Failed to assign agent", e);
        setCallingMessage("Error assigning agent");
        setTimeout(() => setCallingMessage(""), 3000);
        fetchOrders();
      }
    },
    [patchLocalByOrderId, saveOpsMeta, fetchOrders]
  );

  const handleCallIconClick = async (contactNumber) => {
    setCallingMessage(`Initiating call to ${contactNumber}...`);
    try {
      const loggedInUser = JSON.parse(sessionStorage.getItem("user"));
      if (!loggedInUser) {
        setCallingMessage("Error: User not logged in.");
        setTimeout(() => setCallingMessage(""), 3000);
        return;
      }

      const agentNumber = loggedInUser.phone || loggedInUser.agentNumber || "";
      const callerId = process.env.REACT_APP_CALLER_ID || "";

      const requestBody = {
        destination_number: contactNumber,
        async: 1,
        agent_number: agentNumber.toString().trim(),
        caller_id: callerId.toString().trim(),
      };

      const response = await api.post("/api/click_to_call", requestBody);
      setCallingMessage(response.data.status === "success" ? `Connected to ${contactNumber}` : "Call failed.");
    } catch (error) {
      setCallingMessage("Error placing the call.");
    }
    setTimeout(() => setCallingMessage(""), 5000);
  };

  const handleExportCSV = useCallback(() => {
    try {
      const getAgentName = (agentId) => {
        if (!agentId) return "Unassigned";
        const agent = employees.find((e) => e._id === agentId);
        return agent ? agent.fullName : "Unassigned";
      };

      const headers = [
        "Order ID",
        "Customer Name",
        "Contact Number",
        "Tracking Number",
        "Mode of Payment",
        "Carrier",
        "Shipment Status",
        "Order Date",
        "Ops Remark",
        "Assigned Agent",
        "Last Updated",
      ];

      const rows = visibleOrders.map((order) => [
        order.order_id || "",
        order.full_name || "",
        order.contact_number || "",
        order.tracking_number || "",
        order.financial_status === "pending" ? "COD" : order.financial_status || "",
        order.carrier_title || "",
        order.shipment_status || "",
        order.order_date ? dayjs(order.order_date).format("DD/MM/YYYY") : "",
        order.opsRemark || "",
        getAgentName(order.assignedAgentId),
        order.last_updated_at ? dayjs(order.last_updated_at).format("DD/MM/YYYY HH:mm") : "",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      const fileName = `processed_orders_${dayjs().format("YYYY-MM-DD_HH-mm")}.csv`;

      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setCallingMessage(`Exported ${visibleOrders.length} orders to ${fileName}`);
      setTimeout(() => setCallingMessage(""), 3000);
    } catch (error) {
      console.error("Export error:", error);
      setCallingMessage("Error exporting CSV file");
      setTimeout(() => setCallingMessage(""), 3000);
    }
  }, [visibleOrders, employees]);

  const getAssignedAgent = (agentId) => assignableAgents.find((a) => a._id === agentId) || null;

  const totalAll = statusCounts.reduce((acc, s) => acc + (s.count || 0), 0);

  return (
    <Box sx={{ p: 3, bgcolor: "#f8f9fa", minHeight: "100vh" }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#1a2027" }}>
            Undelivered Orders
          </Typography>
        </Box>

        <Stack direction="row" spacing={2} alignItems="center">
          {viewTab === 1 && (
            <Button
              variant="contained"
              color="success"
              startIcon={<DownloadIcon />}
              onClick={handleExportCSV}
              disabled={visibleOrders.length === 0}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                boxShadow: "0 4px 12px rgba(46, 125, 50, 0.25)",
              }}
            >
              Export CSV ({visibleOrders.length})
            </Button>
          )}

          <Box
            sx={{
              bgcolor: "#fff",
              borderRadius: 2,
              p: 0.5,
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            }}
          >
            <Tabs
              value={viewTab}
              onChange={(e, v) => {
                setViewTab(v);
                setPage(0);
                setSelectedAgent(null);
              }}
              sx={{
                minHeight: 40,
                "& .MuiTab-root": {
                  minHeight: 40,
                  px: 3,
                  fontWeight: 600,
                  textTransform: "none",
                },
              }}
            >
              <Tab label="Pending" />
              <Tab label="Processed" />
            </Tabs>
          </Box>
        </Stack>
      </Stack>

      {callingMessage && (
        <Paper
          sx={{
            p: 1.5,
            mb: 2,
            bgcolor: "#e3f2fd",
            borderLeft: "4px solid #1976d2",
            display: "flex",
            alignItems: "center",
          }}
        >
          <PhoneIcon sx={{ mr: 2, color: "#1976d2" }} fontSize="small" />
          <Typography variant="body2" sx={{ fontWeight: 500, color: "#1976d2" }}>
            {callingMessage}
          </Typography>
        </Paper>
      )}

      <Card sx={{ p: 2, mb: 3, borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
            <TextField
              label="Start Date"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              sx={{ width: 180 }}
            />
            <TextField
              label="End Date"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              sx={{ width: 180 }}
            />

            <TextField
              select
              label="Carrier"
              size="small"
              value={selectedCarrier}
              onChange={(e) => setSelectedCarrier(e.target.value)}
              sx={{ minWidth: 200 }}
              InputProps={{
                startAdornment: <ShippingIcon sx={{ mr: 1, color: "action.active" }} fontSize="small" />,
              }}
            >
              <MenuItem value="">All Carriers</MenuItem>
              {carriers.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>

            {viewTab === 1 && (
              <Autocomplete
                size="small"
                value={selectedAgent}
                onChange={(e, newValue) => setSelectedAgent(newValue)}
                options={[{ _id: "unassigned", fullName: "Unassigned" }, ...assignableAgents]}
                getOptionLabel={(option) => option.fullName || ""}
                isOptionEqualToValue={(option, value) => option._id === value._id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Assigned Expert"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <PersonIcon sx={{ mr: 1, ml: 1, color: "action.active" }} fontSize="small" />
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                sx={{ minWidth: 250 }}
              />
            )}

            <Box sx={{ flexGrow: 1 }} />

            <Button
              startIcon={<RefreshIcon />}
              onClick={() => {
                setSelectedCarrier("");
                setSelectedStatus("");
                setSelectedAgent(null);
                setStartDate("");
                setEndDate("");
                setPage(0);
              }}
              variant="outlined"
              color="inherit"
              sx={{ borderRadius: 2, textTransform: "none" }}
            >
              Reset
            </Button>
          </Stack>

          <Divider />

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label={`All Orders (${totalAll})`}
              onClick={() => setSelectedStatus("")}
              variant={!selectedStatus ? "filled" : "outlined"}
              sx={{
                fontWeight: 600,
                ...(!selectedStatus && {
                  bgcolor: "black",
                  color: "white",
                  "&:hover": { bgcolor: "#333" },
                }),
              }}
            />
            {statusCounts.map((s) => (
              <Chip
                key={s.shipment_status}
                label={`${s.shipment_status} (${s.count})`}
                onClick={() => {
                  setSelectedStatus(s.shipment_status);
                  setPage(0);
                }}
                variant={selectedStatus === s.shipment_status ? "filled" : "outlined"}
                sx={{
                  fontWeight: 500,
                  ...(selectedStatus === s.shipment_status && {
                    bgcolor: "black",
                    color: "white",
                    "&:hover": { bgcolor: "#333" },
                  }),
                }}
              />
            ))}
          </Stack>
        </Stack>
      </Card>

      <Paper sx={{ borderRadius: 3, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {[
                  "Order ID",
                  "Customer",
                  "Contact",
                  "Tracking",
                  "Mode of Payment",
                  "Carrier",
                  "Status",
                  "Date",
                  "Ops Remark",
                ].map((h) => (
                  <TableCell key={h} sx={{ bgcolor: "#f1f3f5", fontWeight: 700, py: 2 }}>
                    {h}
                  </TableCell>
                ))}
                {viewTab === 1 && (
                  <TableCell sx={{ bgcolor: "#f1f3f5", fontWeight: 700 }}>Assign Expert</TableCell>
                )}
                <TableCell sx={{ bgcolor: "#f1f3f5", fontWeight: 700 }}>Last Updated</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={viewTab === 1 ? 11 : 10} align="center" sx={{ py: 10 }}>
                    <CircularProgress size={30} thickness={5} />
                    <Typography sx={{ mt: 2 }} color="text.secondary">
                      Fetching data...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : visibleOrders.length > 0 ? (
                visibleOrders.map((order) => {
                  const orderCount = orderCounts[order.contact_number] || 0;

                  return (
                    <TableRow key={order.order_id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                      <TableCell sx={{ fontWeight: 600 }}>#{order.order_id}</TableCell>

                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {order.full_name}
                          </Typography>
                          {orderCount > 1 && (
                            <Tooltip title={`Customer has ${orderCount} total orders`}>
                              <Chip
                                icon={<OrderIcon sx={{ fontSize: "0.9rem" }} />}
                                label={orderCount}
                                size="small"
                                sx={{
                                  height: 20,
                                  bgcolor: "#e3f2fd",
                                  color: "#1976d2",
                                  fontWeight: 700,
                                  fontSize: "0.7rem",
                                  "& .MuiChip-icon": { ml: 0.5 },
                                }}
                              />
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>

                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body2">{order.contact_number || "-"}</Typography>
                          {order.contact_number && (
                            <Tooltip title="Call Customer">
                              <IconButton
                                size="small"
                                onClick={() => handleCallIconClick(order.contact_number)}
                                sx={{ bgcolor: "#f0fdf4", "&:hover": { bgcolor: "#dcfce7" } }}
                              >
                                <PhoneIcon fontSize="inherit" sx={{ color: "#16a34a" }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>

                      <TableCell>
                        {order.tracking_number ? (
                          <Box>
                            <Typography
                              component="a"
                              href={`https://track.shipway.com/t/${order.tracking_number}`}
                              target="_blank"
                              rel="noreferrer"
                              sx={{
                                color: "primary.main",
                                textDecoration: "none",
                                fontWeight: 500,
                                "&:hover": { textDecoration: "underline" },
                              }}
                            >
                              {order.tracking_number}
                            </Typography>
                            {viewTab === 1 && (
                              <Typography
                                variant="caption"
                                sx={{ display: "block", color: "text.secondary", mt: 0.5 }}
                              >
                                ({order.shipment_status})
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          "-"
                        )}
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {order.financial_status === "pending"
                            ? "COD"
                            : order.financial_status || "-"}
                        </Typography>
                      </TableCell>

                      <TableCell>{order.carrier_title || "-"}</TableCell>

                      <TableCell>
                        <Chip
                          label={order.shipment_status}
                          size="small"
                          color={getStatusColor(order.shipment_status)}
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.75rem",
                            ...(getStatusColor(order.shipment_status) === "info" && {
                              bgcolor: "black",
                              color: "white",
                            }),
                          }}
                        />
                      </TableCell>

                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        {order.order_date ? dayjs(order.order_date).format("DD MMM, YYYY") : "-"}
                      </TableCell>

                      <TableCell sx={{ minWidth: 200 }}>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          value={order.opsRemark || ""}
                          onChange={(e) => handleRemarkChange(order, e.target.value)}
                          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                        >
                          <MenuItem value="">
                            <em>None</em>
                          </MenuItem>
                          {getRemarkOptions(order.shipment_status).map((r) => (
                            <MenuItem key={r} value={r}>
                              {r}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>

                      {viewTab === 1 && (
                        <TableCell sx={{ minWidth: 250 }}>
                          <Autocomplete
                            size="small"
                            value={getAssignedAgent(order.assignedAgentId)}
                            onChange={(e, newValue) => handleAssignAgent(order, newValue)}
                            options={assignableAgents}
                            getOptionLabel={(option) => option.fullName || ""}
                            isOptionEqualToValue={(option, value) => option._id === value?._id}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                placeholder="Unassigned"
                                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                              />
                            )}
                            renderOption={(props, option) => (
                              <li {...props}>
                                <Typography variant="body2">{option.fullName}</Typography>
                              </li>
                            )}
                          />
                        </TableCell>
                      )}

                      <TableCell sx={{ color: "text.secondary", fontSize: "0.8rem" }}>
                        {order.last_updated_at ? dayjs(order.last_updated_at).format("DD/MM/YY HH:mm") : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={viewTab === 1 ? 11 : 10} align="center" sx={{ py: 8 }}>
                    <Typography color="text.secondary">No matching orders found.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={visibleCount}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={limit}
          onRowsPerPageChange={(e) => {
            setLimit(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[25, 50, 100]}
          sx={{ borderTop: "1px solid #f1f3f5" }}
        />
      </Paper>
    </Box>
  );
};

export default UndeliveredOrders;
