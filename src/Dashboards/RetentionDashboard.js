import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import IncentiveSummarySection from "../components/IncentiveSummarySection";
import "./RetentionDashboard.css";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Skeleton } from "@mui/material";


const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");

const TIME_RANGE_OPTIONS = [
 "Today",
 "Yesterday",
 "Last 7 days",
 "Last 30 days",
 "Week to date",
 "Month to date",
 "Year to date",
 "Last 90 days",
 "Last 365 days",
 "Last month",
 "Last 12 months",
 "Last year",
 "Quarter to date",
 "Custom range",
];


const DISPOSITION_KEYS = [
 "OC",
 "CNP",
 "Followup Done",
 "Order Placed",
 "Call Back Later",
 "Busy",
 "Switch Off",
 "Drop On Intro",
];


const toISODate = (date) => {
 const year = date.getFullYear();
 const month = String(date.getMonth() + 1).padStart(2, "0");
 const day = String(date.getDate()).padStart(2, "0");
 return `${year}-${month}-${day}`;
};


const getDateRange = (rangeValue) => {
 const now = new Date();
 now.setHours(0, 0, 0, 0);


 let start = new Date(now);
 let end = new Date(now);


 const getWeekStart = (date) => {
   const copy = new Date(date);
   const day = copy.getDay();
   const diff = day === 0 ? 6 : day - 1;
   copy.setDate(copy.getDate() - diff);
   copy.setHours(0, 0, 0, 0);
   return copy;
 };


 switch (rangeValue) {
   case "Today":
     break;
   case "Yesterday":
     start.setDate(now.getDate() - 1);
     end = new Date(start);
     break;
   case "Last 7 days":
     start.setDate(now.getDate() - 6);
     break;
   case "Last 30 days":
     start.setDate(now.getDate() - 29);
     break;
   case "Week to date":
     start = getWeekStart(now);
     break;
   case "Month to date":
     start = new Date(now.getFullYear(), now.getMonth(), 1);
     start.setHours(0, 0, 0, 0);
     break;
   case "Year to date":
     start = new Date(now.getFullYear(), 0, 1);
     start.setHours(0, 0, 0, 0);
     break;
   case "Last 90 days":
     start.setDate(now.getDate() - 89);
     break;
   case "Last 365 days":
     start.setDate(now.getDate() - 364);
     break;
   case "Last month": {
     const year = now.getFullYear();
     const month = now.getMonth();
     const prevMonth = month - 1 < 0 ? 11 : month - 1;
     const prevYear = month - 1 < 0 ? year - 1 : year;
     start = new Date(prevYear, prevMonth, 1);
     end = new Date(prevYear, prevMonth + 1, 0);
     return { startDate: toISODate(start), endDate: toISODate(end) };
   }
   case "Last 12 months":
     start.setFullYear(now.getFullYear() - 1);
     break;
   case "Last year": {
     const y = now.getFullYear() - 1;
     start = new Date(y, 0, 1);
     end = new Date(y, 11, 31);
     return { startDate: toISODate(start), endDate: toISODate(end) };
   }
   case "Quarter to date": {
     const currentMonth = now.getMonth();
     const quarterStartMonth = currentMonth - (currentMonth % 3);
     start = new Date(now.getFullYear(), quarterStartMonth, 1);
     start.setHours(0, 0, 0, 0);
     break;
   }
   case "Custom range":
     return { startDate: "", endDate: "" };
   default:
     break;
 }


 return { startDate: toISODate(start), endDate: toISODate(end) };
};


const iconForMetric = (key) => {
 if (String(key).toLowerCase().startsWith("sales done")) {
   return "SD";
 }
 switch (key) {
   case "Active Customers":
     return "AC";
   case "Total Sales":
     return "TS";
   case "Average Order Value":
     return "AOV";
   case "No Followup Set":
     return "NS";
   case "Followup Missed":
     return "FM";
   case "Followup Today":
     return "FT";
   case "Followup Tomorrow":
     return "FR";
   case "Followup Later":
     return "FL";
   case "Lost Customers":
     return "LC";
   default:
     return "•";
 }
};

const getSummaryHeading = (rangeValue) => {
 switch (rangeValue) {
   case "Today":
     return "Today Summary";
   case "Yesterday":
     return "Yesterday Summary";
   case "Week to date":
     return "Weekly Summary";
   case "Month to date":
     return "Monthly Summary";
   case "Year to date":
     return "Yearly Summary";
   case "Quarter to date":
     return "Quarterly Summary";
   case "Custom range":
     return "Custom Range Summary";
   default:
     return `${rangeValue} Summary`;
 }
};


