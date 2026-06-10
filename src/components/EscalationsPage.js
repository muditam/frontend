import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  MenuItem,
  Typography,
  Chip,
  CircularProgress,
  TablePagination,
  InputAdornment,
  Checkbox,
  ListItemText,
  Tooltip,
  Tabs,
  Tab,
} from "@mui/material";
import { Close, Delete as DeleteIcon, WarningAmber } from "@mui/icons-material";
import axios from "axios";
import { alpha } from "@mui/material/styles";


const statusOptions = ["Open", "In Progress", "Closed"];
const reasonOptions = ["Delivery Issues", "Product Related Issues", "Refund"];


const productOptions = [
  { code: "KJF", label: "KJF" },
  { code: "SDP", label: "SDP" },
  { code: "VKR", label: "VKR" },
  { code: "LFx", label: "LFx" },
  { code: "CPV", label: "CPV" },
  { code: "HDP", label: "HDP" },
  { code: "PF", label: "PF" },
  { code: "PGut", label: "PGut" },
  { code: "SWG", label: "SWG" },
  { code: "Nerve Fix", label: "Nerve Fix" },
  { code: "Core Essentials", label: "Core Essentials" },
  { code: "Omega Fuel", label: "Omega Fuel" },
  { code: "Glucometer", label: "Glucometer" },
  { code: "Blood test", label: "Blood test" },
];

const UI = {
  bg: "#f6f8fc",
  panel: "#ffffff",
  border: "#dbe2ea",
  text: "#0f172a",
  subtext: "#475569",
  accent: "#0f172a",
};

const getTodayDateValue = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getInitialFormData = () => ({
  date: getTodayDateValue(),
  orderId: "",
  name: "",
  contactNumber: "",
  agentName: "",
  query: "",
  attachedFiles: [],
  status: "Open",
  assignedTo: "",
  remark: "",
  followUp: "",
  finalClosure: "",
  resolvedDate: "",
  reason: "",
  amount: "",
  products: [],
});

const getInitialUrgentDeliveryForm = () => ({
  date: getTodayDateValue(),
  name: "",
  contactNumber: "",
  orderId: "",
  expertName: "",
  remark: "",
});

