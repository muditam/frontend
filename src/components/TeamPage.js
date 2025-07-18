import React, { useEffect, useState } from "react";
import {
  Box, Typography, Button, TextField, Table, TableHead,
  TableRow, TableCell, TableBody, Paper, Autocomplete,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton
} from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import DeleteIcon from "@mui/icons-material/Delete";
import Checkbox from "@mui/material/Checkbox";
import { ArrowDownward, ArrowUpward } from "@mui/icons-material";
import axios from "axios";

const getManagerId = () =>
  (JSON.parse(sessionStorage.getItem("user")) || {}).id || "";

function getRemainingWorkingDays() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const lastDate = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let d = today.getDate(); d <= lastDate; d++) {
    const date = new Date(year, month, d);
    if (date.getDay() !== 0) count++;
  }
  return count;
}

const TeamPage = ({ managerId: managerIdProp }) => {
  const managerId = managerIdProp || getManagerId();

  const [allAgents, setAllAgents] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [searchValue, setSearchValue] = useState([]);
  const [addLoading, setAddLoading] = useState(false);
  const [tableProgress, setTableProgress] = useState({});
  const [tableRows, setTableRows] = useState([]);

  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });

  const [totalAchieved, setTotalAchieved] = useState(0);
  const [totalTarget, setTotalTarget] = useState(0);
  const [filterLeader, setFilterLeader] = useState("");

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
        } catch (e) { }

        const monthlyTarget = emp.target || 0;
        const pending = Math.max(0, monthlyTarget - achieved);
        const pctAch = monthlyTarget === 0 ? 0 : Math.min(100, (achieved / monthlyTarget) * 100);
        const pctPend = 100 - pctAch;
        return {
          id: emp._id,
          name: emp.fullName,
          teamLeader: emp.teamLeader || "--",
          monthlyTarget,
          achieved,
          pending,
          pctAch,
          pctPend,
        };
      })
    )
      .then(rows => {
        const achievedSum = rows.reduce((acc, row) => acc + (row.achieved || 0), 0);
        const targetSum = rows.reduce((acc, row) => acc + (row.monthlyTarget || 0), 0);
        setTotalAchieved(achievedSum);
        setTotalTarget(targetSum);
        setTableRows(rows);
      })
      .finally(() => setLoading(false));
  }, [teamMembers]);

  const getSortedRows = () => {
    let filtered = tableRows;
    if (filterLeader) {
      filtered = filtered.filter(row => row.teamLeader === filterLeader);
    }

    if (!sortConfig.key) return filtered;

    return [...filtered].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (typeof aVal === "string") {
        return sortConfig.direction === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
    });
  };


  const handleSort = key => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const workingDaysLeft = getRemainingWorkingDays();
  const teamPending = Math.max(0, totalTarget - totalAchieved);
  const teamDailyRequired =
    workingDaysLeft > 0 && teamPending > 0
      ? Math.ceil(teamPending / workingDaysLeft)
      : 0;
  const totalPctAch = totalTarget === 0 ? 0 : Math.min(100, (totalAchieved / totalTarget) * 100);

  const handleAddSelected = async () => {
    setAddLoading(true);
    try {
      const updatedIds = [
        ...teamMembers.map(tm => tm._id),
        ...searchValue.map(a => a._id)
      ].filter((v, i, arr) => arr.indexOf(v) === i);
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

  const handleRemove = async id => {
    setTableProgress(p => ({ ...p, [id]: true }));
    try {
      const updatedIds = teamMembers.filter(emp => emp._id !== id).map(emp => emp._id);
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

  const uniqueTeamLeaders = Array.from(
    new Set(teamMembers.map(emp => emp.teamLeader).filter(Boolean))
  );


  if (!managerId)
    return <Box sx={{ p: 4, color: "red" }}>Manager ID not found. Please login again.</Box>;

  return (
    <Box sx={{ p: 4, bgcolor: "#fff" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h5" sx={{ color: "#000", fontWeight: "bold" }}>
          Team Management
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
          <TextField
            select
            label="Filter by Team Leader"
            value={filterLeader}
            onChange={(e) => setFilterLeader(e.target.value)}
            SelectProps={{ native: true }}
            size="small"
            sx={{ minWidth: 200 }}
          >
            {uniqueTeamLeaders.map(name => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </TextField>

          <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
            Daily Sales Required: <span style={{ fontWeight: 700 }}>₹{teamDailyRequired.toLocaleString()}</span>
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
            Achieved: {totalAchieved.toLocaleString()} / {totalTarget.toLocaleString()} ({totalPctAch.toFixed(1)}%)
          </Typography>
          <Button variant="contained" sx={{ bgcolor: "#000", color: "#fff" }} onClick={() => setAddOpen(true)}>
            Add
          </Button>
        </Box>

      </Box>

      <Paper sx={{ mt: 2, p: 2, borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              {[
                { label: "Name", key: "name" },
                { label: "Team Leader", key: null },
                { label: "Monthly Targets", key: null },
                { label: "Achieved", key: "achieved" },
                { label: "Pending", key: "pending" },
                { label: "Daily Sales Required", key: "pending" },
                { label: "% Achieved", key: "pctAch" },
                { label: "% Pending", key: "pctPend" },
                { label: "", key: null },
              ].map(({ label, key }) => (
                <TableCell
                  key={label}
                  sx={{ fontWeight: "bold", textAlign: "center", whiteSpace: "nowrap" }}
                >
                  {label}
                  {key && (
                    <IconButton onClick={() => handleSort(key)} size="small">
                      {sortConfig.key === key ? (
                        sortConfig.direction === "asc" ? <ArrowUpward fontSize="inherit" /> : <ArrowDownward fontSize="inherit" />
                      ) : (
                        <ArrowDownward fontSize="inherit" sx={{ opacity: 0.4 }} />
                      )}
                    </IconButton>
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} align="center"><CircularProgress /></TableCell></TableRow>
            ) : getSortedRows().length === 0 ? (
              <TableRow><TableCell colSpan={9} align="center">No team members.</TableCell></TableRow>
            ) : (
              getSortedRows().map(row => {
                const pendingNum = +`${row.pending}`.replace(/,/g, "");
                const dailyRequired = workingDaysLeft > 0 ? Math.ceil(pendingNum / workingDaysLeft) : "--";
                return (
                  <TableRow key={row.id}>
                    <TableCell align="center">{row.name}</TableCell>
                    <TableCell align="center">{row.teamLeader}</TableCell>
                    <TableCell align="center">{row.monthlyTarget.toLocaleString()}</TableCell>
                    <TableCell align="center">{(+row.achieved).toLocaleString()}</TableCell>
                    <TableCell align="center">{(+row.pending).toLocaleString()}</TableCell>
                    <TableCell align="center">{dailyRequired === "--" ? "--" : `₹${dailyRequired.toLocaleString()}`}</TableCell>
                    <TableCell align="center">{row.pctAch.toFixed(1)}%</TableCell>
                    <TableCell align="center">{row.pctPend.toFixed(1)}%</TableCell>
                    <TableCell align="center">
                      <IconButton onClick={() => handleRemove(row.id)} disabled={!!tableProgress[row.id]}>
                        {tableProgress[row.id] ? <CircularProgress size={24} /> : <DeleteIcon sx={{ color: "#d32f2f" }} />}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Employees to Team</DialogTitle>
        <DialogContent>
          <Autocomplete
            multiple
            disableCloseOnSelect
            options={allAgents.filter(agent => !teamMembers.some(tm => tm._id === agent._id))}
            getOptionLabel={option => option.fullName}
            value={searchValue}
            onChange={(_, newValue) => setSearchValue(newValue)}
            renderOption={(props, option, { selected }) => (
              <li {...props}>
                <Checkbox checked={selected} /> {option.fullName}
              </li>
            )}
            renderInput={params => (
              <TextField {...params} label="Search Employees" variant="outlined" />
            )}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)} color="secondary">Cancel</Button>
          <Button onClick={handleAddSelected} variant="contained" disabled={addLoading || searchValue.length === 0}>
            {addLoading ? <CircularProgress size={22} /> : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamPage;