const normalizeShipmentTone = (label = "") => {
 const value = String(label).toLowerCase();
 if (value.includes("deliver")) return "good";
 if (value.includes("rto") || value.includes("cancel") || value.includes("return")) return "bad";
 if (value.includes("unknown")) return "neutral";
 return "info";
};


const clampPercent = (value) => {
 const parsed = Number(value || 0);
 if (!Number.isFinite(parsed)) return 0;
 return Math.max(0, Math.min(100, parsed));
};


const prettyDate = (dateText = "") => {
 if (!dateText) return "";
 const date = new Date(`${dateText}T00:00:00`);
 if (Number.isNaN(date.getTime())) return dateText;
 return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};


const toneClassForMetric = (key) => {
 if (String(key).toLowerCase().startsWith("sales done")) {
   return "rd-tone-orange";
 }
 switch (key) {
   case "Active Customers":
     return "rd-tone-blue";
   case "Total Sales":
     return "rd-tone-teal";
   case "Average Order Value":
     return "rd-tone-red";
   case "No Followup Set":
     return "rd-tone-slate";
   case "Followup Missed":
     return "rd-tone-red";
   case "Followup Today":
     return "rd-tone-green";
   case "Followup Tomorrow":
     return "rd-tone-amber";
   case "Followup Later":
     return "rd-tone-cyan";
   case "Lost Customers":
     return "rd-tone-red";
   default:
     return "rd-tone-slate";
 }
};

const getSalesDoneLabel = (rangeValue) => {
 switch (rangeValue) {
   case "Today":
     return "Sales Done Today";
   case "Yesterday":
     return "Sales Done Yesterday";
   case "Week to date":
     return "Sales Done (Weekly)";
   case "Month to date":
     return "Sales Done (Monthly)";
   case "Year to date":
     return "Sales Done (Yearly)";
   case "Last 7 days":
     return "Sales Done (Last 7 Days)";
   case "Last 30 days":
     return "Sales Done (Last 30 Days)";
   case "Last 90 days":
     return "Sales Done (Last 90 Days)";
   case "Last 365 days":
     return "Sales Done (Last 365 Days)";
   case "Last month":
     return "Sales Done (Last Month)";
   case "Last 12 months":
     return "Sales Done (Last 12 Months)";
   case "Last year":
     return "Sales Done (Last Year)";
   case "Quarter to date":
     return "Sales Done (Quarterly)";
   case "Custom range":
     return "Sales Done (Custom Range)";
   default:
     return "Sales Done";
 }
};


