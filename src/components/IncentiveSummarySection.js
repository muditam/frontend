import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
 Alert,
 Box,
 Button,
 Chip,
 CircularProgress,
 Dialog,
 DialogActions,
 DialogContent,
 DialogTitle,
 Divider,
 LinearProgress,
 Paper,
 Stack,
 Table,
 TableBody,
 TableCell,
 TableContainer,
 TableHead,
 TableRow,
 Typography,
} from "@mui/material";
import {
 ArrowUpward as ArrowUpwardIcon,
 CheckCircle as CheckCircleIcon,
 Autorenew as AutorenewIcon,
 Cancel as CancelIcon,
 VisibilityOutlined as ViewIcon,
} from "@mui/icons-material";


const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";
const MIN_WALLET_MONTH = "2026-04";


const BRAND = {
 border: "#e6ebf2",
 text: "#152033",
 sub: "#667085",
 primary: "#2563eb",
 available: "#16a34a",
 coming: "#f59e0b",
 reversed: "#dc2626",
 unknown: "#94a3b8",
 atRisk: "#ea580c",
 coin: "#7c3aed",
 coinSoft: "#f5f3ff",
 coinBorder: "#ddd6fe",
 prepaid: "#0f766e",
 prepaidSoft: "#ecfeff",
 partial: "#7c2d12",
 partialSoft: "#fff7ed",
 referral: "#1d4ed8",
 referralSoft: "#eff6ff",
};


const CONTAINED_BUTTON_SX = {
 textTransform: "none",
 borderRadius: 2,
 boxShadow: "none",
 backgroundColor: "#111827",
 color: "#ffffff",
 "&:hover": {
   backgroundColor: "#0b1220",
   boxShadow: "none",
 },
 "&.Mui-disabled": {
   backgroundColor: "#d1d5db",
   color: "#ffffff",
 },
};


const OUTLINED_BUTTON_SX = {
 textTransform: "none",
 borderRadius: 2,
 color: BRAND.text,
 borderColor: "#cbd5e1",
 "&:hover": {
   borderColor: BRAND.text,
   backgroundColor: "#f8fafc",
 },
 "&.Mui-disabled": {
   borderColor: "#e5e7eb",
   color: "#9ca3af",
 },
};


const incentiveSummaryCache = new Map();


function round2(value) {
 return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}


function getAuthHeaders() {
 try {
   const raw = sessionStorage.getItem("user");
   const user = raw ? JSON.parse(raw) : null;
   return user ? { "x-session-user": JSON.stringify(user) } : {};
 } catch {
   return {};
 }
}


function getCurrentMonthValue() {
 const now = new Date();
 const yyyy = now.getFullYear();
 const mm = String(now.getMonth() + 1).padStart(2, "0");
 const currentMonth = `${yyyy}-${mm}`;
 return currentMonth < MIN_WALLET_MONTH ? MIN_WALLET_MONTH : currentMonth;
}


function monthToStartDate(monthValue) {
 return monthValue ? `${monthValue}-01` : "";
}


function monthToEndDate(monthValue) {
 if (!monthValue) return "";
 const [year, month] = monthValue.split("-").map(Number);
 const lastDay = new Date(year, month, 0).getDate();
 return `${monthValue}-${String(lastDay).padStart(2, "0")}`;
}


function formatCurrency(value) {
 return `₹${Number(value || 0).toLocaleString("en-IN", {
   minimumFractionDigits: 2,
   maximumFractionDigits: 2,
 })}`;
}


function formatNumber(value) {
 return Number(value || 0).toLocaleString("en-IN");
}


function formatDate(value) {
 if (!value) return "-";
 const d = new Date(value);
 if (Number.isNaN(d.getTime())) return value;
 return d.toLocaleDateString("en-IN");
}


function isReversedWalletCoinStatus(status = "") {
 const s = String(status || "").toUpperCase();
 return (
   s.includes("RTO") ||
   s.includes("CANCEL") ||
   s.includes("RETURN") ||
   s.includes("UNDELIVER")
 );
}


