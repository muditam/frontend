import React, { useEffect, useState } from "react";
import {
 Box, Typography, Button, TextField, Table, TableHead,
 TableRow, TableCell, TableBody, Paper, Autocomplete,
 Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
 Stack, CircularProgress, Tooltip
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import {
 ArrowDownward,
 ArrowBack,
 GroupAdd,
 KeyboardArrowDown,
 KeyboardArrowUp,
 TrendingUp,
} from "@mui/icons-material";
import axios from "axios";
import { clearCachedData, getCachedData } from "../utils/apiCache";
import TotalSalesDrilldown from "../pages/filtered/TotalSalesDrilldown";


const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");
const TEAM_PAGE_CACHE_TTL_MS = 60 * 1000;
const TEAM_PAGE_EMPLOYEE_CACHE_TTL_MS = 5 * 60 * 1000;
const api = axios.create({
 baseURL: API_BASE,
 withCredentials: true,
});


// --- HELPERS ---
const fmt0 = (n) =>
 Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });


const getManagerId = () =>
 (JSON.parse(sessionStorage.getItem("user")) || {}).id || "";

const getCurrentUser = () =>
 (JSON.parse(sessionStorage.getItem("user")) || {});

const normalizeRole = (role = "") =>
 String(role || "").trim().toLowerCase().replace(/[-_]+/g, " ");

const isManagerRole = (role = "") => normalizeRole(role) === "manager";
const isTeamLeaderRole = (role = "") => normalizeRole(role) === "team leader";
const isRetentionAgentRole = (role = "") => normalizeRole(role) === "retention agent";


const isSalesDepartment = (emp = {}) =>
 String(emp.department || "").trim().toLowerCase() === "sales";
const hasTeamFlag = (emp = {}) => emp?.hasTeam === true || emp?.team === true;
const isTargetEligible = (emp = {}) =>
 isSalesDepartment(emp) && emp?.isDoctor !== true;
const isRetentionAgentWithTeam = (emp = {}) =>
 isRetentionAgentRole(emp?.role) && hasTeamFlag(emp);
const isTeamLeaderOptionEligible = (emp = {}) =>
 isTargetEligible(emp) || isRetentionAgentWithTeam(emp);
const shouldIncludeLeaderSelfRow = (emp = {}) =>
 hasTeamFlag(emp) && isTargetEligible(emp) && !isTeamLeaderRole(emp?.role);
const getActiveTargetMembers = (members = []) =>
 (members || []).filter((emp) => emp.status === "active" && isTargetEligible(emp));
const getActiveManagerTeamMembers = (members = []) =>
 (members || []).filter((emp) => emp.status === "active" && isTargetEligible(emp));
const getActiveRetentionTeamLeaders = (members = []) =>
 (members || []).filter((emp) => emp.status === "active" && isRetentionAgentWithTeam(emp));
const getUniqueEmployeesById = (members = []) => {
 const unique = new Map();
 (members || []).forEach((emp) => {
   const id = String(emp?._id || "");
   if (id && !unique.has(id)) {
     unique.set(id, emp);
   }
 });
 return Array.from(unique.values());
};
const mergeEmployeeDirectoryDetails = (members = [], employees = []) =>
 (members || []).map((member) => {
   const matched = (employees || []).find(
     (emp) => String(emp?._id || "") === String(member?._id || "")
   );
   if (!matched) return member;
   return {
     ...matched,
     ...member,
     hasTeam: member?.hasTeam ?? matched?.hasTeam,
     team: member?.team ?? matched?.team,
     isDoctor: member?.isDoctor ?? matched?.isDoctor,
     department: member?.department ?? matched?.department,
   };
 });
