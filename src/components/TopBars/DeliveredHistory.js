import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  CircularProgress,
} from "@mui/material";
import axios from "axios";
import { clearCachedData, getCachedData } from "../../utils/apiCache";

const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";
const DELIVERED_HISTORY_CACHE_TTL_MS = 5 * 60 * 1000;

const isTechHelperDepartment = (employee = {}) =>
  (employee?.department || "").toLowerCase().trim() === "tech helper";

const sortByFullName = (left = {}, right = {}) =>
  (left?.fullName || "").localeCompare(right?.fullName || "", undefined, {
    sensitivity: "base",
  });

const DeliveredHistory = () => {
  const [agents, setAgents] = useState([]);
  const [monthKeys, setMonthKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const storedUser = JSON.parse(sessionStorage.getItem("user") || "{}");
  const userRole = (storedUser?.role || "").toLowerCase().trim();

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async (forceFresh = false) => {
    setLoading(true);
    try {
      const cacheKey = `delivered-history:list:${storedUser?.role || "all"}:${storedUser?.fullName || "all"}`;
      if (forceFresh) {
        clearCachedData(cacheKey);
      }

      const list = await getCachedData(
        cacheKey,
        async () => {
          const res = await axios.get(`${API_BASE}/api/deliver-history`, {
            params: {
              role: storedUser.role,
              fullName: storedUser.fullName,
            },
          });

          return res.data || [];
        },
        DELIVERED_HISTORY_CACHE_TTL_MS
      );

      const filteredAgents = list
        .filter((emp) => !isTechHelperDepartment(emp))
        .sort(sortByFullName);
      setAgents(filteredAgents);

      const start = new Date("2024-03-01");
      const now = new Date();
      const months = [];
      while (start <= now) {
        months.push(start.toLocaleString("default", { month: "short", year: "2-digit" }));
        start.setMonth(start.getMonth() + 1);
      }
      setMonthKeys(months.reverse());
    } catch (err) {
      console.error("Failed to fetch delivered history:", err);
      setAgents([]);
      setMonthKeys([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const emp of agents) {
        await axios.put(
          `${API_BASE}/api/deliver-history/${emp._id}/monthly-sales`,
          {
            monthlyDeliveredSales: emp.monthlyDeliveredSales || {},
          }
        );
      }
      clearCachedData("delivered-history:");
      fetchData(true);
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" mb={2}>
        <Typography variant="h6">Delivered Sales History</Typography>
        {userRole !== "sales agent" && userRole !== "retention agent" && (
          <Button variant="contained" color="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save All"}
          </Button>
        )}
      </Box>

      <TableContainer component={Paper} sx={{ overflowX: "auto", maxWidth: "100%" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  position: "sticky",
                  left: 0,
                  zIndex: 3,
                  backgroundColor: "#f5f5f5",
                  minWidth: 180,
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                Name
              </TableCell>
              <TableCell
                sx={{
                  position: "sticky",
                  left: 180,
                  zIndex: 3,
                  backgroundColor: "#f5f5f5",
                  minWidth: 140,
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                Total Sales
              </TableCell>
              {monthKeys.map((month, idx) => (
                <TableCell
                  key={idx}
                  sx={{
                    minWidth: 100,
                    fontWeight: "bold",
                    backgroundColor: "#f5f5f5",
                    textAlign: "center",
                  }}
                >
                  {month}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={Math.max(2 + monthKeys.length, 2)} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={34} />
                </TableCell>
              </TableRow>
            ) : agents.length ? (
              agents.map((emp) => (
              <TableRow key={emp._id}>
                <TableCell
                  sx={{
                    position: "sticky",
                    left: 0,
                    backgroundColor: "white",
                    zIndex: 2,
                    minWidth: 180,
                    textAlign: "center",
                  }}
                >
                  {emp.fullName}
                </TableCell>
                <TableCell
                  sx={{
                    position: "sticky",
                    left: 180,
                    backgroundColor: "white",
                    zIndex: 2,
                    minWidth: 140,
                    textAlign: "center",
                    fontWeight: 500,
                  }}
                >
                  {monthKeys.reduce(
                    (total, key) => total + (emp.monthlyDeliveredSales?.[key] || 0),
                    0
                  )}
                </TableCell>

                {monthKeys.map((month) => (
                  <TableCell key={month} sx={{ minWidth: 120, textAlign: "center" }}>
                    {userRole === "sales agent" || userRole === "retention agent" ? (
                      <Typography>
                        {emp.monthlyDeliveredSales?.[month] || 0}
                      </Typography>
                    ) : (
                      <TextField
                        variant="outlined"
                        size="small"
                        type="number"
                        value={emp.monthlyDeliveredSales?.[month] || ""}
                        InputProps={{
                          inputProps: {
                            min: 0,
                            inputMode: "numeric",
                            style: {
                              textAlign: "center",
                              appearance: "none",
                              MozAppearance: "textfield",
                              WebkitAppearance: "none",
                            },
                          },
                        }}
                        sx={{
                          width: "100px",
                          "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                            {
                              WebkitAppearance: "none",
                              margin: 0,
                            },
                        }}
                        onChange={(e) => {
                          const updated = [...agents];
                          const index = updated.findIndex((x) => x._id === emp._id);
                          if (!updated[index].monthlyDeliveredSales)
                            updated[index].monthlyDeliveredSales = {};
                          updated[index].monthlyDeliveredSales[month] =
                            parseInt(e.target.value) || 0;
                          setAgents(updated);
                        }}
                      />
                    )}
                  </TableCell>
                ))}
              </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={Math.max(2 + monthKeys.length, 2)} align="center" sx={{ py: 4 }}>
                  No delivered sales history found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default DeliveredHistory;