const RetentionAgentDashboard = () => {
 const [loadingMain, setLoadingMain] = useState(true);
 const [loadingShipment, setLoadingShipment] = useState(false);
 const [loadingAux, setLoadingAux] = useState(false);


 const [todayMetrics, setTodayMetrics] = useState({});
 const [followupMetrics, setFollowupMetrics] = useState({});
 const [shipmentSummary, setShipmentSummary] = useState([]);


 const [reachoutLogsCount, setReachoutLogsCount] = useState(0);
 const [reachoutLogsWhatsApp, setReachoutLogsWhatsApp] = useState(0);
 const [reachoutLogsCall, setReachoutLogsCall] = useState(0);
 const [reachoutLogsBoth, setReachoutLogsBoth] = useState(0);
 const [dispositionCounts, setDispositionCounts] = useState({});
 const [retentionOverviewMine, setRetentionOverviewMine] = useState({
   totalActiveCustomers: 0,
   finished: 0,
   next10Days: 0,
   next10to20Days: 0,
   supply20PlusDays: 0,
 });
 const [retentionOverviewLoading, setRetentionOverviewLoading] = useState(true);


 const [selectedRange, setSelectedRange] = useState("Month to date");
 const [customStart, setCustomStart] = useState("");
 const [customEnd, setCustomEnd] = useState("");
 const [windowLabel, setWindowLabel] = useState("Month to date");
 const [target, setTarget] = useState(0);
 const [salesProgress, setSalesProgress] = useState(0);


 const user = useMemo(() => {
   try {
     return JSON.parse(sessionStorage.getItem("user"));
   } catch {
     return null;
   }
 }, []);
 const canShowDrrPanel = Boolean(user?.permissions?.navbar?.drrPanel);


 const fetchAllSummaryData = useCallback(async (agentName, startDate, endDate) => {
   setLoadingMain(true);
   try {
     const [activeCountsRes, todaySummaryRes, followupRes] = await Promise.all([
       axios.get(`${API_BASE}/api/leads/retention/active-counts`),
       axios.get(`${API_BASE}/api/today-summary`, {
         params: { agentName, startDate, endDate },
       }),
       axios.get(`${API_BASE}/api/followup-summary`, {
         params: { agentName, startDate, endDate },
       }),
     ]);


     const activeCounts = Array.isArray(activeCountsRes?.data)
       ? activeCountsRes.data
       : [];
     const current = activeCounts.find((item) => item?._id === agentName);


     setTodayMetrics({
       ...(todaySummaryRes?.data || {}),
       activeCustomers: Number(current?.activeCount || 0),
     });
     setFollowupMetrics(followupRes?.data || {});
   } catch (error) {
     console.error("Error fetching today/followup data:", error);
     setTodayMetrics({});
     setFollowupMetrics({});
   } finally {
     setLoadingMain(false);
   }
 }, []);


 const fetchShipmentSummary = useCallback(async (agentName, startDate, endDate) => {
   setLoadingShipment(true);
   try {
     const response = await axios.get(`${API_BASE}/api/shipment-summary`, {
       params: { agentName, startDate, endDate },
     });
     setShipmentSummary(Array.isArray(response?.data) ? response.data : []);
   } catch (error) {
     console.error("Error fetching shipment data:", error);
     setShipmentSummary([]);
   } finally {
     setLoadingShipment(false);
   }
 }, []);


 const fetchAuxCards = useCallback(async (startDate, endDate) => {
   if (!user?.fullName || !startDate || !endDate) return;
   setLoadingAux(true);
   try {
     const [reachoutRes, dispositionRes] = await Promise.all([
       axios.get(`${API_BASE}/api/reachout-logs/count`, {
         params: {
           startDate,
           endDate,
           healthExpertAssigned: user.fullName,
         },
       }),
       axios.get(`${API_BASE}/api/reachout-logs/disposition-count`, {
         params: {
           startDate,
           endDate,
           healthExpertAssigned: user.fullName,
         },
       }),
     ]);


     setReachoutLogsCount(Number(reachoutRes?.data?.totalCount || 0));
     setReachoutLogsWhatsApp(Number(reachoutRes?.data?.WhatsApp || 0));
     setReachoutLogsCall(Number(reachoutRes?.data?.Call || 0));
     setReachoutLogsBoth(Number(reachoutRes?.data?.Both || 0));
     setDispositionCounts(dispositionRes?.data || {});
   } catch (error) {
     console.error("Error fetching auxiliary summary cards:", error);
     setReachoutLogsCount(0);
     setReachoutLogsWhatsApp(0);
     setReachoutLogsCall(0);
     setReachoutLogsBoth(0);
     setDispositionCounts({});
   } finally {
     setLoadingAux(false);
   }
 }, [user?.fullName]);


 const loadForRange = useCallback(async (startDate, endDate) => {
   if (!user?.fullName || !startDate || !endDate) return;
   setWindowLabel(`${prettyDate(startDate)} - ${prettyDate(endDate)}`);
   await Promise.all([
     fetchAllSummaryData(user.fullName, startDate, endDate),
     fetchShipmentSummary(user.fullName, startDate, endDate),
     fetchAuxCards(startDate, endDate),
   ]);
 }, [fetchAllSummaryData, fetchAuxCards, fetchShipmentSummary, user?.fullName]);


 useEffect(() => {
   if (!user?.fullName) return;
   const initial = getDateRange("Month to date");
   loadForRange(initial.startDate, initial.endDate);
 }, [loadForRange, user?.fullName]);


 useEffect(() => {
   async function fetchTarget() {
     if (!user?.fullName || !user?.email) return;
     try {
       const response = await axios.get(`${API_BASE}/api/employees`, {
         params: {
           fullName: user.fullName,
           email: user.email,
         },
       });
       if (response.data && response.data[0]) {
         setTarget(Number(response.data[0].target || 0));
       }
     } catch (error) {
       console.error("Error fetching employee target:", error);
     }
   }
   fetchTarget();
 }, [user?.email, user?.fullName]);


 useEffect(() => {
   async function fetchSalesProgress() {
     if (!user?.fullName) return;
     try {
       const response = await axios.get(`${API_BASE}/api/retention-sales/progress`, {
         params: { name: user.fullName },
       });
       setSalesProgress(Number(response?.data?.total || 0));
     } catch (error) {
       console.error("Error fetching retention sales progress:", error);
     }
   }
   fetchSalesProgress();
 }, [user?.fullName]);

 useEffect(() => {
   const fetchMyRetentionOverview = async () => {
     if (!user?.fullName) return;
     setRetentionOverviewLoading(true);
     try {
       const response = await axios.get(`${API_BASE}/cohart-dataApi/active-customers-expert-summary`, {
         params: { lookbackDays: 540 },
       });
       const rows = Array.isArray(response?.data?.experts) ? response.data.experts : [];
       const mine = rows.find(
         (r) =>
           String(r?.healthExpert || "").trim().toLowerCase() ===
           String(user.fullName || "").trim().toLowerCase()
       );
       setRetentionOverviewMine({
         totalActiveCustomers: Number(mine?.totalActiveCustomers || 0),
         finished: Number(mine?.finished || 0),
         next10Days: Number(mine?.next10Days || 0),
         next10to20Days: Number(mine?.next10to20Days || 0),
         supply20PlusDays: Number(mine?.supply20PlusDays || 0),
       });
     } catch (error) {
       console.error("Error fetching retention overview for logged-in user:", error);
       setRetentionOverviewMine({
         totalActiveCustomers: 0,
         finished: 0,
         next10Days: 0,
         next10to20Days: 0,
         supply20PlusDays: 0,
       });
     } finally {
       setRetentionOverviewLoading(false);
     }
   };

   fetchMyRetentionOverview();
 }, [user?.fullName]);


 const workingDaysLeft = useMemo(() => {
   const today = new Date();
   const year = today.getFullYear();
   const month = today.getMonth();
   const date = today.getDate();
   const lastDay = new Date(year, month + 1, 0).getDate();


   let days = 0;
   for (let day = date; day <= lastDay; day += 1) {
     const check = new Date(year, month, day);
     if (check.getDay() !== 0) days += 1;
   }
   return days;
 }, []);


 const dailySalesRequired =
   workingDaysLeft > 0 && target - salesProgress > 0
     ? Math.ceil((target - salesProgress) / workingDaysLeft)
     : 0;


 const onRangeChange = async (value) => {
   setSelectedRange(value);
   if (value === "Custom range") return;
   const range = getDateRange(value);
   await loadForRange(range.startDate, range.endDate);
 };


 const applyCustomRange = async () => {
   if (!customStart || !customEnd) return;
   await loadForRange(customStart, customEnd);
 };


  const handleBoxClick = (filterType) => {
   const clickable = [
     "Active Customers",
     "Lost Customers",
     "Sales Done",
     "Followup Today",
     "No Followup Set",
     "Followup Tomorrow",
     "Followup Later",
     "Followup Missed",
   ];
   const normalizedFilter = String(filterType).toLowerCase().startsWith("sales done")
     ? (selectedRange === "Today" ? "Sales Done Today" : "Sales Done")
     : filterType;
   if (clickable.includes(normalizedFilter)) {
     window.open(`/retention/${normalizedFilter}`, "_blank");
   }
 };

 const salesDoneLabel = useMemo(() => getSalesDoneLabel(selectedRange), [selectedRange]);
 const summaryHeading = useMemo(() => getSummaryHeading(selectedRange), [selectedRange]);


 const todayCards = [
   {
     label: "Active Customers",
     value: Number(todayMetrics.activeCustomers || 0).toLocaleString("en-IN"),
     sub: "Current active base",
   },
   {
     label: salesDoneLabel,
     value: Number(todayMetrics.salesDone || 0).toLocaleString("en-IN"),
     sub: "Confirmed conversions",
   },
   {
     label: "Total Sales",
     value: `₹${Number(todayMetrics.totalSales || 0).toFixed(2)}`,
     sub: "Gross revenue",
   },
   {
     label: "Average Order Value",
     value: `₹${Number(todayMetrics.avgOrderValue || 0).toFixed(2)}`,
     sub: "",
   },
 ];


 const followupCards = [
   { label: "No Followup Set", key: "noFollowupSet" },
   { label: "Followup Missed", key: "followupMissed" },
   { label: "Followup Today", key: "followupToday" },
   { label: "Followup Tomorrow", key: "followupTomorrow" },
   { label: "Followup Later", key: "followupLater" },
   { label: "Lost Customers", key: "lostCustomers" },
 ];


 const totalFollowupVolume = followupCards.reduce(
   (sum, card) => sum + Number(followupMetrics?.[card.key] || 0),
   0
 );


 const deliveredShipmentRow = shipmentSummary.find((row) =>
   String(row?.label || "").toLowerCase().includes("deliver")
 );
 const deliveredShipmentCount = Number(deliveredShipmentRow?.count || 0);


 const conversionRate = Number(todayMetrics.activeCustomers || 0)
   ? ((Number(todayMetrics.salesDone || 0) / Number(todayMetrics.activeCustomers || 1)) * 100).toFixed(2)
   : "0.00";


 const followupCoverage = Number(followupMetrics.followupToday || 0) + Number(followupMetrics.followupTomorrow || 0);
 const followupCoverageRate = totalFollowupVolume
   ? ((followupCoverage / totalFollowupVolume) * 100).toFixed(1)
   : "0.0";


 const executiveKpis = [
   { label: "Conversion Rate", value: `${conversionRate}%`, tone: "rd-chip-blue" },
   { label: "Delivered Shipments", value: deliveredShipmentCount.toLocaleString("en-IN"), tone: "rd-chip-teal" },
   { label: "Followup Coverage", value: `${followupCoverageRate}%`, tone: "rd-chip-violet" },
   { label: "Live Range", value: selectedRange, tone: "rd-chip-gold" },
 ];

 const myTotalActive = Number(retentionOverviewMine.totalActiveCustomers || 0);
 const myPct = (count) =>
   myTotalActive > 0
     ? ((Number(count || 0) / myTotalActive) * 100).toFixed(1)
     : "0.0";

 const openOverviewCategoryInNewTab = (category) => {
   try {
     const rawUser = sessionStorage.getItem("user");
     if (rawUser) {
       const userObj = JSON.parse(rawUser);
       localStorage.setItem(
         "session:user:bridge",
         JSON.stringify({ user: userObj, ts: Date.now() })
       );
     }
   } catch {
     // no-op
   }
   const qp = new URLSearchParams({
     healthExpert: String(user?.fullName || ""),
   });
   window.open(`/retention/overview-combined/details/${category}?${qp.toString()}`, "_blank", "noopener,noreferrer");
 };


 return (
   <div className="rd-page rd-retention-page">
     <div className="rd-shell">
       <section className="rd-hero rd-retention-hero rd-fade-1">
         <div>
           <h1>{user?.fullName || "Retention Agent"} Dashboard</h1> 
           <div className="rd-meta-line">
             <span className="rd-dot" />
             <span>{windowLabel}</span>
           </div>
         </div>


         <div className="rd-hero-controls">
           <div className="rd-filters">
             <label htmlFor="rd-range">Date Range</label>
             <select
               id="rd-range"
               value={selectedRange}
               onChange={(event) => onRangeChange(event.target.value)}
             >
               {TIME_RANGE_OPTIONS.map((option) => (
                 <option key={option} value={option}>
                   {option}
                 </option>
               ))}
             </select>
           </div>


           {canShowDrrPanel && (
             <div className="rd-drr-panel">
               <span className="rd-drr-text">
                 DRR: <strong className="rd-drr-green">{dailySalesRequired > 0 ? `₹${dailySalesRequired}` : "₹0"}</strong>
               </span>
               <span className="rd-drr-divider" />
               <span className="rd-drr-text">
                 Target: ({Math.floor(salesProgress)}/{Math.floor(target)})
                 <strong className="rd-drr-gold">
                   {target > 0 ? `${Math.floor((salesProgress / target) * 100)}%` : "0%"}
                 </strong>
               </span>
             </div>
           )}
         </div>
       </section>


       <section className="rd-kpi-ribbon rd-fade-2">
         {executiveKpis.map((kpi) => (
           <article key={kpi.label} className="rd-kpi-pill">
             <span className={`rd-kpi-label ${kpi.tone}`}>{kpi.label}</span>
             <strong>{kpi.value}</strong>
           </article>
         ))}
       </section>


       {selectedRange === "Custom range" && (
         <section className="rd-custom-range rd-fade-3">
           <div className="rd-field">
             <label htmlFor="rd-start">Start Date</label>
             <input
               id="rd-start"
               type="date"
               value={customStart}
               onChange={(event) => setCustomStart(event.target.value)}
             />
           </div>
           <div className="rd-field">
             <label htmlFor="rd-end">End Date</label>
             <input
               id="rd-end"
               type="date"
               value={customEnd}
               onChange={(event) => setCustomEnd(event.target.value)}
             />
           </div>
           <button type="button" className="rd-btn-primary" onClick={applyCustomRange}>
             Apply
           </button>
         </section>
       )}


       {(loadingMain || loadingShipment || loadingAux) && (
         <div className="rd-top-loader" aria-hidden="true" />
       )}


       <section className="rd-section rd-fade-3">
         <div className="rd-section-head">
           <h2>{summaryHeading}</h2>
         </div>
         <div className="rd-card-grid rd-grid-4">
           {todayCards.map((card) => (
             <button
               type="button"
               key={card.label}
               className={`rd-metric-card ${toneClassForMetric(card.label)}`}
               onClick={() => handleBoxClick(card.label)}
             >
               <span className="rd-icon">{iconForMetric(card.label)}</span>
               <span className="rd-label">{card.label}</span>
               <span className="rd-value">{card.value}</span>
               {card.sub ? <span className="rd-sub">{card.sub}</span> : null}
             </button>
           ))}
         </div>
       </section>

       <section className="rd-section rd-fade-3">
         <div className="rd-section-head">
           <h2>Retention Overview</h2>
         </div>
         <section
           className="rd-kpi-ribbon"
           style={{
             marginTop: 0,
             display: "grid",
             gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
             gap: "12px",
           }}
         >
           {retentionOverviewLoading ? (
             Array.from({ length: 5 }).map((_, idx) => (
               <article key={`ro-shimmer-${idx}`} className="rd-kpi-pill" style={{ minHeight: 72 }}>
                 <Skeleton variant="rounded" height={16} width="55%" />
                 <Skeleton variant="text" height={34} width="80%" sx={{ mt: 0.6 }} />
               </article>
             ))
           ) : (
             <>
               <article
                 className="rd-kpi-pill"
                 style={{ cursor: "pointer", position: "relative" }}
                 onClick={() => openOverviewCategoryInNewTab("totalActive")}
                 title="Open details in new tab"
               >
                 <OpenInNewIcon sx={{ position: "absolute", top: 10, right: 10, fontSize: 16, opacity: 0.75 }} />
                 <span className="rd-kpi-label rd-chip-blue">Total Active</span>
                 <strong>{myTotalActive.toLocaleString("en-IN")} (100.0%)</strong>
               </article>
               <article
                 className="rd-kpi-pill"
                 style={{ cursor: "pointer", position: "relative" }}
                 onClick={() => openOverviewCategoryInNewTab("finished")}
                 title="Open details in new tab"
               >
                 <OpenInNewIcon sx={{ position: "absolute", top: 10, right: 10, fontSize: 16, opacity: 0.75 }} />
                 <span className="rd-kpi-label rd-chip-red">Finished</span>
                 <strong>{retentionOverviewMine.finished.toLocaleString("en-IN")} ({myPct(retentionOverviewMine.finished)}%)</strong>
               </article>
               <article
                 className="rd-kpi-pill"
                 style={{ cursor: "pointer", position: "relative" }}
                 onClick={() => openOverviewCategoryInNewTab("next10Days")}
                 title="Open details in new tab"
               >
                 <OpenInNewIcon sx={{ position: "absolute", top: 10, right: 10, fontSize: 16, opacity: 0.75 }} />
                 <span className="rd-kpi-label rd-chip-gold">Finishing in 10 Days</span>
                 <strong>{retentionOverviewMine.next10Days.toLocaleString("en-IN")} ({myPct(retentionOverviewMine.next10Days)}%)</strong>
               </article>
               <article
                 className="rd-kpi-pill"
                 style={{ cursor: "pointer", position: "relative" }}
                 onClick={() => openOverviewCategoryInNewTab("next10to20Days")}
                 title="Open details in new tab"
               >
                 <OpenInNewIcon sx={{ position: "absolute", top: 10, right: 10, fontSize: 16, opacity: 0.75 }} />
                 <span className="rd-kpi-label rd-chip-amber">10–20 Days</span>
                 <strong>{retentionOverviewMine.next10to20Days.toLocaleString("en-IN")} ({myPct(retentionOverviewMine.next10to20Days)}%)</strong>
               </article>
               <article
                 className="rd-kpi-pill"
                 style={{ cursor: "pointer", position: "relative" }}
                 onClick={() => openOverviewCategoryInNewTab("supply20PlusDays")}
                 title="Open details in new tab"
               >
                 <OpenInNewIcon sx={{ position: "absolute", top: 10, right: 10, fontSize: 16, opacity: 0.75 }} />
                 <span className="rd-kpi-label rd-chip-green">20+ Days</span>
                 <strong>{retentionOverviewMine.supply20PlusDays.toLocaleString("en-IN")} ({myPct(retentionOverviewMine.supply20PlusDays)}%)</strong>
               </article>
             </>
           )}
         </section>
       </section>


       <section className="rd-section rd-fade-4">
         <div className="rd-section-head">
           <h2>Followup Summary</h2>
         </div>
         <div className="rd-card-grid rd-grid-3">
           {followupCards.map((card) => (
             <button
               type="button"
               key={card.label}
               className={`rd-metric-card ${toneClassForMetric(card.label)}`}
               onClick={() => handleBoxClick(card.label)}
             >
               <span className="rd-icon">{iconForMetric(card.label)}</span>
               <span className="rd-label">{card.label}</span>
               <span className="rd-value">
                 {Number(followupMetrics?.[card.key] || 0).toLocaleString("en-IN")}
               </span>
             </button>
           ))}
         </div>
       </section>


       <section className="rd-section rd-fade-5">
         <div className="rd-section-head">
           <h2>Shipment Status</h2>
         </div>
         <div className="rd-table-wrap">
           <table className="rd-table">
             <thead>
               <tr>
                 <th>Category</th>
                 <th>Count</th>
                 <th>Amount</th>
                 <th>Percentage</th>
               </tr>
             </thead>
             <tbody>
               {loadingShipment ? (
                 <tr>
                   <td colSpan={4} className="rd-empty">
                     Loading shipment summary...
                   </td>
                 </tr>
               ) : shipmentSummary.length > 0 ? (
                 shipmentSummary.map((row, index) => (
                   <tr key={`${row.label}-${index}`}>
                     <td>
                       <div className="rd-status">
                         <span className={`rd-status-dot rd-${normalizeShipmentTone(row.label)}`} />
                         <span>{row.label}</span>
                       </div>
                     </td>
                     <td>{Number(row.count || 0).toLocaleString("en-IN")}</td>
                     <td>₹{Number(row.amount || 0).toFixed(2)}</td>
                     <td>
                       <div className="rd-percent-cell">
                         <span>{row.percentage}%</span>
                         <div className="rd-progress rd-progress-tight">
                           <span
                             className="rd-progress-fill"
                             style={{ width: `${clampPercent(row.percentage)}%` }}
                           />
                         </div>
                       </div>
                     </td>
                   </tr>
                 ))
               ) : (
                 <tr>
                   <td colSpan={4} className="rd-empty">
                     No shipment data found.
                   </td>
                 </tr>
               )}
             </tbody>
           </table>
         </div>
       </section>


       <IncentiveSummarySection agentName={user?.fullName} />


       <section className="rd-bottom-grid rd-fade-6">
         <article className="rd-mini-card">
           <h3>Reachout Logs</h3>
           <div className="rd-mini-row">
             <span>Total</span>
             <strong>{reachoutLogsCount.toLocaleString("en-IN")}</strong>
           </div>
           <div className="rd-mini-row">
             <span>WhatsApp</span>
             <strong>{reachoutLogsWhatsApp.toLocaleString("en-IN")}</strong>
           </div>
           <div className="rd-mini-row">
             <span>Call</span>
             <strong>{reachoutLogsCall.toLocaleString("en-IN")}</strong>
           </div>
           <div className="rd-mini-row">
             <span>Both</span>
             <strong>{reachoutLogsBoth.toLocaleString("en-IN")}</strong>
           </div>
         </article>


         <article className="rd-mini-card">
           <h3>Disposition Summary</h3>
           {DISPOSITION_KEYS.map((label) => (
             <div className="rd-mini-row" key={label}>
               <span>{label}</span>
               <strong>{Number(dispositionCounts?.[label] || 0).toLocaleString("en-IN")}</strong>
             </div>
           ))}
         </article>
       </section>
     </div>
   </div>
 );
};


export default RetentionAgentDashboard;
