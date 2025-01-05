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
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import axios from "axios";

const AddEmployee = () => {
  const [employees, setEmployees] = useState([]);
  const [open, setOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentEmployeeId, setCurrentEmployeeId] = useState(null);
  const [employeeData, setEmployeeData] = useState({
    fullName: "",
    email: "",
    contactNumber: "",
    role: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");

  const roles = ["Manager", "Sales Agent", "Retention Agent"];

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get("https://www.60brands.com/api/employees");
      setEmployees(response.data);
    } catch (error) {
      console.error("Failed to fetch employees", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEmployeeData({ ...employeeData, [name]: value });
  };

  const validateForm = () => {
    const { fullName, email, contactNumber, role, password, confirmPassword } = employeeData;

    if (!fullName || !email || !contactNumber || !role || (!isEditMode && !password)) {
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

    if (!/^[0-9]{10}$/.test(contactNumber)) {
      setError("Contact Number must be a 10-digit number.");
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
        await axios.put(`https://www.60brands.com/api/employees/${currentEmployeeId}`, employeeData);
        setEmployees((prev) =>
          prev.map((emp) =>
            emp._id === currentEmployeeId ? { ...emp, ...employeeData } : emp
          )
        );
      } else {
        const response = await axios.post("https://www.60brands.com/api/employees", employeeData);
        setEmployees((prev) => [response.data.employee, ...prev]);
      }
      fetchEmployees();
      setOpen(false);
      setEmployeeData({
        fullName: '',
        email: '',
        contactNumber: '',
        role: '',
        password: '',
        confirmPassword: '',
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
      contactNumber: employee.contactNumber,
      role: employee.role,
      password: "",
      confirmPassword: "",
    });
    setCurrentEmployeeId(employee._id);
    setIsEditMode(true);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`https://www.60brands.com/api/employees/${id}`);
      fetchEmployees();
    } catch (error) {
      console.error("Error deleting employee:", error);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, margin: "auto", mt: 5, padding: 3 }}>
      <Typography variant="h5" gutterBottom>
        Employee Management
      </Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={() => {
          setIsEditMode(false);
          setEmployeeData({
            fullName: "",
            email: "",
            contactNumber: "",
            role: "",
            password: "",
            confirmPassword: "",
          });
          setOpen(true);
        }}
      >
        Add Employee
      </Button>

      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Full Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Contact Number</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee._id}>
                <TableCell>{employee.fullName}</TableCell>
                <TableCell>{employee.email}</TableCell>
                <TableCell>{employee.contactNumber}</TableCell>
                <TableCell>{employee.role}</TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => handleEdit(employee)}>
                    <Edit />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleDelete(employee._id)}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>{isEditMode ? "Edit Employee" : "Add New Employee"}</DialogTitle>
        <DialogContent>
          {error && <Typography color="error">{error}</Typography>}
          <TextField
            fullWidth
            label="Full Name"
            name="fullName"
            value={employeeData.fullName}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Email"
            name="email"
            value={employeeData.email}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Contact Number" 
            name="contactNumber"
            value={employeeData.contactNumber}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            select
            fullWidth
            label="Role"
            name="role"
            value={employeeData.role}
            onChange={handleChange}
            margin="normal"
          >
            {roles.map((role) => (
              <MenuItem key={role} value={role}>
                {role}
              </MenuItem>
            ))}
          </TextField>
          {!isEditMode && (
            <>
              <TextField
                fullWidth
                type="password"
                label="Password"
                name="password"
                value={employeeData.password}
                onChange={handleChange}
                margin="normal"
              />
              <TextField
                fullWidth
                type="password"
                label="Confirm Password"
                name="confirmPassword"
                value={employeeData.confirmPassword}
                onChange={handleChange}
                margin="normal"
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {isEditMode ? "Update" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AddEmployee;