function isUpcomingWalletCoinStatus(status = "") {
 const s = String(status || "").toUpperCase();
 if (!s || s.includes("DELIVERED") || isReversedWalletCoinStatus(s)) return false;


 return (
   s.includes("PROCESSING") ||
   s.includes("TRANSIT") ||
   s.includes("OUT FOR DELIVERY") ||
   s.includes("SHIPPED") ||
   s.includes("DISPATCH") ||
   s.includes("MANIFEST") ||
   s.includes("BOOKED") ||
   s.includes("PICKED") ||
   s.includes("PICKUP") ||
   s.includes("REACHED HUB") ||
   s.includes("AT HUB")
 );
}


function getSlabRange(revenueValue) {
 const revenue = Number(revenueValue || 0);


 if (revenue < 200000) return { currentPercent: 1, max: 200000, nextPercent: 2.5 };
 if (revenue < 300000) return { currentPercent: 2.5, max: 300000, nextPercent: 3.5 };
 if (revenue < 400000) return { currentPercent: 3.5, max: 400000, nextPercent: 5 };
 if (revenue < 500000) return { currentPercent: 5, max: 500000, nextPercent: 6 };
 if (revenue < 600000) return { currentPercent: 6, max: 600000, nextPercent: 7 };
 if (revenue < 800000) return { currentPercent: 7, max: 800000, nextPercent: null };
 return { currentPercent: 7, max: 800000, nextPercent: null };
}


function getSlabTone(percent = 0) {
 if (percent >= 4) {
   return { bar: "#16a34a", track: "#dcfce7", text: "#15803d", chipBg: "#dcfce7", chipBorder: "#bbf7d0" };
 }
 if (percent >= 3) {
   return { bar: "#f59e0b", track: "#fef3c7", text: "#b45309", chipBg: "#fef3c7", chipBorder: "#fde68a" };
 }
 if (percent >= 2) {
   return { bar: "#2563eb", track: "#dbeafe", text: "#1d4ed8", chipBg: "#dbeafe", chipBorder: "#bfdbfe" };
 }
 if (percent >= 1) {
   return { bar: "#7c3aed", track: "#ede9fe", text: "#6d28d9", chipBg: "#ede9fe", chipBorder: "#ddd6fe" };
 }
 return { bar: "#64748b", track: "#e2e8f0", text: "#475569", chipBg: "#f1f5f9", chipBorder: "#cbd5e1" };
}


function getBucketMeta(bucket) {
 switch (bucket) {
   case "available":
     return { label: "Available", color: BRAND.available, chipColor: "success", icon: <CheckCircleIcon sx={{ fontSize: 16 }} /> };
   case "coming":
     return { label: "Upcoming", color: BRAND.coming, chipColor: "warning", icon: <AutorenewIcon sx={{ fontSize: 16 }} /> };
   case "reversed":
     return { label: "Lost", color: BRAND.reversed, chipColor: "error", icon: <CancelIcon sx={{ fontSize: 16 }} /> };
   default:
     return { label: "Unknown", color: BRAND.unknown, chipColor: "default", icon: null };
 }
}


function getStatusMeta(status = "") {
 const s = String(status || "").toUpperCase();


 if (isReversedWalletCoinStatus(s)) return { label: status || "Reversed", color: "error" };
 if (s.includes("DELIVERED")) return { label: status || "Delivered", color: "success" };
 if (isUpcomingWalletCoinStatus(s)) return { label: status || "Coming", color: "warning" };
 return { label: status || "Unknown", color: "default" };
}


function formatSignedCurrency(value, walletBucket) {
 const sign = walletBucket === "reversed" ? "-" : walletBucket ? "+" : "";
 return `${sign}${formatCurrency(Math.abs(Number(value || 0)))}`;
}


