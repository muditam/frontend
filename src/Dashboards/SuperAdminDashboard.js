import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { getCachedData } from "../utils/apiCache";


const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");

const ANALYTICS = `${API_BASE}/api/super-admin/analytics`;
const DASHBOARD_CACHE_TTL_MS = 60 * 1000;
const FULFILLMENT_CACHE_TTL_MS = 2 * 60 * 1000;


/* ── utils ── */
const fmtR = (n) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const num  = (n) => (n || 0).toLocaleString("en-IN");
const pct  = (a, b) => (b > 0 ? ((a / b) * 100).toFixed(1) + "%" : "0%");
const fmtPctValue = (value) => `${Math.abs(Number(value || 0)).toFixed(1)}%`;
const timingBucketDiagnostics = new Set();
const DEFAULT_TIMING_BUCKET_DEFS = [
 { key: "sameDay", label: "Same Day", aliases: ["sameDay"], legacyLabels: ["same day", "0-24h", "0-24 h", "0-1d", "0-1 d", "0-6h", "0-6 h"] },
 { key: "nextDay", label: "Next Day", aliases: ["nextDay"], legacyLabels: ["next day", "24-48h", "24-48 h", "1-2d", "1-2 d", "6-24h", "6-24 h"] },
 { key: "thirdDay", label: "3rd Day", aliases: ["thirdDay"], legacyLabels: ["3rd day", "third day", "48-72h", "48-72 h", "2-3d", "2-3 d"] },
 { key: "fourthDay", label: "4th Day", aliases: ["fourthDay"], legacyLabels: ["4th day", "fourth day", "72-96h", "72-96 h", "3-4d", "3-4 d"] },
 { key: "fifthDayPlus", label: "5th Day+", aliases: ["fifthDayPlus", "fifthDay", "seventhDay", "ninthDayPlus"], legacyLabels: ["5th day+", "5th day", "fifth day+", "fifth day", "96h+", "96 h+", "4d+", "4 d+", "5+d", "5d+", "7th day", "7th day+", "7d+", "9th day+", "9d+", "2d+", "3-5d", "6-7d", "7d+"] },
];
const FULFILLMENT_TO_DELIVERY_BUCKET_DEFS = [
 { key: "sameDay", label: "Same Day", aliases: ["sameDay"], legacyLabels: ["same day"] },
 { key: "nextDay", label: "Next Day", aliases: ["nextDay"], legacyLabels: ["next day"] },
 { key: "thirdDay", label: "3rd Day", aliases: ["thirdDay"], legacyLabels: ["3rd day", "third day"] },
 { key: "fourthDay", label: "4th Day", aliases: ["fourthDay"], legacyLabels: ["4th day", "fourth day"] },
 { key: "fifthDay", label: "5th Day", aliases: ["fifthDay"], legacyLabels: ["5th day", "fifth day"] },
 { key: "sixthDay", label: "6th Day", aliases: ["sixthDay"], legacyLabels: ["6th day", "sixth day"] },
 { key: "seventhDay", label: "7th Day", aliases: ["seventhDay"], legacyLabels: ["7th day", "seventh day"] },
 { key: "eighthDay", label: "8th Day", aliases: ["eighthDay"], legacyLabels: ["8th day", "eighth day"] },
 { key: "ninthDay", label: "9th Day", aliases: ["ninthDay"], legacyLabels: ["9th day", "ninth day"] },
 { key: "tenthDayPlus", label: "10th Day+", aliases: ["tenthDayPlus"], legacyLabels: ["10th day+", "tenth day+"] },
];
const fmtDuration = (hours) => {
 const value = Number(hours || 0);
 if (!value) return "0h";
 if (value >= 24) {
   const days = Math.floor(value / 24);
   const remHours = Math.round(value % 24);
   return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
 }
 if (value >= 1) return `${value.toFixed(1).replace(/\.0$/, "")}h`;
 const minutes = Math.round(value * 60);
 return `${minutes}m`;
};
const fmtDayLabel = (dateStr) => {
 const date = new Date(`${dateStr}T00:00:00.000Z`);
 return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
const getDirectionMeta = (direction) => {
 if (direction === "improving") {
   return {
     label: "Improving",
     arrow: "↓",
     tone: "#15803d",
     bg: "#f0fdf4",
     border: "#bbf7d0",
     subcopy: "faster than previous window",
   };
 }
 if (direction === "declining") {
   return {
     label: "Declining",
     arrow: "↑",
     tone: "#dc2626",
     bg: "#fef2f2",
     border: "#fecaca",
     subcopy: "slower than previous window",
   };
 }
 return {
   label: "Flat",
   arrow: "→",
   tone: "#475569",
   bg: "#f8fafc",
   border: "#cbd5e1",
   subcopy: "holding steady",
 };
};


function normalizeTimingMetric(metric, fallbackHours, bucketDefs = DEFAULT_TIMING_BUCKET_DEFS) {
 const sourceBuckets = Array.isArray(metric?.buckets) ? metric.buckets : [];
 const totalEligible = Number(metric?.eligibleCount ?? 0);


 const normalizeBucketLabel = (value) => String(value || "")
   .toLowerCase()
   .replace(/\s+/g, " ")
   .replace(/_/g, " ")
   .trim();


 const buckets = bucketDefs.map((bucketDef) => {
   const count = sourceBuckets.reduce((sum, bucket) => (
     bucketDef.aliases.includes(bucket?.key) || bucketDef.legacyLabels.includes(normalizeBucketLabel(bucket?.label))
       ? sum + Number(bucket?.count || 0)
       : sum
   ), 0);


   return {
     key: bucketDef.key,
     label: bucketDef.label,
     count,
     percent: totalEligible > 0 ? Number(((count / totalEligible) * 100).toFixed(1)) : 0,
   };
 });


 if (
   process.env.NODE_ENV !== "production" &&
   totalEligible > 0 &&
   buckets.every((bucket) => Number(bucket.count || 0) === 0)
 ) {
   const diagnosticKey = JSON.stringify(sourceBuckets.map((bucket) => ({
     key: bucket?.key || "",
     label: bucket?.label || "",
   })));


   if (!timingBucketDiagnostics.has(diagnosticKey)) {
     timingBucketDiagnostics.add(diagnosticKey);
     console.warn("Unmapped timing buckets received for super admin dashboard:", sourceBuckets);
   }
 }


 return {
   currentAverageHours: Number(metric?.currentAverageHours ?? fallbackHours ?? 0),
   previousAverageHours: Number(metric?.previousAverageHours ?? 0),
   absoluteChangeHours: Number(metric?.absoluteChangeHours ?? 0),
   percentChange: Number(metric?.percentChange ?? 0),
   direction: metric?.direction || "flat",
   eligibleCount: totalEligible,
   trend: Array.isArray(metric?.trend) ? metric.trend : [],
   buckets,
 };
}


function fmtDate(d) {
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function getRange(preset) {
 const today = new Date(), t = fmtDate(today);
 switch (preset) {
   case "Today": return { start: t, end: t };
   case "Yesterday": { const d = new Date(); d.setDate(d.getDate()-1); const s = fmtDate(d); return { start:s, end:s }; }
   case "Last 7 Days": { const d = new Date(); d.setDate(d.getDate()-6); return { start:fmtDate(d), end:t }; }
   case "Last 30 Days": { const d = new Date(); d.setDate(d.getDate()-29); return { start:fmtDate(d), end:t }; }
   case "Last Week": {
     const d = new Date(), dow = d.getDay();
     const sat = new Date(d); sat.setDate(d.getDate()-dow-1);
     const sun = new Date(sat); sun.setDate(sat.getDate()-6);
     return { start:fmtDate(sun), end:fmtDate(sat) };
   }
   case "Last Month": {
     const d = new Date();
     const yr = d.getMonth()===0 ? d.getFullYear()-1 : d.getFullYear();
     const mo = d.getMonth()===0 ? 11 : d.getMonth()-1;
     return { start:fmtDate(new Date(yr,mo,1)), end:fmtDate(new Date(yr,mo+1,0)) };
   }
   default: return { start:t, end:t };
 }
}


async function fetchSection(start, end) {
 return getCachedData(`super-admin:section:${start}:${end}`, async () => {
   const cfg = { params:{ start, end }, withCredentials:true };
   const [sumR, funR, canR, splR, fvrR, escR, cusR, aovR, compR] = await Promise.allSettled([
     axios.get(`${ANALYTICS}/dashboard-summary`, cfg),
     axios.get(`${ANALYTICS}/orders-vs-fulfilled`, cfg),
     axios.get(`${ANALYTICS}/cancelled-orders`, cfg),
     axios.get(`${ANALYTICS}/orders`, cfg),
     axios.get(`${ANALYTICS}/first-vs-returning`, cfg),
     axios.get(`${ANALYTICS}/escalations`, cfg),
     axios.get(`${ANALYTICS}/customer-stats`, cfg),
     axios.get(`${ANALYTICS}/aov`, cfg),
     axios.get(`${ANALYTICS}/comprehensive-summary`, cfg),
   ]);
   const ok = (r) => r.status === "fulfilled" ? r.value.data : {};
   const sum = ok(sumR), fun = ok(funR), spl = ok(splR);
   const fvr = ok(fvrR), esc = ok(escR), aov = ok(aovR);
   const comp = ok(compR);
   const can = canR.status==="fulfilled" ? (canR.value.data.cancelled||0) : 0;
   const trends = cusR.status==="fulfilled" ? cusR.value.data : [];
   const cus = Array.isArray(trends) && trends.length ? trends[trends.length-1] : {};
   const tO  = fun.totalOrders || sum.totalOrders || 0;
   const tR  = sum.totalSales  || 0;
   const teamRev   = (aov.team?.aov||0)*(aov.team?.orders||0);
   const onlineRev = (aov.online?.aov||0)*(aov.online?.orders||0);
   const emptyCompSegment = {
     totalOrders: 0,
     totalAmount: 0,
     aov: 0,
     prepaid: { count: 0, amount: 0 },
     cod: { count: 0, amount: 0 },
     delivered: { count: 0 },
     undelivered: { count: 0 },
     rto: { count: 0 },
   };
   const mapCompSegment = (segment = emptyCompSegment) => ({
     totalOrders: Number(segment?.totalOrders || 0),
     totalAmount: Number(segment?.totalAmount || 0),
     aov: Number(segment?.aov || 0),
     prepaidCount: Number(segment?.prepaid?.count || 0),
     prepaidAmount: Number(segment?.prepaid?.amount || 0),
     codCount: Number(segment?.cod?.count || 0),
     codAmount: Number(segment?.cod?.amount || 0),
     delivered: Number(segment?.delivered?.count || 0),
     undelivered: Number(segment?.undelivered?.count || 0),
     rto: Number(segment?.rto?.count || 0),
   });


   return {
     totalOrders:       tO,
     totalRevenue:      tR || (teamRev+onlineRev),
     fulfilled:         fun.fulfilled?.count   || 0,
     delivered:         fun.delivered?.count   || 0,
     rto:               fun.rto?.count         || 0,
     cancelled:         can,
     notDispatched:     fun.notDispatched?.count || 0,
     inTransit:         fun.inTransit?.count   || 0,
     aov:               aov.combined?.aov      || sum.aov || 0,
     teamOrders:        spl.teamOrders         || 0,
     onlineOrders:      spl.onlineOrders       || 0,
     teamRevenue:       teamRev,
     onlineRevenue:     onlineRev,
     teamAov:           aov.team?.aov          || 0,
     onlineAov:         aov.online?.aov        || 0,
     activeCustomers:   cus.active             || 0,
     lostCustomers:     cus.lost               || 0,
     unassignedCustomers: cus.unassigned       || 0,
     firstTime:         fvr.firstTime          || 0,
     returning:         fvr.returning          || 0,
     openEscalations:   esc.open               || 0,
     closedEscalations: esc.closed             || 0,
     prepaidCount:      sum.prepaid?.count     || 0,
     prepaidAmount:     sum.prepaid?.amount    || 0,
     codCount:          sum.cod?.count         || 0,
     codAmount:         sum.cod?.amount        || 0,
     comprehensive: {
       total: mapCompSegment(comp?.total || emptyCompSegment),
       team: mapCompSegment(comp?.team || emptyCompSegment),
       shopify: mapCompSegment(comp?.shopify || emptyCompSegment),
     },
   };
 }, DASHBOARD_CACHE_TTL_MS);
}


async function fetchFulfillmentOverview() {
 return getCachedData("super-admin:fulfillment-overview", async () => {
   const { data } = await axios.get(`${ANALYTICS}/dashboard-fulfillment-overview`, {
     withCredentials: true,
   });
   return data || {};
 }, FULFILLMENT_CACHE_TTL_MS);
}


async function fetchUnfulfilledOrdersByBucket(bucketKey) {
 return getCachedData(`super-admin:fulfillment-orders:${bucketKey}`, async () => {
   const { data } = await axios.get(`${ANALYTICS}/dashboard-fulfillment-orders`, {
     params: { bucketKey },
     withCredentials: true,
   });
   return data || {};
 }, FULFILLMENT_CACHE_TTL_MS);
}


/* ── Skeleton ── */
function Sk({ w=60, h=20 }) {
 return <div style={{ width:w, height:h, borderRadius:4, background:"linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize:"200% 100%", animation:"shimmer 1.4s infinite", flexShrink:0 }} />;
}


/* ── Spinner ── */
function Spin() {
 return <div style={{ width:32, height:32, border:"3px solid #e2e8f0", borderTop:"3px solid #2563eb", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"auto" }} />;
}


/* ── SVG Donut ── */
function Donut({ segments, size=110, thick=20, label, sub }) {
 const r = size/2 - thick/2, circ = 2*Math.PI*r;
 let off = 0;
 const total = segments.reduce((s,x)=>s+(x.value||0), 0);
 return (
   <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display:"block", flexShrink:0 }}>
     <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={thick} />
     {total>0 && segments.map((seg,i) => {
       const dash = seg.value/total*circ, gap = circ-dash;
       const el = <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={seg.color} strokeWidth={thick} strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-off} strokeLinecap="round" style={{ transform:"rotate(-90deg)", transformOrigin:"50% 50%" }} />;
       off += dash+1.5; return el;
     })}
     {label && <>
       <text x={size/2} y={size/2-4} textAnchor="middle" dominantBaseline="middle" style={{ fontFamily:"'Noto Sans',sans-serif", fontSize:"18px", fontWeight:"800", fill:"#0f172a" }}>{label}</text>
       {sub && <text x={size/2} y={size/2+14} textAnchor="middle" dominantBaseline="middle" style={{ fontFamily:"'Noto Sans',sans-serif", fontSize:"9px", fontWeight:"500", fill:"#94a3b8", letterSpacing:"0.5px" }}>{sub.toUpperCase()}</text>}
     </>}
   </svg>
 );
}


/* ── Trapezoid Funnel ── */
function Funnel({ data }) {
 const stages = [
   { label:"Total Orders", value:data.totalOrders||0, color:"#2563eb", p:100 },
   { label:"Fulfilled",    value:data.fulfilled||0,   color:"#0d9488", p:data.totalOrders>0?data.fulfilled/data.totalOrders*100:0 },
   { label:"Delivered",    value:data.delivered||0,   color:"#16a34a", p:data.totalOrders>0?data.delivered/data.totalOrders*100:0 },
   { label:"RTO",          value:data.rto||0,         color:"#dc2626", p:data.totalOrders>0?data.rto/data.totalOrders*100:0 },
 ];
 const W = [92,76,62,48];
 return (
   <div style={{ display:"flex", flexDirection:"column", gap:3, alignItems:"center", width:"100%" }}>
     {stages.map((s,i) => (
       <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", width:"100%" }}>
         <div style={{
           width:`${W[i]}%`, background:s.color,
           padding:"12px 16px", display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", gap:2,
           borderRadius: i===0?"8px 8px 0 0":i===stages.length-1?"0 0 8px 8px":"0",
           clipPath: i<stages.length-1
             ? `polygon(0 0,100% 0,${100-(W[i]-W[i+1])/W[i]*50}% 100%,${(W[i]-W[i+1])/W[i]*50}% 100%)`
             : "none",
           minHeight:50
         }}>
           <span style={{ color:"rgba(255,255,255,0.9)", fontWeight:600, fontSize:12 }}>{s.label}</span>
           <span style={{ color:"#fff", fontWeight:800, fontSize:22, lineHeight:1 }}>{num(s.value)}</span>
         </div>
         {i<stages.length-1 && (
           <div style={{ fontSize:10, color:"#94a3b8", padding:"3px 0", fontWeight:500 }}>
             ↓ {stages[i+1].p.toFixed(1)}% conversion
           </div>
         )}
       </div>
     ))}
   </div>
 );
}


/* ── Status pill ── */
function StatusCard({ label, value, sub, color, bg, border }) {
 return (
   <div style={{ background:bg, border:`1.5px solid ${border}`, borderRadius:10, padding:"14px 16px", display:"flex", flexDirection:"column", gap:4 }}>
     <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.8px", textTransform:"uppercase", color }}>{label}</div>
     <div style={{ fontSize:28, fontWeight:800, color, lineHeight:1 }}>{num(value)}</div>
     <div style={{ fontSize:11, color:"#94a3b8" }}>{sub}</div>
   </div>
 );
}


/* ── KPI card ── */
function KPI({ label, value, sub, color="#0f172a", bg="#fff", loading }) {
 return (
   <div style={{ background:bg, border:"1px solid #e6ebf2", borderRadius:10, padding:"14px 16px", boxShadow:"0 1px 3px rgba(15,23,42,0.06)", display:"flex", flexDirection:"column", gap:3 }}>
     <div style={{ fontSize:11, fontWeight:500, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.5px" }}>{label}</div>
     {loading ? <Sk w={100} h={28} /> : <div style={{ fontSize:26, fontWeight:800, color, lineHeight:1.1 }}>{value}</div>}
     {sub && !loading && <div style={{ fontSize:11, color:"#94a3b8" }}>{sub}</div>}
   </div>
 );
}


function TrendSparkline({ points, color, loading }) {
 if (loading) {
   return (
     <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:180 }}>
       <Spin />
     </div>
   );
 }


 const safePoints = Array.isArray(points) ? points : [];
 const values = safePoints.map((point) => Number(point.currentHours || 0));
 const max = Math.max(...values, 0);
 const min = Math.min(...values, 0);
 const width = 520;
 const height = 180;
 const padding = { top: 16, right: 14, bottom: 34, left: 46 };
 const drawWidth = width - padding.left - padding.right;
 const drawHeight = height - padding.top - padding.bottom;
 const range = max - min || 1;


 const chartPoints = safePoints.map((point, index) => {
   const x = padding.left + (safePoints.length <= 1 ? drawWidth / 2 : (index / (safePoints.length - 1)) * drawWidth);
   const y = padding.top + drawHeight - ((Number(point.currentHours || 0) - min) / range) * drawHeight;
   return { x, y, value: Number(point.currentHours || 0), date: point.date };
 });
 const line = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");


 const area = line ? `${padding.left},${padding.top + drawHeight} ${line} ${padding.left + drawWidth},${padding.top + drawHeight}` : "";
 const firstLabel = safePoints[0]?.date ? fmtDayLabel(safePoints[0].date) : "";
 const midLabel = safePoints[Math.floor(safePoints.length / 2)]?.date ? fmtDayLabel(safePoints[Math.floor(safePoints.length / 2)].date) : "";
 const lastLabel = safePoints[safePoints.length - 1]?.date ? fmtDayLabel(safePoints[safePoints.length - 1].date) : "";
 const yTicks = [max, min + range * 0.5, min];
 const xTickPositions = [
   padding.left,
   padding.left + drawWidth * 0.5,
   padding.left + drawWidth,
 ];


 return (
   <div>
     <svg viewBox={`0 0 ${width} ${height}`} style={{ width:"100%", height:180, display:"block" }}>
       <defs>
         <linearGradient id={`timing-gradient-${color.replace("#","")}`} x1="0%" y1="0%" x2="0%" y2="100%">
           <stop offset="0%" stopColor={color} stopOpacity="0.28" />
           <stop offset="100%" stopColor={color} stopOpacity="0.02" />
         </linearGradient>
       </defs>
       {[0, 0.5, 1].map((ratio) => {
         const y = padding.top + drawHeight * ratio;
         return <line key={ratio} x1={padding.left} y1={y} x2={padding.left + drawWidth} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />;
       })}
       <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + drawHeight} stroke="#cbd5e1" strokeWidth="1.2" />
       <line x1={padding.left} y1={padding.top + drawHeight} x2={padding.left + drawWidth} y2={padding.top + drawHeight} stroke="#cbd5e1" strokeWidth="1.2" />
       {area && <polygon points={area} fill={`url(#timing-gradient-${color.replace("#","")})`} />}
       {line && <polyline points={line} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
       {chartPoints.map((point, index) => (
         <g key={`${point.date || "point"}-${index}`}>
           <circle cx={point.x} cy={point.y} r={index === chartPoints.length - 1 ? 4.5 : 3.5} fill={color} stroke="#fff" strokeWidth="2">
             <title>{`${fmtDayLabel(point.date)}: ${fmtDuration(point.value)}`}</title>
           </circle>
         </g>
       ))}
       {yTicks.map((tick, idx) => {
         const y = padding.top + drawHeight * (idx / (yTicks.length - 1));
         return (
           <text key={`yt-${idx}`} x={padding.left - 8} y={y + 3} textAnchor="end" style={{ fontSize: 10, fill: "#94a3b8", fontFamily: "'Noto Sans',sans-serif" }}>
             {fmtDuration(tick)}
           </text>
         );
       })}
       {[firstLabel, midLabel, lastLabel].map((label, idx) => (
         <text key={`xt-${idx}`} x={xTickPositions[idx]} y={height - 8} textAnchor={idx === 0 ? "start" : idx === 2 ? "end" : "middle"} style={{ fontSize: 10, fill: "#94a3b8", fontFamily: "'Noto Sans',sans-serif" }}>
           {label}
         </text>
       ))}
     </svg>
   </div>
 );
}


function TimingKpiCard({ label, metric, accent, note, loading }) {
 const direction = getDirectionMeta(metric.direction);
 const isImproving = metric.direction === "improving";
 const changeLabel = `${direction.arrow} ${fmtPctValue(metric.percentChange)}`;
 const absoluteCopy = metric.previousAverageHours > 0
   ? `${fmtDuration(Math.abs(metric.absoluteChangeHours))} ${isImproving ? "faster" : metric.direction === "declining" ? "slower" : "change"}`
   : "No previous window baseline";


 return (
   <div style={{ background:accent.bg, border:`1px solid ${accent.border}`, borderRadius:12, padding:"16px 18px", boxShadow:"0 1px 3px rgba(15,23,42,0.06)", display:"flex", flexDirection:"column", gap:10 }}>
     <div style={{ display:"flex", alignItems:"start", justifyContent:"space-between", gap:10 }}>
       <div>
         <div style={{ fontSize:11, fontWeight:700, color:accent.label, letterSpacing:"0.6px", textTransform:"uppercase" }}>{label}</div>
         {loading ? <Sk w={110} h={30} /> : <div style={{ fontSize:30, fontWeight:800, color:accent.value, lineHeight:1.05, marginTop:6 }}>{fmtDuration(metric.currentAverageHours)}</div>}
       </div>
       {!loading && (
         <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"5px 10px", borderRadius:999, background:direction.bg, border:`1px solid ${direction.border}`, color:direction.tone, fontSize:11, fontWeight:700 }}>
           <span>{changeLabel}</span>
           <span>{direction.label}</span>
         </div>
       )}
     </div>
     {!loading && (
       <>
         <div style={{ fontSize:12, color:"#334155", fontWeight:600 }}>
           Previous 30 days: <span style={{ color:"#0f172a" }}>{fmtDuration(metric.previousAverageHours)}</span>
         </div>
         <div style={{ fontSize:11, color:"#64748b" }}>{absoluteCopy} and {direction.subcopy}</div>
         <div style={{ fontSize:11, color:"#64748b" }}>{note} · {num(metric.eligibleCount)} eligible completed orders</div>
       </>
     )}
   </div>
 );
}


