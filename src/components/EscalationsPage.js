import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import { Close, Delete as DeleteIcon } from "@mui/icons-material";
import axios from "axios";

const statusOptions = ["Open", "In Progress", "Closed"];

const EscalationsPage = () => {
  const [openForm, setOpenForm] = useState(false);
  const [openFileDialog, setOpenFileDialog] = useState(false);
  const [fileToView, setFileToView] = useState(null);
  const [escalations, setEscalations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false); // For submit button
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteEscalationId, setDeleteEscalationId] = useState(null);

  const user = JSON.parse(sessionStorage.getItem("user")); // logged-in user

  const [formData, setFormData] = useState({
    date: "",
    orderId: "",
    name: "",
    contactNumber: "",
    agentName: "",
    query: "",
    attachedFiles: [], // array for multiple files
    status: "Open",
    assignedTo: "",
    remark: "",
    resolvedDate: "",
  });

  const BACKEND_URL = "https://muditamleads-14f32a10d7f7.herokuapp.com/api";

  useEffect(() => {
    fetchEmployees();
    fetchEscalations();
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

  const fetchEscalations = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/escalations`);
      setEscalations(response.data);
    } catch (error) {
      console.error("Failed to fetch escalations", error);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await axios.delete(`${BACKEND_URL}/escalations/${deleteEscalationId}`);
      fetchEscalations();
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const form = new FormData();
      form.append("date", formData.date);
      form.append("orderId", formData.orderId);
      form.append("name", formData.name);
      form.append("contactNumber", formData.contactNumber);
      form.append("agentName", formData.agentName);
      form.append("query", formData.query);
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
      });
    } catch (error) {
      console.error("Failed to submit escalation", error);
    }
    setLoading(false);
  };

  const handleEditCell = async (index, field, value) => {
    const updatedEscalation = { ...escalations[index], [field]: value };
    try {
      await axios.put(`${BACKEND_URL}/escalations/${updatedEscalation._id}`, {
        status: updatedEscalation.status,
        assignedTo: updatedEscalation.assignedTo,
        remark: updatedEscalation.remark,
        resolvedDate: updatedEscalation.resolvedDate,
      });

      setEscalations((prev) => {
        const newArr = [...prev];
        newArr[index] = updatedEscalation;
        return newArr;
      });
    } catch (error) {
      console.error("Failed to update escalation", error);
    }
  };

  

  const handleOpenFile = (fileUrl) => {
    setFileToView(fileUrl);
    setOpenFileDialog(true);
  };

  const filteredEscalations =
    user?.role === "Manager"
      ? escalations
      : escalations.filter((e) => e.agentName === user?.fullName);

  return (
    <Box sx={{ padding: 3, bgcolor: "#fff", borderRadius: 2 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: "bold", color: "black" }}>
        Escalations
      </Typography>

      <Button
        variant="contained"
        onClick={() => setOpenForm(true)}
        sx={{ mb: 3, bgcolor: "black", ":hover": { bgcolor: "#333" }, fontWeight: "bold" }}
      >
        Add Escalation
      </Button>

      {/* Add New Escalation Form Dialog */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold", color: "black" }}>Add New Escalation</DialogTitle>
        <DialogContent>
          <Box
            component="form"
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              mt: 1,
              p: 2,
              bgcolor: "#f5f5f5",
              borderRadius: 1,
            }}
            onSubmit={handleSubmit}
          >
            <TextField
              label="Date"
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
            />
            <TextField
              label="Order ID"
              name="orderId"
              value={formData.orderId}
              onChange={handleChange}
              required
              fullWidth
            />
            <TextField
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              fullWidth
            />
            <TextField
              label="Contact Number"
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleChange}
              required
              fullWidth
            />
            <TextField
              select
              label="Agent Name"
              name="agentName"
              value={formData.agentName}
              onChange={handleChange}
              required
              fullWidth
            >
              {employees.map((emp) => (
                <MenuItem key={emp._id} value={emp.fullName}>
                  {emp.fullName}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Query"
              name="query"
              value={formData.query}
              onChange={handleChange}
              multiline
              rows={3}
              required
              fullWidth
            />

            <Button
              variant="outlined"
              component="label"
              sx={{ alignSelf: "start", color: "black", borderColor: "black", fontWeight: "bold" }}
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

            <DialogActions sx={{ px: 0 }}>
              <Button onClick={() => setOpenForm(false)} disabled={loading} sx={{ color: "black" }}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                sx={{ bgcolor: "black", ":hover": { bgcolor: "#333" }, fontWeight: "bold" }}
              >
                Submit
              </Button>
            </DialogActions>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Escalations Table */}
      <TableContainer
        component={Paper}
        sx={{
          maxHeight: 550,
          borderRadius: 2,
          boxShadow: "0 4px 10px rgb(0 0 0 / 0.1)",
          bgcolor: "#fafafa",
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "black" }}>
              {[
                "Date",
                "Order ID",
                "Name",
                "Contact Number",
                "Agent Name",
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
                  sx={{ fontWeight: "bold", color: "white", textAlign: "center", backgroundColor: "black", whiteSpace: "nowrap", }}
                >
                  {head}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEscalations.map((esc, i) => (
              <TableRow
                key={esc._id}
                hover
                sx={{
                  "&:hover": { bgcolor: "#e0e0e0" },
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <TableCell align="center">{esc.date}</TableCell>
                <TableCell align="center">{esc.orderId}</TableCell>
                <TableCell align="center">{esc.name}</TableCell>
                <TableCell align="center">{esc.contactNumber}</TableCell>
                <TableCell align="center">{esc.agentName}</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap", maxWidth: 220 }}>{esc.query}</TableCell>
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
                    <Typography
                      variant="body2"
                      sx={{ fontStyle: "italic", color: "text.secondary" }}
                    >
                      No File
                    </Typography>
                  )}
                </TableCell>

                {/* Editable only for Manager */}
                <TableCell align="center" >
                  {user?.role === "Manager" ? (
                    <TextField
                      select
                      size="small"
                      value={esc.status}
                      onChange={(e) => handleEditCell(i, "status", e.target.value)}
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
                <TableCell align="center"  >
                  {user?.role === "Manager" ? (
                    <TextField
                      select
                      size="small"
                      value={esc.assignedTo}
                      onChange={(e) => handleEditCell(i, "assignedTo", e.target.value)}
                      sx={{ minWidth: 130 }}
                    >
                      {employees.map((emp) => (
                        <MenuItem key={emp._id} value={emp.fullName}>
                          {emp.fullName}
                        </MenuItem>
                      ))}
                    </TextField>
                  ) : (
                    esc.assignedTo
                  )}
                </TableCell>
                <TableCell  >
                  {user?.role === "Manager" ? (
                    <TextField
                      size="small"
                      value={esc.remark}
                      onChange={(e) => handleEditCell(i, "remark", e.target.value)}
                      fullWidth
                    />
                  ) : (
                    esc.remark
                  )}
                </TableCell>
                <TableCell align="center"  >
                  {user?.role === "Manager" ? (
                    <TextField
                      type="date"
                      size="small"
                      value={esc.resolvedDate || ""}
                      onChange={(e) => handleEditCell(i, "resolvedDate", e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ minWidth: 120 }}
                    />
                  ) : (
                    esc.resolvedDate || "-"
                  )}
                </TableCell>
                <TableCell align="right">
                  {user?.role === "Manager" ? (
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
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
  open={deleteDialogOpen}
  onClose={handleCancelDelete}
  maxWidth="xs"
  fullWidth
>
  <DialogTitle>Confirm Delete</DialogTitle>
  <DialogContent>
    <Typography>Are you sure you want to delete this escalation?</Typography>
  </DialogContent>
  <DialogActions>
    <Button onClick={handleCancelDelete} color="primary">
      Cancel
    </Button>
    <Button onClick={handleConfirmDelete} color="error" variant="contained">
      Delete
    </Button>
  </DialogActions>
</Dialog>


      {/* File Preview Dialog */}
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