function WalletDistributionBar({ available = 0, coming = 0, atRisk = 0, reversed = 0, unknown = 0 }) {
 const segments = [
   { key: "available", label: "Available", value: Math.max(0, Number(available || 0)), color: BRAND.available },
   { key: "coming", label: "Upcoming", value: Math.max(0, Number(coming || 0)), color: BRAND.coming },
   { key: "atRisk", label: "At Risk", value: Math.max(0, Number(atRisk || 0)), color: BRAND.atRisk },
   { key: "reversed", label: "Lost", value: Math.max(0, Number(reversed || 0)), color: BRAND.reversed },
   { key: "unknown", label: "Unknown", value: Math.max(0, Number(unknown || 0)), color: BRAND.unknown },
 ];
 const total = segments.reduce((sum, segment) => sum + segment.value, 0);
 const pct = (value) => (total ? (value / total) * 100 : 0);
 const legendSegments = segments.filter(
   (segment) => segment.key !== "unknown" || segment.value > 0
 );


 return (
   <Box>
     <Box
       sx={{
         height: 12,
         borderRadius: 999,
         overflow: "hidden",
         display: "flex",
         background: "#edf2f7",
         border: `1px solid ${BRAND.border}`,
       }}
     >
       {segments.map((segment) => (
         <Box
           key={segment.key}
           title={`${segment.label}: ${formatCurrency(segment.value)} (${pct(segment.value).toFixed(1)}%)`}
           sx={{ width: `${pct(segment.value)}%`, background: segment.color }}
         />
       ))}
     </Box>


     <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" sx={{ mt: 1.25 }}>
       {legendSegments.map((segment) => (
         <Stack key={segment.key} direction="row" spacing={1} alignItems="center">
           <Box sx={{ width: 10, height: 10, borderRadius: "50%", background: segment.color }} />
           <Typography variant="caption" color="text.secondary">
             {segment.label} {pct(segment.value).toFixed(1)}%
           </Typography>
         </Stack>
       ))}
     </Stack>
   </Box>
 );
}


function SummaryMetric({ title, value, sub, color, bg, borderColor }) {
 return (
   <Box
     sx={{
       flex: 1,
       minWidth: 160,
       p: 2,
       borderRadius: 2.5,
       border: `1px solid ${borderColor || BRAND.border}`,
       background: bg || "#fff",
     }}
   >
     <Typography variant="body2" sx={{ color: BRAND.sub, fontWeight: 500, mb: 0.75 }}>
       {title}
     </Typography>
     <Typography variant="h5" sx={{ color: color || BRAND.text, fontWeight: 800, lineHeight: 1.1 }}>
       {value}
     </Typography>
     {sub ? (
       <Typography variant="caption" sx={{ color: BRAND.sub }}>
         {sub}
       </Typography>
     ) : null}
   </Box>
 );
}


function VKRTargetProgressBar({ value = 0, threshold = 60 }) {
 const safeValue = Math.max(0, Math.min(100, Number(value || 0)));
 const safeThreshold = Math.max(0, Math.min(100, Number(threshold || 60)));
 const isSafe = safeValue >= safeThreshold;


 return (
   <Box sx={{ width: "100%" }}>
     <Box
       sx={{
         position: "relative",
         height: 12,
         borderRadius: 999,
         overflow: "hidden",
         border: "1px solid #e5e7eb",
         background: isSafe ? "#dcfce7" : "#fee2e2",
       }}
     >
       <Box
         sx={{
           height: "100%",
           width: `${safeValue}%`,
           background: isSafe ? "#16a34a" : "#dc2626",
           transition: "width 0.35s ease",
           borderRadius: 999,
         }}
       />
     </Box>
     <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.75 }}>
       <Typography variant="caption" sx={{ color: BRAND.sub, fontWeight: 600 }}>
         0%
       </Typography>
       <Typography variant="caption" sx={{ color: isSafe ? BRAND.available : BRAND.reversed, fontWeight: 700 }}>
         Min. Required: {safeThreshold}%
       </Typography>
       <Typography variant="caption" sx={{ color: BRAND.sub, fontWeight: 600 }}>
         100%
       </Typography>
     </Stack>
   </Box>
 );
}