function TimingTrendCard({ title, metric, color, loading }) {
 return (
   <div style={{ background:"#fff", border:"1px solid #e6ebf2", borderRadius:12, padding:18, boxShadow:"0 1px 3px rgba(15,23,42,0.06)" }}>
     <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12, gap:10 }}>
       <div style={{ fontWeight:700, fontSize:13, color:"#0f172a" }}>{title}</div>
       {!loading && <div style={{ fontSize:11, color:"#64748b" }}>Last 30 days daily average</div>}
     </div>
     <TrendSparkline points={metric.trend} color={color} loading={loading} />
   </div>
 );
}


function TimingBucketCard({ title, metric, accent, loading }) {
 const totalPercent = (metric.buckets || []).reduce((sum, bucket) => sum + Number(bucket.percent || 0), 0);
 const placeholderCount = Math.max((metric.buckets || []).length || 0, 5);


 return (
   <div style={{ background:"#fff", border:"1px solid #e6ebf2", borderRadius:12, padding:18, boxShadow:"0 1px 3px rgba(15,23,42,0.06)", display:"flex", flexDirection:"column", gap:12 }}>
     <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
       <div style={{ fontWeight:700, fontSize:13, color:"#0f172a" }}>{title}</div>
       {!loading && <div style={{ fontSize:11, color:"#64748b" }}>{num(metric.eligibleCount)} eligible orders</div>}
     </div>
     <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(120px, 1fr))", gap:10 }}>
       {(loading ? Array.from({ length: placeholderCount }, (_, i) => ({ key: i })) : metric.buckets).map((bucket, index) => (
         <div key={bucket.key || index} style={{ background:accent.bg, border:`1px solid ${accent.border}`, borderRadius:10, padding:"12px 12px 10px", display:"flex", flexDirection:"column", gap:7 }}>
           <div style={{ fontSize:10, fontWeight:700, color:accent.label, letterSpacing:"0.5px", textTransform:"uppercase" }}>{bucket.label || ""}</div>
           {loading ? <Sk w={42} h={24} /> : <div style={{ fontSize:22, fontWeight:800, color:accent.value, lineHeight:1 }}>{num(bucket.count || 0)}</div>}
           {!loading && (
             <>
               <div style={{ height:6, background:"#e2e8f0", borderRadius:999, overflow:"hidden" }}>
                 <div style={{ width:`${Math.min(Number(bucket.percent || 0), 100)}%`, height:"100%", background:accent.value, borderRadius:999 }} />
               </div>
               <div style={{ fontSize:10, color:"#64748b" }}>{Number(bucket.percent || 0).toFixed(1)}% of current completed orders</div>
             </>
           )}
         </div>
       ))}
     </div>
     {!loading && totalPercent > 0 && <div style={{ fontSize:10, color:"#94a3b8" }}>Bucket shares are based on the current 30-day completed-order window.</div>}
   </div>
 );
}


