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

  const user = JSON.parse(sessionStorage.getItem("user")); // logged-in user

  const [formData, setFormData] = useState({
    date: "",
    orderId: "",
    name: "",
    contactNumber: "",
    agentName: "",
    query: "",
    attachedFile: null,
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
      const activeEmployees = response.data.filter(
        (emp) => emp.status === "active"
      );
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((fd) => ({ ...fd, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFormData((fd) => ({ ...fd, attachedFile: file }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const form = new FormData();
      form.append("date", formData.date);
      form.append("orderId", formData.orderId);
      form.append("name", formData.name);
      form.append("contactNumber", formData.contactNumber);
      form.append("agentName", formData.agentName);
      form.append("query", formData.query);
      if (formData.attachedFile) {
        form.append("attachedFile", formData.attachedFile);
      }
      await axios.post(`${BACKEND_URL}/escalations`, form);
      setOpenForm(false);
      fetchEscalations();

      setFormData({
        date: "",
        orderId: "",
        name: "",
        contactNumber: "",
        agentName: "",
        query: "",
        attachedFile: null,
        status: "Open",
        assignedTo: "",
        remark: "",
        resolvedDate: "",
      });
    } catch (error) {
      console.error("Failed to submit escalation", error);
    }
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

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this escalation?")) {
      try {
        await axios.delete(`${BACKEND_URL}/escalations/${id}`);
        fetchEscalations();
      } catch (error) {
        console.error("Failed to delete escalation", error);
      }
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
    <Box sx={{ padding: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Escalations
      </Typography>

      <Button variant="contained" onClick={() => setOpenForm(true)} sx={{ mb: 3 }}>
        Add Escalation
      </Button>

      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Escalation</DialogTitle>
        <DialogContent>
          <Box
            component="form"
            sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}
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
            />
            <TextField
              label="Order ID"
              name="orderId"
              value={formData.orderId}
              onChange={handleChange}
              required
            />
            <TextField
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <TextField
              label="Contact Number"
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleChange}
              required
            />
            <TextField
              select
              label="Agent Name"
              name="agentName"
              value={formData.agentName}
              onChange={handleChange}
              required
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
            />
            <Button variant="outlined" component="label">
              Attach File
              <input
                type="file"
                hidden
                onChange={handleFileChange}
                accept="image/*,.pdf,.doc,.docx"
              />
            </Button>
            {formData.attachedFile && (
              <Typography variant="caption" sx={{ mt: 1 }}>
                Selected file: {formData.attachedFile.name}
              </Typography>
            )}
            <DialogActions sx={{ px: 0 }}>
              <Button onClick={() => setOpenForm(false)}>Cancel</Button>
              <Button type="submit" variant="contained">
                Submit
              </Button>
            </DialogActions>
          </Box>
        </DialogContent>
      </Dialog>

      <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
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
                <TableCell key={head} sx={{ fontWeight: "bold" }}>
                  {head}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEscalations.map((esc, i) => (
              <TableRow key={esc._id}>
                <TableCell>{esc.date}</TableCell>
                <TableCell>{esc.orderId}</TableCell>
                <TableCell>{esc.name}</TableCell>
                <TableCell>{esc.contactNumber}</TableCell>
                <TableCell>{esc.agentName}</TableCell>
                <TableCell sx={{ whiteSpace: "pre-wrap" }}>{esc.query}</TableCell>
                <TableCell>
                  {esc.attachedFileUrl ? (
                    <Button
                      variant="text"
                      onClick={() => handleOpenFile(esc.attachedFileUrl)}
                    >
                      View File
                    </Button>
                  ) : (
                    "No File"
                  )}
                </TableCell>
                <TableCell>
                  <TextField
                    select
                    size="small"
                    value={esc.status}
                    onChange={(e) =>
                      handleEditCell(i, "status", e.target.value)
                    }
                  >
                    {statusOptions.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                  </TextField>
                </TableCell>
                <TableCell>
                  <TextField
                    select
                    size="small"
                    value={esc.assignedTo}
                    onChange={(e) =>
                      handleEditCell(i, "assignedTo", e.target.value)
                    }
                  >
                    {employees.map((emp) => (
                      <MenuItem key={emp._id} value={emp.fullName}>
                        {emp.fullName}
                      </MenuItem>
                    ))}
                  </TextField>
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={esc.remark}
                    onChange={(e) =>
                      handleEditCell(i, "remark", e.target.value)
                    }
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="date"
                    size="small"
                    value={esc.resolvedDate || ""}
                    onChange={(e) =>
                      handleEditCell(i, "resolvedDate", e.target.value)
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    color="error"
                    onClick={() => handleDelete(esc._id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={openFileDialog}
        onClose={() => setOpenFileDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          File Preview
          <IconButton
            aria-label="close"
            onClick={() => setOpenFileDialog(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
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
