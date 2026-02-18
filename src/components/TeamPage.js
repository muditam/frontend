import React, { useEffect, useState } from "react";
import {
  Box, Typography, Button, TextField, Table, TableHead,
  TableRow, TableCell, TableBody, Paper, Autocomplete,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Stack, CircularProgress, Tooltip
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { ArrowDownward, GroupAdd } from "@mui/icons-material";
import axios from "axios";


// --- HELPERS ---
const fmt0 = (n) =>
  Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });


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


// --- SUB-COMPONENTS ---
const KPICard = ({ title, value, subValue, trendColor = "#10b981" }) => (
  <Paper
    elevation={0}
    sx={{
      p: 3,
      flex: "1 1 200px",
      minWidth: 200,
      border: "1px solid #e2e8f0",
      borderRadius: 4,
      bgcolor: "#fff",
      display: "flex",
      flexDirection: "column",
      gap: 1,
    }}
  >
    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
      {title}
    </Typography>
    <Typography variant="h4" sx={{ fontWeight: 800, color: "#1e293b" }}>
      {value}
    </Typography>
    {subValue && (
      <Typography variant="caption" sx={{ color: trendColor, fontWeight: 700, fontSize: "0.75rem" }}>
        {subValue}
      </Typography>
    )}
  </Paper>
);


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
          emp => emp.status === "active" && (emp.role === "Sales Agent" || emp.role === "Retention Agent")
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
        const pctAch = monthlyTarget === 0 ? 0 : (achieved / monthlyTarget) * 100;
        return {
          id: emp._id,
          name: emp.fullName,
          teamLeader: emp.teamLeader || "--",
          monthlyTarget,
          achieved,
          pending,
          pctAch,
        };
      })
    )
      .then(rows => setTableRows(rows))
      .finally(() => setLoading(false));
  }, [teamMembers]);


  const getProcessedRows = () => {
    let filtered = [...tableRows];
    if (filterLeader && filterLeader.trim() !== "") {
      filtered = filtered.filter(row =>
        row.teamLeader && row.teamLeader.trim() === filterLeader.trim()
      );
    }
    if (!sortConfig.key) return filtered;
    return filtered.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (typeof aVal === "string") {
        return sortConfig.direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
    });
  };


  const filteredRows = getProcessedRows();
  const filteredAchieved = filteredRows.reduce((acc, row) => acc + row.achieved, 0);
  const filteredTarget = filteredRows.reduce((acc, row) => acc + row.monthlyTarget, 0);
  const workingDaysLeft = getRemainingWorkingDays();
  const filteredPending = Math.max(0, filteredTarget - filteredAchieved);
  const filteredDailyRequired = workingDaysLeft > 0 && filteredPending > 0 ? Math.ceil(filteredPending / workingDaysLeft) : 0;
  const filteredPctAch = filteredTarget === 0 ? 0 : (filteredAchieved / filteredTarget) * 100;


  const handleSort = key => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };


  const handleAddSelected = async () => {
    setAddLoading(true);
    try {
      const updatedIds = [...teamMembers.map(tm => tm._id), ...searchValue.map(a => a._id)].filter((v, i, arr) => arr.indexOf(v) === i);
      const { data } = await axios.put(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees/${managerId}/team`, { teamMembers: updatedIds });
      setTeamMembers(data.manager.teamMembers || []);
      setAddOpen(false);
      setSearchValue([]);
    } catch (e) { alert("Failed to update team."); } finally { setAddLoading(false); }
  };


  const handleRemove = async id => {
    setTableProgress(p => ({ ...p, [id]: true }));
    try {
      const updatedIds = teamMembers.filter(emp => emp._id !== id).map(emp => emp._id);
      const { data } = await axios.put(`https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees/${managerId}/team`, { teamMembers: updatedIds });
      setTeamMembers(data.manager.teamMembers || []);
    } catch (e) { alert("Failed to update team."); } finally { setTableProgress(p => ({ ...p, [id]: false })); }
  };


  const uniqueTeamLeaders = Array.from(new Set(teamMembers.map(emp => emp.teamLeader).filter(Boolean)));


  if (!managerId) return <Box sx={{ p: 4, color: "red" }}>Manager ID not found. Please login again.</Box>;


  return (
    <Box sx={{ p: 4, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      {/* Header Section */}
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems="flex-start" spacing={2} mb={4}>
        <Box>
          <Typography variant="h4" sx={{ color: "#1e293b", fontWeight: 800, mb: 0.5 }}>Team Management</Typography> 
        </Box>


        <Stack direction="row" spacing={2}>
          <TextField
            select
            value={filterLeader} 
            onChange={(e) => setFilterLeader(e.target.value)}
            SelectProps={{ native: true }}
            size="small"
            sx={{ minWidth: 220, bgcolor: "#fff", "& .MuiOutlinedInput-root": { borderRadius: 3, fontWeight: 600 } }}
          >
            <option value="">All Team Leaders</option>
            {uniqueTeamLeaders.map(name => <option key={name} value={name}>{name}</option>)}
          </TextField>
          <Button variant="contained" startIcon={<GroupAdd />} onClick={() => setAddOpen(true)} sx={{ bgcolor: "#1e293b", borderRadius: 3, fontWeight: 700, textTransform: "none", px: 3 }}>
            Add Member
          </Button>
        </Stack>
      </Stack>


      {/* KPI Section - Updated with 5 Cards */}
      <Stack direction="row" spacing={3} mb={4} sx={{ flexWrap: "wrap", gap: 3 }}>
        <KPICard title="Total Target" value={`₹${fmt0(filteredTarget)}`} subValue="Group Goal" trendColor="#64748b" />
        <KPICard title="Total Achieved" value={`₹${fmt0(filteredAchieved)}`} />
        <KPICard title="Remaining" value={`₹${fmt0(filteredPending)}`} trendColor="#ef4444" />
        <KPICard title="Daily Required" value={`₹${fmt0(filteredDailyRequired)}`} subValue={`Over ${workingDaysLeft} days`} />
        <KPICard title="Overall %" value={`${filteredPctAch.toFixed(2)}%`} subValue={filteredPctAch >= 100 ? "Goal Met" : "In Progress"} trendColor={filteredPctAch < 40 ? "#ef4444" : "#10b981"} />
      </Stack>


      {/* Table Section */}
      <Paper elevation={0} sx={{ borderRadius: 4, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <Table>
          <TableHead sx={{ bgcolor: "#f8fafc" }}>
            <TableRow>
              {[{ label: "Agent", key: "name" }, { label: "Leader", key: null }, { label: "Target", key: "monthlyTarget" }, { label: "Achieved", key: "achieved" }, { label: "Remaining", key: "pending" },{ label: "Daily Req.", key: "pending" }, { label: "Progress", key: "pctAch" }, { label: "", key: null }].map(({ label, key }) => (
                <TableCell key={label} sx={{ py: 2, fontWeight: 800, color: "#64748b", fontSize: "0.7rem", textTransform: "uppercase" }}>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <span>{label}</span>
                    {key && (
                      <IconButton onClick={() => handleSort(key)} size="small">
                        <ArrowDownward sx={{ fontSize: 14, opacity: sortConfig.key === key ? 1 : 0.3, transform: sortConfig.key === key && sortConfig.direction === "asc" ? "rotate(180deg)" : "none" }} />
                      </IconButton>
                    )}
                  </Stack>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 8 }}><CircularProgress size={30} /></TableCell></TableRow>
            ) : filteredRows.map(row => {
                const remainingAmt = Math.max(0, row.monthlyTarget - row.achieved);
                const remainingPct = Math.max(0, 100 - row.pctAch).toFixed(1);


                return (
              <TableRow key={row.id} sx={{ "&:hover": { bgcolor: "#f1f5f9" } }}>
                <TableCell sx={{ fontWeight: 700, color: "#1e293b" }}>{row.name}</TableCell>
                <TableCell sx={{ color: "#475569" }}>{row.teamLeader}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>₹{fmt0(row.monthlyTarget)}</TableCell>
                <TableCell sx={{ color: "#10b981", fontWeight: 800 }}>₹{fmt0(row.achieved)}</TableCell>
                <TableCell sx={{ color: "#ef4444", fontWeight: 600 }}>
  ₹{fmt0(row.pending)}
</TableCell>
                <TableCell sx={{ color: "#64748b" }}>₹{fmt0(workingDaysLeft > 0 ? Math.ceil(row.pending / workingDaysLeft) : 0)}</TableCell>
                <TableCell>
                  <Tooltip
                    arrow
                    placement="top"
                    title={
                        <Box sx={{ p: 0.5 }}>
                            <Typography variant="caption" display="block">Remaining: {remainingPct}%</Typography>
                            <Typography variant="caption" display="block">Gap: ₹{fmt0(remainingAmt)}</Typography>
                        </Box>
                    }
                  >
                    <Box sx={{ minWidth: 100, cursor: "help" }}>
                        <Typography sx={{ fontSize: "0.75rem", fontWeight: 800, mb: 0.5 }}>{row.pctAch.toFixed(1)}%</Typography>
                        <Box sx={{ width: "100%", height: 8, bgcolor: "#e2e8f0", borderRadius: 4 }}>
                        <Box sx={{
                            width: `${Math.min(row.pctAch, 100)}%`,
                            height: "100%",
                            bgcolor: row.pctAch < 40 ? "#ef4444" : row.pctAch >= 100 ? "#10b981" : "#3b82f6",
                            borderRadius: 4,
                            transition: "width 0.4s ease"
                        }} />
                        </Box>
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleRemove(row.id)} disabled={!!tableProgress[row.id]} sx={{ color: "#cbd5e1", "&:hover": { color: "#ef4444" } }}>
                    {tableProgress[row.id] ? <CircularProgress size={20} /> : <DeleteIcon fontSize="small" />}
                  </IconButton>
                </TableCell>
              </TableRow>
            )})}
          </TableBody>
        </Table>
      </Paper>


      {/* Add Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Add Team Members</DialogTitle>
        <DialogContent>
          <Autocomplete
            multiple
            options={allAgents.filter(agent => !teamMembers.some(tm => tm._id === agent._id))}
            getOptionLabel={option => option.fullName}
            value={searchValue}
            onChange={(_, newValue) => setSearchValue(newValue)}
            renderInput={params => <TextField {...params} label="Search Employees" variant="outlined" sx={{ mt: 2 }} />}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setAddOpen(false)} sx={{ fontWeight: 700, color: "#64748b" }}>Cancel</Button>
          <Button onClick={handleAddSelected} variant="contained" disabled={addLoading || !searchValue.length} sx={{ bgcolor: "#1e293b", borderRadius: 3, fontWeight: 700 }}>
            {addLoading ? <CircularProgress size={22} color="inherit" /> : "Add to Team"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};


export default TeamPage;

