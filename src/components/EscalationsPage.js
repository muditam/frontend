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
import { Close, Delete as DeleteIcon, WarningAmber } from "@mui/icons-material";
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
  const [showClosedOnly, setShowClosedOnly] = useState(false);


  const user = JSON.parse(sessionStorage.getItem("user"));  


  const [formData, setFormData] = useState({
    date: "",
    orderId: "",
    name: "",
    contactNumber: "",
    agentName: "",
    query: "",
    attachedFiles: [],
    status: "Open",
    assignedTo: "Preeti Shrestha",
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
      const activeManagers = response.data.filter(
        (emp) => emp.status === "active" 
      );
      setEmployees(activeManagers);
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
        assignedTo: "Preeti Shrestha",
        remark: "",
        resolvedDate: "",
      });
    } catch (error) {
      console.error("Failed to submit escalation", error);
    }
    setLoading(false);
  };

  const handleEditCell = async (index, field, value) => {
  const escalationId = filteredEscalations[index]._id;
  const updatedEscalation = escalations.find(e => e._id === escalationId);


  try {
    const payload = {
      status: field === "status" ? value : updatedEscalation.status,
      assignedTo: field === "assignedTo" ? value : updatedEscalation.assignedTo,
      remark: field === "remark" ? value : updatedEscalation.remark,
      resolvedDate: field === "resolvedDate" ? value : updatedEscalation.resolvedDate,
    };

    const response = await axios.put(
      `${BACKEND_URL}/escalations/${updatedEscalation._id}`,
      payload
    );
 
    if (showClosedOnly && payload.status !== "Closed") {
      setShowClosedOnly(false);
    }

    await fetchEscalations();
  } catch (error) {
    console.error("Failed to update escalation", error);
  }
};



  const handleOpenFile = (fileUrl) => {
    setFileToView(fileUrl);
    setOpenFileDialog(true);
  };

  const filteredEscalations = escalations.filter((esc) => {
    if (showClosedOnly) return esc.status === "Closed";
    return esc.status === "Open" || esc.status === "In Progress";
  });

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

      <Button
          variant={showClosedOnly ? "contained" : "outlined"}
          sx={{ backgroundColor: showClosedOnly ? "black" : "transparent", color: showClosedOnly ? "white" : "black" }}
          onClick={() => setShowClosedOnly(!showClosedOnly)}
        >
          {showClosedOnly ? "Show Open / In Progress" : "Show Closed"}
        </Button> 
</Box>
      {/* Add New Escalation Form Dialog */}
      <Dialog
        open={openForm}
        onClose={() => setOpenForm(false)}
        maxWidth="sm"
        fullWidth
      >
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
            <Box sx={{ display: 'flex', gap: 2 }}>
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
            
            <Box sx={{ display: 'flex', gap: 2 }}>
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
                  color: "rgba(0,0,0,0.6)", // default label color
                  "&.Mui-focused": {
                    color: "gray", // label color when focused
                  },
                  "&.MuiInputLabel-shrink": {
                    color: "gray", // label color when shrunk (input filled)
                  },
                },
              }}
            >
              {employees.map((emp) => (
                <MenuItem key={emp._id} value={emp.fullName}>       
                  {emp.fullName}  
                </MenuItem>
              ))}
            </TextField>
            </Box>
            <TextField
              label="Query"
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
                  color: "rgba(0,0,0,0.6)", // default label color
                  "&.Mui-focused": {
                    color: "gray", // label color when focused
                  },
                  "&.MuiInputLabel-shrink": {
                    color: "gray", // label color when shrunk (input filled)
                  },
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


            <DialogActions
              sx={{ px: 0, display: "flex", justifyContent: "space-between" }}
            >
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
                  loading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : null
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


      {/* Escalations Table */}
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
                <TableCell 
                  sx={{ 
                    whiteSpace: "pre-wrap", 
                    maxWidth: 500, 
                    minWidth: 300, 
                    wordBreak: "break-word" 
                  }}
                >
                  {esc.query.match(/.{1,100}/g)?.join('\n')}
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
                    <Typography
                      variant="body2"
                      sx={{ fontStyle: "italic", color: "text.secondary" }}
                    >
                      No File
                    </Typography>
                  )}
                </TableCell>


                {/* Editable only for Manager */}
                <TableCell align="center">
                  {user?.role === "Manager" ? (
                    <TextField
                      select
                      size="small"
                      value={esc.status}
                      onChange={(e) =>
                        handleEditCell(i, "status", e.target.value)
                      }
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
                  {user?.role === "Manager" ? (
                    <TextField
                      select
                      size="small"
                      value={esc.assignedTo}
                      onChange={(e) =>
                        handleEditCell(i, "assignedTo", e.target.value)
                      }
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
                <TableCell sx={{ minWidth: 300 }}>
                  {user?.role === "Manager" ? (
                    <TextField
                      size="small"
                      value={esc.remark}
                      onChange={(e) =>
                        handleEditCell(i, "remark", e.target.value)
                      }
                      fullWidth
                    />
                  ) : (
                    esc.remark
                  )}
                </TableCell>
                <TableCell align="center">
                  {user?.role === "Manager" ? (
                    <TextField
                      type="date"
                      size="small"
                      value={esc.resolvedDate || ""}
                      onChange={(e) =>
                        handleEditCell(i, "resolvedDate", e.target.value)
                      }
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
        <DialogTitle><Box display="flex" alignItems="center" gap={1} color="error.main">
          <WarningAmber fontSize="medium" />
          Confirm Deletion
        </Box></DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this escalation?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 2, pb: 1 }}>
          <Button onClick={handleCancelDelete} color="black">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>


      {/* File Preview Dialog */}
      <Dialog
        open={openFileDialog}
        onClose={() => setOpenFileDialog(false)}
        maxWidth="md"
        fullWidth
      >
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



