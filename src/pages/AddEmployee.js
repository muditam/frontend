import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  MenuItem,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  InputAdornment,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { Visibility, VisibilityOff, WarningAmber, Edit, Delete } from "@mui/icons-material";
import axios from "axios";

const AddEmployee = () => {
  const [employees, setEmployees] = useState([]);
  const [open, setOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentEmployeeId, setCurrentEmployeeId] = useState(null);
  const [employeeData, setEmployeeData] = useState({
    fullName: "",
    email: "",
    callerId: "",
    agentNumber: "",
    role: "",
    password: "",
    confirmPassword: "",
    async: 1,
    status: "active",
    target: "",
    hasTeam: false,  
  });
  const [error, setError] = useState("");
  const [viewInactive, setViewInactive] = useState(false);

  const roles = ["Manager", "Sales Agent", "Retention Agent"];
  const statusOptions = ["active", "inactive"];

  useEffect(() => {
    fetchEmployees(); 
  }, [viewInactive]);
 
  const fetchEmployees = async () => {
    try {
      const response = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees");
      const fetchedEmployees = response.data.filter(emp =>
        viewInactive ? emp.status === "inactive" : emp.status === "active"
      );
      setEmployees(fetchedEmployees);
    } catch (error) {
      console.error("Failed to fetch employees", error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEmployeeData({ ...employeeData, [name]: type === "checkbox" ? checked : value });
  };

  const validateForm = () => {
    const { fullName, email, callerId, agentNumber, role, password, confirmPassword, target } = employeeData;

    if (!fullName || !email || !callerId || !agentNumber || !role || (!isEditMode && !password) || target === "") {
      setError("All fields are required.");
      return false;
    }

    if (!/^[a-zA-Z ]+$/.test(fullName)) {
      setError("Full Name should contain only alphabets and spaces.");
      return false;
    }

    if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      setError("Invalid email format.");
      return false;
    }

    if (!/^[0-9]+$/.test(callerId)) {
      setError("Contact Number must be a 10-digit number.");
      return false;
    }
    if (!/^\d+$/.test(target)) {
      setError("Target must be a number.");
      return false;
    }
    if (!isEditMode && password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return false;
    }

    if (!isEditMode && password !== confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }

    setError("");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (isEditMode) {
        await axios.put(
          `https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees/${currentEmployeeId}`,
          employeeData
        );
      } else {
        await axios.post("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees", employeeData);
      }
      fetchEmployees();
      setOpen(false);
      setEmployeeData({
        fullName: "",
        email: "",
        callerId: "",
        agentNumber: "",
        role: "",
        password: "",
        confirmPassword: "",
        async: 1,
        status: "active",
        target: "",
        hasTeam: false,
      });
    } catch (error) {
      console.error("Error submitting employee data:", error);
      setError("Error occurred while saving employee data.");
    }
  };

  const handleEdit = (employee) => {
    setEmployeeData({
      fullName: employee.fullName,
      email: employee.email,
      callerId: employee.callerId,
      agentNumber: employee.agentNumber,
      role: employee.role,
      password: "",
      confirmPassword: "",
      async: 1,
      status: employee.status,
      target: employee.target || "",
      hasTeam: employee.hasTeam || false, // <-- NEW FIELD
    });
    setCurrentEmployeeId(employee._id);
    setIsEditMode(true);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees/${id}`);
      fetchEmployees();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting employee:", error);
    }
  };

  const confirmDelete = (id) => {
    setEmployeeToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleToggleViewInactive = () => {
    setViewInactive(!viewInactive);
  };

  return (
    <Box sx={{ maxWidth: 800, margin: "auto", mt: 5, padding: 3 }}>
      <Typography
        variant="h5"
        gutterBottom
        sx={{ textAlign: "center", color: "#000000", fontWeight: "bold" }}
      >
        Employee Management
      </Typography>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            setIsEditMode(false);
            setEmployeeData({
              fullName: "",
              email: "",
              callerId: "",
              agentNumber: "",
              role: "",
              password: "",
              confirmPassword: "",
              async: 1,
              status: "active",
              target: "",
              hasTeam: false,
            });
            setOpen(true);
          }}
        >
          Add Employee
        </Button>
        <Button variant="outlined" onClick={handleToggleViewInactive}>
          {viewInactive ? "Hide Inactive Employees" : "View Inactive Employees"}
        </Button>
      </Box>

      <TableContainer
        component={Paper}
        sx={{ mt: 5, borderRadius: 2, boxShadow: 3 }}
      >
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f0f0f0" }}>
              {[
                "Full Name",
                "Email",
                "Caller ID (IVR)",
                "Agent Number (IVR)",
                "Role",
                "Status",
                "Target",
                "Async",
                "Actions",
              ].map((head) => (
                <TableCell
                  key={head}
                  sx={{
                    fontWeight: "bold",
                    textAlign: "center",
                    color: "#333",
                  }}
                >
                  {head}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.map((employee, index) => (
              <TableRow
                key={employee._id}
                sx={{
                  backgroundColor: index % 2 === 0 ? "#ffffff" : "#fafafa",
                  transition: "all 0.2s",
                  "&:hover": { backgroundColor: "#f1f1f1" },
                }}
              >
                <TableCell align="center" sx={{ padding: "8px 16px" }}>
                  {employee.fullName}
                </TableCell>
                <TableCell align="center" sx={{ padding: "8px 16px" }}>
                  {employee.email}
                </TableCell>
                <TableCell align="center" sx={{ padding: "8px 16px" }}>
                  {employee.callerId}
                </TableCell>
                <TableCell align="center" sx={{ padding: "8px 16px" }}>
                  {employee.agentNumber}
                </TableCell>
                <TableCell align="center" sx={{ padding: "8px 16px" }}>
                  {employee.role}
                </TableCell>
                <TableCell align="center" sx={{ padding: "8px 16px" }}>
                  <Box
                    sx={{
                      display: "inline-block",
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 2,
                      fontSize: "0.75rem",
                      backgroundColor:
                        employee.status === "active" ? "#C8E6C9" : "#FFCDD2",
                      color:
                        employee.status === "active" ? "#2E7D32" : "#C62828",
                    }}
                  >
                    {employee.status}
                  </Box>
                </TableCell>
                <TableCell align="center" sx={{ padding: "8px 16px" }}>
                  {employee.target || 0}
                </TableCell>
                <TableCell align="center" sx={{ padding: "8px 16px" }}>
                  {employee.async}
                </TableCell>
                <TableCell align="center" sx={{ padding: "8px 16px" }}>
                  <IconButton
                    color="primary"
                    onClick={() => handleEdit(employee)}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => confirmDelete(employee._id)}
                  >
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle
          sx={{
            backgroundColor: "transparent",
            color: "#1976d2",
            fontWeight: "bold",
            textAlign: "center",
            fontSize: "1.5rem",
            pb: 1,
          }}
        >
          {isEditMode ? "Edit Employee" : "Add New Employee"}
          <Box
            sx={{
              height: "4px",
              backgroundColor: "#FFD700",
              width: "100%",
              mt: 1,
              borderRadius: "2px",
            }}
          />
        </DialogTitle>
        <DialogContent sx={{ p: 4, backgroundColor: "#f9f9f9" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="Full Name"
              name="fullName"
              value={employeeData.fullName}
              onChange={handleChange}
              variant="filled"
              InputProps={{
                disableUnderline: true,
                sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
              }}
            />
            <TextField
              fullWidth
              label="Email"
              name="email"
              value={employeeData.email}
              onChange={handleChange}
              variant="filled"
              InputProps={{
                disableUnderline: true,
                sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
              }}
            />
            <TextField
              fullWidth
              label="Caller ID (IVR)"
              name="callerId"
              value={employeeData.callerId}
              onChange={handleChange}
              variant="filled"
              InputProps={{
                disableUnderline: true,
                sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
              }}
            />
            <TextField
              fullWidth
              label="Agent Number (IVR)"
              name="agentNumber"
              value={employeeData.agentNumber}
              onChange={handleChange}
              variant="filled"
              InputProps={{
                disableUnderline: true,
                sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
              }}
            />
            <TextField
              select
              fullWidth
              label="Role"
              name="role"
              value={employeeData.role}
              onChange={handleChange}
              variant="filled"
              InputProps={{
                disableUnderline: true,
                sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
              }}
            >
              {roles.map((role) => (
                <MenuItem key={role} value={role}>
                  {role}
                </MenuItem>
              ))}
            </TextField>

            {/* Have a Team Checkbox BELOW Role */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!employeeData.hasTeam}
                  onChange={handleChange}
                  name="hasTeam"
                  color="primary"
                />
              }
              label="Have a Team?"
              sx={{ pl: 1, mt: -1, mb: 1 }}
            />

            <TextField
              select
              fullWidth
              label="Status"
              name="status"
              value={employeeData.status}
              onChange={handleChange}
              variant="filled"
              InputProps={{
                disableUnderline: true,
                sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
              }}
            >
              {statusOptions.map((status) => (
                <MenuItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </MenuItem>
              ))}
            </TextField>
            {/* Target input just below Status */}
            <TextField
              fullWidth
              label="Target"
              name="target"
              type="number"
              value={employeeData.target}
              onChange={handleChange}
              variant="filled"
              InputProps={{
                disableUnderline: true,
                sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
              }}
            />
            <TextField
              fullWidth
              label="Async"
              name="async"
              value={employeeData.async}
              disabled
              variant="filled"
              InputProps={{
                disableUnderline: true,
                sx: { backgroundColor: "#f1f1f1", borderRadius: 1, px: 1 },
              }}
            />
            {!isEditMode && (
              <>
                <TextField
                  fullWidth
                  type={showPassword ? "text" : "password"}
                  label="Password"
                  name="password"
                  value={employeeData.password}
                  onChange={handleChange}
                  variant="filled"
                  InputProps={{
                    disableUnderline: true,
                    sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  fullWidth
                  type={showConfirmPassword ? "text" : "password"}
                  label="Confirm Password"
                  name="confirmPassword"
                  value={employeeData.confirmPassword}
                  onChange={handleChange}
                  variant="filled"
                  InputProps={{
                    disableUnderline: true,
                    sx: { backgroundColor: "#fff", borderRadius: 1, px: 1 },
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          edge="end"
                        >
                          {showConfirmPassword ? (
                            <VisibilityOff />
                          ) : (
                            <Visibility />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            justifyContent: "center",
            p: 2,
            flexDirection: "column",
            gap: 2,
          }}
        >
          {error && (
            <Typography color="error" textAlign="center">
              {error}
            </Typography>
          )}
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              onClick={() => setOpen(false)}
              variant="outlined"
              color="secondary"
              sx={{ borderRadius: 2, px: 2 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              color="primary"
              sx={{ borderRadius: 2, px: 2 }}
            >
              {isEditMode ? "Update" : "Save"}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1} color="error.main">
            <WarningAmber fontSize="medium" />
            Confirm Deletion
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" color="textSecondary">
            Are you sure you want to delete this employee?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 2, pb: 1 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            color="primary"
          >
            Cancel
          </Button>
          <Button 
            onClick={() => handleDelete(employeeToDelete)}
            variant="contained"
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AddEmployee;