function TooltipMetricCard({ label, count, amount, tone, loading, onOpenDetails }) {
 return (
   <div
     title={loading ? "" : `Total amount: ${fmtR(amount)}`}
     style={{
       background: tone.bg,
       border: `1px solid ${tone.border}`,
       borderRadius: 12,
       padding: "16px 18px",
       boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
       display: "flex",
       flexDirection: "column",
       gap: 6,
       minHeight: 100,
       position: "relative",
     }}
   >
     <button
       type="button"
       aria-label={`Open ${label} details`}
       onClick={onOpenDetails}
       disabled={loading || !onOpenDetails}
       style={{
         position: "absolute",
         top: 10,
         right: 10,
         width: 24,
         height: 24,
         borderRadius: 6,
         border: "1px solid #dbe3ee",
         background: "#ffffff",
         color: "#475569",
         display: "flex",
         alignItems: "center",
         justifyContent: "center",
         cursor: loading ? "not-allowed" : "pointer",
         opacity: loading ? 0.6 : 1,
       }}
     >
       <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
         <path d="M14 3h7v7" />
         <path d="M10 14 21 3" />
         <path d="M21 14v7h-7" />
         <path d="M3 10V3h7" />
         <path d="M3 21h7v-7" />
       </svg>
     </button>
     <div style={{ fontSize: 11, fontWeight: 700, color: tone.label, letterSpacing: "0.6px", textTransform: "uppercase" }}>{label}</div>
     {loading ? <Sk w={56} h={30} /> : <div style={{ fontSize: 28, fontWeight: 800, color: tone.value, lineHeight: 1 }}>{num(count)}</div>}
     <div style={{ fontSize: 11, color: "#64748b" }}>{loading ? "" : `Total amount: ${fmtR(amount)}`}</div>
   </div>
 );
}


