import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  Paper,
  Button,
} from "@mui/material";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const DeliveredSalesRecord = () => {
  const [employees, setEmployees] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/deliver-history").then((res) => {
      const filtered = res.data.filter(
        (emp) =>
          emp.status === "active" &&
          (emp.role === "Sales Agent" || emp.role === "Retention Agent")
      );
      setEmployees(filtered);
    });
  }, []);

  const calculateTenure = (joiningDate) => {
    const join = new Date(joiningDate);
    const now = new Date();
    const diffMonths =
      (now.getFullYear() - join.getFullYear()) * 12 +
      (now.getMonth() - join.getMonth());
    const years = Math.floor(diffMonths / 12);
    const months = diffMonths % 12;
    return `${years}y ${months}m`;
  };

  const totalAllSales = employees.reduce(
    (sum, emp) => sum + (emp.totalDeliveredSales || 0),
    0
  );

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" mb={2}>
        <Typography variant="h6">Delivered Sales Record</Typography>
        <Button variant="contained" onClick={() => navigate("/delivered-history")}>
          Add Delivered Sales
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
            <TableRow>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell><strong>Joining Date</strong></TableCell>
              <TableCell><strong>Tenure</strong></TableCell>
              <TableCell><strong>Total Sales</strong></TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {employees.map((emp) => (
              <TableRow key={emp._id}>
                <TableCell>{emp.fullName}</TableCell>
                <TableCell>
                  {emp.joiningDate
                    ? new Date(emp.joiningDate).toLocaleDateString()
                    : "--"}
                </TableCell>
                <TableCell>
                  {emp.joiningDate ? calculateTenure(emp.joiningDate) : "--"}
                </TableCell>
                <TableCell>{emp.totalDeliveredSales || 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>

          <TableFooter>
            <TableRow>
              <TableCell colSpan={3} align="right">
                <strong>Grand Total Sales:</strong>
              </TableCell>
              <TableCell>
                <strong>{totalAllSales}</strong>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default DeliveredSalesRecord;