function SlabCard({ title, revenue, percent }) {
 const range = getSlabRange(revenue);
 const tone = getSlabTone(percent);
 const progress = range.max ? Math.max(0, Math.min(100, (Number(revenue || 0) / range.max) * 100)) : 0;
 const amountToNextSlab = range.nextPercent ? Math.max(0, range.max - Number(revenue || 0)) : 0;


 return (
   <Box sx={{ p: 2, borderRadius: 2.5, border: `1px solid ${BRAND.border}`, background: "#fbfdff" }}>
     <Typography variant="body2" sx={{ color: BRAND.sub, fontWeight: 600, mb: 1.25 }}>
       {title}
     </Typography>
     <Stack spacing={1}>
       <Stack direction="row" justifyContent="space-between" alignItems="baseline">
         <Typography variant="h5" sx={{ fontWeight: 800, color: BRAND.text }}>
           {formatCurrency(revenue)}
         </Typography>
         <Chip
           label={`${percent}%`}
           size="small"
           sx={{
             fontWeight: 700,
             color: tone.text,
             backgroundColor: tone.chipBg,
             border: `1px solid ${tone.chipBorder}`,
           }}
         />
       </Stack>
       <LinearProgress
         variant="determinate"
         value={progress}
         sx={{
           height: 7,
           borderRadius: 999,
           backgroundColor: tone.track,
           "& .MuiLinearProgress-bar": {
             borderRadius: 999,
             backgroundColor: tone.bar,
           },
         }}
       />
       <Stack direction="row" justifyContent="space-between">
         <Typography variant="caption" sx={{ color: BRAND.sub }}>
           ₹0.00
         </Typography>
         <Typography variant="caption" sx={{ color: BRAND.sub }}>
           {formatCurrency(range.max)}
         </Typography>
       </Stack>
       {range.nextPercent ? (
         <Typography variant="body2" sx={{ color: BRAND.sub, mt: 0.25 }}>
           Need <Box component="span" sx={{ fontWeight: 700, color: BRAND.text }}>{formatCurrency(amountToNextSlab)}</Box>{" "}
           more {title.toLowerCase().includes("delivered") ? "delivered" : "total"} to reach{" "}
           <Box component="span" sx={{ fontWeight: 700, color: tone.text }}>{range.nextPercent}%</Box>
         </Typography>
       ) : (
         <Typography variant="body2" sx={{ color: tone.text, mt: 0.25, fontWeight: 700 }}>
           Highest slab reached
         </Typography>
       )}
     </Stack>
   </Box>
 );
}


