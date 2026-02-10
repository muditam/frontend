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
} from "@mui/material";
import { Close, Delete as DeleteIcon, WarningAmber } from "@mui/icons-material";
import axios from "axios";


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
const EscalationsPage = () => {
  const [openForm, setOpenForm] = useState(false);
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
  const [formData, setFormData] = useState({
    date: "",
    orderId: "",
    name: "",
    contactNumber: "",
    agentName: "",
    query: "",
    attachedFiles: [],
    status: "Open",
    assignedTo: "",
    remark: "",
    resolvedDate: "",
    reason: "",
    amount: "",
    products: [],
  });


  const BACKEND_URL = "https://muditamleads-14f32a10d7f7.herokuapp.com/api";
  const allowedAssignees = useMemo(() => {
    return employees
      .filter((emp) => allowedRolesForAssign.includes(emp.role))
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


  const fetchEscalations = async (pageIdx = page, rpp = rowsPerPage, closedOnly = showClosedOnly) => {
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
  }, [page, rowsPerPage, showClosedOnly, reasonFilter]);


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


      setFormData({
        date: "",
        orderId: "",
        name: "",
        contactNumber: "",
        agentName: "",
        query: "",
        attachedFiles: [],
        status: "Open",
        assignedTo: "",
        remark: "",
        resolvedDate: "",
        reason: "",
        amount: "",
        products: [],
      });
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
        resolvedDate: current.resolvedDate,
      });
    }
  };


  const handleOpenFile = (fileUrl) => {
    setFileToView(fileUrl);
    setOpenFileDialog(true);
  };


  return (
    <Box sx={{ padding: 3, bgcolor: "#fff", borderRadius: 2 }}>
      <Typography
        variant="h4"
        sx={{
          fontWeight: "bold",
          textAlign: "center",
          color: "black",
          marginBottom: 2,
        }}
      >
        Escalations
      </Typography>


      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Button
          variant="contained"
          onClick={() => setOpenForm(true)}
          sx={{ mb: 2, backgroundColor: "black" }}
        >
          Add Escalation
        </Button>


        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <TextField
            select
            size="small"
            label=""
            value={reasonFilter}
            onChange={(e) => {
              setReasonFilter(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 240, bgcolor: "#fff" }}
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
              backgroundColor: showClosedOnly ? "black" : "transparent",
              color: showClosedOnly ? "white" : "black",
            }}
            onClick={() => setShowClosedOnly(!showClosedOnly)}
          >
            {showClosedOnly ? "Show Open / In Progress" : "Show Closed"}
          </Button>
        </Box>
      </Box>


      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            backgroundColor: "transparent",
            color: "black",
            fontWeight: "bold",
            textAlign: "center",
            fontSize: "1.5rem",
            pb: 1,
          }}
        >
          Add New Escalation
        </DialogTitle>
        <Box
          sx={{
            height: "4px",
            backgroundColor: "#FFD700",
            width: "100%",
            mt: 1,
            borderRadius: "2px",
          }}
        />
        <DialogContent sx={{ p: 4, backgroundColor: "#f9f9f9" }}>
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
                label="Agent Name"
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
                sx={{ borderRadius: 1, px: 2, width: 200 }}
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
                sx={{ borderRadius: 1, px: 2 }}
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
                sx={{ borderRadius: 1, px: 2, background: "black" }}
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
          borderRadius: 2,
          boxShadow: "0 4px 10px rgb(0 0 0 / 0.1)",
          bgcolor: "#fafafa",
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "black" }}>
              <TableCell
                sx={{
                  fontWeight: "bold",
                  color: "white",
                  textAlign: "center",
                  backgroundColor: "black",
                  whiteSpace: "nowrap",
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
                "Resolved Date",
                "Actions",
              ].map((head) => (
                <TableCell
                  key={head}
                  sx={{
                    fontWeight: "bold",
                    color: "white",
                    textAlign: "center",
                    backgroundColor: "black",
                    whiteSpace: "nowrap",
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
                <TableCell colSpan={15} align="center">
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : (
              escalations.map((esc, index) => {
                const baseDate = esc.date ? new Date(esc.date) : new Date(esc.createdAt);
                const now = new Date();
                const hoursDifference = (now - baseDate) / (1000 * 3600);
                const daysDifference = hoursDifference / 24;


                let backgroundColor = "transparent";
                if (esc.status !== "Closed") {
                  if (daysDifference > 3) backgroundColor = "lightcoral";
                  else if (hoursDifference > 48) backgroundColor = "orange";
                }


                return (
                  <TableRow
                    key={esc._id}
                    hover
                    sx={{
                      "&:hover": { bgcolor: "#e0e0e0" },
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      backgroundColor,
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
                                color: "#333", // Darker for better clarity
                                fontSize: "0.75rem",
                                fontWeight: "bold", // Bold as requested
                                fontStyle: "normal", // Removed italic to fix blurriness
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
                      {user?.role === "Manager" || user?.role === "Operations" ? (
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
                        esc.status
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {user?.role === "Manager" || user?.role === "Operations" ? (
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
                      {user?.role === "Manager" || user?.role === "Operations" ? (
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


                    <TableCell align="center">
                      {user?.role === "Manager" || user?.role === "Operations" ? (
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
                      {user?.role === "Manager" || user?.role === "Operations" ? (
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
          <button onClick={handleCancelDelete} style={{ background: 'none', border: 'none', color: 'black', cursor: 'pointer' }}>
            Cancel
          </button>
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