function FulfillmentOverviewSection({ overview, loading }) {
 const buckets = overview?.unfulfilledBuckets || [];
 const [detailsOpen, setDetailsOpen] = useState(false);
 const [detailsLoading, setDetailsLoading] = useState(false);
 const [detailsTitle, setDetailsTitle] = useState("");
 const [detailsRows, setDetailsRows] = useState([]);
 const [detailsTotal, setDetailsTotal] = useState(0);
 const dispatchTiming = normalizeTimingMetric(overview?.dispatchTiming, overview?.avgOrderToDispatchHours);
 const deliveryTiming = normalizeTimingMetric(overview?.deliveryTiming, overview?.avgOrderToDeliveryHours);
 const fulfillmentToDeliveryTiming = normalizeTimingMetric(
   overview?.fulfillmentToDeliveryTiming,
   overview?.avgFulfillmentToDeliveryHours,
   FULFILLMENT_TO_DELIVERY_BUCKET_DEFS
 );
 const tones = [
   { bg: "#fff7ed", border: "#fed7aa", label: "#c2410c", value: "#9a3412" },
   { bg: "#f5f3ff", border: "#ddd6fe", label: "#6d28d9", value: "#5b21b6" },
   { bg: "#eff6ff", border: "#bfdbfe", label: "#1d4ed8", value: "#1e40af" },
   { bg: "#ecfeff", border: "#a5f3fc", label: "#0f766e", value: "#115e59" },
   { bg: "#fef2f2", border: "#fecaca", label: "#dc2626", value: "#b91c1c" },
 ];
 const dispatchAccent = { bg:"#f5f3ff", border:"#ddd6fe", label:"#6d28d9", value:"#5b21b6" };
 const deliveryAccent = { bg:"#f0fdf4", border:"#bbf7d0", label:"#15803d", value:"#166534" };
 const fulfillmentToDeliveryAccent = { bg:"#ecfeff", border:"#a5f3fc", label:"#0f766e", value:"#115e59" };
 const handleOpenDetails = async (bucket) => {
   if (!bucket?.key) return;
   setDetailsOpen(true);
   setDetailsLoading(true);
   setDetailsRows([]);
   setDetailsTotal(0);
   setDetailsTitle(bucket.label || "Unfulfilled Orders");
   try {
     const payload = await fetchUnfulfilledOrdersByBucket(bucket.key);
     setDetailsRows(Array.isArray(payload?.orders) ? payload.orders : []);
     setDetailsTotal(Number(payload?.total || 0));
     if (payload?.bucket?.label) {
       setDetailsTitle(payload.bucket.label);
     }
   } catch (err) {
     console.error("Unfulfilled details fetch error:", err);
     setDetailsRows([]);
     setDetailsTotal(0);
   } finally {
     setDetailsLoading(false);
   }
 };


 return (
   <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
     <div style={{ background:"#fff", border:"1px solid #e6ebf2", borderRadius:12, padding:18, boxShadow:"0 1px 3px rgba(15,23,42,0.06)" }}>
       <SectionHeader title="Unfulfilled Orders" subtitle="Fixed rolling windows independent of the dashboard date filter" />
       <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:12 }}>
         {(loading ? Array.from({ length: 5 }, (_, i) => ({ key: i })) : buckets).map((bucket, index) => (
           <TooltipMetricCard
             key={bucket.key || index}
             label={bucket.label || ""}
             count={bucket.count || 0}
             amount={bucket.amount || 0}
             tone={tones[index % tones.length]}
             loading={loading}
             onOpenDetails={!loading ? () => handleOpenDetails(bucket) : undefined}
           />
         ))}
       </div>
     </div>


     {detailsOpen && (
       <div
         style={{
           position: "fixed",
           inset: 0,
           background: "rgba(15, 23, 42, 0.35)",
           zIndex: 1000,
           display: "flex",
           alignItems: "center",
           justifyContent: "center",
           padding: 16,
         }}
         onClick={() => setDetailsOpen(false)}
       >
         <div
           style={{
             width: "min(860px, 96vw)",
             maxHeight: "82vh",
             background: "#fff",
             borderRadius: 12,
             border: "1px solid #e2e8f0",
             boxShadow: "0 16px 40px rgba(15,23,42,0.2)",
             display: "flex",
             flexDirection: "column",
             overflow: "hidden",
           }}
           onClick={(e) => e.stopPropagation()}
         >
           <div style={{ padding: "14px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
             <div>
               <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{detailsTitle} - Unfulfilled Order Details</div>
               <div style={{ fontSize: 12, color: "#64748b" }}>Total: {num(detailsTotal)}</div>
             </div>
             <button
               type="button"
               onClick={() => setDetailsOpen(false)}
               style={{ border: "1px solid #dbe3ee", background: "#fff", color: "#334155", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}
             >
               Close
             </button>
           </div>
           <div style={{ overflow: "auto", padding: 12 }}>
             {detailsLoading ? (
               <div style={{ padding: 10 }}><Sk w={260} h={20} /></div>
             ) : (
               <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                 <thead>
                   <tr>
                     <th style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontWeight: 600 }}>Order Number</th>
                     <th style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontWeight: 600 }}>Fulfillment Status</th>
                   </tr>
                 </thead>
                 <tbody>
                   {detailsRows.length === 0 ? (
                     <tr>
                       <td colSpan={2} style={{ padding: "14px 8px", color: "#94a3b8" }}>No records found.</td>
                     </tr>
                   ) : detailsRows.map((row, idx) => (
                     <tr key={`${row.orderNumber}-${idx}`}>
                       <td style={{ padding: "9px 8px", borderBottom: "1px solid #f1f5f9", color: "#0f172a" }}>{row.orderNumber}</td>
                       <td style={{ padding: "9px 8px", borderBottom: "1px solid #f1f5f9", color: "#334155" }}>{row.fulfillmentStatus}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             )}
           </div>
         </div>
       </div>
     )}


     <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))", gap:14 }}>
       <TimingKpiCard
         label="Avg Order to Delivery Time"
         metric={deliveryTiming}
         accent={deliveryAccent}
         note="Shopify order created to delivered status update"
         loading={loading}
       />
       <TimingKpiCard
         label="Avg Order to Dispatch Time"
         metric={dispatchTiming}
         accent={dispatchAccent}
         note="Shopify order created to shipment record creation"
         loading={loading}
       />
     </div>


     <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
       <TimingBucketCard title="Order to Delivery Age Buckets" metric={deliveryTiming} accent={deliveryAccent} loading={loading} />
       <TimingBucketCard title="Dispatch Age Buckets" metric={dispatchTiming} accent={dispatchAccent} loading={loading} />
     </div>


     <TimingBucketCard
       title="Fulfillment to Delivery Age Buckets"
       metric={fulfillmentToDeliveryTiming}
       accent={fulfillmentToDeliveryAccent}
       loading={loading}
     />
   </div>
 );
}


