import React, { useEffect, useState } from "react";
import {
  Box, Typography, Button, TextField, Table, TableHead,
  TableRow, TableCell, TableBody, Paper, Autocomplete,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton
} from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import DeleteIcon from "@mui/icons-material/Delete";
import Checkbox from "@mui/material/Checkbox";
import axios from "axios";

// Helper to get logged-in manager id
const getManagerId = () =>
  (JSON.parse(sessionStorage.getItem("user")) || {}).id || "";

// Helper to calculate remaining working days (Mon-Sat) in current month (including today if not Sunday)
function getRemainingWorkingDays() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const lastDate = new Date(year, month + 1, 0).getDate();

  let count = 0;
  for (let d = today.getDate(); d <= lastDate; d++) {
    const date = new Date(year, month, d);
    // Sunday = 0
    if (date.getDay() !== 0) count++;
  }
  return count;
}

const TeamPage = ({ managerId: managerIdProp }) => {
  const managerId = managerIdProp || getManagerId();

  // States
  const [allAgents, setAllAgents] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [searchValue, setSearchValue] = useState([]);
  const [addLoading, setAddLoading] = useState(false);
  const [tableProgress, setTableProgress] = useState({});
  const [tableRows, setTableRows] = useState([]);

  // Totals for header
  const [totalAchieved, setTotalAchieved] = useState(0);
  const [totalTarget, setTotalTarget] = useState(0);

  // Load initial team and agents
  useEffect(() => {
    if (!managerId) return;
    setLoading(true);
    Promise.all([
      axios.get("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees"),
      axios.get(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees/${managerId}`)
    ])
      .then(([agentsRes, managerRes]) => {
        const agents = agentsRes.data.filter(
          emp =>
            emp.status === "active" &&
            (emp.role === "Sales Agent" || emp.role === "Retention Agent")
        );
        setAllAgents(agents);
        setTeamMembers(managerRes.data.teamMembers || []);
      })
      .catch(() => {
        setAllAgents([]);
        setTeamMembers([]);
      })
      .finally(() => setLoading(false));
  }, [managerId]);

  // For each team member, get their target/achieved, and calc totals
  useEffect(() => {
    if (!teamMembers.length) {
      setTableRows([]);
      setTotalAchieved(0);
      setTotalTarget(0);
      return;
    }
    setLoading(true);
    Promise.all(
      teamMembers.map(async emp => {
        let achieved = 0;
        try {
          const { data } = await axios.get(
            `https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales/progress?name=${encodeURIComponent(emp.fullName)}`
          );
          achieved = data.total || 0;
        } catch (e) {}
        const monthlyTarget = emp.target || 0;
        const pending = Math.max(0, monthlyTarget - achieved);
        const pctAch =
          monthlyTarget === 0
            ? 0
            : Math.min(100, (achieved / monthlyTarget) * 100);
        const pctPend = 100 - pctAch;
        return {
          id: emp._id,
          name: emp.fullName,
          monthlyTarget,
          achieved,
          pending,
          pctAch,
          pctPend,
        };
      })
    )
      .then(rows => {
        setTableRows(rows.map(row => ({
          ...row,
          achieved: row.achieved.toLocaleString(),
          pending: row.pending.toLocaleString(),
        })));
        // Totals
        const achievedSum = rows.reduce((acc, row) => acc + (row.achieved || 0), 0);
        const targetSum = rows.reduce((acc, row) => acc + (row.monthlyTarget || 0), 0);
        setTotalAchieved(achievedSum);
        setTotalTarget(targetSum);
      })
      .finally(() => setLoading(false));
  }, [teamMembers]);

  // --- Add/Remove Logic ---
  const handleAddSelected = async () => {
    setAddLoading(true);
    try {
      const updatedIds = [
        ...teamMembers.map(tm => tm._id),
        ...searchValue.map(a => a._id)
      ].filter((v, i, arr) => arr.indexOf(v) === i); // Unique
      const { data } = await axios.put(
        `https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees/${managerId}/team`,
        { teamMembers: updatedIds }
      );
      setTeamMembers(data.manager.teamMembers || []);
      setAddOpen(false);
      setSearchValue([]);
    } catch (e) {
      alert("Failed to update team.");
    } finally {
      setAddLoading(false);
    }
  };

  // Remove a team member (by id)
  const handleRemove = async id => {
    setTableProgress(p => ({ ...p, [id]: true }));
    try {
      const updatedIds = teamMembers
        .filter(emp => emp._id !== id)
        .map(emp => emp._id);
      const { data } = await axios.put(
        `https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees/${managerId}/team`,
        { teamMembers: updatedIds }
      );
      setTeamMembers(data.manager.teamMembers || []);
    } catch (e) {
      alert("Failed to update team.");
    } finally {
      setTableProgress(p => ({ ...p, [id]: false }));
    }
  };

  if (!managerId)
    return (
      <Box sx={{ p: 4, color: "red" }}>
        Manager ID not found. Please login again.
      </Box>
    );

  // Compute total % achieved
  const totalPctAch = totalTarget === 0 ? 0 : Math.min(100, (totalAchieved / totalTarget) * 100);

  // Calculate working days left in month (Mon-Sat)
  const workingDaysLeft = getRemainingWorkingDays();

  return (
    <Box sx={{ p: 4, bgcolor: "#fff" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h5" sx={{ color: "#000", fontWeight: "bold" }}>
          Team Management
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
          <Typography variant="subtitle1" sx={{ color: "#000", fontWeight: "bold", mr: 1 }}>
            Achieved: {totalAchieved.toLocaleString()} / {totalTarget.toLocaleString()}{" "}
            <span style={{ color: "#777", fontWeight: "normal" }}>
              ({totalPctAch.toFixed(1)}%)
            </span>
          </Typography>
          <Button
            variant="contained"
            sx={{
              bgcolor: "#000",
              color: "#fff",
              px: 4,
              borderRadius: 2,
              textTransform: "none",
              "&:hover": { bgcolor: "#111" },
            }}
            onClick={() => setAddOpen(true)}
          >
            Add
          </Button>
        </Box>
      </Box>

      {/* TABLE */}
      <Paper sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: "#fafafa" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: "#000", fontWeight: "bold", fontSize: 15, textAlign: "center" }}>Name</TableCell>
              <TableCell sx={{ color: "#000", fontWeight: "bold", fontSize: 15, textAlign: "center" }}>Monthly Targets</TableCell>
              <TableCell sx={{ color: "#000", fontWeight: "bold", fontSize: 15, textAlign: "center" }}>Achieved</TableCell>
              <TableCell sx={{ color: "#000", fontWeight: "bold", fontSize: 15, textAlign: "center" }}>Pending</TableCell>
              <TableCell sx={{ color: "#000", fontWeight: "bold", fontSize: 15, textAlign: "center" }}>
                Daily Sales Required<br />
                <span style={{ fontSize: 12, fontWeight: 400, color: "#444" }}>
                  ({workingDaysLeft} working days left)
                </span>
              </TableCell>
              <TableCell sx={{ color: "#000", fontWeight: "bold", fontSize: 15, textAlign: "center" }}>% Achieved</TableCell>
              <TableCell sx={{ color: "#000", fontWeight: "bold", fontSize: 15, textAlign: "center" }}>% Pending</TableCell>
              <TableCell sx={{ color: "#000", fontWeight: "bold", fontSize: 15, textAlign: "center" }}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress sx={{ color: "#000" }} />
                </TableCell>
              </TableRow>
            ) : tableRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">No team members.</TableCell>
              </TableRow>
            ) : (
              tableRows.map((row, idx) => {
                // Calculate daily sales required
                const pendingNum = parseInt((row.pending + "").replace(/,/g, "")) || 0;
                const dailyRequired = workingDaysLeft > 0 ? Math.ceil(pendingNum / workingDaysLeft) : "--";
                return (
                  <TableRow key={row.id}>
                    <TableCell align="center">{row.name}</TableCell>
                    <TableCell align="center">
                      {row.monthlyTarget?.toLocaleString() || 0}{" "}
                      <span style={{ color: "#777", fontWeight: "normal" }}>
                        ({row.pctAch.toFixed(1)}%)
                      </span>
                    </TableCell>
                    <TableCell align="center">{row.achieved}</TableCell>
                    <TableCell align="center">{row.pending}</TableCell>
                    <TableCell align="center">
                      {dailyRequired === "--" ? "--" : `₹${dailyRequired.toLocaleString()}`}
                    </TableCell>
                    <TableCell align="center">{row.pctAch.toFixed(1)}%</TableCell>
                    <TableCell align="center">{row.pctPend.toFixed(1)}%</TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        disabled={!!tableProgress[row.id]}
                        onClick={() => handleRemove(row.id)}
                      >
                        {tableProgress[row.id] ? (
                          <CircularProgress size={24} sx={{ color: "#000" }} />
                        ) : (
                          <DeleteIcon sx={{ color: "#d32f2f" }} />
                        )}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* ADD TEAM DIALOG */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: "bold", color: "#000" }}>Add Employees to Team</DialogTitle>
        <DialogContent>
          <Autocomplete
            multiple
            disableCloseOnSelect
            options={allAgents.filter(
              agent => !teamMembers.some(tm => tm._id === agent._id)
            )}
            getOptionLabel={option => option.fullName}
            value={searchValue}
            onChange={(_, newValue) => setSearchValue(newValue)}
            renderOption={(props, option, { selected }) => (
              <li {...props} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Checkbox
                    sx={{ color: "#000" }}
                    checked={selected}
                  />
                  <span>{option.fullName}</span>
                </Box>
              </li>
            )}
            renderInput={params => (
              <TextField {...params} label="Search Employees" variant="outlined" />
            )}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)} color="secondary" variant="outlined">
            Cancel
          </Button>
          <Button
            variant="contained"
            sx={{
              bgcolor: "#000",
              color: "#fff",
              "&:hover": { bgcolor: "#111" },
            }}
            onClick={handleAddSelected}
            disabled={addLoading || searchValue.length === 0}
          >
            {addLoading ? <CircularProgress size={22} sx={{ color: "#fff" }} /> : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamPage;