const EscalationsPage = () => {
  const [openForm, setOpenForm] = useState(false);
  const [openUrgentDialog, setOpenUrgentDialog] = useState(false);
  const [openUrgentFormDialog, setOpenUrgentFormDialog] = useState(false);
  const [urgentTab, setUrgentTab] = useState("Pending");
  const [urgentFormData, setUrgentFormData] = useState(getInitialUrgentDeliveryForm);
  const [urgentDeliveries, setUrgentDeliveries] = useState([]);
  const [urgentLoading, setUrgentLoading] = useState(false);
  const [urgentSaving, setUrgentSaving] = useState(false);
  const [openFileDialog, setOpenFileDialog] = useState(false);
  const [fileToView, setFileToView] = useState(null);
  const [escalations, setEscalations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const allowedRolesForAssign = ["Operations"];
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteEscalationId, setDeleteEscalationId] = useState(null);
  const [showClosedOnly, setShowClosedOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [initialLoading, setInitialLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [orderIdError, setOrderIdError] = useState(false);
  const [orderIdErrorMsg, setOrderIdErrorMsg] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [assignedToFilter, setAssignedToFilter] = useState("");
  const todayDate = getTodayDateValue();
  const [formData, setFormData] = useState(getInitialFormData);

  const BACKEND_URL = `${(process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "")}/api`;

  const allowedAssignees = useMemo(() => {
    return employees
      .filter((emp) => allowedRolesForAssign.includes(emp.role))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [employees]);

  const assignedToFilterOptions = useMemo(() => {
    return allowedAssignees.map((emp) => emp.fullName);
  }, [allowedAssignees]);

  const urgentDeliveryExperts = useMemo(() => {
    const allowedRoles = new Set(["sales agent", "retention agent"]);
    return employees
      .filter((emp) => {
        const role = String(emp.role || "").trim().toLowerCase();
        const department = String(emp.department || "").trim().toLowerCase();
        return allowedRoles.has(role) && department !== "tech helper";
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [employees]);

  useEffect(() => {
    fetchEmployees();
  }, []);


  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/employees`);
      const activeEmployees = response.data.filter((emp) => emp.status === "active");
      setEmployees(activeEmployees);
    } catch (error) {
      console.error("Failed to fetch employees", error);
    }
  };


  const fetchEscalations = async (
    pageIdx = page,
    rpp = rowsPerPage,
    closedOnly = showClosedOnly
  ) => {
    try {
      const statusParam = closedOnly ? "Closed" : "Open,In Progress";

      const params = {
        page: pageIdx + 1,
        limit: rpp,
        status: statusParam,
        sortBy: "createdAt",
        order: "desc",
      };

      if (reasonFilter) params.reason = reasonFilter;
      if (assignedToFilter) params.assignedTo = assignedToFilter;

      const response = await axios.get(`${BACKEND_URL}/escalations`, { params });
      setEscalations(response.data.data);
      setTotalCount(response.data.total);
    } catch (error) {
      console.error("Failed to fetch escalations", error);
    } finally {
      setInitialLoading(false);
    }
  };


  useEffect(() => {
    setInitialLoading(true);
    fetchEscalations(page, rowsPerPage, showClosedOnly);
  }, [page, rowsPerPage, showClosedOnly, reasonFilter, assignedToFilter]);


  const handleConfirmDelete = async () => {
    try {
      await axios.delete(`${BACKEND_URL}/escalations/${deleteEscalationId}`);
      fetchEscalations(page, rowsPerPage, showClosedOnly);
    } catch (error) {
      console.error("Failed to delete escalation", error);
    }
    setDeleteDialogOpen(false);
    setDeleteEscalationId(null);
  };


  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setDeleteEscalationId(null);
  };


  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "date" && value && value < todayDate) {
      setFormData((fd) => ({ ...fd, date: todayDate }));
      return;
    }
    if (name === "products") {
      setFormData((fd) => ({ ...fd, products: value }));
      return;
    }
    if (name === "orderId") {
      const v = String(value || "");
      if (/#/i.test(v) || /^\s*#\s*ma/i.test(v)) {
        setOrderIdError(true);
        setOrderIdErrorMsg("Add order id without #MA");
      } else {
        setOrderIdError(false);
        setOrderIdErrorMsg("");
      }
    }
    setFormData((fd) => ({ ...fd, [name]: value }));
  };


  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData((fd) => ({
      ...fd,
      attachedFiles: [...fd.attachedFiles, ...files],
    }));
    e.target.value = null;
  };


  const handleRemoveFile = (index) => {
    setFormData((fd) => {
      const newFiles = [...fd.attachedFiles];
      newFiles.splice(index, 1);
      return { ...fd, attachedFiles: newFiles };
    });
  };


  const handleOpenForm = () => {
    setFormData(getInitialFormData());
    setOrderIdError(false);
    setOrderIdErrorMsg("");
    setOpenForm(true);
  };


  const fetchUrgentDeliveries = async (status = urgentTab) => {
    setUrgentLoading(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/urgent-deliveries`, {
        params: { status },
      });
      setUrgentDeliveries(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch urgent deliveries", error);
    } finally {
      setUrgentLoading(false);
    }
  };


  const handleOpenUrgentDialog = () => {
    setOpenUrgentDialog(true);
    setUrgentTab("Pending");
    setUrgentFormData(getInitialUrgentDeliveryForm());
    fetchUrgentDeliveries("Pending");
  };


  const handleUrgentFieldChange = (e) => {
    const { name, value } = e.target;
    if (name === "date" && value && value < todayDate) {
      setUrgentFormData((fd) => ({ ...fd, date: todayDate }));
      return;
    }
    setUrgentFormData((fd) => ({ ...fd, [name]: value }));
  };


  const handleUrgentTabChange = (event, value) => {
    setUrgentTab(value);
    fetchUrgentDeliveries(value);
  };


  const handleSubmitUrgentDelivery = async (e) => {
    e.preventDefault();
    if (!urgentFormData.date || !urgentFormData.orderId.trim()) return;

    setUrgentSaving(true);
    try {
      await axios.post(`${BACKEND_URL}/urgent-deliveries`, urgentFormData);
      setUrgentFormData(getInitialUrgentDeliveryForm());
      setOpenUrgentFormDialog(false);
      setUrgentTab("Pending");
      fetchUrgentDeliveries("Pending");
    } catch (error) {
      console.error("Failed to submit urgent delivery", error);
    } finally {
      setUrgentSaving(false);
    }
  };


  const handleMarkUrgentDelivered = async (id) => {
    try {
      await axios.patch(`${BACKEND_URL}/urgent-deliveries/${id}/delivered`);
      fetchUrgentDeliveries(urgentTab);
    } catch (error) {
      console.error("Failed to mark urgent delivery delivered", error);
    }
  };


  const user = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("user"));
    } catch {
      return null;
    }
  }, []);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (orderIdError) {
        setLoading(false);
        return;
      }
      if (!formData.date || formData.date < getTodayDateValue()) {
        setFormData((fd) => ({ ...fd, date: getTodayDateValue() }));
        setLoading(false);
        return;
      }
      const digits = String(formData.orderId || "").replace(/\D/g, "");
      if (!digits) {
        setOrderIdError(true);
        setOrderIdErrorMsg("Please enter the numeric part of the Order ID");
        setLoading(false);
        return;
      }
      const form = new FormData();
      form.append("date", formData.date);
      form.append("orderId", formData.orderId);
      form.append("name", formData.name);
      form.append("contactNumber", formData.contactNumber);
      form.append("agentName", formData.agentName);
      form.append("query", formData.query);
      form.append("reason", formData.reason);
      form.append("amount", formData.amount || "");
      (formData.products || []).forEach((p) => form.append("products", p));
      formData.attachedFiles.forEach((file) => {
        form.append("attachedFiles", file);
      });


      await axios.post(`${BACKEND_URL}/escalations`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });


      setOpenForm(false);
      fetchEscalations();


      setFormData(getInitialFormData());
      setOrderIdError(false);
      setOrderIdErrorMsg("");
    } catch (error) {
      console.error("Failed to submit escalation", error);
      const msg = error?.response?.data?.error || error?.message || "";
      if (/without\s*#MA/i.test(msg)) {
        setOrderIdError(true);
        setOrderIdErrorMsg("Add order id without #MA");
      }
    }
    setLoading(false);
  };


  const updateLocalEscalation = (id, patch) => {
    setEscalations((prev) => prev.map((e) => (e._id === id ? { ...e, ...patch } : e)));
  };


  const handleEditCell = async (id, field, value) => {
    const current = escalations.find((e) => e._id === id);
    if (!current) return;


    const next = {
      status: field === "status" ? value : current.status,
      assignedTo: field === "assignedTo" ? value : current.assignedTo,
      remark: field === "remark" ? value : current.remark,
      followUp: field === "followUp" ? value : current.followUp,
      finalClosure: field === "finalClosure" ? value : current.finalClosure,
      resolvedDate: field === "resolvedDate" ? value : current.resolvedDate,
    };


    updateLocalEscalation(id, next);


    if (showClosedOnly && next.status !== "Closed") {
      setShowClosedOnly(false);
    }


    try {
      await axios.put(`${BACKEND_URL}/escalations/${id}`, next);
    } catch (err) {
      console.error("Failed to update escalation", err);
      updateLocalEscalation(id, {
        status: current.status,
        assignedTo: current.assignedTo,
        remark: current.remark,
        followUp: current.followUp,
        finalClosure: current.finalClosure,
        resolvedDate: current.resolvedDate,
      });
    }
  };


  const handleOpenFile = (fileUrl) => {
    setFileToView(fileUrl);
    setOpenFileDialog(true);
  };

  const canManageEscalations =
    user?.role === "Manager" || user?.role === "Operations";

  const getRowSeverity = (esc) => {
    if (esc.status === "Closed") return "closed";
    const baseDate = esc.date ? new Date(esc.date) : new Date(esc.createdAt);
    const now = new Date();
    const hoursDifference = (now - baseDate) / (1000 * 3600);
    const daysDifference = hoursDifference / 24;
    if (daysDifference > 3) return "critical";
    if (hoursDifference > 48) return "warning";
    return "normal";
  };

  const getRowSx = (severity) => {
    if (severity === "critical") {
      return {
        backgroundColor: alpha("#dc2626", 0.5),
        "&:hover": { backgroundColor: alpha("#dc2626", 0.2) },
      };
    }
    if (severity === "warning") {
      return {
        backgroundColor: alpha("#ea580c", 0.16),
        "&:hover": { backgroundColor: alpha("#ea580c", 0.22) },
      };
    }
    return {
      "&:hover": { backgroundColor: "#f8fafc" },
    };
  };

  const getStatusChipSx = (status) => {
    const s = String(status || "").toLowerCase();
    if (s.includes("open")) {
      return { bgcolor: alpha("#dc2626", 0.1), color: "#991b1b", border: `1px solid ${alpha("#dc2626", 0.25)}` };
    }
    if (s.includes("progress")) {
      return { bgcolor: alpha("#ea580c", 0.12), color: "#9a3412", border: `1px solid ${alpha("#ea580c", 0.3)}` };
    }
    return { bgcolor: alpha("#16a34a", 0.12), color: "#166534", border: `1px solid ${alpha("#16a34a", 0.3)}` };
  };

  const renderUrgentDeliveriesTable = () => (
    <TableContainer sx={{ border: `1px solid ${UI.border}`, borderRadius: 2, maxHeight: 360 }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            {[
              "Date",
              "Name",
              "Contact Number",
              "Order ID",
              "Expert Name",
              "Remark",
              ...(urgentTab === "Delivered" ? ["Delivered At"] : ["Action"]),
            ].map((head) => (
              <TableCell
                key={head}
                sx={{
                  fontWeight: 800,
                  color: "#fff",
                  backgroundColor: urgentTab === "Delivered" ? "#166534" : UI.accent,
                  whiteSpace: "nowrap",
                }}
              >
                {head}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {urgentLoading ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                <CircularProgress size={24} />
              </TableCell>
            </TableRow>
          ) : urgentDeliveries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                <Typography variant="body2" sx={{ py: 2, color: UI.subtext }}>
                  No records found
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            urgentDeliveries.map((row) => (
              <TableRow key={row._id} hover>
                <TableCell>{row.date}</TableCell>
                <TableCell>{row.name || "-"}</TableCell>
                <TableCell>{row.contactNumber || "-"}</TableCell>
                <TableCell>{row.orderId}</TableCell>
                <TableCell>{row.expertName || "-"}</TableCell>
                <TableCell sx={{ whiteSpace: "pre-wrap", minWidth: 220 }}>{row.remark || "-"}</TableCell>
                <TableCell>
                  {urgentTab === "Delivered" ? (
                    row.deliveredAt ? new Date(row.deliveredAt).toLocaleString() : "-"
                  ) : (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleMarkUrgentDelivered(row._id)}
                      sx={{
                        backgroundColor: "#166534",
                        borderRadius: 999,
                        textTransform: "none",
                        fontWeight: 700,
                        boxShadow: "none",
                        whiteSpace: "nowrap",
                        "&:hover": { backgroundColor: "#14532d", boxShadow: "none" },
                      }}
                    >
                      Mark Delivered
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );


  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 }, bgcolor: UI.bg, borderRadius: 3, border: `1px solid ${UI.border}` }}>
      <Paper
        elevation={0}
        sx={{
          mb: 2,
          p: { xs: 1.5, md: 2 },
          borderRadius: 3,
          border: `1px solid ${UI.border}`,
          background: "linear-gradient(140deg, #ffffff 0%, #f8fafc 60%, #eef2ff 100%)",
        }}
      >
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1.25 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, fontSize: { xs: "1.35rem", md: "1.85rem" }, color: UI.text }}>
              Escalations
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              onClick={handleOpenForm}
              sx={{
                backgroundColor: UI.accent,
                borderRadius: 999,
                px: 2.2,
                py: 0.9,
                textTransform: "none",
                fontWeight: 700,
                boxShadow: "none",
                "&:hover": { backgroundColor: "#020617", boxShadow: "none" },
              }}
            >
              Add Escalation
            </Button>
            <Button
              variant="contained"
              onClick={handleOpenUrgentDialog}
              sx={{
                backgroundColor: UI.accent,
                borderRadius: 999,
                px: 2.2,
                py: 0.9,
                textTransform: "none",
                fontWeight: 700,
                boxShadow: "none",
                "&:hover": { backgroundColor: "#020617", boxShadow: "none" },
              }}
            >
              Urgent Delivery
            </Button>
          </Box>
        </Box>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          mb: 2,
          p: 1.5,
          borderRadius: 2.5,
          border: `1px solid ${UI.border}`,
          display: "flex",
          flexWrap: "wrap",
          gap: 1.2,
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: UI.panel,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <TextField
            select
            size="small"
            value={assignedToFilter}
            onChange={(e) => {
              setAssignedToFilter(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 220 }}
            SelectProps={{ displayEmpty: true }}
          >
            <MenuItem value="">
              <em>All assignees</em>
            </MenuItem>
            {assignedToFilterOptions.map((name) => (
              <MenuItem key={name} value={name}>
                {name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            value={reasonFilter}
            onChange={(e) => {
              setReasonFilter(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 240 }}
            SelectProps={{ displayEmpty: true }}
          >
            <MenuItem value="">
              <em>All reasons</em>
            </MenuItem>
            {reasonOptions.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </TextField>

          <Button
            variant={showClosedOnly ? "contained" : "outlined"}
            sx={{
              backgroundColor: showClosedOnly ? UI.accent : "transparent",
              color: showClosedOnly ? "#fff" : UI.text,
              borderColor: UI.border,
              textTransform: "none",
              borderRadius: 999,
              fontWeight: 700,
              px: 1.8,
              "&:hover": {
                borderColor: "#94a3b8",
                backgroundColor: showClosedOnly ? "#020617" : "#f8fafc",
              },
            }}
            onClick={() => setShowClosedOnly(!showClosedOnly)}
          >
            {showClosedOnly ? "Show Open / In Progress" : "Show Closed"}
          </Button>
        </Box>
        <Chip
          label={`Records: ${totalCount}`}
          size="small"
          sx={{
            fontWeight: 700,
            bgcolor: "#e2e8f0",
            color: UI.text,
            border: `1px solid ${UI.border}`,
          }}
        />
      </Paper>


      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            color: UI.text,
            fontWeight: 800,
            textAlign: "center",
            fontSize: "1.35rem",
            pb: 0.7,
          }}
        >
          Add New Escalation
        </DialogTitle>
        <Box
          sx={{
            height: "3px",
            backgroundColor: "#94a3b8",
            width: "100%",
            mt: 0.5,
            borderRadius: "2px",
          }}
        />
        <DialogContent sx={{ p: 3, backgroundColor: "#f8fafc" }}>
          <Box
            component="form"
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            onSubmit={handleSubmit}
          >
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Date"
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                fullWidth
                variant="filled"
                inputProps={{ min: todayDate }}
                InputProps={{
                  disableUnderline: true,
                  sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
                }}
                InputLabelProps={{
                  sx: {
                    color: "rgba(0,0,0,0.6)",
                    "&.Mui-focused": { color: "gray" },
                    "&.MuiInputLabel-shrink": { color: "gray" },
                  },
                  shrink: true,
                }}
              />
              <TextField
                label="Order ID"
                name="orderId"
                value={formData.orderId}
                onChange={handleChange}
                required
                fullWidth
                variant="filled"
                error={orderIdError}
                inputProps={{ inputMode: "numeric", pattern: "\\d*" }}
                InputProps={{
                  disableUnderline: true,
                  sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
                  startAdornment: <InputAdornment position="start">#MA</InputAdornment>,
                }}
                InputLabelProps={{
                  sx: {
                    color: "rgba(0,0,0,0.6)",
                    "&.Mui-focused": { color: "gray" },
                    "&.MuiInputLabel-shrink": { color: "gray" },
                  },
                }}
              />


              <TextField
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                fullWidth
                variant="filled"
                InputProps={{
                  disableUnderline: true,
                  sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
                }}
                InputLabelProps={{
                  sx: {
                    color: "rgba(0,0,0,0.6)",
                    "&.Mui-focused": { color: "gray" },
                    "&.MuiInputLabel-shrink": { color: "gray" },
                  },
                }}
              />
            </Box>


            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Contact Number"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleChange}
                required
                fullWidth
                variant="filled"
                InputProps={{
                  disableUnderline: true,
                  sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
                }}
                InputLabelProps={{
                  sx: {
                    color: "rgba(0,0,0,0.6)",
                    "&.Mui-focused": { color: "gray" },
                    "&.MuiInputLabel-shrink": { color: "gray" },
                  },
                }}
              />


              <TextField
                select
                label="Expert Name"
                name="agentName"
                value={formData.agentName}
                onChange={handleChange}
                required
                fullWidth
                variant="filled"
                InputProps={{
                  disableUnderline: true,
                  sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
                }}
                InputLabelProps={{
                  sx: {
                    color: "rgba(0,0,0,0.6)",
                    "&.Mui-focused": { color: "gray" },
                    "&.MuiInputLabel-shrink": { color: "gray" },
                  },
                }}
              >
                {employees.map((emp) => (
                  <MenuItem key={emp._id} value={emp.fullName}>
                    {emp.fullName}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Reasons"
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                fullWidth
                variant="filled"
                InputProps={{
                  disableUnderline: true,
                  sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
                }}
                InputLabelProps={{
                  sx: {
                    color: "rgba(0,0,0,0.6)",
                    "&.Mui-focused": { color: "gray" },
                    "&.MuiInputLabel-shrink": { color: "gray" },
                  },
                }}
              >
                {reasonOptions.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Amount"
                name="amount"
                type="number"
                value={formData.amount}
                onChange={handleChange}
                fullWidth
                variant="filled"
                InputProps={{
                  disableUnderline: true,
                  sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
                InputLabelProps={{
                  sx: {
                    color: "rgba(0,0,0,0.6)",
                    "&.Mui-focused": { color: "gray" },
                    "&.MuiInputLabel-shrink": { color: "gray" },
                  },
                  shrink: true,
                }}
              />


              <TextField
                select
                label="Products"
                name="products"
                value={formData.products}
                onChange={handleChange}
                fullWidth
                variant="filled"
                SelectProps={{
                  multiple: true,
                  renderValue: (selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((code) => (
                        <Chip key={code} label={code} size="small" />
                      ))}
                    </Box>
                  ),
                }}
                InputProps={{
                  disableUnderline: true,
                  sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
                }}
                InputLabelProps={{
                  sx: {
                    color: "rgba(0,0,0,0.6)",
                    "&.Mui-focused": { color: "gray" },
                    "&.MuiInputLabel-shrink": { color: "gray" },
                  },
                }}
              >
                {productOptions.map((opt) => (
                  <MenuItem key={opt.code} value={opt.code}>
                    <Checkbox checked={formData.products.indexOf(opt.code) > -1} />
                    <ListItemText
                      primary={
                        <Tooltip title={opt.label} placement="right">
                          <span>{opt.code}</span>
                        </Tooltip>
                      }
                      secondary={opt.code === opt.label ? "" : opt.label}
                    />
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <TextField
              label="Remark"
              name="query"
              value={formData.query}
              onChange={handleChange}
              multiline
              rows={3}
              required
              fullWidth
              variant="filled"
              InputProps={{
                disableUnderline: true,
                sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
              }}
              InputLabelProps={{
                sx: {
                  color: "rgba(0,0,0,0.6)",
                  "&.Mui-focused": { color: "gray" },
                  "&.MuiInputLabel-shrink": { color: "gray" },
                },
              }}
            />


            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <Button
                variant="outlined"
                component="label"
                color="black"
                sx={{ borderRadius: 999, px: 2.2, width: 220, textTransform: "none", fontWeight: 700 }}
              >
                Attach Files
                <input
                  type="file"
                  hidden
                  onChange={handleFileChange}
                  accept="image/*,.pdf,.doc,.docx"
                  multiple
                />
              </Button>
            </Box>


            {formData.attachedFiles.length > 0 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {formData.attachedFiles.map((file, i) => (
                  <Chip
                    key={i}
                    label={file.name}
                    onDelete={() => handleRemoveFile(i)}
                    sx={{
                      bgcolor: "black",
                      color: "white",
                      fontWeight: "bold",
                      "& .MuiChip-deleteIcon": {
                        color: "white",
                      },
                    }}
                    size="small"
                  />
                ))}
              </Box>
            )}


            <DialogActions sx={{ px: 0, display: "flex", justifyContent: "space-between" }}>
              <Button
                onClick={() => setOpenForm(false)}
                disabled={loading}
                variant="outlined"
                color="black"
                sx={{ borderRadius: 999, px: 2.2, textTransform: "none", fontWeight: 700 }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                startIcon={
                  loading ? <CircularProgress size={20} color="inherit" /> : null
                }
                variant="contained"
                sx={{ borderRadius: 999, px: 2.4, background: UI.accent, textTransform: "none", fontWeight: 700 }}
              >
                Submit
              </Button>
            </DialogActions>
          </Box>
        </DialogContent>
      </Dialog>


      <Dialog open={openUrgentDialog} onClose={() => setOpenUrgentDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: UI.text }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Urgent Delivery
            </Typography>
            <IconButton onClick={() => setOpenUrgentDialog(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: "#f8fafc" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 2 }}>
            <Button
              variant="contained"
              onClick={() => {
                setUrgentTab("Pending");
                setUrgentFormData(getInitialUrgentDeliveryForm());
                setOpenUrgentFormDialog(true);
                if (urgentTab !== "Pending") fetchUrgentDeliveries("Pending");
              }}
              sx={{
                backgroundColor: UI.accent,
                borderRadius: 999,
                textTransform: "none",
                fontWeight: 700,
                boxShadow: "none",
                "&:hover": { backgroundColor: "#020617", boxShadow: "none" },
              }}
            >
              Add Urgent Delivery
            </Button>
            <Tabs
              value={urgentTab}
              onChange={handleUrgentTabChange}
              sx={{
                minHeight: 38,
                "& .MuiTab-root": { minHeight: 38, textTransform: "none", fontWeight: 800 },
              }}
            >
              <Tab value="Pending" label="Pending" />
              <Tab value="Delivered" label="Delivered" />
            </Tabs>
          </Box>

          {renderUrgentDeliveriesTable()}
        </DialogContent>
      </Dialog>


      <Dialog open={openUrgentFormDialog} onClose={() => setOpenUrgentFormDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            color: UI.text,
            fontWeight: 800,
            textAlign: "center",
            fontSize: "1.35rem",
            pb: 0.7,
          }}
        >
          Add Urgent Delivery
        </DialogTitle>
        <Box
          sx={{
            height: "3px",
            backgroundColor: "#94a3b8",
            width: "100%",
            mt: 0.5,
            borderRadius: "2px",
          }}
        />
        <DialogContent sx={{ p: 3, backgroundColor: "#f8fafc" }}>
          <Box
            component="form"
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            onSubmit={handleSubmitUrgentDelivery}
          >
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Date"
                type="date"
                name="date"
                value={urgentFormData.date}
                onChange={handleUrgentFieldChange}
                required
                fullWidth
                variant="filled"
                inputProps={{ min: todayDate }}
                InputProps={{
                  disableUnderline: true,
                  sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
                }}
                InputLabelProps={{
                  sx: {
                    color: "rgba(0,0,0,0.6)",
                    "&.Mui-focused": { color: "gray" },
                    "&.MuiInputLabel-shrink": { color: "gray" },
                  },
                  shrink: true,
                }}
              />
              <TextField
                label="Order ID"
                name="orderId"
                value={urgentFormData.orderId}
                onChange={handleUrgentFieldChange}
                required
                fullWidth
                variant="filled"
                InputProps={{
                  disableUnderline: true,
                  sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
                }}
                InputLabelProps={{
                  sx: {
                    color: "rgba(0,0,0,0.6)",
                    "&.Mui-focused": { color: "gray" },
                    "&.MuiInputLabel-shrink": { color: "gray" },
                  },
                }}
              />
            </Box>

            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Name"
                name="name"
                value={urgentFormData.name}
                onChange={handleUrgentFieldChange}
                fullWidth
                variant="filled"
                InputProps={{
                  disableUnderline: true,
                  sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
                }}
                InputLabelProps={{
                  sx: {
                    color: "rgba(0,0,0,0.6)",
                    "&.Mui-focused": { color: "gray" },
                    "&.MuiInputLabel-shrink": { color: "gray" },
                  },
                }}
              />
              <TextField
                label="Contact Number"
                name="contactNumber"
                value={urgentFormData.contactNumber}
                onChange={handleUrgentFieldChange}
                fullWidth
                variant="filled"
                InputProps={{
                  disableUnderline: true,
                  sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
                }}
                InputLabelProps={{
                  sx: {
                    color: "rgba(0,0,0,0.6)",
                    "&.Mui-focused": { color: "gray" },
                    "&.MuiInputLabel-shrink": { color: "gray" },
                  },
                }}
              />
            </Box>

            <TextField
              select
              label="Expert Name"
              name="expertName"
              value={urgentFormData.expertName}
              onChange={handleUrgentFieldChange}
              fullWidth
              variant="filled"
              InputProps={{
                disableUnderline: true,
                sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
              }}
              InputLabelProps={{
                sx: {
                  color: "rgba(0,0,0,0.6)",
                  "&.Mui-focused": { color: "gray" },
                  "&.MuiInputLabel-shrink": { color: "gray" },
                },
              }}
            >
              {urgentDeliveryExperts.map((emp) => (
                <MenuItem key={emp._id} value={emp.fullName}>
                  {emp.fullName}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Remark"
              name="remark"
              value={urgentFormData.remark}
              onChange={handleUrgentFieldChange}
              multiline
              rows={3}
              fullWidth
              variant="filled"
              InputProps={{
                disableUnderline: true,
                sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
              }}
              InputLabelProps={{
                sx: {
                  color: "rgba(0,0,0,0.6)",
                  "&.Mui-focused": { color: "gray" },
                  "&.MuiInputLabel-shrink": { color: "gray" },
                },
              }}
            />

            <DialogActions sx={{ px: 0, display: "flex", justifyContent: "space-between" }}>
              <Button
                onClick={() => {
                  setOpenUrgentFormDialog(false);
                  setUrgentFormData(getInitialUrgentDeliveryForm());
                }}
                disabled={urgentSaving}
                variant="outlined"
                color="black"
                sx={{ borderRadius: 999, px: 2.2, textTransform: "none", fontWeight: 700 }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={urgentSaving}
                startIcon={urgentSaving ? <CircularProgress size={20} color="inherit" /> : null}
                variant="contained"
                sx={{ borderRadius: 999, px: 2.4, background: UI.accent, textTransform: "none", fontWeight: 700 }}
              >
                Submit
              </Button>
            </DialogActions>
          </Box>
        </DialogContent>
      </Dialog>


      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 3,
          boxShadow: "none",
          border: `1px solid ${UI.border}`,
          bgcolor: "#fff",
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: UI.accent }}>
              <TableCell
                sx={{
                  fontWeight: 800,
                  color: "#fff",
                  textAlign: "center",
                  backgroundColor: UI.accent,
                  whiteSpace: "nowrap",
                  borderBottom: `1px solid ${alpha("#ffffff", 0.2)}`,
                }}
              >
                S. No.
              </TableCell>
              {[
                "Date",
                "Order ID",
                "Tracking Id",
                "Name",
                "Contact Number",
                "Agent Name",
                "Amount",
                "Products",
                "Reason",
                "Query",
                "Attach File",
                "Status",
                "Assigned To",
                "Remark",
                "Follow Up",
                "Final Closure",
                "Resolved Date",
                "Actions",
              ].map((head) => (
                <TableCell
                  key={head}
                  sx={{
                    fontWeight: 800,
                    color: "#fff",
                    textAlign: "center",
                    backgroundColor: UI.accent,
                    whiteSpace: "nowrap",
                    borderBottom: `1px solid ${alpha("#ffffff", 0.2)}`,
                  }}
                >
                  {head}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {initialLoading ? (
              <TableRow>
                <TableCell colSpan={19} align="center">
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : (
              escalations.map((esc, index) => {
                const severity = getRowSeverity(esc);


                return (
                  <TableRow
                    key={esc._id}
                    hover
                    sx={{
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      "& td": { borderBottom: `1px solid ${alpha(UI.border, 0.7)}` },
                      ...getRowSx(severity),
                    }}
                  >
                    <TableCell align="center">
                      {page * rowsPerPage + index + 1}
                    </TableCell>
                    <TableCell align="center">{esc.date}</TableCell>
                    <TableCell align="center">{esc.orderId}</TableCell>


                    <TableCell align="center">
                      {esc.trackingId ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                          <a
                            href={`https://track.shipway.com/t/${encodeURIComponent(esc.trackingId)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "black", textDecoration: "underline", fontWeight: 500 }}
                          >
                            {esc.trackingId}
                          </a>
                          {esc.shipmentStatus && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: "#333",
                                fontSize: "0.75rem",
                                fontWeight: "bold",
                                fontStyle: "normal",
                              }}
                            >
                              ({esc.shipmentStatus})
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        "-"
                      )}
                    </TableCell>


                    <TableCell align="center">{esc.name}</TableCell>
                    <TableCell align="center">{esc.contactNumber}</TableCell>
                    <TableCell align="center">{esc.agentName}</TableCell>
                    <TableCell align="center">{esc.amount ?? "-"}</TableCell>
                    <TableCell align="center">
                      {Array.isArray(esc.products) && esc.products.length > 0 ? (
                        <Box sx={{ display: "inline-flex", gap: 0.5, flexWrap: "wrap", justifyContent: "center" }}>
                          {esc.products.map((p, i) => (
                            <Chip key={`${esc._id}-p-${i}`} label={p} size="small" sx={{ bgcolor: "#000", color: "#fff" }} />
                          ))}
                        </Box>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell align="center">{esc.reason || "-"}</TableCell>
                    <TableCell
                      sx={{
                        whiteSpace: "pre-wrap",
                        maxWidth: 500,
                        minWidth: 300,
                        wordBreak: "break-word",
                      }}
                    >
                      {esc.query.match(/.{1,100}/g)?.join("\n")}
                    </TableCell>
                    <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                      {esc.attachedFileUrls && esc.attachedFileUrls.length > 0 ? (
                        esc.attachedFileUrls.map((url, idx) => (
                          <Button
                            key={idx}
                            variant="text"
                            onClick={() => handleOpenFile(url)}
                            sx={{
                              display: "inline-block",
                              mb: 0.5,
                              color: "black",
                              fontWeight: "bold",
                              textTransform: "none",
                              minWidth: 50,
                              mx: 0.3,
                            }}
                          >
                            File {idx + 1}
                          </Button>
                        ))
                      ) : (
                        <Typography variant="body2" sx={{ fontStyle: "italic", color: "text.secondary" }}>
                          No File
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell align="center">
                      {canManageEscalations ? (
                        <TextField
                          select
                          size="small"
                          value={esc.status}
                          onChange={(e) => handleEditCell(esc._id, "status", e.target.value)}
                          sx={{ minWidth: 100 }}
                        >
                          {statusOptions.map((opt) => (
                            <MenuItem key={opt} value={opt}>
                              {opt}
                            </MenuItem>
                          ))}
                        </TextField>
                      ) : (
                        <Chip label={esc.status} size="small" sx={{ ...getStatusChipSx(esc.status), fontWeight: 700 }} />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {canManageEscalations ? (
                        <TextField
                          select
                          size="small"
                          value={esc.assignedTo}
                          onChange={(e) => handleEditCell(esc._id, "assignedTo", e.target.value)}
                          sx={{ minWidth: 130 }}
                        >
                          {allowedAssignees.map((emp) => (
                            <MenuItem key={emp._id} value={emp.fullName}>
                              {emp.fullName}
                            </MenuItem>
                          ))}
                        </TextField>
                      ) : (
                        esc.assignedTo
                      )}
                    </TableCell>


                    <TableCell sx={{ minWidth: 350 }}>
                      {canManageEscalations ? (
                        <TextField
                          key={`${esc._id}:${esc.remark ?? ""}`}
                          size="small"
                          defaultValue={esc.remark}
                          onBlur={(e) => {
                            const val = e.target.value;
                            if (val !== esc.remark) {
                              handleEditCell(esc._id, "remark", val);
                            }
                          }}
                          fullWidth
                          sx={{ width: "100%", maxWidth: 400 }}
                          InputProps={{ sx: { textAlign: "center" } }}
                        />
                      ) : (
                        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                          {esc.remark || "-"}
                        </Typography>
                      )}
                    </TableCell>


                    <TableCell sx={{ minWidth: 350 }}>
                      {canManageEscalations ? (
                        <TextField
                          key={`${esc._id}:${esc.followUp ?? ""}`}
                          size="small"
                          defaultValue={esc.followUp}
                          onBlur={(e) => {
                            const val = e.target.value;
                            if (val !== esc.followUp) {
                              handleEditCell(esc._id, "followUp", val);
                            }
                          }}
                          fullWidth
                          sx={{ width: "100%", maxWidth: 400 }}
                          InputProps={{ sx: { textAlign: "center" } }}
                        />
                      ) : (
                        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                          {esc.followUp || "-"}
                        </Typography>
                      )}
                    </TableCell>


                    <TableCell sx={{ minWidth: 350 }}>
                      {canManageEscalations ? (
                        <TextField
                          key={`${esc._id}:${esc.finalClosure ?? ""}`}
                          size="small"
                          defaultValue={esc.finalClosure}
                          onBlur={(e) => {
                            const val = e.target.value;
                            if (val !== esc.finalClosure) {
                              handleEditCell(esc._id, "finalClosure", val);
                            }
                          }}
                          fullWidth
                          sx={{ width: "100%", maxWidth: 400 }}
                          InputProps={{ sx: { textAlign: "center" } }}
                        />
                      ) : (
                        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                          {esc.finalClosure || "-"}
                        </Typography>
                      )}
                    </TableCell>


                    <TableCell align="center">
                      {canManageEscalations ? (
                        <TextField
                          type="date"
                          size="small"
                          value={esc.resolvedDate || ""}
                          onChange={(e) => handleEditCell(esc._id, "resolvedDate", e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          sx={{ minWidth: 180 }}
                        />
                      ) : (
                        esc.resolvedDate || "-"
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {canManageEscalations ? (
                        <IconButton
                          color="error"
                          onClick={() => {
                            setDeleteEscalationId(esc._id);
                            setDeleteDialogOpen(true);
                          }}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[25, 50, 100, 200]}
        />
      </TableContainer>


      <Dialog open={deleteDialogOpen} onClose={handleCancelDelete} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1} color="error.main">
            <WarningAmber fontSize="medium" />
            Confirm Deletion
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this escalation?</Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 2, pb: 1 }}>
          <Button onClick={handleCancelDelete} variant="text" sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>


      <Dialog open={openFileDialog} onClose={() => setOpenFileDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold", color: "black" }}>
          File Preview
          <IconButton
            aria-label="close"
            onClick={() => setOpenFileDialog(false)}
            sx={{ position: "absolute", right: 8, top: 8, color: "black" }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: "#f9f9f9" }}>
          {fileToView ? (
            fileToView.endsWith(".pdf") ? (
              <iframe
                src={fileToView}
                style={{ width: "100%", height: "600px", border: "none" }}
                title="File Preview"
              />
            ) : (
              <img
                src={fileToView}
                alt="Attachment Preview"
                style={{ maxWidth: "100%", maxHeight: "600px" }}
              />
            )
          ) : (
            <Typography>No file to preview</Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};


export default EscalationsPage;
