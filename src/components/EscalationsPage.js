import React, { useState } from "react";
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
import { Close } from "@mui/icons-material";

const statusOptions = ["Open", "In Progress", "Closed"];
const assignedToOptions = ["Agent A", "Agent B", "Manager"];

const EscalationsPage = () => {
  const [openForm, setOpenForm] = useState(false);
  const [openFileDialog, setOpenFileDialog] = useState(false);
  const [fileToView, setFileToView] = useState(null);
  const [escalations, setEscalations] = useState([]);

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

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((fd) => ({ ...fd, [name]: value }));
  };

  // Handle file input change
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFormData((fd) => ({ ...fd, attachedFile: file }));
  };

  // Add escalation
  const handleSubmit = (e) => {
    e.preventDefault();

    // Prepare display object - for attached file show file name only
    const newEscalation = {
      ...formData,
      attachedFileUrl: formData.attachedFile
        ? URL.createObjectURL(formData.attachedFile)
        : null,
    };

    setEscalations((prev) => [...prev, newEscalation]);
    setOpenForm(false);
    // Reset form
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
  };

  // Inline edit handler for editable fields
  const handleEditCell = (index, field, value) => {
    setEscalations((prev) => {
      const newArr = [...prev];
      newArr[index][field] = value;
      return newArr;
    });
  };

  // Open file preview dialog
  const handleOpenFile = (fileUrl) => {
    setFileToView(fileUrl);
    setOpenFileDialog(true);
  };

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Escalations
      </Typography>

      <Button variant="contained" onClick={() => setOpenForm(true)} sx={{ mb: 3 }}>
        Add Escalation
      </Button>

      {/* Add Escalation Form Dialog */}
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
              label="Agent Name"
              name="agentName"
              value={formData.agentName}
              onChange={handleChange}
              required
            />
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

      {/* Escalations Table */}
      <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
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
              ].map((head) => (
                <TableCell key={head} sx={{ fontWeight: "bold" }}>
                  {head}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {escalations.map((esc, i) => (
              <TableRow key={i}>
                {/* Read-only cells */}
                <TableCell>{esc.date}</TableCell>
                <TableCell>{esc.orderId}</TableCell>
                <TableCell>{esc.name}</TableCell>
                <TableCell>{esc.contactNumber}</TableCell>
                <TableCell>{esc.agentName}</TableCell>
                <TableCell sx={{ whiteSpace: "pre-wrap" }}>{esc.query}</TableCell>

                {/* Attach File clickable */}
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

                {/* Editable cells */}
                <TableCell>
                  <TextField
                    select
                    size="small"
                    value={esc.status}
                    onChange={(e) => handleEditCell(i, "status", e.target.value)}
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
                    onChange={(e) => handleEditCell(i, "assignedTo", e.target.value)}
                  >
                    {assignedToOptions.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                  </TextField>
                </TableCell>

                <TableCell>
                  <TextField
                    size="small"
                    value={esc.remark}
                    onChange={(e) => handleEditCell(i, "remark", e.target.value)}
                  />
                </TableCell>

                <TableCell>
                  <TextField
                    type="date"
                    size="small"
                    value={esc.resolvedDate}
                    onChange={(e) => handleEditCell(i, "resolvedDate", e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* File Preview Dialog */}
      <Dialog open={openFileDialog} onClose={() => setOpenFileDialog(false)} maxWidth="md" fullWidth>
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
            <>
              {/* Show PDF or image */}
              {fileToView.endsWith(".pdf") ? (
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
              )}
            </>
          ) : (
            <Typography>No file to preview</Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default EscalationsPage;