/* ── Comprehensive table ── */
function OrderTable({ data, loading }) {
 const comp = data?.comprehensive || {};
 const total = comp.total || {};
 const team = comp.team || {};
 const shopify = comp.shopify || {};


 const rows = [
   { label:"Total Orders", dot:"#2563eb", total:total.totalOrders || 0, rev:total.totalAmount || 0, prepC:total.prepaidCount || 0, prepA:total.prepaidAmount || 0, codC:total.codCount || 0, codA:total.codAmount || 0, del:total.delivered || 0, undel:total.undelivered || 0, rto:total.rto || 0, aov:total.aov || 0 },
   { label:"Team Orders", dot:"#ea580c", total:team.totalOrders || 0, rev:team.totalAmount || 0, prepC:team.prepaidCount || 0, prepA:team.prepaidAmount || 0, codC:team.codCount || 0, codA:team.codAmount || 0, del:team.delivered || 0, undel:team.undelivered || 0, rto:team.rto || 0, aov:team.aov || 0 },
   { label:"Shopify Orders", dot:"#16a34a", total:shopify.totalOrders || 0, rev:shopify.totalAmount || 0, prepC:shopify.prepaidCount || 0, prepA:shopify.prepaidAmount || 0, codC:shopify.codCount || 0, codA:shopify.codAmount || 0, del:shopify.delivered || 0, undel:shopify.undelivered || 0, rto:shopify.rto || 0, aov:shopify.aov || 0 },
 ];
 const TH = { padding:"10px 14px", fontSize:10, fontWeight:600, color:"#64748b", letterSpacing:"0.6px", textTransform:"uppercase", borderBottom:"1px solid #e6ebf2", background:"#f8fafc", whiteSpace:"nowrap" };
 return (
   <div style={{ overflowX:"auto" }}>
     <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:"'Noto Sans',sans-serif", fontSize:"12.5px" }}>
       <thead><tr>
         {["Category","Total Orders","Prepaid","COD","Delivered","Undelivered","RTO","Avg Order Value"].map((h,i)=>
           <th key={h} style={{ ...TH, textAlign:i===7?"right":"left", borderRadius:i===0?"8px 0 0 0":undefined }}>{h}</th>
         )}
       </tr></thead>
       <tbody>
         {loading ? [0,1,2].map(ri=>(
           <tr key={ri} style={{ borderBottom:ri<2?"1px solid #f1f5f9":"none" }}>
             {[0,1,2,3,4,5,6,7].map(ci=><td key={ci} style={{ padding:14 }}><Sk w={60} h={16} /></td>)}
           </tr>
         )) : rows.map((row,ri)=>(
           <tr key={ri} style={{ borderBottom:ri<rows.length-1?"1px solid #f1f5f9":"none" }}>
             <td style={{ padding:14, verticalAlign:"top" }}>
               <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                 <div style={{ width:8, height:8, borderRadius:"50%", background:row.dot, flexShrink:0, marginTop:2 }} />
                 <span style={{ fontWeight:600, color:"#0f172a", fontSize:13 }}>{row.label}</span>
               </div>
             </td>
             <td style={{ padding:14, verticalAlign:"top" }}>
               <div style={{ fontWeight:800, fontSize:20, color:"#0f172a", lineHeight:1 }}>{num(row.total)}</div>
               <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{fmtR(row.rev)}</div>
             </td>
             <td style={{ padding:14, verticalAlign:"top" }}>
               <div style={{ fontSize:13, fontWeight:600, color:"#0f172a" }}>{num(row.prepC)} <span style={{ fontSize:10, color:"#64748b", fontWeight:400 }}>({pct(row.prepC,row.total)})</span></div>
               <div style={{ display:"inline-flex", alignItems:"center", gap:3, marginTop:3, background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:4, padding:"1px 6px" }}>
                 <span style={{ fontSize:11, color:"#15803d", fontWeight:600 }}>{fmtR(row.prepA)}</span>
                 <span style={{ fontSize:9, color:"#86efac" }}>{pct(row.prepA,row.rev)}</span>
               </div>
             </td>
             <td style={{ padding:14, verticalAlign:"top" }}>
               <div style={{ fontSize:13, fontWeight:600, color:"#0f172a" }}>{num(row.codC)} <span style={{ fontSize:10, color:"#64748b", fontWeight:400 }}>({pct(row.codC,row.total)})</span></div>
               <div style={{ display:"inline-flex", alignItems:"center", gap:3, marginTop:3, background:"#fef2f2", border:"1px solid #fecaca", borderRadius:4, padding:"1px 6px" }}>
                 <span style={{ fontSize:11, color:"#b91c1c", fontWeight:600 }}>{fmtR(row.codA)}</span>
                 <span style={{ fontSize:9, color:"#fca5a5" }}>{pct(row.codA,row.rev)}</span>
               </div>
             </td>
             <td style={{ padding:14, verticalAlign:"top" }}>
               <div style={{ fontSize:13, fontWeight:600, color:row.del>0?"#16a34a":"#94a3b8" }}>{num(row.del)}</div>
               <div style={{ fontSize:10, color:"#94a3b8", marginTop:1 }}>{pct(row.del,row.total)}</div>
             </td>
             <td style={{ padding:14, verticalAlign:"top" }}>
               <div style={{ fontSize:13, fontWeight:600, color:row.undel>0?"#f59e0b":"#94a3b8" }}>{num(row.undel)}</div>
               <div style={{ fontSize:10, color:"#94a3b8", marginTop:1 }}>{pct(row.undel,row.total)}</div>
             </td>
             <td style={{ padding:14, verticalAlign:"top" }}>
               <div style={{ fontSize:13, fontWeight:600, color:row.rto>0?"#dc2626":"#94a3b8" }}>{num(row.rto)}</div>
               <div style={{ fontSize:10, color:"#94a3b8", marginTop:1 }}>{pct(row.rto,row.total)}</div>
             </td>
             <td style={{ padding:14, textAlign:"right", verticalAlign:"top" }}>
               <div style={{ fontSize:16, fontWeight:800, color:"#2563eb" }}>{fmtR(row.aov)}</div>
               <div style={{ fontSize:10, color:"#94a3b8", letterSpacing:"0.5px", fontWeight:500, marginTop:1 }}>AOV</div>
             </td>
           </tr>
         ))}
       </tbody>
     </table>
   </div>
 );
}


