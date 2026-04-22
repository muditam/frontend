import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import IncentiveSummarySection from "../components/IncentiveSummarySection";
import "./RetentionDashboard.css";


const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";


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
 switch (key) {
   case "Active Customers":
     return "AC";
   case "Sales Done Today":
     return "SD";
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
 switch (key) {
   case "Active Customers":
     return "rd-tone-blue";
   case "Sales Done Today":
     return "rd-tone-orange";
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
     "Sales Done Today",
     "Followup Today",
     "No Followup Set",
     "Followup Tomorrow",
     "Followup Later",
     "Followup Missed",
   ];
   if (clickable.includes(filterType)) {
     window.open(`/retention/${filterType}`, "_blank");
   }
 };


 const todayCards = [
   {
     label: "Active Customers",
     value: Number(todayMetrics.activeCustomers || 0).toLocaleString("en-IN"),
     sub: "Current active base",
   },
   {
     label: "Sales Done Today",
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
     sub: "Ticket quality",
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
           <h2>Today Summary</h2>
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
               <span className="rd-sub">{card.sub}</span>
             </button>
           ))}
         </div>
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


