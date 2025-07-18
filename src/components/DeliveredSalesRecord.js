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

  const storedUser = JSON.parse(sessionStorage.getItem("user") || "{}");
  const userRole = (storedUser?.role || "").toLowerCase().trim();
  const userName = (storedUser?.fullName || "").toLowerCase().trim();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/deliver-history", {
          params: {
            role: storedUser?.role,
            fullName: storedUser?.fullName,
          },
        });

        const activeEmployees = (res.data || []).filter((emp) => emp.status === "active");

        let filtered = [];
        if (userRole === "sales agent" || userRole === "retention agent") {
          filtered = activeEmployees.filter(
            (emp) => (emp.fullName || "").toLowerCase().trim() === userName
          );
        } else {
          filtered = activeEmployees.filter(
            (emp) =>
              emp.role === "Sales Agent" || emp.role === "Retention Agent"
          );
        }

        setEmployees(filtered);
      } catch (err) {
        console.error("Failed to fetch delivered history:", err);
        setEmployees([]);
      }
    };

    fetchData();
  }, [userRole, userName]);

  const calculateTenure = (joiningDate) => {
    if (!joiningDate) return "--";
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
    <Box p={3} display="flex" justifyContent="center">
      <Box width="100%" maxWidth="65%">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6" fontWeight="bold" color="black">
            Delivered Sales Record
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate("/delivered-history")}
            sx={{
              backgroundColor: "black",
              color: "white",
              "&:hover": { backgroundColor: "#333" },
              textTransform: "none",
              fontWeight: "bold",
            }}
          >
            View Delivered Sales
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#000" }}>
                {["Name", "Joining Date", "Tenure", "Total Sales"].map((title) => (
                  <TableCell
                    key={title}
                    align="center"
                    sx={{ color: "#fff", fontWeight: "bold", fontSize: "15px" }}
                  >
                    {title}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {employees.map((emp, idx) => (
                <TableRow
                  key={emp._id}
                  sx={{
                    backgroundColor: idx % 2 === 0 ? "#f9f9f9" : "#eaeaea",
                    "&:hover": { backgroundColor: "#ddd" },
                  }}
                >
                  <TableCell align="center" sx={{ fontWeight: 500 }}>{emp.fullName}</TableCell>
                  <TableCell align="center">
                    {emp.joiningDate
                      ? new Date(emp.joiningDate).toLocaleDateString()
                      : "--"}
                  </TableCell>
                  <TableCell align="center">{calculateTenure(emp.joiningDate)}</TableCell>
                  <TableCell align="center">{emp.totalDeliveredSales || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>

            {employees.length > 1 && (
              <TableFooter>
                <TableRow sx={{ backgroundColor: "#f0f0f0" }}>
                  <TableCell colSpan={3} align="right" sx={{ fontWeight: "bold" }}>
                    Grand Total Sales:
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>
                    {totalAllSales}
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};

export default DeliveredSalesRecord;