export default function IncentiveSummarySection({ agentName }) {
 const currentMonth = useMemo(() => getCurrentMonthValue(), []);
 const headers = useMemo(() => getAuthHeaders(), []);
 const [data, setData] = useState(null);
 const [loading, setLoading] = useState(false);
 const [loadingDetails, setLoadingDetails] = useState(false);
 const [error, setError] = useState("");
 const [cashOpen, setCashOpen] = useState(false);
 const [walletOpen, setWalletOpen] = useState(false);
 const [rulesOpen, setRulesOpen] = useState(false);
 const startDate = useMemo(() => monthToStartDate(currentMonth), [currentMonth]);
 const endDate = useMemo(() => monthToEndDate(currentMonth), [currentMonth]);
 const requestKey = useMemo(
   () => `${agentName || ""}|${startDate}|${endDate}`,
   [agentName, endDate, startDate]
 );


 const fetchIncentiveData = useCallback(async ({ includeDetails = false } = {}) => {
   if (!agentName) return null;


   const cacheKey = `${requestKey}|${includeDetails ? "details" : "summary"}`;
   if (incentiveSummaryCache.has(cacheKey)) {
     return incentiveSummaryCache.get(cacheKey);
   }


   const request = axios
     .get(`${API_BASE}/api/incentives-new`, {
       headers,
       params: {
         agentName,
         startDate,
         endDate,
         summaryOnly: includeDetails ? undefined : "true",
       },
     })
     .then((res) => res.data);


   incentiveSummaryCache.set(cacheKey, request);


   try {
     return await request;
   } catch (err) {
     incentiveSummaryCache.delete(cacheKey);
     throw err;
   }
 }, [agentName, endDate, headers, requestKey, startDate]);


 useEffect(() => {
   if (!agentName) return;


   let active = true;
   const fetchData = async () => {
     setLoading(true);
     setError("");


     try {
       const nextData = await fetchIncentiveData({ includeDetails: false });
       if (active) setData(nextData);
     } catch (err) {
       console.error("Error fetching dashboard incentive summary:", err);
       if (active) {
         setData(null);
         setError(err?.response?.data?.message || "Failed to load incentive summary");
       }
     } finally {
       if (active) setLoading(false);
     }
   };


   fetchData();


   return () => {
     active = false;
   };
 }, [agentName, fetchIncentiveData, requestKey]);


 const ensureDetailsLoaded = useCallback(async () => {
   if (data?.detailsIncluded) return;


   setLoadingDetails(true);
   setError("");


   try {
     const detailedData = await fetchIncentiveData({ includeDetails: true });
     setData(detailedData);
   } catch (err) {
     console.error("Error fetching dashboard incentive details:", err);
     setError(err?.response?.data?.message || "Failed to load incentive details");
   } finally {
     setLoadingDetails(false);
   }
 }, [data?.detailsIncluded, fetchIncentiveData]);


 const openCashSummary = () => {
   setCashOpen(true);
   ensureDetailsLoaded();
 };


 const openWalletSummary = () => {
   setWalletOpen(true);
   ensureDetailsLoaded();
 };


 const summary = data?.summary || {};
 const slab = data?.slab || {};
 const walletCoin = data?.walletCoin || {};
 const walletRules = walletCoin.rules || {};
 const walletTarget = walletCoin.target || {};
 const walletSop = walletCoin.sop || {};
 const walletRows = walletCoin.rows || [];
 const walletNote = walletCoin.note || summary.walletCoinNote || "Wallet coin summary";


 const totalRevenueValue = Number(slab.totalRevenue || summary.totalRevenue || 0);
 const deliveredRevenueValue = Number(slab.deliveredRevenue || 0);
 const totalPercent = getSlabRange(totalRevenueValue).currentPercent;
 const deliveredPercent = getSlabRange(deliveredRevenueValue).currentPercent;
 const walletAchievementPercent = Number(walletTarget.achievementPercent ?? 0);
 const walletDeliveredOrders = Number(walletCoin.deliveredQualifyingOrders ?? summary.walletCoinDeliveredOrders ?? 0);
 const walletBaseEarnedCoins = Number(walletCoin.baseEarnedCoins ?? summary.walletCoinBaseEarned ?? 0);
 const walletLapsedCoins = Number(walletCoin.lapsedCoins ?? summary.walletCoinLapsed ?? 0);


 const walletUpcomingRows = walletRows.filter(
   (row) => !row?.isDelivered && isUpcomingWalletCoinStatus(row?.shipmentStatus || "")
 );
 const walletUpcomingOrders = walletUpcomingRows.length;
 const walletUpcomingCoins = round2(
   walletUpcomingRows.reduce((sum, row) => sum + Number(row?.coinsIfDelivered || 0), 0)
 );
 const walletTargetVisibleOrders = Number(walletDeliveredOrders || 0) + walletUpcomingRows.length;


 const prepaidCoins = Number(summary.prepaidCoins ?? walletCoin.prepaidCoins ?? data?.extraCoins?.prepaidCoins ?? 0);
 const partialPaidCoins = Number(summary.partialPaidCoins ?? walletCoin.partialPaidCoins ?? data?.extraCoins?.partialPaidCoins ?? 0);
 const referralPatientCoins = Number(summary.referralPatientCoins ?? walletCoin.referralPatientCoins ?? data?.extraCoins?.referralPatientCoins ?? 0);
 const prepaidCount = Number(summary.prepaidCount ?? walletCoin.prepaidCount ?? data?.extraCoins?.prepaidCount ?? 0);
 const partialPaidCount = Number(summary.partialPaidCount ?? walletCoin.partialPaidCount ?? data?.extraCoins?.partialPaidCount ?? 0);
 const referralPatientCount = Number(summary.referralPatientCount ?? walletCoin.referralPatientCount ?? data?.extraCoins?.referralPatientCount ?? 0);


 if (!agentName) return null;


 return (
   <Stack spacing={2.5} sx={{ mt: 4, width: "100%", maxWidth: "1400px", mx: "auto" }}>
     {error ? <Alert severity="error">{error}</Alert> : null}


     {loading ? (
       <Paper sx={{ p: 5, borderRadius: 3, border: `1px solid ${BRAND.border}`, display: "flex", justifyContent: "center" }}>
         <CircularProgress />
       </Paper>
     ) : data ? (
       <>
         <Paper sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${BRAND.border}`, boxShadow: "0 8px 30px rgba(15, 23, 42, 0.04)" }}>
           <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2}>
             <Typography variant="h6" sx={{ fontWeight: 800, color: BRAND.text }}>
               Cash Summary
             </Typography>
             <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
	               <Chip
	                 icon={<ArrowUpwardIcon />}
	                 label={`Current Delivered Slab: ${deliveredPercent}%`}
	                 sx={{
                   background: "#f3f4f6",
                   color: BRAND.text,
                   fontWeight: 700,
                   border: "1px solid #d1d5db",
                   "& .MuiChip-icon": {
                     color: "#4b5563",
                   },
                 }}
	               />
	               <Button variant="contained" startIcon={<ViewIcon />} onClick={openCashSummary} sx={CONTAINED_BUTTON_SX}>
	                 View Summary
	               </Button>
             </Stack>
           </Stack>


           <Divider sx={{ my: 2 }} />


           <Stack direction={{ xs: "column", lg: "row" }} spacing={2.5}>
             <Box sx={{ flex: 1.15 }}>
               <Typography variant="body2" sx={{ color: BRAND.sub, fontWeight: 600, mb: 1.25 }}>
                 Incentive Cash Distribution
               </Typography>
               <WalletDistributionBar
                 available={summary.availableIncentive || 0}
                 coming={summary.comingIncentive || 0}
                 atRisk={summary.atRiskIncentive || 0}
                 reversed={summary.reversedIncentive || 0}
                 unknown={summary.unknownIncentive || 0}
               />
               <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2, flexWrap: "wrap" }}>
                 <SummaryMetric title="Available Cash" value={formatCurrency(summary.availableIncentive)} sub={`${formatNumber(summary.deliveredOrders || 0)} delivered orders`} color={BRAND.available} />
                 <SummaryMetric title="Upcoming Cash" value={formatCurrency(summary.comingIncentive)} sub={`${formatNumber(summary.comingOrders || 0)} undelivered orders`} color={BRAND.coming} />
                 <SummaryMetric title="At Risk" value={formatCurrency(summary.atRiskIncentive)} sub={`${formatNumber(summary.atRiskOrders || 0)} orders older than 5 days`} color={BRAND.atRisk} />
                 <SummaryMetric title="Lost" value={formatCurrency(summary.reversedIncentive)} sub={`${formatNumber(summary.reversedOrders || 0)} RTO orders`} color={BRAND.reversed} />
               </Stack>
             </Box>


             <Box sx={{ flex: 0.95, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.5 }}>
               <SlabCard title="Total Sales Slab" revenue={totalRevenueValue} percent={totalPercent} />
               <SlabCard title="Delivered Sales Slab" revenue={deliveredRevenueValue} percent={deliveredPercent} />
             </Box>
           </Stack>
         </Paper>


         <Paper sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${BRAND.border}`, boxShadow: "0 8px 30px rgba(15, 23, 42, 0.04)" }}>
           <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2}>
             <Box>
               <Typography variant="h6" sx={{ fontWeight: 800, color: BRAND.text }}>
                 Coins Summary
               </Typography>
               <Typography variant="body2" sx={{ color: BRAND.sub, mt: 0.5 }}>
                 {walletNote}
               </Typography>
	             </Box>
	             <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
	               <Button variant="contained" startIcon={<ViewIcon />} onClick={openWalletSummary} sx={CONTAINED_BUTTON_SX}>
	                 View Summary
	               </Button>
	               <Button variant="outlined" onClick={() => setRulesOpen(true)} sx={OUTLINED_BUTTON_SX}>
	                 Rules
	               </Button>
             </Stack>
           </Stack>


           <Divider sx={{ my: 2 }} />


           <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} alignItems="stretch">
             <Box sx={{ flex: 1.15, p: 2, borderRadius: 2.5, border: `1px solid ${BRAND.coinBorder}`, background: BRAND.coinSoft }}>
               <Typography variant="body2" sx={{ color: BRAND.sub, fontWeight: 600, mb: 0.75 }}>
                 VKR Sales
               </Typography>
               <Stack spacing={1.25}>
                 <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "flex-start" }} spacing={1.5}>
                   <Box sx={{ minWidth: 0, flex: 1 }}>
                     <Typography variant="h5" sx={{ color: BRAND.coin, fontWeight: 800, lineHeight: 1.1 }}>
                       {walletAchievementPercent}%
                     </Typography>
                     <Typography variant="caption" sx={{ color: BRAND.sub }}>
                      Target: {formatNumber(walletTargetVisibleOrders)} / {formatNumber(walletTarget.monthlyTargetCount || 0)}
                     </Typography>
                   </Box>
                   <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ width: { xs: "100%", md: "auto" }, minWidth: { md: 570 } }}>
                    <SummaryMetric title="Earned Coins" value={formatNumber(walletBaseEarnedCoins)} sub={`${formatNumber(walletDeliveredOrders)} delivered qualifying orders`} color={BRAND.coin} bg="#ffffff" borderColor={BRAND.coinBorder} />
                    <SummaryMetric title="Upcoming Coins" value={formatNumber(walletUpcomingCoins)} sub={`${formatNumber(walletUpcomingOrders)} upcoming qualifying orders`} color={BRAND.coming} bg="#ffffff" borderColor="#fde68a" />
                     <SummaryMetric title="Lapsed Coins" value={formatNumber(walletLapsedCoins)} sub={`${walletAchievementPercent}% achievement`} color={BRAND.reversed} bg="#ffffff" borderColor="#fecaca" />
                   </Stack>
                 </Stack>
                 <Box sx={{ mt: 0.5 }}>
                   <VKRTargetProgressBar value={walletAchievementPercent} threshold={walletTarget.minAchievementPercentToRetain || 60} />
                 </Box>
               </Stack>
             </Box>


             <Box sx={{ flex: 1, display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 1.5 }}>
               <SummaryMetric title="Prepaid" value={formatNumber(prepaidCoins)} sub={`${formatNumber(prepaidCount)} orders`} color={BRAND.prepaid} bg={BRAND.prepaidSoft} borderColor="#ccfbf1" />
               <SummaryMetric title="Partial Paid" value={formatNumber(partialPaidCoins)} sub={`${formatNumber(partialPaidCount)} orders`} color={BRAND.partial} bg={BRAND.partialSoft} borderColor="#fed7aa" />
               <SummaryMetric title="Referral Patient" value={formatNumber(referralPatientCoins)} sub={`${formatNumber(referralPatientCount)} referrals`} color={BRAND.referral} bg={BRAND.referralSoft} borderColor="#bfdbfe" />
             </Box>
           </Stack>
         </Paper>


         <Dialog open={cashOpen} onClose={() => setCashOpen(false)} fullWidth maxWidth="xl">
           <DialogTitle sx={{ fontWeight: 800, color: BRAND.text }}>Cash Summary</DialogTitle>
           <DialogContent dividers sx={{ p: 0 }}>
             <TableContainer sx={{ overflowX: "auto" }}>
               <Table sx={{ minWidth: 980 }}>
                 <TableHead>
                   <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                     {["Date", "Order ID", "Customer", "Amount", "Shipment Status", "Wallet", "Incentive"].map((header) => (
                       <TableCell key={header} sx={{ fontWeight: 700 }} align={header === "Incentive" ? "right" : "left"}>
                         {header}
                       </TableCell>
                     ))}
                   </TableRow>
                 </TableHead>
                 <TableBody>
	                   {loadingDetails ? (
	                     <TableRow>
	                       <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
	                         <CircularProgress size={24} />
	                       </TableCell>
	                     </TableRow>
	                   ) : (data.rows || []).length ? (
	                     data.rows.map((row, index) => {
                       const bucketMeta = getBucketMeta(row.walletBucket);
                       const statusMeta = getStatusMeta(row.deliveryStatus);


                       return (
                         <TableRow key={`${row.orderId || "row"}-${index}`} hover>
                           <TableCell>{formatDate(row.date)}</TableCell>
                           <TableCell sx={{ fontWeight: 600 }}>{row.orderId || "-"}</TableCell>
                           <TableCell>{row.name || row.customerName || "-"}</TableCell>
                           <TableCell sx={{ fontWeight: 600 }}>{formatCurrency(row.amount)}</TableCell>
                           <TableCell><Chip size="small" label={statusMeta.label} color={statusMeta.color} variant="outlined" /></TableCell>
                           <TableCell><Chip size="small" label={bucketMeta.label} color={bucketMeta.chipColor} icon={bucketMeta.icon} /></TableCell>
                           <TableCell align="right" sx={{ fontWeight: 700, color: bucketMeta.color }}>
                             {formatSignedCurrency(row.incentiveAmount, row.walletBucket)}
                           </TableCell>
                         </TableRow>
                       );
                     })
                   ) : (
                     <TableRow>
                       <TableCell colSpan={7} align="center" sx={{ py: 4 }}>No records found</TableCell>
                     </TableRow>
                   )}
                 </TableBody>
               </Table>
             </TableContainer>
           </DialogContent>
           <DialogActions sx={{ p: 2 }}>
	           <Button onClick={() => setCashOpen(false)} variant="outlined" sx={OUTLINED_BUTTON_SX}>Close</Button>
           </DialogActions>
         </Dialog>


         <Dialog open={walletOpen} onClose={() => setWalletOpen(false)} fullWidth maxWidth="xl">
           <DialogTitle sx={{ fontWeight: 800, color: BRAND.text }}>Wallet Summary</DialogTitle>
           <DialogContent dividers sx={{ p: 0 }}>
             <Box sx={{ p: 2 }}>
               <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
                 <Box>
                   <Typography variant="body2" sx={{ color: BRAND.sub }}>
                     SOP: <Box component="span" sx={{ color: BRAND.text, fontWeight: 700 }}>{walletSop.name || "VKR Plan Coin"}</Box>
                   </Typography>
                   <Typography variant="body2" sx={{ color: BRAND.sub, mt: 0.5 }}>
                     Value per count: <Box component="span" sx={{ color: BRAND.text, fontWeight: 700 }}>{formatNumber(walletSop.valuePerCount || 0)}</Box>
                   </Typography>
                 </Box>
                 <Chip label={`Achievement: ${walletAchievementPercent}%`} variant="outlined" />
               </Stack>
             </Box>
             <TableContainer sx={{ borderTop: `1px solid ${BRAND.border}`, overflowX: "auto" }}>
               <Table sx={{ minWidth: 900 }}>
                 <TableHead>
                   <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                     {["Date", "Order ID", "Customer", "Phone Number", "Shipment Status"].map((header) => (
                       <TableCell key={header} sx={{ fontWeight: 700 }}>{header}</TableCell>
                     ))}
                   </TableRow>
                 </TableHead>
                 <TableBody>
	                   {loadingDetails ? (
	                     <TableRow>
	                       <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
	                         <CircularProgress size={24} />
	                       </TableCell>
	                     </TableRow>
	                   ) : walletRows.length ? (
	                     walletRows.map((row, index) => (
                       <TableRow key={`${row.orderId || "wallet"}-${index}`} hover>
                         <TableCell>{formatDate(row.date)}</TableCell>
                         <TableCell sx={{ fontWeight: 600 }}>{row.orderId || "-"}</TableCell>
                         <TableCell>{row.customerName || "-"}</TableCell>
                         <TableCell>{row.contactNumber || "-"}</TableCell>
                         <TableCell><Chip size="small" label={row.shipmentStatus || "Unknown"} color={row.isDelivered ? "success" : "default"} variant={row.isDelivered ? "filled" : "outlined"} /></TableCell>
                       </TableRow>
                     ))
                   ) : (
                     <TableRow>
                       <TableCell colSpan={5} align="center" sx={{ py: 4 }}>No wallet records found</TableCell>
                     </TableRow>
                   )}
                 </TableBody>
               </Table>
             </TableContainer>
           </DialogContent>
           <DialogActions sx={{ p: 2 }}>
	             <Button onClick={() => setWalletOpen(false)} variant="outlined" sx={OUTLINED_BUTTON_SX}>Close</Button>
           </DialogActions>
         </Dialog>


         <Dialog open={rulesOpen} onClose={() => setRulesOpen(false)} fullWidth maxWidth="sm">
           <DialogTitle sx={{ fontWeight: 800, color: BRAND.text }}>Wallet Rules</DialogTitle>
           <DialogContent dividers>
             <Stack spacing={1.25}>
               <Typography variant="body2" sx={{ color: BRAND.sub }}>
                 Below 60% target coins lapse: <Box component="span" sx={{ color: BRAND.text, fontWeight: 700 }}>{walletRules.below60PercentTargetCoinsLapse ? "Yes" : "No"}</Box>
               </Typography>
               <Typography variant="body2" sx={{ color: BRAND.sub }}>
                 Redeemable only on Diwali: <Box component="span" sx={{ color: BRAND.text, fontWeight: 700 }}>{walletRules.redeemableOnlyOnDiwali ? "Yes" : "No"}</Box>
               </Typography>
               <Typography variant="body2" sx={{ color: BRAND.sub }}>
                 Redeemable months: <Box component="span" sx={{ color: BRAND.text, fontWeight: 700 }}>{Array.isArray(walletRules.redeemableOnlyTwiceAYear) ? walletRules.redeemableOnlyTwiceAYear.join(", ") : "-"}</Box>
               </Typography>
             </Stack>
           </DialogContent>
           <DialogActions sx={{ p: 2 }}>
	             <Button onClick={() => setRulesOpen(false)} variant="outlined" sx={OUTLINED_BUTTON_SX}>Close</Button>
           </DialogActions>
         </Dialog>
       </>
     ) : null}
   </Stack>
 );
}