/* ── Customer Mix ── */
function CustomerMixCard({ data, loading }) {
 const ft = data.firstTime||0, re = data.returning||0, tot = ft+re;
 return (
   <div style={{ background:"#fff", border:"1px solid #e6ebf2", borderRadius:12, padding:18, boxShadow:"0 1px 3px rgba(15,23,42,0.06)", display:"flex", flexDirection:"column", gap:14 }}>
     <div style={{ fontWeight:700, fontSize:13, color:"#0f172a" }}>Customer Mix</div>
     <div style={{ display:"flex", alignItems:"center", gap:16 }}>
       <Donut segments={[{value:ft,color:"#1e4ed8"},{value:re,color:"#22d3ee"}]} label={num(tot)} sub="total" />
       <div style={{ display:"flex", flexDirection:"column", gap:10, flex:1 }}>
         {[{label:"First-Time",value:ft,color:"#1e4ed8"},{label:"Returning",value:re,color:"#22d3ee"}].map(item=>(
           <div key={item.label}>
             <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
               <div style={{ width:10, height:10, borderRadius:2, background:item.color, flexShrink:0 }} />
               <span style={{ fontSize:11, color:"#64748b", fontWeight:500 }}>{item.label}</span>
             </div>
             {loading ? <Sk w={50} h={22} /> : <>
               <div style={{ fontSize:22, fontWeight:800, color:"#0f172a", lineHeight:1 }}>{num(item.value)}</div>
               <div style={{ fontSize:10, color:"#94a3b8" }}>{pct(item.value,tot)} of orders</div>
             </>}
           </div>
         ))}
       </div>
     </div>
   </div>
 );
}


/* ── Orders Split ── */
function OrderSplitCard({ data, loading }) {
 const on = data.onlineOrders||0, tm = data.teamOrders||0, tot = on+tm;
 return (
   <div style={{ background:"#fff", border:"1px solid #e6ebf2", borderRadius:12, padding:18, boxShadow:"0 1px 3px rgba(15,23,42,0.06)", display:"flex", flexDirection:"column", gap:14 }}>
     <div style={{ fontWeight:700, fontSize:13, color:"#0f172a" }}>Orders Split</div>
     <div style={{ display:"flex", alignItems:"center", gap:16 }}>
       <Donut segments={[{value:on,color:"#2563eb"},{value:tm,color:"#22d3ee"}]} label={num(tot)} sub="orders" />
       <div style={{ display:"flex", flexDirection:"column", gap:10, flex:1 }}>
         {[{label:"Online",value:on,color:"#2563eb"},{label:"Team",value:tm,color:"#22d3ee"}].map(item=>(
           <div key={item.label}>
             <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
               <div style={{ width:10, height:10, borderRadius:2, background:item.color, flexShrink:0 }} />
               <span style={{ fontSize:11, color:"#64748b", fontWeight:500 }}>{item.label}</span>
             </div>
             {loading ? <Sk w={50} h={22} /> : <>
               <div style={{ fontSize:22, fontWeight:800, color:"#0f172a", lineHeight:1 }}>{num(item.value)}</div>
               <div style={{ fontSize:10, color:"#94a3b8" }}>{pct(item.value,tot)} of orders</div>
             </>}
           </div>
         ))}
       </div>
     </div>
   </div>
 );
}


