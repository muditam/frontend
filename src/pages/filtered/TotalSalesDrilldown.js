// src/components/TotalSalesDrilldown.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
 Dialog,
 Box,
 Grid,
 Button,
 TextField,
 Autocomplete,
 Typography,
 Tabs,
 Tab,
 CircularProgress,
 Paper,
 Table,
 TableHead,
 TableRow,
 TableCell,
 TableBody,
 TableFooter,
 ToggleButton,
 ToggleButtonGroup,
 Divider,
 IconButton,
 Stack,
 TableContainer,
 Alert
} from "@mui/material";
import {
 RestartAlt,
 PersonSearch,
 Group,
 TrendingUp,
 Close,
 Payments,
 ChevronRight,
 KeyboardArrowDown,
 KeyboardArrowUp
} from "@mui/icons-material";
import axios from "axios";
import { getCachedData } from "../../utils/apiCache";


const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");
const DRILLDOWN_CACHE_TTL_MS = 60 * 1000;
const EMPLOYEE_CACHE_TTL_MS = 5 * 60 * 1000;

const api = axios.create({
 baseURL: API_BASE,
 withCredentials: true,
});


// --- Configuration & Helpers ---
const RANGE_OPTIONS = ["Today", "Yesterday", "Custom Date"];
const toISODate = (d) => d.toISOString().split("T")[0];
const isSalesDepartment = (emp = {}) =>
 String(emp.department || "").trim().toLowerCase() === "sales";
const normalizeRole = (role = "") =>
 String(role || "").trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
const hasTeamFlag = (emp = {}) => emp?.hasTeam === true || emp?.team === true;
const isManagerRole = (role = "") => normalizeRole(role) === "manager";
const isRetentionAgentRole = (role = "") => normalizeRole(role) === "retention agent";
const isTargetEligible = (emp = {}) =>
 isSalesDepartment(emp) && emp?.isDoctor !== true;
const isRetentionAgentWithTeam = (emp = {}) =>
 isRetentionAgentRole(emp?.role) && hasTeamFlag(emp);
const getLeaderId = (member = {}) =>
 member?.teamLeader?._id || member?.teamLeader?.id || member?.teamLeader || "";
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




const toDisplayDate = (d) => {
 const dt = typeof d === "string" ? new Date(d) : d;
 return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
};




const getRange = (label) => {
 const now = new Date();
 let start = new Date(now);
 let end = new Date(now);
 switch (label) {
   case "Yesterday": start.setDate(now.getDate() - 1); end = new Date(start); break;
   default: break;
 }
 return { startDate: toISODate(start), endDate: toISODate(end) };
};




