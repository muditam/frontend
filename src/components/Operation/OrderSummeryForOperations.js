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
} from "@mui/material";
import {
  Phone as PhoneIcon,
  Refresh as RefreshIcon,
  LocalShipping as ShippingIcon,
  FileDownload as DownloadIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import axios from "axios";
import dayjs from "dayjs";


const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";


const REMARK_OPTIONS = [
  "Ringing",
  "Fake Remark",
  "Hold",
  "Consignee don't want to order",
];


// Helper for status chip colors
const getStatusColor = (status) => {
  const s = status?.toLowerCase() || "";
  if (s.includes("delivered")) return "success";
  if (s.includes("out for delivery")) return "info"; // This is usually blue
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
  const [selectedAgent, setSelectedAgent] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [callingMessage, setCallingMessage] = useState("");
  const [viewTab, setViewTab] = useState(0);
  const [employees, setEmployees] = useState([]);


  const assignableAgents = useMemo(() => {
    return (employees || []).filter((e) => {
      const role = String(e.role || "").toLowerCase();
      const status = String(e.status || "active").toLowerCase();
      return status === "active" && (role.includes("sales") || role.includes("retention"));
    });
  }, [employees]);


  const fetchEmployees = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/employees`);
      setEmployees(res.data || []);
    } catch (e) {
      console.error("Failed to fetch employees", e);
    }
  }, []);


  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/operations/undelivered-orders`, {
        params: {
          page: page + 1,
          limit,
          status: selectedStatus || undefined,
          carrier: selectedCarrier || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });
      setOrders(res.data.orders || []);
      setTotalCount(res.data.totalCount || 0);
      setStatusCounts(res.data.statusCounts || []);
      setCarriers(res.data.carriers || []);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, selectedStatus, selectedCarrier, startDate, endDate]);


  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);
  useEffect(() => { setPage(0); }, [viewTab]);
  useEffect(() => { setPage(0); }, [selectedStatus, selectedCarrier, startDate, endDate, selectedAgent]);


  const visibleOrders = useMemo(() => {
    const hasRemark = (o) => String(o.opsRemark || "").trim().length > 0;
    let filtered = viewTab === 0
      ? orders.filter((o) => !hasRemark(o))
      : orders.filter((o) => hasRemark(o));


    if (viewTab === 1 && selectedAgent) {
      filtered = filtered.filter((o) => String(o.assignedAgentId || "") === selectedAgent);
    }


    return filtered;
  }, [orders, viewTab, selectedAgent]);


  const visibleCount = useMemo(() => visibleOrders.length, [visibleOrders]);


  const patchLocalByOrderId = useCallback((order_id, patch) => {
    setOrders((prev) => prev.map((o) => (o.order_id === order_id ? { ...o, ...patch } : o)));
  }, []);


  const saveOpsMeta = useCallback(async (order, patch) => {
    return axios.patch(`${API_BASE}/api/orders/ops-meta/by-order-id`, {
      order_id: order.order_id,
      ...patch,
    });
  }, []);


  const handleRemarkChange = useCallback(
    async (order, value) => {
      const remark = String(value || "").trim();
      patchLocalByOrderId(order.order_id, {
        opsRemark: remark,
        assignedAgentId: null,
        last_updated_at: new Date().toISOString(),
      });


      try {
        await saveOpsMeta(order, { opsRemark: remark, assignedAgentId: null });
        if (remark) { setViewTab(1); setPage(0); } else { setViewTab(0); setPage(0); }
      } catch (e) {
        console.error("Failed to save remark", e);
        fetchOrders();
      }
    },
    [patchLocalByOrderId, saveOpsMeta, fetchOrders]
  );


  const handleAssignAgent = useCallback(async (order, agentId) => {
    const assignedAgentId = agentId ? String(agentId) : null;
    patchLocalByOrderId(order.order_id, { assignedAgentId, last_updated_at: new Date().toISOString() });
    try {
      await saveOpsMeta(order, { assignedAgentId });
    } catch (e) {
      console.error("Failed to assign agent", e);
      fetchOrders();
    }
  }, [patchLocalByOrderId, saveOpsMeta, fetchOrders]);


  const handleCallIconClick = async (contactNumber) => {
    setCallingMessage(`Initiating call to ${contactNumber}...`);
    try {
      const loggedInUser = JSON.parse(sessionStorage.getItem("user"));
      if (!loggedInUser) { setCallingMessage("Error: User not logged in."); return; }
      const agentNumber = loggedInUser.phone || loggedInUser.agentNumber || "";
      const callerId = process.env.REACT_APP_CALLER_ID || "";
      const requestBody = { destination_number: contactNumber, async: 1, agent_number: agentNumber.toString().trim(), caller_id: callerId.toString().trim() };
      const response = await axios.post(`${API_BASE}/api/click_to_call`, requestBody);
      setCallingMessage(response.data.status === "success" ? `Connected to ${contactNumber}` : "Call failed.");
    } catch (error) {
      setCallingMessage("Error placing the call.");
    }
    setTimeout(() => setCallingMessage(""), 5000);
  };


  const handleExportCSV = useCallback(() => {
    try {
      const getAgentName = (agentId) => {
        const agent = employees.find(e => e._id === agentId);
        return agent ? agent.fullName : "Unassigned";
      };
      const headers = ["Order ID", "Customer Name", "Contact Number", "Tracking Number", "Carrier", "Shipment Status", "Order Date", "Ops Remark", "Assigned Agent", "Last Updated"];
      const rows = visibleOrders.map(order => [
        order.order_id || "",
        order.full_name || "",
        order.contact_number || "",
        order.tracking_number || "",
        order.carrier_title || "",
        order.shipment_status || "",
        order.order_date ? dayjs(order.order_date).format("DD/MM/YYYY") : "",
        order.opsRemark || "",
        getAgentName(order.assignedAgentId),
        order.last_updated_at ? dayjs(order.last_updated_at).format("DD/MM/YYYY HH:mm") : ""
      ]);
      const csvContent = [headers.join(","), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");
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
      setCallingMessage("Error exporting CSV file");
      setTimeout(() => setCallingMessage(""), 3000);
    }
  }, [visibleOrders, employees]);


  const totalAll = statusCounts.reduce((acc, s) => acc + (s.count || 0), 0);


  return (
    <Box sx={{ p: 3, bgcolor: "#f8f9fa", minHeight: "100vh" }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#1a2027" }}>
            Undelivered Orders
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage and track orders requiring operational intervention.
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
              sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, boxShadow: "0 4px 12px rgba(46, 125, 50, 0.25)" }}
            >
              Export CSV ({visibleOrders.length})
            </Button>
          )}


          <Box sx={{ bgcolor: "#fff", borderRadius: 2, p: 0.5, boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
            <Tabs
              value={viewTab}
              onChange={(e, v) => { setViewTab(v); setPage(0); setSelectedAgent(""); }}
              sx={{ minHeight: 40, "& .MuiTab-root": { minHeight: 40, px: 3, fontWeight: 600, textTransform: "none" } }}
            >
              <Tab label="Pending" />
              <Tab label="Processed" />
            </Tabs>
          </Box>
        </Stack>
      </Stack>


      {callingMessage && (
        <Paper sx={{ p: 1.5, mb: 2, bgcolor: "#e3f2fd", borderLeft: "4px solid #1976d2", display: "flex", alignItems: "center" }}>
          <PhoneIcon sx={{ mr: 2, color: "#1976d2" }} fontSize="small" />
          <Typography variant="body2" sx={{ fontWeight: 500, color: "#1976d2" }}>{callingMessage}</Typography>
        </Paper>
      )}


      <Card sx={{ p: 2, mb: 3, borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
            <TextField label="Start Date" type="date" size="small" InputLabelProps={{ shrink: true }} value={startDate} onChange={(e) => setStartDate(e.target.value)} sx={{ width: 180 }} />
            <TextField label="End Date" type="date" size="small" InputLabelProps={{ shrink: true }} value={endDate} onChange={(e) => setEndDate(e.target.value)} sx={{ width: 180 }} />
            <TextField select label="Carrier" size="small" value={selectedCarrier} onChange={(e) => setSelectedCarrier(e.target.value)} sx={{ minWidth: 200 }} InputProps={{ startAdornment: <ShippingIcon sx={{ mr: 1, color: "action.active" }} fontSize="small" /> }}>
              <MenuItem value="">All Carriers</MenuItem>
              {carriers.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>


            {viewTab === 1 && (
              <TextField select label="Assigned Agent" size="small" value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)} sx={{ minWidth: 220 }} InputProps={{ startAdornment: <PersonIcon sx={{ mr: 1, color: "action.active" }} fontSize="small" /> }}>
                <MenuItem value="">All Agents</MenuItem>
                <MenuItem value="unassigned">Unassigned</MenuItem>
                {assignableAgents.map((agent) => (
                  <MenuItem key={agent._id} value={agent._id}>{agent.fullName}</MenuItem>
                ))}
              </TextField>
            )}
           
            <Box sx={{ flexGrow: 1 }} />
            <Button startIcon={<RefreshIcon />} onClick={() => { setSelectedCarrier(""); setSelectedStatus(""); setSelectedAgent(""); setStartDate(""); setEndDate(""); setPage(0); }} variant="outlined" color="inherit" sx={{ borderRadius: 2, textTransform: "none" }}>Reset</Button>
          </Stack>


          <Divider />


          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {/* ✅ ALL ORDERS CHIP: Updated to Black Background */}
            <Chip
              label={`All Orders (${totalAll})`}
              onClick={() => setSelectedStatus("")}
              variant={!selectedStatus ? "filled" : "outlined"}
              sx={{
                fontWeight: 600,
                ...( !selectedStatus && { bgcolor: "black", color: "white", "&:hover": { bgcolor: "#333" } })
              }}
            />
            {/* ✅ STATUS FILTER CHIPS: Updated to Black Background when active */}
            {statusCounts.map((s) => (
              <Chip
                key={s.shipment_status}
                label={`${s.shipment_status} (${s.count})`}
                onClick={() => { setSelectedStatus(s.shipment_status); setPage(0); }}
                variant={selectedStatus === s.shipment_status ? "filled" : "outlined"}
                sx={{
                  fontWeight: 500,
                  ...( selectedStatus === s.shipment_status && { bgcolor: "black", color: "white", "&:hover": { bgcolor: "#333" } })
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
                {["Order ID", "Customer", "Contact", "Tracking", "Carrier", "Status", "Date", "Ops Remark"].map((h) => (
                  <TableCell key={h} sx={{ bgcolor: "#f1f3f5", fontWeight: 700, py: 2 }}>{h}</TableCell>
                ))}
                {viewTab === 1 && <TableCell sx={{ bgcolor: "#f1f3f5", fontWeight: 700 }}>Assign Agent</TableCell>}
                <TableCell sx={{ bgcolor: "#f1f3f5", fontWeight: 700 }}>Last Updated</TableCell>
              </TableRow>
            </TableHead>


            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 10 }}>
                    <CircularProgress size={30} thickness={5} />
                    <Typography sx={{ mt: 2 }} color="text.secondary">Fetching data...</Typography>
                  </TableCell>
                </TableRow>
              ) : visibleOrders.length > 0 ? (
                visibleOrders.map((order) => (
                  <TableRow key={order.order_id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                    <TableCell sx={{ fontWeight: 600 }}>#{order.order_id}</TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>{order.full_name}</Typography></TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="body2">{order.contact_number || "-"}</Typography>
                        {order.contact_number && (
                          <Tooltip title="Call Customer">
                            <IconButton size="small" onClick={() => handleCallIconClick(order.contact_number)} sx={{ bgcolor: "#f0fdf4", "&:hover": { bgcolor: "#dcfce7" } }}>
                              <PhoneIcon fontSize="inherit" sx={{ color: "#16a34a" }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {order.tracking_number ? (
                        <Typography component="a" href={`https://track.shipway.com/t/${order.tracking_number}`} target="_blank" sx={{ color: "primary.main", textDecoration: "none", fontWeight: 500, "&:hover": { textDecoration: "underline" } }}>
                          {order.tracking_number}
                        </Typography>
                      ) : "-"}
                    </TableCell>
                    <TableCell>{order.carrier_title || "-"}</TableCell>
                    <TableCell>
                      {/* ✅ TABLE CHIP: Updated 'info' status to Black/White */}
                      <Chip
                        label={order.shipment_status}
                        size="small"
                        color={getStatusColor(order.shipment_status)}
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.75rem",
                          ...(getStatusColor(order.shipment_status) === "info" && { bgcolor: "black", color: "white" })
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{order.order_date ? dayjs(order.order_date).format("DD MMM, YYYY") : "-"}</TableCell>
                    <TableCell sx={{ minWidth: 200 }}>
                      <TextField select fullWidth size="small" value={order.opsRemark || ""} onChange={(e) => handleRemarkChange(order, e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}>
                        <MenuItem value=""><em>None</em></MenuItem>
                        {REMARK_OPTIONS.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                      </TextField>
                    </TableCell>
                    {viewTab === 1 && (
                      <TableCell sx={{ minWidth: 220 }}>
                        <TextField select fullWidth size="small" value={order.assignedAgentId || order.agentId || ""} onChange={(e) => handleAssignAgent(order, e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}>
                          <MenuItem value=""><em>Unassigned</em></MenuItem>
                          {assignableAgents.map((a) => (
                            <MenuItem key={a._id} value={a._id}>{a.fullName} <Typography variant="caption" sx={{ ml: 1, color: "text.disabled" }}>({a.role})</Typography></MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                    )}
                    <TableCell sx={{ color: "text.secondary", fontSize: "0.8rem" }}>{order.last_updated_at ? dayjs(order.last_updated_at).format("DD/MM/YY HH:mm") : "-"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={11} align="center" sx={{ py: 8 }}><Typography color="text.secondary">No matching orders found.</Typography></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>


        <TablePagination component="div" count={visibleCount} page={page} onPageChange={(e, newPage) => setPage(newPage)} rowsPerPage={limit} onRowsPerPageChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(0); }} rowsPerPageOptions={[25, 50, 100]} sx={{ borderTop: "1px solid #f1f3f5" }} />
      </Paper>
    </Box>
  );
};


export default UndeliveredOrders;