/* ── Customers ── */
function CustomersCard({ data, loading }) {
 const ac = data.activeCustomers||0, ls = data.lostCustomers||0, ua = data.unassignedCustomers||0, tot = ac+ls+ua;
 const retPct = tot>0 ? Math.round(ac/tot*100) : 0;
 return (
   <div style={{ background:"#fff", border:"1px solid #e6ebf2", borderRadius:12, padding:18, boxShadow:"0 1px 3px rgba(15,23,42,0.06)" }}>
     <div style={{ fontWeight:700, fontSize:13, color:"#0f172a", marginBottom:14 }}>Customers</div>
     <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14 }}>
       <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:8, padding:12 }}>
         <div style={{ fontSize:10, fontWeight:700, color:"#16a34a", letterSpacing:"0.5px", textTransform:"uppercase", marginBottom:4 }}>Active</div>
         {loading ? <Sk w={50} h={28} /> : <div style={{ fontSize:28, fontWeight:800, color:"#15803d", lineHeight:1 }}>{num(ac)}</div>}
         <div style={{ fontSize:10, color:"#94a3b8", marginTop:2 }}>{pct(ac,tot)} retention</div>
       </div>
       <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:12 }}>
         <div style={{ fontSize:10, fontWeight:700, color:"#dc2626", letterSpacing:"0.5px", textTransform:"uppercase", marginBottom:4 }}>Lost</div>
         {loading ? <Sk w={50} h={28} /> : <div style={{ fontSize:28, fontWeight:800, color:"#b91c1c", lineHeight:1 }}>{num(ls)}</div>}
         <div style={{ fontSize:10, color:"#94a3b8", marginTop:2 }}>{pct(ls,tot)} churn</div>
       </div>
       <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:8, padding:12 }}>
         <div style={{ fontSize:10, fontWeight:700, color:"#1d4ed8", letterSpacing:"0.5px", textTransform:"uppercase", marginBottom:4 }}>Unassigned</div>
         {loading ? <Sk w={50} h={28} /> : <div style={{ fontSize:28, fontWeight:800, color:"#1e40af", lineHeight:1 }}>{num(ua)}</div>}
         <div style={{ fontSize:10, color:"#94a3b8", marginTop:2 }}>{pct(ua,tot)} no health expert</div>
       </div>
     </div>
     <div style={{ height:8, borderRadius:999, overflow:"hidden", background:"#e2e8f0", display:"flex" }}>
       <div style={{ height:"100%", width:`${retPct}%`, background:"#16a34a", transition:"width 0.4s" }} />
     </div>
     <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#94a3b8", marginTop:4 }}>
       <span style={{ color:"#16a34a", fontWeight:600 }}>Active {pct(ac,tot)}</span>
       <span style={{ color:"#dc2626", fontWeight:600 }}>Lost {pct(ls,tot)}</span>
       <span style={{ color:"#1d4ed8", fontWeight:600 }}>Unassigned {pct(ua,tot)}</span>
     </div>
   </div>
 );
}


/* ── Escalations ── */
function EscalationsCard({ data, loading }) {
 const op = data.openEscalations||0, cl = data.closedEscalations||0, tot = op+cl;
 const res = tot>0 ? Math.round(cl/tot*100) : 0;
 return (
   <div style={{ background:"#fff", border:"1px solid #e6ebf2", borderRadius:12, padding:18, boxShadow:"0 1px 3px rgba(15,23,42,0.06)" }}>
     <div style={{ fontWeight:700, fontSize:13, color:"#0f172a", marginBottom:14 }}>Escalations</div>
     <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
       <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:12 }}>
         <div style={{ fontSize:10, fontWeight:700, color:"#dc2626", letterSpacing:"0.5px", textTransform:"uppercase", marginBottom:4 }}>Open</div>
         {loading ? <Sk w={50} h={28} /> : <div style={{ fontSize:28, fontWeight:800, color:"#b91c1c", lineHeight:1 }}>{num(op)}</div>}
         <div style={{ fontSize:10, color:"#94a3b8", marginTop:2 }}>pending resolution</div>
       </div>
       <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:8, padding:12 }}>
         <div style={{ fontSize:10, fontWeight:700, color:"#16a34a", letterSpacing:"0.5px", textTransform:"uppercase", marginBottom:4 }}>Closed</div>
         {loading ? <Sk w={50} h={28} /> : <div style={{ fontSize:28, fontWeight:800, color:"#15803d", lineHeight:1 }}>{num(cl)}</div>}
         <div style={{ fontSize:10, color:"#94a3b8", marginTop:2 }}>resolved</div>
       </div>
     </div>
     <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#64748b", marginBottom:5 }}>
       <span>Resolution Rate</span>
       <span style={{ fontWeight:700, color:res>=80?"#16a34a":"#f59e0b" }}>{res}%</span>
     </div>
     <div style={{ height:6, borderRadius:999, background:"#e2e8f0", overflow:"hidden" }}>
       <div style={{ height:"100%", width:`${res}%`, background:res>=80?"#16a34a":"#f59e0b", borderRadius:999, transition:"width 0.4s" }} />
     </div>
   </div>
 );
}


/* ── Date Range Picker ── */
const RANGES = ["Today","Yesterday","Last 7 Days","Last 30 Days","Last Week","Last Month","Custom Range"];
function DatePicker({ value, onChange, customStart, customEnd, onCS, onCE }) {
 const [open, setOpen] = useState(false);
 const ref = useRef(null);
 useEffect(() => {
   const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
   document.addEventListener("mousedown", h);
   return () => document.removeEventListener("mousedown", h);
 }, []);
 return (
   <div ref={ref} style={{ position:"relative", userSelect:"none", display:"flex", alignItems:"center", gap:8 }}>
     <button onClick={()=>setOpen(o=>!o)} style={{
       display:"flex", alignItems:"center", gap:8, padding:"7px 12px", background:"#fff",
       border:`1.5px solid ${open?"#2563eb":"#e2e8f0"}`, borderRadius:8, cursor:"pointer",
       fontFamily:"'Noto Sans',sans-serif", fontSize:"12.5px", fontWeight:500, color:"#0f172a",
       boxShadow:open?"0 0 0 3px rgba(37,99,235,0.08)":"0 1px 2px rgba(15,23,42,0.04)",
       transition:"all 0.15s", whiteSpace:"nowrap"
     }}>
       <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
         <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
       </svg>
       {value}
       <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" style={{ transform:open?"rotate(180deg)":"none", transition:"transform 0.2s" }}>
         <polyline points="6 9 12 15 18 9"/>
       </svg>
     </button>
     {open && (
       <div style={{ position:"absolute", top:"calc(100% + 6px)", right:0, background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, boxShadow:"0 8px 24px rgba(15,23,42,0.12)", zIndex:200, minWidth:170, overflow:"hidden" }}>
         {RANGES.map(r=>(
           <div key={r} onClick={()=>{ onChange(r); if(r!=="Custom Range") setOpen(false); }}
             style={{ padding:"9px 14px", fontSize:"12.5px", cursor:"pointer", color:r===value?"#2563eb":"#334155", fontWeight:r===value?600:400, background:r===value?"#eff6ff":"transparent", transition:"background 0.1s" }}
             onMouseEnter={e=>{ if(r!==value) e.currentTarget.style.background="#f8fafc"; }}
             onMouseLeave={e=>{ if(r!==value) e.currentTarget.style.background="transparent"; }}>
             {r}
           </div>
         ))}
       </div>
     )}
     {value==="Custom Range" && <>
       <input type="date" value={customStart} onChange={e=>onCS(e.target.value)} style={{ padding:"6px 10px", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:12, fontFamily:"'Noto Sans',sans-serif", outline:"none" }} />
       <input type="date" value={customEnd} onChange={e=>onCE(e.target.value)} style={{ padding:"6px 10px", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:12, fontFamily:"'Noto Sans',sans-serif", outline:"none" }} />
     </>}
   </div>
 );
}