const fmtINR = (n) =>
 `₹${Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const fmtNumber = (n) =>
 Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });




const EmptyState = ({ fullPage = false }) => (
 <Stack
   alignItems="center"
   justifyContent="center"
   sx={{ height: 400, border: "2px dashed #eee", borderRadius: 4, textAlign: "center" }}
 >
   <Payments sx={{ fontSize: 48, color: "#eee", mb: 2 }} />
   <Typography variant="body1" fontWeight={700} color="text.secondary">
     No Data Generated
 </Typography>
 <Typography variant="caption" color="text.secondary">
    Configure filters {fullPage ? "above" : "on the left"} and click "Generate Report"
 </Typography>
 </Stack>
);




export default function TotalSalesDrilldown({ open, onClose, initialDates, fullPage = false }) {
 // -------------------- State --------------------
 const [employees, setEmployees] = useState([]);
 const [leaders, setLeaders] = useState([]);
 const [tabMode, setTabMode] = useState("manager");
 const [range, setRange] = useState("Today");
 const [customStart, setCustomStart] = useState(initialDates?.startDate || "");
 const [customEnd, setCustomEnd] = useState(initialDates?.endDate || "");
 const [selectedLeader, setSelectedLeader] = useState(null);
 const [selectedAgents, setSelectedAgents] = useState([]);
 const [resultsLoading, setResultsLoading] = useState(false);
 const [results, setResults] = useState([]);
 const [resultsError, setResultsError] = useState("");
 const [daywiseResults, setDaywiseResults] = useState([]);
 const [expandedRows, setExpandedRows] = useState({});

 const formatRevenue = (value) => (fullPage ? fmtNumber(value) : fmtINR(value));




 // -------------------- Effects --------------------
 const isActive = fullPage || open;




 useEffect(() => {
   if (!isActive) return;
   getCachedData(
     "sales-drilldown:employees",
     async () => {
       const { data } = await api.get("/api/employees");
       return data;
     },
     EMPLOYEE_CACHE_TTL_MS
   )
     .then((data) => {
       const list = data || [];
       setEmployees(list);
       setLeaders(
         list.filter((e) => e.status === "active" && isTargetEligible(e) && e.hasTeam === true)
       );
     })
     .catch(() => { setEmployees([]); setLeaders([]); });
 }, [isActive]);




 // -------------------- Derived Logic --------------------
 const activeAgents = useMemo(() =>
   employees.filter((e) => e.status === "active" && isTargetEligible(e)),
   [employees]
 );




 const effectiveDates = useMemo(() => {
   if (range === "Custom Date") return { startDate: customStart, endDate: customEnd };
   return getRange(range);
 }, [range, customStart, customEnd]);




 const isDaywise = range === "Custom Date" && customStart && customEnd;




 const canApply = effectiveDates.startDate && effectiveDates.endDate &&
   (tabMode === "agents" ? selectedAgents.length > 0 : Boolean(selectedLeader?.fullName));




 const displayedRows = isDaywise ? daywiseResults : results;




 const totalSalesRevenue = useMemo(() => {
   if (isDaywise) {
     return displayedRows.reduce((acc, r) => acc + Number(r.grandTotal || 0), 0);
   }
   return displayedRows.reduce((acc, r) => acc + Number(r.total || 0), 0);
 }, [isDaywise, displayedRows]);




 const deliveredSalesRevenue = useMemo(
   () => displayedRows.reduce((acc, r) => acc + Number(r.deliveredTotal || 0), 0),
   [displayedRows]
 );




 // Calculate vertical totals for the footer
 const columnTotals = useMemo(() => {
   if (!isDaywise || daywiseResults.length === 0) return [];
   const totals = daywiseResults[0].perDay.map((_, colIndex) => {
     return daywiseResults.reduce((sum, row) => sum + (row.perDay[colIndex]?.total || 0), 0);
   });
   return totals;
 }, [isDaywise, daywiseResults]);




 // -------------------- Actions --------------------
 const handleApply = async () => {
   setResultsError(""); setResults([]); setDaywiseResults([]); setResultsLoading(true);
   setExpandedRows({});
   const { startDate, endDate } = effectiveDates;
   try {
     let names = [];
     let managerRetentionTeamMembers = [];
     if (tabMode === "agents") {
       names = selectedAgents.map(a => a.fullName).filter(Boolean);
     } else if (tabMode === "manager" && selectedLeader?._id) {
       const mgr = await getCachedData(
         `sales-drilldown:manager:${selectedLeader._id}`,
         async () => {
           const { data } = await api.get(`/api/employees/${selectedLeader._id}`);
           return data;
         },
         EMPLOYEE_CACHE_TTL_MS
       );
       const enrichedTeamMembers = mergeEmployeeDirectoryDetails(mgr?.teamMembers || [], employees);
       names = enrichedTeamMembers
         .filter((m) => m?.status === "active" && isTargetEligible(m))
         .map((m) => m.fullName);
       managerRetentionTeamMembers = isManagerRole(selectedLeader?.role)
         ? enrichedTeamMembers.filter(
             (m) => m?.status === "active" && isTargetEligible(m) && isRetentionAgentWithTeam(m)
           )
         : [];
     }
   
     if (!names.length) throw new Error("No active users found for selection.");
     const employeeByName = new Map(
       employees
         .filter((e) => e?.fullName)
         .map((e) => [e.fullName, e])
     );
     const getDirectReportNames = (emp = {}) =>
       employees
         .filter(
           (member) =>
            member?.status === "active" &&
            isTargetEligible(member) &&
            String(getLeaderId(member)) === String(emp?._id || "")
         )
         .map((member) => member.fullName)
         .filter(Boolean);
     const getContributorsForRow = (name) => {
       const emp = employeeByName.get(name);
       if (!emp?.hasTeam || !emp?._id) {
         return { contributors: [name], teamMemberNames: [] };
       }
       const directReportNames = getDirectReportNames(emp);
       if (!directReportNames.length) {
         return { contributors: [name], teamMemberNames: [] };
       }
       return {
         contributors: [...new Set(directReportNames)],
         teamMemberNames: directReportNames.filter((memberName) => memberName !== name),
       };
     };
     const fetchOwnProgressTotal = (name) =>
       getCachedData(
         `sales-drilldown:progress:self:${name}:${startDate}:${endDate}`,
         async () => {
           const { data } = await api.get("/api/retention-sales/progress", {
             params: { name, from: startDate, to: endDate },
           });
           return data;
         },
         DRILLDOWN_CACHE_TTL_MS
       )
         .then((data) => Number(data?.total || 0))
         .catch(() => 0);
     const fetchDeliveredSalesTotal = (name) =>
       getCachedData(
         `sales-drilldown:delivered:${name}:${startDate}:${endDate}`,
         async () => {
           const { data } = await api.get("/api/incentives", {
             params: { agentName: name, startDate, endDate },
           });
           return data;
         },
         DRILLDOWN_CACHE_TTL_MS
       )
         .then((rows = []) =>
           (Array.isArray(rows) ? rows : []).reduce((sum, row) => {
             const status = String(row?.deliveryStatus || "").toUpperCase();
             const isDelivered = status.includes("DELIVERED");
             const isRTO = status.includes("RTO");
             if (!isDelivered || isRTO) return sum;
             return sum + Number(row?.amount || row?.amountPaid || 0);
           }, 0)
         )
         .catch(() => 0);
     const buildManagerGroupingRow = async () => {
       if (tabMode !== "manager" || !managerRetentionTeamMembers.length) return null;

       const memberRows = await Promise.all(
         managerRetentionTeamMembers
           .filter((member) => member?.fullName)
           .map(async (member) => {
             const [total, deliveredTotal] = await Promise.all([
               fetchOwnProgressTotal(member.fullName),
               fetchDeliveredSalesTotal(member.fullName),
             ]);
             return {
               name: member.fullName,
               total,
               deliveredTotal,
             };
           })
       );

       return {
         name: selectedLeader?.fullName || "Manager",
         total: memberRows.reduce((sum, member) => sum + Number(member.total || 0), 0),
         deliveredTotal: memberRows.reduce((sum, member) => sum + Number(member.deliveredTotal || 0), 0),
         teamMembers: memberRows,
         isGroupingRow: true,
       };
     };
     const buildDaywiseManagerGroupingRow = async (tableDates = []) => {
       if (tabMode !== "manager" || !managerRetentionTeamMembers.length) return null;

       const memberNames = managerRetentionTeamMembers
         .map((member) => member?.fullName)
         .filter(Boolean);
       if (!memberNames.length) return null;

       const data = await getCachedData(
         `sales-drilldown:daywise:self-group:${memberNames.slice().sort().join("|")}:${startDate}:${endDate}`,
         async () => {
           const res = await api.post("/api/retention-sales/daywise-matrix", {
             names: memberNames,
             startDate,
             endDate,
           });
           return res.data;
         },
         DRILLDOWN_CACHE_TTL_MS
       );

       const perDayByName = new Map(
         (data || []).map((row) => [row?.name, row?.perDay || []])
       );
       const fallbackDates = new Set();
       perDayByName.forEach((perDay) => {
         (perDay || []).forEach((d) => fallbackDates.add(String(d?.date || "")));
       });
       const dates = tableDates.length
         ? tableDates
         : [...fallbackDates].filter(Boolean).sort((a, b) => new Date(a) - new Date(b));
       const teamMembers = await Promise.all(memberNames.map(async (name) => {
         const totalsByDate = new Map(
           (perDayByName.get(name) || []).map((d) => [String(d?.date || ""), Number(d?.total || 0)])
         );
         const perDay = dates.map((date) => ({
           date,
           total: Number(totalsByDate.get(date) || 0),
           label: toDisplayDate(date),
         }));
         return {
           name,
           perDay,
           grandTotal: perDay.reduce((sum, d) => sum + Number(d.total || 0), 0),
           deliveredTotal: await fetchDeliveredSalesTotal(name),
         };
       }));
       const perDay = dates.map((date) => ({
         date,
         total: teamMembers.reduce((sum, member) => {
           const day = member.perDay.find((d) => d.date === date);
           return sum + Number(day?.total || 0);
         }, 0),
         label: toDisplayDate(date),
       }));

       return {
         name: selectedLeader?.fullName || "Manager",
         perDay,
         grandTotal: perDay.reduce((sum, d) => sum + Number(d.total || 0), 0),
         deliveredTotal: teamMembers.reduce((sum, member) => sum + Number(member.deliveredTotal || 0), 0),
         teamMembers,
         isGroupingRow: true,
       };
     };
     if (tabMode === "manager") {
       const canStayTopLevel = (name) => {
         const emp = employeeByName.get(name);
         return Boolean(emp?.hasTeam) && getDirectReportNames(emp).length > 0;
       };
       const nestedMemberNames = new Set(
         names.flatMap((name) => {
           const emp = employeeByName.get(name);
           return emp?.hasTeam ? getDirectReportNames(emp) : [];
         })
       );
       names = names.filter((name) => !nestedMemberNames.has(name) || canStayTopLevel(name));
     }




     if (isDaywise) {
       const rows = await Promise.all(
         names.map(async (name) => {
           const { contributors, teamMemberNames } = getContributorsForRow(name);
           const contributorsKey = contributors.slice().sort().join("|");
           const data = await getCachedData(
             `sales-drilldown:daywise:${contributorsKey}:${startDate}:${endDate}`,
             async () => {
               const res = await api.post("/api/retention-sales/daywise-matrix", {
                 names: contributors,
                 startDate,
                 endDate,
               });
               return res.data;
             },
             DRILLDOWN_CACHE_TTL_MS
           );

           const perDayByName = new Map(
             (data || []).map((contributorRow) => [contributorRow?.name, contributorRow?.perDay || []])
           );
           const allDates = new Set();
           perDayByName.forEach((perDay) => {
             (perDay || []).forEach((d) => allDates.add(String(d?.date || "")));
           });
           const sortedDates = [...allDates].filter(Boolean).sort((a, b) => new Date(a) - new Date(b));
           const normalizedContributorRows = await Promise.all(contributors.map(async (contributorName) => {
             const totalsByDate = new Map(
               (perDayByName.get(contributorName) || []).map((d) => [String(d?.date || ""), Number(d?.total || 0)])
             );
             const perDay = sortedDates.map((date) => ({
               date,
               total: Number(totalsByDate.get(date) || 0),
               label: toDisplayDate(date),
             }));
             return {
               name: contributorName,
               perDay,
               grandTotal: perDay.reduce((sum, d) => sum + Number(d.total || 0), 0),
               deliveredTotal: await fetchDeliveredSalesTotal(contributorName),
             };
           }));
           const perDay = sortedDates.map((date) => ({
             date,
             total: normalizedContributorRows.reduce((sum, contributorRow) => {
               const day = contributorRow.perDay.find((d) => d.date === date);
               return sum + Number(day?.total || 0);
             }, 0),
             label: toDisplayDate(date),
           }));
           const teamMembers = normalizedContributorRows.filter(
             (contributorRow) => contributorRow.name !== name && teamMemberNames.includes(contributorRow.name)
           );


           return {
             name,
             perDay,
             grandTotal: perDay.reduce((sum, d) => sum + Number(d.total || 0), 0),
             deliveredTotal: normalizedContributorRows.reduce((sum, contributorRow) => sum + Number(contributorRow.deliveredTotal || 0), 0),
             teamMembers,
           };
         })
       );


       const sortedRows = rows.sort((a, b) => b.grandTotal - a.grandTotal);
       const tableDates = sortedRows[0]?.perDay?.map((d) => d.date).filter(Boolean) || [];
       const managerGroupingRow = await buildDaywiseManagerGroupingRow(tableDates);
       setDaywiseResults(managerGroupingRow ? [managerGroupingRow, ...sortedRows] : sortedRows);
     } else {
       const rows = await Promise.all(
         names.map(async (name) => {
           const { contributors, teamMemberNames } = getContributorsForRow(name);
           const contributorTotals = await Promise.all(
             contributors.map(async (contributorName) => {
               const [progressData, deliveredTotal] = await Promise.all([
                 getCachedData(
                   `sales-drilldown:progress:${contributorName}:${startDate}:${endDate}`,
                   async () => {
                     const { data } = await api.get("/api/retention-sales/progress", {
                       params: { name: contributorName, from: startDate, to: endDate },
                     });
                     return data;
                   },
                   DRILLDOWN_CACHE_TTL_MS
                 ).catch(() => ({ total: 0 })),
                 fetchDeliveredSalesTotal(contributorName),
               ]);
               return {
                 name: contributorName,
                 total: Number(progressData?.total || 0),
                 deliveredTotal,
               };
             })
           );
           return {
             name,
             total: contributorTotals.reduce((sum, value) => sum + Number(value.total || 0), 0),
             deliveredTotal: contributorTotals.reduce((sum, value) => sum + Number(value.deliveredTotal || 0), 0),
             teamMembers: contributorTotals.filter(
               (row) => row.name !== name && teamMemberNames.includes(row.name)
             ),
           };
         })
       );
       const sortedRows = rows.sort((a, b) => b.total - a.total);
       const managerGroupingRow = await buildManagerGroupingRow();
       setResults(managerGroupingRow ? [managerGroupingRow, ...sortedRows] : sortedRows);
     }
   } catch (e) {
     setResultsError(e.message || "Failed to fetch data.");
   } finally {
     setResultsLoading(false);
   }
 };




 const resetFilters = () => {
   setRange("Today");
   setResults([]);
   setDaywiseResults([]);
   setExpandedRows({});
   setSelectedLeader(null);
   setSelectedAgents([]);
   setResultsError("");
 };

 const toggleRow = (name) => {
   setExpandedRows((prev) => ({ ...prev, [name]: !prev[name] }));
 };




 const drilldownContent = (
   <>
     {!fullPage && (
     <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "#000", color: "#fff" }}>
       <Stack direction="row" spacing={1.5} alignItems="center">
         <Box sx={{ bgcolor: "#333", p: 0.8, borderRadius: 1.5, display: "flex" }}><TrendingUp fontSize="small" /></Box>
         <Typography variant="h6" fontWeight={800} letterSpacing="-0.5px">Sales Analytics Drilldown</Typography>
       </Stack>
       {!fullPage && (
         <IconButton onClick={onClose} size="small" sx={{ color: "#fff" }}><Close /></IconButton>
       )}
     </Box>
     )}




     <Box sx={{ p: 0, bgcolor: fullPage ? "#fff" : "#fcfcfc" }}>
       <Grid container sx={{ height: "100%" }}>
         {fullPage ? (
           <Grid item xs={12} sx={{ p: 1.5, borderBottom: "1px solid #e2e8f0", bgcolor: "#f8fafc" }}>
             <Box
               sx={{
                 display: "grid",
                 gridTemplateColumns: {
                   xs: "1fr",
                   md: "132px 132px 180px minmax(280px, 1fr) 300px 178px",
                 },
                 gap: 1.25,
                 alignItems: "end",
               }}
             >
               <Box sx={{ height: 44, px: 1.25, py: 0.6, border: "1px solid #e2e8f0", borderRadius: 2, bgcolor: "#fff", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                 <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ display: "block", lineHeight: 1, fontSize: "0.65rem" }}>
                   TOTAL SALES
                 </Typography>
                 <Typography variant="h6" fontWeight={900} color="#000" sx={{ lineHeight: 1.1 }}>
                   {formatRevenue(totalSalesRevenue)}
                 </Typography>
               </Box>

               <Box sx={{ height: 44, px: 1.25, py: 0.6, border: "1px solid #e2e8f0", borderRadius: 2, bgcolor: "#fff", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                 <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ display: "block", lineHeight: 1, fontSize: "0.65rem" }}>
                   DELIVERED SALES
                 </Typography>
                 <Typography variant="h6" fontWeight={900} color="#000" sx={{ lineHeight: 1.1 }}>
                   {formatRevenue(deliveredSalesRevenue)}
                 </Typography>
               </Box>

               <Tabs
                 value={tabMode}
                 onChange={(_, v) => setTabMode(v)}
                 sx={{
                   minHeight: 44,
                   height: 44,
                   bgcolor: "#eef0f3",
                   p: 0.4,
                   borderRadius: 2,
                   "& .MuiTabs-flexContainer": { height: "100%" },
                   "& .MuiTabs-indicator": { display: "none" },
                 }}
               >
                 <Tab icon={<Group sx={{ fontSize: 15 }} />} label="Team" value="manager" sx={{ flex: 1, minHeight: 36, py: 0.25, textTransform: "none", fontWeight: 800, borderRadius: 1.5, "&.Mui-selected": { bgcolor: "#fff", color: "#000", boxShadow: "0 1px 2px rgba(15,23,42,0.08)" } }} />
                 <Tab icon={<PersonSearch sx={{ fontSize: 15 }} />} label="Experts" value="agents" sx={{ flex: 1, minHeight: 36, py: 0.25, textTransform: "none", fontWeight: 800, borderRadius: 1.5, "&.Mui-selected": { bgcolor: "#fff", color: "#000", boxShadow: "0 1px 2px rgba(15,23,42,0.08)" } }} />
               </Tabs>

               <Box>
                 <Typography variant="caption" fontWeight={800} sx={{ mb: 0.5, display: "block" }}>Date Range</Typography>
                 <ToggleButtonGroup
                   exclusive
                   value={range}
                   onChange={(_, v) => v && setRange(v)}
                   size="small"
                   sx={{
                     display: "grid",
                     gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, minmax(86px, 1fr))" },
                     gap: 0.5,
                     "& .MuiToggleButton-root": {
                       minHeight: 40,
                       border: "1px solid #e2e8f0 !important",
                       borderRadius: "8px !important",
                       bgcolor: "#fff",
                       textTransform: "none",
                       fontWeight: 800,
                       px: 0.75,
                     },
                   }}
                 >
                   {RANGE_OPTIONS.map((opt) => <ToggleButton key={opt} value={opt}>{opt}</ToggleButton>)}
                 </ToggleButtonGroup>
               </Box>

               <Box>
                 <Typography variant="caption" fontWeight={800} sx={{ mb: 0.5, display: "block" }}>{tabMode === "manager" ? "Select Manager" : "Select Experts"}</Typography>
                 {tabMode === "manager" ? (
                   <Autocomplete
                     options={leaders}
                     getOptionLabel={(o) => o?.fullName || ""}
                     value={selectedLeader}
                     onChange={(_, v) => setSelectedLeader(v)}
                     renderInput={(params) => <TextField {...params} placeholder="Search manager..." size="small" />}
                   />
                 ) : (
                   <Autocomplete
                     multiple
                     options={activeAgents}
                     getOptionLabel={(o) => o?.fullName || ""}
                     value={selectedAgents}
                     onChange={(_, v) => setSelectedAgents(v)}
                     renderInput={(params) => <TextField {...params} placeholder="Select experts..." size="small" />}
                   />
                 )}
               </Box>

               <Button
                 onClick={handleApply}
                 variant="contained"
                 disabled={!canApply || resultsLoading}
                 sx={{ height: 40, px: 2, whiteSpace: "nowrap", bgcolor: "#111827", borderRadius: 2, fontWeight: 800, textTransform: "none", "&:hover": { bgcolor: "#000" } }}
               >
                 {resultsLoading ? <CircularProgress size={20} color="inherit" /> : "Generate Report"}
               </Button>
             </Box>

             {range === "Custom Date" && (
               <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mt: 1, maxWidth: 360 }}>
                 <TextField size="small" type="date" label="Start" value={customStart} onChange={(e) => setCustomStart(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
                 <TextField size="small" type="date" label="End" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
               </Stack>
             )}
           </Grid>
         ) : (
         <Grid item xs={12} md={3.5} sx={{ p: 2.5, borderRight: "1px solid #eee" }}>
           <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ mb: 2, display: "block", textTransform: "uppercase" }}>View Configuration</Typography>
         
           <Tabs
             value={tabMode} onChange={(_, v) => setTabMode(v)}
             sx={{ mb: 3, minHeight: 44, bgcolor: "#f1f1f1", p: 0.5, borderRadius: 2.5, "& .MuiTabs-indicator": { display: "none" } }}
           >
             <Tab icon={<Group sx={{ fontSize: 18 }} />} label="Team" value="manager" sx={{ flex: 1, textTransform: "none", fontWeight: 700, borderRadius: 2, "&.Mui-selected": { bgcolor: "#fff", color: "#000" } }} />
             <Tab icon={<PersonSearch sx={{ fontSize: 18 }} />} label="Experts" value="agents" sx={{ flex: 1, textTransform: "none", fontWeight: 700, borderRadius: 2, "&.Mui-selected": { bgcolor: "#fff", color: "#000" } }} />
           </Tabs>




           <Stack spacing={2.5}>
             <Box>
               <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>Date Range</Typography>
               <ToggleButtonGroup
                 exclusive value={range} onChange={(_, v) => v && setRange(v)} size="small"
                 sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.5, "& .MuiToggleButton-root": { border: "1px solid #eee !important", borderRadius: "8px !important", textTransform: "none", fontWeight: 600 } }}
               >
                 {RANGE_OPTIONS.map((opt) => <ToggleButton key={opt} value={opt} sx={{ py: 0.5 }}>{opt}</ToggleButton>)}
               </ToggleButtonGroup>
             </Box>




             {range === "Custom Date" && (
               <Stack spacing={1}>
                 <TextField size="small" type="date" label="Start" value={customStart} onChange={(e) => setCustomStart(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
                 <TextField size="small" type="date" label="End" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
               </Stack>
             )}




             <Box>
               <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>{tabMode === "manager" ? "Select Manager" : "Select Experts"}</Typography>
               {tabMode === "manager" ? (
                 <Autocomplete
                   options={leaders} getOptionLabel={(o) => o?.fullName || ""}
                   value={selectedLeader} onChange={(_, v) => setSelectedLeader(v)}
                   renderInput={(params) => <TextField {...params} placeholder="Search manager..." size="small" />}
                 />
               ) : (
                 <Autocomplete
                   multiple options={activeAgents} getOptionLabel={(o) => o?.fullName || ""}
                   value={selectedAgents} onChange={(_, v) => setSelectedAgents(v)}
                   renderInput={(params) => <TextField {...params} placeholder="Select experts..." size="small" />}
                 />
               )}
             </Box>




             <Button
               onClick={handleApply} variant="contained" disabled={!canApply || resultsLoading}
               sx={{ bgcolor: "#000", py: 1.2, borderRadius: 2, fontWeight: 700, textTransform: "none", "&:hover": { bgcolor: "#222" } }}
             >
               {resultsLoading ? <CircularProgress size={20} color="inherit" /> : "Generate Report"}
             </Button>
           
             <Button onClick={resetFilters} startIcon={<RestartAlt />} sx={{ color: "text.secondary", textTransform: "none", fontWeight: 600 }}>Reset Filters</Button>
           </Stack>
         </Grid>
         )}




         <Grid item xs={12} md={fullPage ? 12 : 8.5} sx={{ bgcolor: "#fff", display: "flex", flexDirection: "column" }}>
           {!fullPage && (
           <Box sx={{ p: 2, borderBottom: "1px solid #eee", bgcolor: "#fafafa" }}>
             <Stack direction="row" spacing={3}>
               <Box>
                 <Typography variant="caption" color="text.secondary" fontWeight={700}>TOTAL SALES REVENUE</Typography>
                 <Typography variant="h5" fontWeight={900} color="#000">{formatRevenue(totalSalesRevenue)}</Typography>
               </Box>
               <Divider orientation="vertical" flexItem />
               <Box>
                 <Typography variant="caption" color="text.secondary" fontWeight={700}>PERIOD</Typography>
                 <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>
                   {effectiveDates.startDate} <ChevronRight sx={{ fontSize: 14 }} /> {effectiveDates.endDate}
                 </Typography>
               </Box>
             </Stack>
           </Box>
           )}




           <Box sx={{ p: 2, flexGrow: 1, overflow: "hidden" }}>
             {resultsError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{resultsError}</Alert>}




             {resultsLoading ? (
               <Stack alignItems="center" justifyContent="center" sx={{ height: 400 }}>
                 <CircularProgress color="inherit" size={30} />
               </Stack>
             ) : (daywiseResults.length > 0 || results.length > 0) ? (
               <Paper elevation={0} sx={{ border: "1px solid #eee", borderRadius: 3, overflow: "hidden" }}>
                 <TableContainer
                   sx={{
                     maxHeight: fullPage ? "calc(100vh - 360px)" : "60vh",
                     overflowY: "auto",
                     overflowX: "auto",
                     "&::-webkit-scrollbar": { width: 6, height: 6 },
                     "&::-webkit-scrollbar-thumb": { bgcolor: "#ccc", borderRadius: 3 }
                   }}
                 >
                   <Table stickyHeader size="small">
                     <TableHead>
                       <TableRow>
                         <TableCell sx={{ bgcolor: "#000", color: "#fff", fontWeight: 700, position: "sticky", left: 0, zIndex: 12 }}>Expert Name</TableCell>
                         {isDaywise ? (
                           <>
                             {daywiseResults[0]?.perDay?.map((d) => (
                               <TableCell key={d.label} align="right" sx={{ bgcolor: "#000", color: "#fff", fontWeight: 700 }}>{d.label}</TableCell>
                             ))}
                             <TableCell align="right" sx={{ bgcolor: "#000", color: "#fff", fontWeight: 800 }}>TOTAL</TableCell>
                           </>
                         ) : (
                           <TableCell align="right" sx={{ bgcolor: "#000", color: "#fff", fontWeight: 700 }}>Total Revenue</TableCell>
                         )}
                       </TableRow>
                     </TableHead>
                     <TableBody>
                       {isDaywise ? daywiseResults.map((row) => {
                         const hasTeamMembers = row.teamMembers?.length > 0;
                         const isExpanded = Boolean(expandedRows[row.name]);
                         return (
                           <React.Fragment key={row.name}>
                             <TableRow hover>
                               <TableCell sx={{ fontWeight: 700, position: "sticky", left: 0, bgcolor: "#fff", zIndex: 5, borderRight: "2px solid #f1f1f1" }}>
                                 <Stack direction="row" spacing={0.5} alignItems="center">
                                   {hasTeamMembers ? (
                                     <IconButton size="small" onClick={() => toggleRow(row.name)} sx={{ p: 0.25 }}>
                                       {isExpanded ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                                     </IconButton>
                                   ) : (
                                     <Box sx={{ width: 22 }} />
                                   )}
                                   <Typography variant="body2" fontWeight={700}>{row.name}</Typography>
                                 </Stack>
                               </TableCell>
                               {row.perDay.map((d, i) => <TableCell key={i} align="right">{formatRevenue(d.total)}</TableCell>)}
                               <TableCell align="right" sx={{ fontWeight: 900, bgcolor: "#f8f9fa" }}>{formatRevenue(row.grandTotal)}</TableCell>
                             </TableRow>
                             {isExpanded && (row.teamMembers || []).map((member) => (
                               <TableRow key={`${row.name}-${member.name}`}>
                                 <TableCell sx={{ position: "sticky", left: 0, bgcolor: "#fafafa", zIndex: 4, borderRight: "2px solid #f1f1f1", pl: 4, color: "text.secondary" }}>
                                   {member.name}
                                 </TableCell>
                                 {member.perDay.map((d, i) => <TableCell key={i} align="right" sx={{ bgcolor: "#fafafa" }}>{formatRevenue(d.total)}</TableCell>)}
                                 <TableCell align="right" sx={{ fontWeight: 700, bgcolor: "#f3f3f3" }}>{formatRevenue(member.grandTotal)}</TableCell>
                               </TableRow>
                             ))}
                           </React.Fragment>
                         );
                       }) : results.map((r) => {
                         const hasTeamMembers = r.teamMembers?.length > 0;
                         const isExpanded = Boolean(expandedRows[r.name]);
                         return (
                           <React.Fragment key={r.name}>
                             <TableRow hover>
                               <TableCell sx={{ fontWeight: 700 }}>
                                 <Stack direction="row" spacing={0.5} alignItems="center">
                                   {hasTeamMembers ? (
                                     <IconButton size="small" onClick={() => toggleRow(r.name)} sx={{ p: 0.25 }}>
                                       {isExpanded ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                                     </IconButton>
                                   ) : (
                                     <Box sx={{ width: 22 }} />
                                   )}
                                   <Typography variant="body2" fontWeight={700}>{r.name}</Typography>
                                 </Stack>
                               </TableCell>
                               <TableCell align="right" sx={{ fontWeight: 900, color: "primary.main" }}>{formatRevenue(r.total)}</TableCell>
                             </TableRow>
                             {isExpanded && (r.teamMembers || []).map((member) => (
                               <TableRow key={`${r.name}-${member.name}`}>
                                 <TableCell sx={{ pl: 4, color: "text.secondary", bgcolor: "#fafafa" }}>
                                   {member.name}
                                 </TableCell>
                                 <TableCell align="right" sx={{ fontWeight: 700, color: "text.secondary", bgcolor: "#fafafa" }}>
                                   {formatRevenue(member.total)}
                                 </TableCell>
                               </TableRow>
                             ))}
                           </React.Fragment>
                         );
                       })}
                     </TableBody>
                     {/* --- Added Footer for Date-wise Totals --- */}
                     {isDaywise && (
                       <TableFooter sx={{ position: "sticky", bottom: 0, zIndex: 10, bgcolor: "#f1f1f1" }}>
                         <TableRow>
                           <TableCell sx={{ fontWeight: 900, position: "sticky", left: 0, bgcolor: "#f1f1f1", zIndex: 11 }}>TOTAL SALES</TableCell>
                           {columnTotals.map((total, idx) => (
                             <TableCell key={idx} align="right" sx={{ fontWeight: 900, color: "#000" }}>
                               {formatRevenue(total)}
                             </TableCell>
                           ))}
                           <TableCell align="right" sx={{ fontWeight: 900, bgcolor: "#000", color: "#fff" }}>
                             {formatRevenue(totalSalesRevenue)}
                           </TableCell>
                         </TableRow>
                       </TableFooter>
                     )}
                   </Table>
                 </TableContainer>
               </Paper>
             ) : (
              <EmptyState fullPage={fullPage} />
             )}
           </Box>
         </Grid>
       </Grid>
     </Box>
   </>
 );




 if (fullPage) {
   return (
     <Paper elevation={0} sx={{ borderRadius: 4, border: "1px solid #e2e8f0", overflow: "hidden", bgcolor: "#fff" }}>
       {drilldownContent}
     </Paper>
   );
 }




 return (
   <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" PaperProps={{ sx: { borderRadius: 4, overflow: "hidden" } }}>
     {drilldownContent}
   </Dialog>
 );
}