const getEmployeeId = (emp = {}) => String(emp?._id || "");
const getLeaderDisplayName = (teamLeader) => {
 if (!teamLeader) return "--";
 if (typeof teamLeader === "string") return teamLeader;
 if (typeof teamLeader === "object") {
   return teamLeader.fullName || teamLeader.email || "--";
 }
 return "--";
};
const mergeDisplayedMembers = (leader, members = []) => {
 const filteredMembers = getActiveTargetMembers(members);

 if (!shouldIncludeLeaderSelfRow(leader)) {
   return filteredMembers;
 }

 const uniqueMembers = new Map();
 [leader, ...filteredMembers].forEach((emp) => {
   const id = String(emp?._id || "");
   if (id) {
     uniqueMembers.set(id, emp);
   }
 });

 return Array.from(uniqueMembers.values());
};




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

const fetchAchievedByName = async (fullName) => {
 try {
   const data = await getCachedData(
     `team-page:achieved:${fullName}`,
     async () => {
       const res = await api.get(
         `/api/retention-sales/progress?name=${encodeURIComponent(fullName)}`
       );
       return res.data;
     },
     TEAM_PAGE_CACHE_TTL_MS
   );
   return Number(data?.total || 0);
 } catch (e) {
   return 0;
 }
};




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
 const currentUser = getCurrentUser();
 const managerId = managerIdProp || getManagerId();
 const canSelectAnyLeader = isManagerRole(currentUser?.role);
 const isManagerView = isManagerRole(currentUser?.role);
 const workingDaysLeft = getRemainingWorkingDays();




 const [allAgents, setAllAgents] = useState([]);
 const [leaderOptions, setLeaderOptions] = useState([]);
 const [selectedLeaderId, setSelectedLeaderId] = useState("");
 const [selectedLeader, setSelectedLeader] = useState(null);
 const [teamMembers, setTeamMembers] = useState([]);
 const [managerRetentionTeamMembers, setManagerRetentionTeamMembers] = useState([]);
 const [loading, setLoading] = useState(true);
 const [addOpen, setAddOpen] = useState(false);
 const [searchValue, setSearchValue] = useState([]);
 const [addLoading, setAddLoading] = useState(false);
 const [tableProgress, setTableProgress] = useState({});
  const [tableRows, setTableRows] = useState([]);
 const [nestedRowsByParent, setNestedRowsByParent] = useState({});
 const [expandedRows, setExpandedRows] = useState({});
 const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
 const [showDrilldown, setShowDrilldown] = useState(false);


 const fetchLeaderAndAgentLists = async () => {
   const data = await getCachedData(
     "team-page:employees",
     async () => {
       const res = await api.get("/api/employees");
       return res.data;
     },
     TEAM_PAGE_EMPLOYEE_CACHE_TTL_MS
   );
   const activeTargetEmployees = (data || []).filter(
     (emp) => emp.status === "active" && isTargetEligible(emp)
   );
   const activeTeamEmployees = (data || []).filter(
     (emp) => emp.status === "active" && isTeamLeaderOptionEligible(emp)
   );


   const leaders = activeTargetEmployees
     .filter((emp) => hasTeamFlag(emp))
     .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));


   setAllAgents(activeTeamEmployees);
   setLeaderOptions(leaders);


   return leaders;
 };


 useEffect(() => {
   setLoading(true);
   fetchLeaderAndAgentLists()
     .then((leaders) => {
       const defaultLeaderId = canSelectAnyLeader
         ? leaders.find((l) => l._id === managerId)?._id || leaders[0]?._id || ""
         : managerId;
       setSelectedLeaderId(defaultLeaderId);
     })
     .catch(() => {
       setAllAgents([]);
       setLeaderOptions([]);
       setTeamMembers([]);
       setManagerRetentionTeamMembers([]);
       setSelectedLeader(null);
       setSelectedLeaderId("");
     })
     .finally(() => setLoading(false));
 }, [canSelectAnyLeader, managerId]);


 useEffect(() => {
   if (!selectedLeaderId) {
     setTeamMembers([]);
     setManagerRetentionTeamMembers([]);
     setSelectedLeader(null);
     setExpandedRows({});
     setNestedRowsByParent({});
     return;
   }


   setLoading(true);
   getCachedData(
     `team-page:employee:${selectedLeaderId}`,
     async () => {
       const { data } = await api.get(`/api/employees/${selectedLeaderId}`);
       return data;
     },
     TEAM_PAGE_EMPLOYEE_CACHE_TTL_MS
   )
     .then((data) => {
       setSelectedLeader(data || null);
       const enrichedTeamMembers = mergeEmployeeDirectoryDetails(data.teamMembers || [], allAgents);
       const nextMembers = isManagerView
         ? getActiveManagerTeamMembers(enrichedTeamMembers)
         : mergeDisplayedMembers(data, enrichedTeamMembers);
       const nextRetentionTeamMembers = isManagerView
         ? getActiveRetentionTeamLeaders(enrichedTeamMembers)
         : [];
       setTeamMembers(nextMembers);
       setManagerRetentionTeamMembers(nextRetentionTeamMembers);
       setExpandedRows({});
       setNestedRowsByParent({});
     })
     .catch(() => {
       setTeamMembers([]);
       setManagerRetentionTeamMembers([]);
       setSelectedLeader(null);
       setExpandedRows({});
       setNestedRowsByParent({});
     })
     .finally(() => setLoading(false));
 }, [allAgents, isManagerView, selectedLeaderId]);


 useEffect(() => {
   if (!teamMembers.length && !managerRetentionTeamMembers.length) {
     setTableRows([]);
     setNestedRowsByParent({});
     return;
   }
   let active = true;
   setLoading(true);

   const buildMetricRow = (emp, achieved, overrides = {}) => {
     const targetValue = Number(overrides.monthlyTarget ?? emp?.target ?? 0);
     const pending = Math.max(0, targetValue - achieved);
     const dailyRequired = workingDaysLeft > 0 && pending > 0
       ? Math.ceil(pending / workingDaysLeft)
       : 0;
     const pctAch = targetValue === 0 ? 0 : (achieved / targetValue) * 100;

     return {
       id: overrides.id || emp?._id,
       renderKey:
         overrides.renderKey ||
         `${overrides.type || "member"}:${overrides.parentId || "root"}:${overrides.id || emp?._id}`,
       sourceId: emp?._id || "",
       name: overrides.name || emp?.fullName || "--",
       teamLeader: overrides.teamLeader ?? getLeaderDisplayName(emp?.teamLeader),
       hasOwnTeam: Boolean(overrides.hasOwnTeam ?? hasTeamFlag(emp)),
       isSelfRow: Boolean(overrides.isSelfRow),
       type: overrides.type || "member",
       expandable: Boolean(overrides.expandable),
       parentId: overrides.parentId || null,
       isManagerView,
       isRemovable: Boolean(overrides.isRemovable),
       monthlyTarget: targetValue,
       achieved,
       groupTargetContribution: Number(overrides.groupTargetContribution ?? targetValue),
       groupAchievedContribution: Number(overrides.groupAchievedContribution ?? achieved),
       pending,
       dailyRequired,
       pctAch,
       targetLabel: overrides.targetLabel || "",
     };
   };

   const getCurrentEmployee = (emp) =>
     allAgents.find((agent) => String(agent._id) === String(emp?._id)) || emp;

   const buildManagerAggregateRows = async (member, directMemberIds, preloadedMemberData = null) => {
     const current = getCurrentEmployee(member);
     const [memberData, selfAchieved] = await Promise.all([
       preloadedMemberData
         ? Promise.resolve(preloadedMemberData)
         : getCachedData(
             `team-page:employee:${current._id}`,
             async () => {
               const { data } = await api.get(`/api/employees/${current._id}`);
               return data;
             },
             TEAM_PAGE_EMPLOYEE_CACHE_TTL_MS
           ),
       fetchAchievedByName(current.fullName),
     ]);

     const nestedMembers = getUniqueEmployeesById(
       getActiveTargetMembers(memberData?.teamMembers || []).filter(
         (nestedMember) => getEmployeeId(nestedMember) !== getEmployeeId(current)
       )
     );
     const childRows = await Promise.all(
       nestedMembers.map(async (nestedMember) => {
         const nestedCurrent = getCurrentEmployee(nestedMember);
         const nestedAchieved = await fetchAchievedByName(nestedCurrent.fullName);
         return buildMetricRow(nestedCurrent, nestedAchieved, {
           id: `${current._id}__member__${nestedCurrent._id}`,
           type: "member",
           parentId: current._id,
           isRemovable: directMemberIds.has(String(nestedCurrent._id)),
           targetLabel: "Self target",
         });
       })
     );

     const childTarget = childRows.reduce((sum, row) => sum + row.monthlyTarget, 0);
     const childAchieved = childRows.reduce((sum, row) => sum + row.achieved, 0);
     const excludeSelfFromManagerAggregate =
       isManagerView && hasTeamFlag(current) && isRetentionAgentRole(current?.role);
     const hasSelfMetrics = Number(current.target || 0) > 0 || selfAchieved > 0;
     const selfRow = hasSelfMetrics
       ? buildMetricRow(current, selfAchieved, {
           id: `${current._id}__self`,
           renderKey: `self:${current._id}__self`,
           name: `${current.fullName} (Self)`,
           type: "self",
           parentId: current._id,
           isRemovable: false,
           targetLabel: "Self target",
         })
       : null;
     const children = childRows;
     const selfTargetForAggregate = excludeSelfFromManagerAggregate ? 0 : selfRow?.monthlyTarget || 0;
     const selfAchievedForAggregate = excludeSelfFromManagerAggregate ? 0 : selfRow?.achieved || 0;
     const teamTarget = childTarget + selfTargetForAggregate;
     const teamAchieved = childAchieved + selfAchievedForAggregate;
     const groupTargetContribution = childTarget + (selfRow?.monthlyTarget || 0);
     const groupAchievedContribution = childAchieved + (selfRow?.achieved || 0);

     return {
       row: buildMetricRow(current, teamAchieved, {
         renderKey: `aggregate:${current._id}`,
         type: "aggregate",
         monthlyTarget: teamTarget,
         groupTargetContribution,
         groupAchievedContribution,
         expandable: children.length > 0,
         isRemovable: false,
         targetLabel: "Team target",
       }),
       children,
     };
   };

   const buildManagerRetentionRow = async (members) => {
     const childDetails = await Promise.all(
       members.map(async (member) => {
         const selfAchieved = await fetchAchievedByName(member.fullName);
         const selfTarget = Number(member?.target || 0);
         return {
           row: buildMetricRow(member, selfAchieved, {
             id: `${selectedLeaderId}__retention_team__${getEmployeeId(member)}`,
             renderKey: `manager-retention-team:${selectedLeaderId}:${getEmployeeId(member)}`,
             type: "member",
             parentId: selectedLeaderId,
             monthlyTarget: selfTarget,
             groupTargetContribution: selfTarget,
             groupAchievedContribution: selfAchieved,
             expandable: false,
             isRemovable: false,
             targetLabel: "Self target",
           }),
           selfTarget,
           selfAchieved,
         };
       })
     );
     const childRows = childDetails.map((item) => item.row);
     const childTarget = childRows.reduce(
       (sum, row, index) => sum + Number(childDetails[index]?.selfTarget || 0),
       0
     );
     const childAchieved = childRows.reduce(
       (sum, row, index) => sum + Number(childDetails[index]?.selfAchieved || 0),
       0
     );
     const managerRow = buildMetricRow(selectedLeader || {}, childAchieved, {
       id: `${selectedLeaderId}__retention_team`,
       renderKey: `manager-retention-team:${selectedLeaderId}`,
       name: selectedLeader?.fullName || currentUser?.fullName || "Manager",
       teamLeader: getLeaderDisplayName(selectedLeader?.teamLeader),
       type: "manager-retention-team",
       monthlyTarget: childTarget,
       groupTargetContribution: 0,
       groupAchievedContribution: 0,
       expandable: childRows.length > 0,
       isRemovable: false,
       targetLabel: "Retention agent teams",
     });

     return { row: managerRow, children: childRows };
   };

   const loadRows = async () => {
     const directMemberIds = new Set(teamMembers.map((member) => getEmployeeId(member)));
     const nextNestedRows = {};
     const memberDetails = await Promise.all(
       teamMembers.map(async (member) => {
         const current = getCurrentEmployee(member);
         if (!isManagerView || !hasTeamFlag(current)) {
           return { current, memberData: null };
         }

         const memberData = await getCachedData(
           `team-page:employee:${current._id}`,
           async () => {
             const { data } = await api.get(`/api/employees/${current._id}`);
             return data;
           },
           TEAM_PAGE_EMPLOYEE_CACHE_TTL_MS
         );
         return { current, memberData };
       })
     );

     const nestedMemberIds = new Set();
     memberDetails.forEach(({ current, memberData }) => {
       if (!isManagerView || !hasTeamFlag(current) || !memberData) return;

       getUniqueEmployeesById(
         getActiveTargetMembers(memberData.teamMembers || []).filter(
           (nestedMember) => getEmployeeId(nestedMember) !== getEmployeeId(current)
         )
       ).forEach((nestedMember) => {
         nestedMemberIds.add(getEmployeeId(nestedMember));
       });
     });

     const visibleMembers = isManagerView
       ? memberDetails.filter(({ current }) => !nestedMemberIds.has(getEmployeeId(current)))
       : memberDetails;

     const rows = await Promise.all(
       visibleMembers.map(async ({ current, memberData }) => {
         if (isManagerView && hasTeamFlag(current)) {
           const aggregate = await buildManagerAggregateRows(current, directMemberIds, memberData);
           nextNestedRows[getEmployeeId(current)] = aggregate.children;
           return aggregate.row;
         }

         const achieved = await fetchAchievedByName(current.fullName);
         return buildMetricRow(current, achieved, {
           type: "member",
           isSelfRow: getEmployeeId(current) === String(selectedLeaderId),
           isRemovable: getEmployeeId(current) !== String(selectedLeaderId),
           targetLabel: isManagerView || hasTeamFlag(current) ? "Self target" : "",
         });
       })
     );

     if (isManagerView && managerRetentionTeamMembers.length) {
       const managerRetentionRow = await buildManagerRetentionRow(managerRetentionTeamMembers);
       nextNestedRows[managerRetentionRow.row.id] = managerRetentionRow.children;
       rows.unshift(managerRetentionRow.row);
     }

     if (!active) return;
     setNestedRowsByParent(nextNestedRows);
     setTableRows(rows);
     setLoading(false);
   };

   loadRows().catch(() => {
     if (!active) return;
     setNestedRowsByParent({});
     setTableRows([]);
     setLoading(false);
   });

   return () => {
     active = false;
   };
 }, [
   allAgents,
   currentUser?.fullName,
   isManagerView,
   managerRetentionTeamMembers,
   selectedLeader,
   selectedLeaderId,
   teamMembers,
   workingDaysLeft,
 ]);




 const getProcessedRows = (rows = tableRows) => {
   let filtered = [...rows];
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




 const topLevelRows = getProcessedRows();
 const getDisplayRows = () => {
   if (!isManagerView) return topLevelRows;

   return topLevelRows.flatMap((row) => {
     const childRows = expandedRows[row.id] ? (nestedRowsByParent[row.id] || []) : [];
     return [row, ...childRows];
   });
 };

 const filteredRows = getDisplayRows();
 const filteredAchieved = topLevelRows.reduce(
   (acc, row) => acc + Number(row.groupAchievedContribution ?? row.achieved ?? 0),
   0
 );
 const filteredTarget = topLevelRows.reduce(
   (acc, row) => acc + Number(row.groupTargetContribution ?? row.monthlyTarget ?? 0),
   0
 );
 const filteredPending = Math.max(0, filteredTarget - filteredAchieved);
 const filteredDailyRequired = workingDaysLeft > 0 && filteredPending > 0 ? Math.ceil(filteredPending / workingDaysLeft) : 0;
 const filteredPctAch = filteredTarget === 0 ? 0 : (filteredAchieved / filteredTarget) * 100;
 const assignedMembers = [...teamMembers, ...managerRetentionTeamMembers];




 const handleSort = key => {
   setSortConfig(prev => ({
     key,
     direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
   }));
 };

 const toggleRowExpansion = (rowId) => {
   setExpandedRows((prev) => ({
     ...prev,
     [rowId]: !prev[rowId],
   }));
 };




 const handleAddSelected = async () => {
   if (!selectedLeaderId) return;
   setAddLoading(true);
   try {
     const updatedIds = [...assignedMembers.map(tm => tm._id), ...searchValue.map(a => a._id)].filter((v, i, arr) => arr.indexOf(v) === i);
     const { data } = await api.put(`/api/employees/${selectedLeaderId}/team`, { teamMembers: updatedIds });
     clearCachedData("team-page:");
     const enrichedTeamMembers = mergeEmployeeDirectoryDetails(
       data.manager.teamMembers || [],
       allAgents
     );
     const nextMembers = isManagerView
       ? getActiveManagerTeamMembers(enrichedTeamMembers)
       : mergeDisplayedMembers(data.manager, enrichedTeamMembers);
     const nextRetentionTeamMembers = isManagerView
       ? getActiveRetentionTeamLeaders(enrichedTeamMembers)
       : [];
     setTeamMembers(nextMembers);
     setManagerRetentionTeamMembers(nextRetentionTeamMembers);
     setSelectedLeader(data.manager || null);
     await fetchLeaderAndAgentLists();
     setAddOpen(false);
     setSearchValue([]);
   } catch (e) { alert("Failed to update team."); } finally { setAddLoading(false); }
 };




 const handleRemove = async id => {
   if (!selectedLeaderId) return;
   setTableProgress(p => ({ ...p, [id]: true }));
   try {
     const updatedIds = assignedMembers.filter(emp => emp._id !== id).map(emp => emp._id);
     const { data } = await api.put(`/api/employees/${selectedLeaderId}/team`, { teamMembers: updatedIds });
     clearCachedData("team-page:");
     const enrichedTeamMembers = mergeEmployeeDirectoryDetails(
       data.manager.teamMembers || [],
       allAgents
     );
     const nextMembers = isManagerView
       ? getActiveManagerTeamMembers(enrichedTeamMembers)
       : mergeDisplayedMembers(data.manager, enrichedTeamMembers);
     const nextRetentionTeamMembers = isManagerView
       ? getActiveRetentionTeamLeaders(enrichedTeamMembers)
       : [];
     setTeamMembers(nextMembers);
     setManagerRetentionTeamMembers(nextRetentionTeamMembers);
     setSelectedLeader(data.manager || null);
     await fetchLeaderAndAgentLists();
   } catch (e) { alert("Failed to update team."); } finally { setTableProgress(p => ({ ...p, [id]: false })); }
 };


 if (!managerId) return <Box sx={{ p: 4, color: "red" }}>Manager ID not found. Please login again.</Box>;




 return (
   <Box sx={{ p: 4, bgcolor: "#f8fafc", minHeight: "100vh" }}>
     {/* Header Section */}
     <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems="flex-start" spacing={2} mb={4}>
       <Box>
         <Typography variant="h4" sx={{ color: "#1e293b", fontWeight: 800, mb: 0.5 }}>Team Management</Typography>
       </Box>




       <Stack direction="row" spacing={2}>
         <Button
           variant="outlined"
           startIcon={showDrilldown ? <ArrowBack /> : <TrendingUp />}
           onClick={() => setShowDrilldown((prev) => !prev)}
           sx={{
             bgcolor: "#fff",
             borderColor: "#cbd5e1",
             color: "#1e293b",
             borderRadius: 3,
             fontWeight: 700,
             textTransform: "none",
             px: 3,
             "&:hover": { bgcolor: "#f8fafc", borderColor: "#94a3b8" },
           }}
         >
           {showDrilldown ? "Back to Team Page" : "View Drilldown"}
         </Button>
         {!showDrilldown && canSelectAnyLeader ? (
           <TextField
             select
             value={selectedLeaderId}
             onChange={(e) => setSelectedLeaderId(e.target.value)}
             SelectProps={{ native: true }}
             size="small"
             sx={{ minWidth: 220, bgcolor: "#fff", "& .MuiOutlinedInput-root": { borderRadius: 3, fontWeight: 600 } }}
           >
             <option value="">Select Team Leader</option>
             {leaderOptions.map((leader) => (
               <option key={leader._id} value={leader._id}>
                 {leader.fullName}
               </option>
             ))}
           </TextField>
         ) : null}
         {!showDrilldown && (
         <Button variant="contained" startIcon={<GroupAdd />} onClick={() => setAddOpen(true)} sx={{ bgcolor: "#1e293b", borderRadius: 3, fontWeight: 700, textTransform: "none", px: 3 }}>
           Add Member
         </Button>
         )}
       </Stack>
     </Stack>




     {showDrilldown ? (
       <TotalSalesDrilldown fullPage />
     ) : (
       <>
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
             {[{ label: "Agent", key: "name" }, { label: "Leader", key: null }, { label: "Target", key: "monthlyTarget" }, { label: "Achieved", key: "achieved" }, { label: "Remaining", key: "pending" },{ label: "Daily Req.", key: "dailyRequired" }, { label: "Progress", key: "pctAch" }, { label: "", key: null }].map(({ label, key }) => (
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
             <TableRow><TableCell colSpan={8} align="center" sx={{ py: 8 }}><CircularProgress size={30} /></TableCell></TableRow>
           ) : filteredRows.map(row => {
               const remainingAmt = Math.max(0, row.monthlyTarget - row.achieved);
               const remainingPct = Math.max(0, 100 - row.pctAch).toFixed(1);
               const isChildRow = Boolean(row.parentId);
               const isExpanded = Boolean(expandedRows[row.id]);




               return (
             <TableRow key={row.renderKey || row.id} sx={{ "&:hover": { bgcolor: "#f1f5f9" } }}>
             <TableCell sx={{ fontWeight: 700, color: "#1e293b" }}>
               <Stack direction="row" spacing={0.5} alignItems="center" sx={{ pl: isChildRow ? 2 : 0 }}>
                 {row.expandable ? (
                   <IconButton size="small" onClick={() => toggleRowExpansion(row.id)} sx={{ p: 0.25 }}>
                     {isExpanded ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                   </IconButton>
                 ) : (
                   <Box sx={{ width: 22, flexShrink: 0 }} />
                 )}
                 <Typography variant="body2" fontWeight={700}>{row.name}</Typography>
               </Stack>
             </TableCell>
             <TableCell sx={{ color: "#475569" }}>{row.teamLeader}</TableCell>
             <TableCell sx={{ fontWeight: 600 }}>
               ₹{fmt0(row.monthlyTarget)}
               {row.targetLabel ? (
                 <Typography variant="caption" sx={{ display: "block", color: "#64748b", mt: 0.2 }}>
                   {row.targetLabel}
                 </Typography>
               ) : null}
             </TableCell>
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
                 {!row.isRemovable ? null : (
                   <IconButton onClick={() => handleRemove(row.id)} disabled={!!tableProgress[row.id]} sx={{ color: "#cbd5e1", "&:hover": { color: "#ef4444" } }}>
                     {tableProgress[row.id] ? <CircularProgress size={20} /> : <DeleteIcon fontSize="small" />}
                   </IconButton>
                 )}
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
           options={allAgents.filter(agent => !assignedMembers.some(tm => tm._id === agent._id))}
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
       </>
     )}
   </Box>
 );
};




export default TeamPage;