/* ── Section Header ── */
function SectionHeader({ title, subtitle, badge, children }) {
 return (
   <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, flexWrap:"wrap", gap:10 }}>
     <div style={{ display:"flex", alignItems:"center", gap:8 }}>
       <h2 style={{ fontSize:16, fontWeight:700, color:"#0f172a", fontFamily:"'Noto Sans',sans-serif", lineHeight:1.2, margin:0 }}>{title}</h2>
       {badge && <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.5px", padding:"2px 8px", borderRadius:999, background:badge==="LIVE"?"#f0fdf4":"#eff6ff", color:badge==="LIVE"?"#16a34a":"#2563eb", border:`1px solid ${badge==="LIVE"?"#bbf7d0":"#bfdbfe"}` }}>{badge}</span>}
       {subtitle && <span style={{ fontSize:"11.5px", color:"#64748b" }}>· {subtitle}</span>}
     </div>
     {children}
   </div>
 );
}


/* ── Dashboard Section ── */
function DashSection({ data, loading }) {
 const d = data || {};
 return (
   <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
     {/* KPI row */}
     <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
       <KPI label="Total Orders"    value={num(d.totalOrders)}  sub={fmtR(d.totalRevenue)+" revenue"}            color="#0f172a"  bg="#fff"     loading={loading} />
       <KPI label="Avg Order Value" value={fmtR(d.aov)}         sub="across all orders"                          color="#2563eb"  bg="#eff6ff"  loading={loading} />
       <KPI label="Delivered"       value={num(d.delivered)}    sub={pct(d.delivered,d.totalOrders)+" delivery rate"} color="#16a34a" bg="#f0fdf4" loading={loading} />
       <KPI label="RTO"             value={num(d.rto)}          sub={pct(d.rto,d.totalOrders)+" return rate"}    color="#dc2626"  bg="#fef2f2"  loading={loading} />
     </div>


     {/* Funnel + status + splits — 3 columns */}
     <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:14, alignItems:"start" }}>


       {/* Col 1: Funnel */}
       <div style={{ background:"#fff", border:"1px solid #e6ebf2", borderRadius:12, padding:18, boxShadow:"0 1px 3px rgba(15,23,42,0.06)" }}>
         <div style={{ fontWeight:700, fontSize:13, color:"#0f172a", marginBottom:16 }}>Orders Funnel</div>
         {loading ? <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:220 }}><Spin /></div> : <>
           <Funnel data={d} />
           {/* Legend with circle-check icons */}
           <div style={{ display:"flex", flexWrap:"wrap", gap:"8px 20px", marginTop:16, padding:12, background:"#f8fafc", borderRadius:8 }}>
             {[
               {label:"Total Orders", value:d.totalOrders, color:"#2563eb", check:true},
               {label:"Fulfilled",    value:d.fulfilled,   color:"#0d9488", check:true},
               {label:"Delivered",    value:d.delivered,   color:"#16a34a", check:true},
               {label:"RTO",          value:d.rto,         color:"#dc2626", check:false},
             ].map(item=>(
               <div key={item.label} style={{ display:"flex", alignItems:"center", gap:6 }}>
                 <svg width="16" height="16" viewBox="0 0 16 16" style={{ flexShrink:0 }}>
                   <circle cx="8" cy="8" r="8" fill={item.color} />
                   {item.check
                     ? <polyline points="4,8 7,11 12,5" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                     : <><line x1="5" y1="5" x2="11" y2="11" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/><line x1="11" y1="5" x2="5" y2="11" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></>
                   }
                 </svg>
                 <span style={{ fontSize:11, color:"#334155", fontWeight:500 }}>
                   {item.label}: <strong>{num(item.value)}</strong>
                 </span>
               </div>
             ))}
           </div>
         </>}
       </div>


       {/* Col 2: Status pills */}
       <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
         <StatusCard label="Cancelled"      value={d.cancelled||0}     sub="orders cancelled" color="#ea580c" bg="#fff7ed" border="#fed7aa" />
         <StatusCard label="Not Dispatched" value={d.notDispatched||0} sub="pending dispatch"  color="#7c3aed" bg="#f5f3ff" border="#ddd6fe" />
         <StatusCard label="In Transit"     value={d.inTransit||0}     sub="with courier"      color="#2563eb" bg="#eff6ff" border="#bfdbfe" />
       </div>


       {/* Col 3: Orders Split + Customer Mix */}
       <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
         <OrderSplitCard  data={d} loading={loading} />
         <CustomerMixCard data={d} loading={loading} />
       </div>


     </div>


     {/* Table */}
     <div style={{ background:"#fff", border:"1px solid #e6ebf2", borderRadius:12, boxShadow:"0 1px 3px rgba(15,23,42,0.06)", overflow:"hidden" }}>
       <div style={{ padding:"14px 18px", borderBottom:"1px solid #f1f5f9" }}>
         <div style={{ fontWeight:700, fontSize:13, color:"#0f172a" }}>Comprehensive Order Analytics</div>
       </div>
       <OrderTable data={d} loading={loading} />
     </div>


     {/* Bottom cards */}
     <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
       <CustomersCard   data={d} loading={loading} />
       <EscalationsCard data={d} loading={loading} />
     </div>
   </div>
 );
}


/* ── Main ── */
export default function SuperAdminDashboard() {
 const [data,    setData]    = useState({});
 const [loading, setLoading] = useState(true);
 const [overview, setOverview] = useState({});
 const [overviewLoading, setOverviewLoading] = useState(true);
 const [range,   setRange]   = useState("Last 30 Days");
 const [csStart, setCsStart] = useState("");
 const [csEnd,   setCsEnd]   = useState("");


 useEffect(() => {
   let start, end;
   if (range === "Custom Range") { start = csStart; end = csEnd; }
   else { const r = getRange(range); start = r.start; end = r.end; }
   if (!start || !end) return;
   setLoading(true);
   fetchSection(start, end).then(d => { setData(d); setLoading(false); });
 }, [range, csStart, csEnd]);


 useEffect(() => {
   let mounted = true;
   setOverviewLoading(true);
   fetchFulfillmentOverview()
     .then((payload) => {
       if (!mounted) return;
       setOverview(payload);
       setOverviewLoading(false);
     })
     .catch(() => {
       if (!mounted) return;
       setOverview({});
       setOverviewLoading(false);
     });
   return () => {
     mounted = false;
   };
 }, []);


 const dateLabel = (() => {
   if (range === "Custom Range") return csStart && csEnd ? `${csStart} — ${csEnd}` : "";
   const { start, end } = getRange(range);
   return `${start} — ${end}`;
 })();


 return (
   <>
     <style>{`
       @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
       @keyframes spin { to{transform:rotate(360deg)} }
     `}</style>
     <div style={{ fontFamily:"'Noto Sans',system-ui,sans-serif", background:"#f6f8fb", minHeight:"100vh", padding:"20px 24px 40px" }}>
       <section>
         <SectionHeader title="Super Admin Dashboard" subtitle={dateLabel}>
           <DatePicker value={range} onChange={setRange} customStart={csStart} customEnd={csEnd} onCS={setCsStart} onCE={setCsEnd} />
         </SectionHeader>
         <DashSection data={data} loading={loading} />
         <div style={{ marginTop: 18 }}>
           <FulfillmentOverviewSection overview={overview} loading={overviewLoading} />
         </div>
       </section>
     </div>
   </>
 );
}



