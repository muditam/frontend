import React, { useEffect, useState } from "react";
import {
    Box,
    Typography,
    Grid,
    Card,
    Stack,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Skeleton,
    Tooltip as MuiTooltip,
    ToggleButton,
    ToggleButtonGroup,
} from "@mui/material";
import {
    FunnelChart,
    Funnel,
    LabelList,
    Tooltip as ReTooltip,
} from "recharts";
import axios from "axios";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import GroupIcon from "@mui/icons-material/Group";
import CustomerCohortHeatmap from "./CustomerCohortHeatmap";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";



// Recharts
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    LineChart,
    Line,
    ResponsiveContainer,
    AreaChart,
    Area,
} from "recharts";

// ===== ADD THESE HELPER FUNCTIONS AT THE TOP OF THE FILE (before SuperAdminAnalytics function) =====

function isSingleDay(start, end) {
    if (!start || !end) return false;
    return start === end;
}

function formatHourlyLabel(timeStr) {
    if (!timeStr) return '';
    const [hour] = timeStr.split(':');
    const h = parseInt(hour);

    if (h === 0) return '12am';
    if (h < 12) return `${h}am`;
    if (h === 12) return '12pm';
    return `${h - 12}pm`;
}

function formatDateLabel(dateStr) {
    const date = new Date(dateStr + 'T00:00:00.000Z');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getSmartTicks(dataLength, isSingle) {
    if (isSingle) {
        if (dataLength <= 24) {
            return [0, Math.floor(dataLength / 2), dataLength - 1];
        }
    } else {
        if (dataLength <= 7) {
            return Array.from({ length: dataLength }, (_, i) => i);
        } else if (dataLength <= 30) {
            const step = Math.ceil(dataLength / 5);
            return Array.from({ length: dataLength }, (_, i) => i).filter(i => i % step === 0);
        } else {
            const step = Math.ceil(dataLength / 8);
            return Array.from({ length: dataLength }, (_, i) => i).filter(i => i % step === 0);
        }
    }
    return [];
}

// ------------------- DATE RANGE -------------------
const RANGE_OPTIONS = ["Today", "Yesterday", "Last 7 Days", "Last 30 Days", "Custom Range"];
// unified funnel theme (dark → light)
const COMMON_COLORS = ['#2C5F6F', '#3A8F9F', '#5FB8A8', '#80CBC4'];


function formatDate(d) {
    return new Date(d).toISOString().split("T")[0];
}

function getRange(preset) {
    const today = new Date();
    const todayStr = formatDate(today);
    switch (preset) {
        case "Today":
            return { start: todayStr, end: todayStr };
        case "Yesterday": {
            let d = new Date();
            d.setDate(d.getDate() - 1);
            return { start: formatDate(d), end: formatDate(d) };
        }
        case "Last 7 Days": {
            let d = new Date();
            d.setDate(d.getDate() - 6);
            return { start: formatDate(d), end: todayStr };
        }
        case "Last 30 Days": {
            let d = new Date();
            d.setDate(d.getDate() - 29);
            return { start: formatDate(d), end: todayStr };
        }
        default:
            return { start: todayStr, end: todayStr };
    }
}

// ------------------- CARDS -------------------
function OrdersSplitCard({ onlineOrders, teamOrders }) {
    return (
        <Card elevation={3} sx={{ borderRadius: 4, p: 3, background: "#fff" }}>
            <Stack direction="row" justifyContent="space-between">
                <Box sx={{ textAlign: "center", flex: 1 }}>
                    <ShoppingCartIcon sx={{ fontSize: 32, color: "#1976d2" }} />
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Online Orders</Typography>
                    <Typography sx={{ fontSize: 26, fontWeight: 800 }}>{onlineOrders}</Typography>
                </Box>
                <Divider orientation="vertical" flexItem sx={{ mx: 3 }} />
                <Box sx={{ textAlign: "center", flex: 1 }}>
                    <GroupIcon sx={{ fontSize: 32, color: "#d81b60" }} />
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Team Orders</Typography>
                    <Typography sx={{ fontSize: 26, fontWeight: 800 }}>{teamOrders}</Typography>
                </Box>
            </Stack>
        </Card>
    );
}

function FirstVsReturningCard({ firstTime, returning }) {
    return (
        <Card elevation={3} sx={{ borderRadius: 4, p: 3, background: "#fff" }}>
            <Typography sx={{ fontWeight: 700, mb: 2 }}>First-Time vs Returning</Typography>
            <Stack direction="row" justifyContent="space-between">
                <Box sx={{ flex: 1, textAlign: "center" }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>First-Time</Typography>
                    <Typography sx={{ fontSize: 26, fontWeight: 800 }}>{firstTime}</Typography>
                </Box>
                <Divider orientation="vertical" flexItem sx={{ mx: 3 }} />
                <Box sx={{ flex: 1, textAlign: "center" }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Returning</Typography>
                    <Typography sx={{ fontSize: 26, fontWeight: 800 }}>{returning}</Typography>
                </Box>
            </Stack>
        </Card>
    );
}
function EscalationDonut({ open = 0, closed = 0 }) {
    const pieData = [
        { name: "Open", value: open },
        { name: "Closed", value: closed },
    ];

    return (
        <Card elevation={3} sx={{ borderRadius: 4, p: 3 }}>
            <Typography sx={{ fontWeight: 700, mb: 2 }}>
                Escalations Overview
            </Typography>

            <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                    <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={85}
                        paddingAngle={1}
                        stroke="white"
                        strokeWidth={1.2}
                        label={({ value }) => value}
                    >
                        {pieData.map((_, i) => (
                            <Cell key={i} fill={COMMON_COLORS[i]} />
                        ))}
                    </Pie>

                    <Tooltip
                        contentStyle={{
                            backgroundColor: "white",
                            borderRadius: "10px",
                            border: "1px solid #e0e0e0",
                        }}
                        formatter={(value, name) => [value.toLocaleString(), name]}
                    />

                    <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
            </ResponsiveContainer>
        </Card>
    );
}




function CallsSplitCard({ incoming, outgoing }) {
    return (
        <Card elevation={3} sx={{ borderRadius: 4, p: 3, background: "#ffffff" }}>
            <Typography sx={{ fontWeight: 700, mb: 2, color: "#444" }}>Calls</Typography>
            <Stack direction="row" justifyContent="space-between">
                <Box sx={{ flex: 1, textAlign: "center" }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Incoming</Typography>
                    <Typography sx={{ fontSize: 26, fontWeight: 800 }}>{incoming}</Typography>
                </Box>
                <Divider orientation="vertical" flexItem sx={{ mx: 3 }} />
                <Box sx={{ flex: 1, textAlign: "center" }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Outgoing</Typography>
                    <Typography sx={{ fontSize: 26, fontWeight: 800 }}>{outgoing}</Typography>
                </Box>
            </Stack>
        </Card>
    );
}



function CODDeliveredCard({ count = 0, amount = 0 }) {
    return (
        <Card elevation={3} sx={{ borderRadius: 4, p: 3 }}>
            <Typography sx={{ fontWeight: 700, mb: 2 }}>COD Delivered</Typography>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography sx={{ fontSize: 16, fontWeight: 500 }}>Delivered Orders</Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 700 }}>{count}</Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
                <Typography sx={{ fontSize: 16, fontWeight: 500 }}>Total COD Amount</Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 700 }}>₹{amount}</Typography>
            </Box>
        </Card>
    );
}

function RTOCard({ rto, rtoDelivered }) {
    return (
        <Card elevation={3} sx={{ borderRadius: 4, p: 3 }}>
            <Typography sx={{ fontWeight: 700, mb: 2 }}>RTO & RTO Delivered</Typography>
            <Stack direction="row" justifyContent="space-between">
                <Box sx={{ flex: 1, textAlign: "center" }}>
                    <Typography>RTO</Typography>
                    <Typography sx={{ fontSize: 26, fontWeight: 800 }}>{rto}</Typography>
                </Box>
                <Divider orientation="vertical" flexItem sx={{ mx: 3 }} />
                <Box sx={{ flex: 1, textAlign: "center" }}>
                    <Typography>RTO Delivered</Typography>
                    <Typography sx={{ fontSize: 26, fontWeight: 800 }}>{rtoDelivered}</Typography>
                </Box>
            </Stack>
        </Card>
    );
}

function AOVCombinedCard({ online = {}, team = {}, combined = {} }) {
    return (
        <Card elevation={3} sx={{ borderRadius: 4, p: 3 }}>
            <Typography sx={{ fontWeight: 700, mb: 2, textAlign: "center" }}>
                Average Order Value (AOV)
            </Typography>
            <Stack direction="row" justifyContent="space-between">
                <Box sx={{ flex: 1, textAlign: "center" }}>
                    <Typography>Online</Typography>
                    <Typography sx={{ fontSize: 24, fontWeight: 800, color: "#1976d2" }}>
                        ₹{online.aov}
                    </Typography>
                    <Typography sx={{ fontSize: 12 }}>{online.orders} orders</Typography>
                </Box>
                <Divider orientation="vertical" flexItem sx={{ mx: 3 }} />
                <Box sx={{ flex: 1, textAlign: "center" }}>
                    <Typography>Team</Typography>
                    <Typography sx={{ fontSize: 24, fontWeight: 800, color: "#d81b60" }}>
                        ₹{team.aov}
                    </Typography>
                    <Typography sx={{ fontSize: 12 }}>{team.orders} orders</Typography>
                </Box>
                <Divider orientation="vertical" flexItem sx={{ mx: 3 }} />
                <Box sx={{ flex: 1, textAlign: "center" }}>
                    <Typography>Combined</Typography>
                    <Typography sx={{ fontSize: 24, fontWeight: 800, color: "#2e7d32" }}>
                        ₹{combined.aov}
                    </Typography>
                    <Typography sx={{ fontSize: 12 }}>{combined.orders} orders</Typography>
                </Box>
            </Stack>
        </Card>
    );
}

function FollowUpCard({ followUpsDue }) {
    return (
        <Card elevation={3} sx={{ borderRadius: 4, p: 3 }}>
            <Typography sx={{ fontWeight: 700, mb: 2 }}>Follow-Ups Due</Typography>
            <Typography sx={{ fontSize: 32, fontWeight: 900, textAlign: "center" }}>
                {followUpsDue}
            </Typography>
        </Card>
    );
}

function NoConsultCard({ noConsult }) {
    return (
        <Card elevation={3} sx={{ borderRadius: 4, p: 3 }}>
            <Typography>No Consult Ever</Typography>
            <Typography sx={{ fontSize: 32, fontWeight: 900, textAlign: "center" }}>
                {noConsult}
            </Typography>
        </Card>
    );
}

function NDRCard({ ndr }) {
    return (
        <Card elevation={3} sx={{ borderRadius: 4, p: 3 }}>
            <Typography>NDR Orders</Typography>
            <Typography sx={{ fontSize: 32, fontWeight: 900, textAlign: "center" }}>
                {ndr}
            </Typography>
        </Card>
    );
}

function LossCard({ loss }) {
    return (
        <Card elevation={3} sx={{ borderRadius: 4, p: 3 }}>
            <Typography>Total Loss Orders</Typography>
            <Typography
                sx={{ fontSize: 30, fontWeight: 900, color: "red", textAlign: "center" }}
            >
                {loss}
            </Typography>
        </Card>
    );
}

function DietPlansCard({ total }) {
    return (
        <Card elevation={3} sx={{ borderRadius: 4, p: 3 }}>
            <Typography>Diet Plans Created</Typography>
            <Typography sx={{ fontSize: 32, fontWeight: 900, textAlign: "center" }}>
                {total}
            </Typography>
        </Card>
    );
}
function OrdersVsFulfilledCard({ total, fulfilled }) {
    return (
        <Card elevation={3} sx={{ borderRadius: 4, p: 3 }}>
            <Typography sx={{ fontWeight: 700, mb: 2 }}>
                Total Orders vs Fulfilled
            </Typography>

            <Stack direction="row" justifyContent="space-between">
                <Box sx={{ textAlign: "center", flex: 1 }}>
                    <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
                        Total Orders
                    </Typography>
                    <Typography sx={{ fontSize: 28, fontWeight: 900, color: "#1976d2" }}>
                        {total}
                    </Typography>
                </Box>

                <Divider orientation="vertical" flexItem sx={{ mx: 3 }} />

                <Box sx={{ textAlign: "center", flex: 1 }}>
                    <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
                        Fulfilled
                    </Typography>
                    <Typography sx={{ fontSize: 28, fontWeight: 900, color: "#2e7d32" }}>
                        {fulfilled}
                    </Typography>
                </Box>
            </Stack>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    Fulfillment Rate: {total > 0 ? ((fulfilled / total) * 100).toFixed(1) : 0}%
                </Typography>
            </Box>
        </Card>
    );
}



function EscalationCard({ open = 0, closed = 0 }) {
    const pieData = [
        { name: "Open", value: open },
        { name: "Closed", value: closed },
    ];

    return (
        <Card sx={{ p: 3, borderRadius: 3 }}>
            <Typography sx={{ fontWeight: 700, mb: 2 }}>
                Escalations (Open vs Closed)
            </Typography>

            <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                    <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ value }) => value}
                    >
                        {pieData.map((_, i) => (
                            <Cell key={i} fill={COMMON_COLORS[i]} />
                        ))}
                    </Pie>

                    <Tooltip />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </Card>
    );
}
function CallsInOutCard({ incoming = 0, outgoing = 0 }) {
    const pieData = [
        { name: "Incoming", value: incoming },
        { name: "Outgoing", value: outgoing },
    ];

    return (
        <Card sx={{ p: 3, borderRadius: 3 }}>
            <Typography sx={{ fontWeight: 700, mb: 2 }}>
                Calls (Incoming vs Outgoing)
            </Typography>

            <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                    <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ value }) => value}
                    >
                        {pieData.map((_, i) => (
                            <Cell key={i} fill={COMMON_COLORS[i]} />
                        ))}
                    </Pie>

                    <Tooltip />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </Card>
    );
}
function LeadsOverviewCard({ totalLeads = 0, followUpDue = 0, noConsult = 0 }) {

    const pieData = [
        { name: "Total Leads", value: totalLeads },
        { name: "Follow-up Due", value: followUpDue },
        { name: "No-Consult", value: noConsult },
    ];

    return (
        <Card elevation={3} sx={{ borderRadius: 4, p: 3 }}>
            <Typography sx={{ fontWeight: 700, mb: 2 }}>
                Leads Overview
            </Typography>

            <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                    <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={85}
                        label={({ value }) => value}
                        stroke="white"
                        strokeWidth={1.2}
                    >
                        {pieData.map((_, i) => (
                            <Cell key={i} fill={COMMON_COLORS[i]} />
                        ))}
                    </Pie>

                    <Tooltip
                        contentStyle={{
                            backgroundColor: "white",
                            borderRadius: "10px",
                            border: "1px solid #e0e0e0",
                        }}
                        formatter={(value, name) => [value.toLocaleString(), name]}
                    />

                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </Card>
    );
}
function LeadsOverviewDonut({ totalLeads = 0, followUpDue = 0, noConsult = 0 }) {
    const pieData = [
        { name: "Total Leads", value: totalLeads },
        { name: "Follow-up Due", value: followUpDue },
        { name: "No Consult Ever", value: noConsult },
    ];

    return (
        <Card elevation={3} sx={{ borderRadius: 4, p: 3 }}>
            <Typography sx={{ fontWeight: 700, mb: 2 }}>
                Leads Overview
            </Typography>

            <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                    <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        // ⭐ Donut hole
                        innerRadius={45}
                        outerRadius={85}
                        paddingAngle={1}
                        stroke="white"
                        strokeWidth={1.2}
                        label={({ value }) => value}
                    >
                        {pieData.map((_, i) => (
                            <Cell key={i} fill={COMMON_COLORS[i]} />
                        ))}
                    </Pie>

                    <Tooltip
                        contentStyle={{
                            backgroundColor: "white",
                            borderRadius: "10px",
                            border: "1px solid #e0e0e0",
                        }}
                        formatter={(val, name) => [val.toLocaleString(), name]}
                    />

                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </Card>
    );
}



function AverageOrderValueCard({
    apiBase,
    start,
    end,
    aovStats,
    compareMode,
    compareStart,
    compareEnd,
    useCustomCompare,
}) {
    const [scope, setScope] = useState("combined");
    const [loading, setLoading] = useState(false);
    const [series, setSeries] = useState([]);

    const [summary, setSummary] = useState({
        currentAOV: 0,
        previousAOV: 0,
        changePct: 0,
        currentRange: null,
        previousRange: null,
    });

    const hasComparison = compareStart && compareEnd;

    // ============================================
    // AGGREGATE DATA FOR LARGE DATE RANGES
    // ============================================
    // In the AverageOrderValueCard component, update the aggregateData function:

    const aggregateData = (points, days) => {
        if (days <= 31) return points;

        if (days <= 90) {
            const weeks = [];
            for (let i = 0; i < points.length; i += 7) {
                const chunk = points.slice(i, i + 7);
                const validCurrent = chunk.filter(p => p.current > 0);
                const validPrev = chunk.filter(p => p.previous > 0);

                const avgCurrent = validCurrent.length > 0
                    ? validCurrent.reduce((s, p) => s + p.current, 0) / validCurrent.length
                    : 0;
                const avgPrev = validPrev.length > 0
                    ? validPrev.reduce((s, p) => s + p.previous, 0) / validPrev.length
                    : 0;

                weeks.push({
                    label: chunk[0].label,
                    current: Number(avgCurrent.toFixed(2)),
                    previous: avgPrev > 0 ? Number(avgPrev.toFixed(2)) : null,  // 🔥 Set to null if 0
                });
            }
            return weeks;
        }

        const months = {};
        points.forEach(p => {
            const monthKey = p.label.slice(0, 7);
            if (!months[monthKey]) {
                months[monthKey] = { current: [], previous: [] };
            }
            months[monthKey].current.push(p.current);
            if (p.previous > 0) months[monthKey].previous.push(p.previous);  // 🔥 Only valid values
        });

        return Object.entries(months).map(([month, data]) => ({
            label: month,
            current: Number((data.current.reduce((s, v) => s + v, 0) / data.current.length).toFixed(2)),
            previous: data.previous.length > 0
                ? Number((data.previous.reduce((s, v) => s + v, 0) / data.previous.length).toFixed(2))
                : null,  // 🔥 Set to null if no valid data
        }));
    };
    // ============================================
    // FETCH AOV WITH COMPARISON
    // ============================================
    useEffect(() => {
        if (!start || !end) return;

        const fetchAOV = async () => {
            try {
                setLoading(true);

                const params = { start, end, scope };

                // 🔥 KEY FIX: Send comparison dates properly
                if (hasComparison) {
                    params.compareMode = "custom";
                    params.customCompareStart = compareStart;
                    params.customCompareEnd = compareEnd;
                } else {
                    params.compareMode = "none";
                }

                const res = await axios.get(
                    `${apiBase}/api/super-admin/analytics/aov-over-time`,
                    { params }
                );

                const { current, previous, points } = res.data || {};

                const currentAOV = current?.aov || 0;
                const previousAOV = previous?.aov || 0;

                const changePct =
                    previousAOV > 0
                        ? ((currentAOV - previousAOV) / previousAOV) * 100
                        : 0;

                setSummary({
                    currentAOV,
                    previousAOV,
                    changePct,
                    currentRange: current?.range || { start, end },
                    previousRange: previous?.range || null,
                });

                const dayCount = Math.ceil(
                    (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)
                );

                const aggregated = aggregateData(points || [], dayCount);
                setSeries(aggregated);

            } catch (err) {
                console.error("AOV fetch error:", err);
                setSeries([]);
            } finally {
                setLoading(false);
            }
        };

        fetchAOV();
    }, [
        apiBase,
        start,
        end,
        scope,
        compareStart,  // 🔥 ADD THIS
        compareEnd,    // 🔥 ADD THIS
        hasComparison, // 🔥 ADD THIS
    ]);

    // ============================================
    // HELPERS
    // ============================================
    const fmtAOV = (v) =>
        `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

    const fmtDate = (d) => {
        if (!d) return "N/A";
        return new Date(d).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const buildPill = (label, color) => (
        <Box
            sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                borderRadius: "20px",
                px: 1.6,
                py: 0.8,
                bgcolor: `${color}22`,
                border: `1px solid ${color}55`,
            }}
        >
            <Box
                sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: color,
                }}
            />
            <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                {label}
            </Typography>
        </Box>
    );

    const { currentAOV, previousAOV, changePct, currentRange, previousRange } =
        summary;

    const scopeStats = {
        online: aovStats?.online || { aov: 0, orders: 0 },
        team: aovStats?.team || { aov: 0, orders: 0 },
        combined: aovStats?.combined || { aov: 0, orders: 0 },
    };

    const renderScopeValue = (value) => {
        const s = scopeStats[value] || scopeStats.combined;
        return `${value[0].toUpperCase() + value.slice(1)} – ₹${s.aov.toLocaleString(
            "en-IN"
        )} · ${s.orders} orders`;
    };

    // ============================================
    // UI RENDER
    // ============================================
    return (
        <Card sx={{ p: 3, borderRadius: 4, height: 430, display: "flex", flexDirection: "column" }}>

            {/* HEADER */}
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 2,
                }}
            >
                <Typography sx={{ fontSize: 22, fontWeight: 700 }}>
                    Average Order Value
                </Typography>

                <FormControl size="small" sx={{ minWidth: 240 }}>
                    <Select
                        value={scope}
                        onChange={(e) => setScope(e.target.value)}
                        renderValue={renderScopeValue}
                    >
                        <MenuItem value="combined">{renderScopeValue("combined")}</MenuItem>
                        <MenuItem value="online">{renderScopeValue("online")}</MenuItem>
                        <MenuItem value="team">{renderScopeValue("team")}</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            {/* BIG NUMBER + PERCENT */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                <Typography sx={{ fontSize: 32, fontWeight: 800 }}>
                    {fmtAOV(currentAOV)}
                </Typography>

                {hasComparison && previousAOV > 0 ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography
                            sx={{
                                fontSize: 16,
                                fontWeight: 700,
                                color: changePct >= 0 ? "green" : "red",
                            }}
                        >
                            {changePct >= 0 ? "▲" : "▼"} {Math.abs(changePct).toFixed(2)}%
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                            vs {fmtAOV(previousAOV)}
                        </Typography>
                    </Box>
                ) : null}
            </Box>

            {/* BEAUTIFUL DATE PILLS */}
            {hasComparison && previousRange && (
                <Box sx={{ display: "flex", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
                    {buildPill(
                        currentRange?.start === currentRange?.end
                            ? fmtDate(currentRange?.start)
                            : `${fmtDate(currentRange?.start)} – ${fmtDate(currentRange?.end)}`,
                        "#2e7d32"
                    )}
                    {buildPill(
                        previousRange?.start === previousRange?.end
                            ? fmtDate(previousRange?.start)
                            : `${fmtDate(previousRange?.start)} – ${fmtDate(previousRange?.end)}`,
                        "#fbc02d"
                    )}
                </Box>
            )}

            <Typography
                sx={{
                    fontSize: 12,
                    color: "text.secondary",
                    mb: 1,
                    textTransform: "uppercase",
                }}
            >
                Average order value over time
            </Typography>

            {/* CHART */}
            <Box sx={{ height: 250, flex: 1 }}>
                {loading ? (
                    <Skeleton height={220} />
                ) : series.length === 0 ? (
                    <Box sx={{ textAlign: "center", py: 10 }}>
                        <Typography color="text.secondary">No data available</Typography>
                    </Box>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={series}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 11 }}
                                tickFormatter={(value) => {
                                    if (!value) return "";     // prevents INVALID DATE
                                    const isSingle = start === end;
                                    return isSingle ? formatHourlyLabel(value) : formatDateLabel(value);
                                }}

                                interval={series.length > 5 ? Math.floor(series.length / 3) - 1 : 0}
                            />
                            <YAxis tickFormatter={(v) => `₹${v}`} tick={{ fontSize: 11 }} />

                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (!active || !payload || payload.length === 0) return null;

                                    const isSingle = start === end;

                                    return (
                                        <div
                                            style={{
                                                background: "white",
                                                padding: "10px",
                                                borderRadius: "8px",
                                                boxShadow: "0 2px 10px rgba(0,0,0,0.15)"
                                            }}
                                        >
                                            <strong>{isSingle ? formatHourlyLabel(label) : formatDateLabel(label)}</strong>

                                            {payload.map((entry, i) => (
                                                <div key={i} style={{ color: entry.color, marginTop: 4 }}>
                                                    <span style={{ fontWeight: 600 }}>
                                                        {entry.name === "current"
                                                            ? (currentRange?.start === currentRange?.end
                                                                ? fmtDate(currentRange?.start)
                                                                : `${fmtDate(currentRange?.start)} – ${fmtDate(currentRange?.end)}`)
                                                            : (previousRange?.start === previousRange?.end
                                                                ? fmtDate(previousRange?.start)
                                                                : `${fmtDate(previousRange?.start)} – ${fmtDate(previousRange?.end)}`)
                                                        }
                                                    </span>
                                                    : ₹{entry.value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                }}
                            />

                            <Legend
                                formatter={(value) => {
                                    if (value === "current") {
                                        if (!currentRange) return "Current Period";
                                        if (currentRange.start === currentRange.end) {
                                            return fmtDate(currentRange.start);
                                        }
                                        return `${fmtDate(currentRange.start)} – ${fmtDate(currentRange.end)}`;
                                    }

                                    if (value === "previous") {
                                        if (!previousRange) return "Previous Period";
                                        if (previousRange.start === previousRange.end) {
                                            return fmtDate(previousRange.start);
                                        }
                                        return `${fmtDate(previousRange.start)} – ${fmtDate(previousRange.end)}`;
                                    }
                                    return value;
                                }}
                            />

                            <Line
                                type="monotone"
                                dataKey="current"
                                name="current"
                                stroke={COMMON_COLORS[0]}
                                strokeWidth={2}
                                dot={{ r: 3 }}
                            />

                            {hasComparison && (
                                <Line
                                    type="monotone"
                                    dataKey="previous"
                                    name="previous"
                                    stroke={COMMON_COLORS[1]}
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                    strokeDasharray="5 5"
                                />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </Box>
        </Card>
    );
}
function TotalCustomersCard({ total }) {
    return (
        <Card elevation={3} sx={{ borderRadius: 4, p: 3 }}>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Total Customers</Typography>
            <Typography sx={{ fontSize: 36, fontWeight: 900, textAlign: "center", color: "#1976d2" }}>
                {total}
            </Typography>
        </Card>
    );
}

function ActiveCustomersCard({ active }) {
    return (
        <Card elevation={3} sx={{ borderRadius: 4, p: 3, textAlign: "center" }}>
            <Typography sx={{ fontSize: 36, fontWeight: 900, color: "#2e7d32" }}>
                {active}
            </Typography>
        </Card>
    );
}


function LostCustomersCard({ lost }) {
    return (
        <Card elevation={3} sx={{ borderRadius: 4, p: 3 }}>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Lost Customers</Typography>
            <Typography sx={{ fontSize: 36, fontWeight: 900, textAlign: "center", color: "#d32f2f" }}>
                {lost}
            </Typography>
        </Card>
    );
}



function OrdersFunnelCard({ data }) {

    console.log('🔍 Funnel received data:', data); // Debug log

    // 🔥 FIXED: Map data to show Fulfilled → Delivered → RTO funnel
    const funnelData = [
        {
            name: 'Total Orders',
            value: data?.totalOrders || 0,
            color: '#2C5F6F'
        },
        {
            name: 'Fulfilled',
            value: data?.fulfilled?.count || 0,
            color: '#3A8F9F'
        },
        {
            name: 'Delivered',
            value: data?.delivered?.count || 0,
            color: '#5FB8A8'
        },
        {
            name: 'RTO',
            value: data?.rto?.count || 0,
            color: '#80CBC4'
        }
    ];

    const calculatePercentage = (index) => {
        const maxValue = funnelData[0]?.value || 1;
        const percentage = ((funnelData[index].value / maxValue) * 100).toFixed(1);
        return percentage === 'NaN' ? '0' : percentage;
    };

    const formatLabel = (name, value, width) => {
        const fullText = `${name}: ${value.toLocaleString()}`;

        if (width < 150 || name.length > 12) {
            return {
                split: true,
                line1: name + ':',
                line2: value.toLocaleString()
            };
        }

        return { split: false, text: fullText };
    };

    return (
        <Card sx={{ p: 3, borderRadius: 3 }}>
            <Typography sx={{ fontWeight: 700, mb: 3 }}>
                Orders Funnel
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <svg
                    viewBox="0 0 300 350"
                    style={{
                        width: '100%',
                        maxWidth: '400px',
                        height: 'auto',
                        filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))'
                    }}
                >
                    {funnelData.map((item, index) => {
                        const topWidth = 280 - (index * 45);
                        const bottomWidth = 280 - ((index + 1) * 45);
                        const height = 80;
                        const y = index * height;

                        const avgWidth = (topWidth + bottomWidth) / 2;
                        const leftX = (300 - topWidth) / 2;
                        const rightX = leftX + topWidth;
                        const bottomLeftX = (300 - bottomWidth) / 2;
                        const bottomRightX = bottomLeftX + bottomWidth;

                        const label = formatLabel(item.name, item.value, avgWidth);
                        const fontSize = avgWidth > 150 ? 14 : 12;
                        const percentage = calculatePercentage(index);

                        return (
                            <g key={index}>
                                {/* Trapezoid Shape */}
                                <path
                                    d={`M ${leftX} ${y}
                      L ${rightX} ${y}
                      L ${bottomRightX} ${y + height}
                      L ${bottomLeftX} ${y + height} Z`}
                                    fill={item.color}
                                    opacity="0.9"
                                    stroke="white"
                                    strokeWidth="2"
                                />

                                {/* Text Label */}
                                {label.split ? (
                                    <>
                                        <text
                                            x="150"
                                            y={y + height / 2 - 10}
                                            textAnchor="middle"
                                            style={{
                                                fontSize,
                                                fontWeight: 700,
                                                fill: '#000',
                                                fontFamily: 'Arial, sans-serif'
                                            }}
                                        >
                                            {label.line1}
                                        </text>
                                        <text
                                            x="150"
                                            y={y + height / 2 + 5}
                                            textAnchor="middle"
                                            style={{
                                                fontSize,
                                                fontWeight: 700,
                                                fill: '#000',
                                                fontFamily: 'Arial, sans-serif'
                                            }}
                                        >
                                            {label.line2}
                                        </text>
                                    </>
                                ) : (
                                    <text
                                        x="150"
                                        y={y + height / 2 - 2}
                                        textAnchor="middle"
                                        style={{
                                            fontSize,
                                            fontWeight: 700,
                                            fill: '#000',
                                            fontFamily: 'Arial, sans-serif'
                                        }}
                                    >
                                        {label.text}
                                    </text>
                                )}

                                {/* Percentage */}
                                <text
                                    x="150"
                                    y={y + height / 2 + (label.split ? 20 : 16)}
                                    textAnchor="middle"
                                    style={{
                                        fontSize: 12,
                                        fill: '#000',
                                        opacity: 0.7,
                                        fontFamily: 'Arial, sans-serif',
                                        fontWeight: 600
                                    }}
                                >
                                    {percentage}%
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </Box>

            {/* Legend with Breakdown */}
            <Box sx={{ mt: 3, p: 2, bgcolor: '#F5F5F5', borderRadius: 2 }}>
                <Grid container spacing={2}>
                    {funnelData.map((item, i) => (
                        <Grid item xs={6} sm={3} key={i}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                <Box
                                    sx={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: '2px',
                                        bgcolor: item.color,
                                        mt: 0.5,
                                        flexShrink: 0
                                    }}
                                />
                                <Box sx={{ flex: 1 }}>
                                    <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 500 }}>
                                        {item.name}
                                    </Typography>
                                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                                        {item.value.toLocaleString()}
                                    </Typography>
                                    <Typography sx={{ fontSize: 10, color: '#666' }}>
                                        {calculatePercentage(i)}%
                                    </Typography>
                                </Box>
                            </Box>
                        </Grid>
                    ))}
                </Grid>
            </Box>
        </Card>
    );
}
function CODCard({ count, amount, percentage }) {
    return (
        <Card elevation={3} sx={{ borderRadius: 4, p: 2 }}>
            <Typography sx={{ fontSize: 14, color: "#555", fontWeight: 600 }}>
                COD Orders
            </Typography>

            <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                <Box>
                    <Typography sx={{ fontSize: 26, fontWeight: 900, color: "#d32f2f" }}>
                        {count}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: "#777" }}>
                        Orders
                    </Typography>
                </Box>

                <Box sx={{ textAlign: "right" }}>
                    <Typography sx={{ fontSize: 20, fontWeight: 700, color: "#2e7d32" }}>
                        ₹{amount.toLocaleString()}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: "#2e7d32" }}>
                        {percentage}
                    </Typography>
                </Box>
            </Stack>
        </Card>
    );
}
function PrepaidCard({ count, amount, percentage }) {
    return (
        <Card elevation={3} sx={{ borderRadius: 4, p: 2 }}>
            <Typography sx={{ fontSize: 14, color: "#555", fontWeight: 600 }}>
                Prepaid Orders
            </Typography>

            <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                <Box>
                    <Typography sx={{ fontSize: 26, fontWeight: 900, color: "#1976d2" }}>
                        {count}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: "#777" }}>
                        Orders
                    </Typography>
                </Box>

                <Box sx={{ textAlign: "right" }}>
                    <Typography sx={{ fontSize: 20, fontWeight: 700, color: "#388e3c" }}>
                        ₹{amount.toLocaleString()}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: "#388e3c" }}>
                        {percentage}
                    </Typography>
                </Box>
            </Stack>
        </Card>
    );
}
function TotalSalesCard({ amount }) {
    return (
        <Card
            elevation={3}
            sx={{ borderRadius: 3, p: 3, textAlign: "center" }}
        >
            <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 1 }}>
                Total Sales
            </Typography>

            <Typography
                sx={{
                    fontSize: 30,
                    fontWeight: 900,
                    color: "#1976d2",
                }}
            >
                ₹{amount?.toLocaleString("en-IN") || 0}
            </Typography>
        </Card>
    );
}
function OrdersSplitPie({ onlineOrders = 0, teamOrders = 0 }) {
    const pieData = [
        { name: "Online Orders", value: onlineOrders },
        { name: "Team Orders", value: teamOrders },
    ];

    return (
        <Card sx={{ p: 3, borderRadius: 3 }}>
            <Typography sx={{ fontWeight: 700, mb: 2 }}>Orders Split</Typography>

            <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                    <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        label={({ value }) => value}
                    >
                        {pieData.map((_, i) => (
                            <Cell key={i} fill={COMMON_COLORS[i]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </Card>
    );
}
function FirstReturningDonut({ firstTime = 0, returning = 0 }) {
    const pieData = [
        { name: "First-Time", value: firstTime },
        { name: "Returning", value: returning },
    ];

    return (
        <Card elevation={3} sx={{ borderRadius: 4, p: 3 }}>
            <Typography sx={{ fontWeight: 700, mb: 2 }}>
                Customer Mix
            </Typography>

            <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                    <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={85}
                        paddingAngle={1}
                        stroke="white"
                        strokeWidth={1.2}
                        label={({ value }) => value}
                    >
                        {pieData.map((_, i) => (
                            <Cell key={i} fill={COMMON_COLORS[i]} />
                        ))}
                    </Pie>

                    <Tooltip
                        contentStyle={{
                            backgroundColor: "white",
                            borderRadius: "10px",
                            border: "1px solid #e0e0e0",
                        }}
                        formatter={(value, name) => [value.toLocaleString(), name]}
                    />

                    <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
            </ResponsiveContainer>
        </Card>
    );
}


export default function SuperAdminAnalytics() {
    const API = "https://muditamleads-14f32a10d7f7.herokuapp.com";

    const [compareMode, setCompareMode] = useState("previous");
    const [compareStart, setCompareStart] = useState("");
    const [compareEnd, setCompareEnd] = useState("");
    const [useCustomCompare, setUseCustomCompare] = useState(false);
    const [compareDialogOpen, setCompareDialogOpen] = useState(false);
    const [tempCompareStart, setTempCompareStart] = useState("");
    const [tempCompareEnd, setTempCompareEnd] = useState("");
    const [preset, setPreset] = useState("Today");
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");
    const [escalationStats, setEscalationStats] = useState({ open: 0, closed: 0 });

    const [data, setData] = useState({ onlineOrders: 0, teamOrders: 0 });
    const [firstReturning, setFirstReturning] = useState({ firstTime: 0, returning: 0 });
    const [leadStats, setLeadStats] = useState({ totalLeads: 0 });
    const [loading, setLoading] = useState(false);
    const [deliveredStats, setDeliveredStats] = useState({ delivered: 0 });
    const [callStats, setCallStats] = useState({ incoming: 0, outgoing: 0 });
    const [codStats, setCodStats] = useState({ totalCount: 0, totalAmount: 0 });

    const [rtoStats, setRtoStats] = useState({ rto: 0, rtoDelivered: 0 });
    const [aovStats, setAovStats] = useState({
        online: { aov: 0, orders: 0 },
        team: { aov: 0, orders: 0 },
        combined: { aov: 0, orders: 0 },
    });
    const [followUpStats, setFollowUpStats] = useState({ followUpsDue: 0 });
    const [noConsultStats, setNoConsultStats] = useState({ noConsult: 0 });
    const [ndrStats, setNdrStats] = useState({ ndr: 0 });
    const [lossStats, setLossStats] = useState({ loss: 0 });
    const [dietStats, setDietStats] = useState({ totalDietPlans: 0 });
    const [orderVsConfirmed, setOrderVsConfirmed] = useState({
        totalOrders: 0,
        confirmedOrders: 0,
    });

    // Delivered Sales Per Agent State
    const [deliveredAgents, setDeliveredAgents] = useState([]);
    const [deliveredLoading, setDeliveredLoading] = useState(true);
    const [deliveredOpen, setDeliveredOpen] = useState(false);

    // Customer Trends State
    const [visibleLines, setVisibleLines] = useState({
        newCustomers: true,
        active: true,
        lost: true
    });

    const toggleLine = (lineKey) => {
        setVisibleLines(prev => ({
            ...prev,
            [lineKey]: !prev[lineKey]
        }));
    };

    const [funnelStats, setFunnelStats] = useState({
        totalOrders: 0,
        fulfilled: { count: 0, percentage: 0 },
        delivered: { count: 0, percentage: 0 },
        rto: { count: 0, percentage: 0 }
    });
    const [customerStats, setCustomerStats] = useState({
        totalCustomers: 0,
        activeCustomers: 0,
        lostCustomers: 0,
    });

    const [customerTrendData, setCustomerTrendData] = useState([]);
    const [customerTrendLoading, setCustomerTrendLoading] = useState(false);
    const [paymentStats, setPaymentStats] = useState({
        cod: { count: 0, amount: 0, percentage: "0%" },
        prepaid: { count: 0, amount: 0, percentage: "0%" }
    });
    const [salesStats, setSalesStats] = useState({
        totalSales: 0,
    });
    const [orderTrendData, setOrderTrendData] = useState([]);
    const [orderFilter, setOrderFilter] = useState("all");
    const [orderTrendLoading, setOrderTrendLoading] = useState(false);
    const [orderTrendSummary, setOrderTrendSummary] = useState({
        total: 0,
        percentChange: 0
    });
    // SUMMARY CHIP STATES
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summary, setSummary] = useState({
        totalSales: 0,
        totalOrders: 0,
        aov: 0,
        prepaid: { count: 0, amount: 0, percentage: 0 },
        cod: { count: 0, amount: 0, percentage: 0 },
    });

    const loadSummary = async () => {
        try {
            setSummaryLoading(true);

            const res = await axios.get(`${API}/api/super-admin/analytics/dashboard-summary`, {
                params: { start, end }
            });

            setSummary(res.data);

        } catch (err) {
            console.error("Summary Fetch Error:", err);
        } finally {
            setSummaryLoading(false);
        }
    };
    const handleComparisonSave = () => {
        if (!tempCompareStart || !tempCompareEnd) {
            alert("Please select both dates");
            return;
        }
        if (tempCompareStart > tempCompareEnd) {
            alert("Start date must be before end date");
            return;
        }
        setCompareStart(tempCompareStart);
        setCompareEnd(tempCompareEnd);
        setCompareMode("custom");
        setUseCustomCompare(true);
        setCompareDialogOpen(false);
    };

    const handleComparisonReset = () => {
        setCompareStart("");
        setCompareEnd("");
        setCompareMode("none");
        setUseCustomCompare(false);
        setTempCompareStart("");
        setTempCompareEnd("");
        setCompareDialogOpen(false);
    };



    const loadDeliveredRevenue = async () => {
        try {
            setDeliveredLoading(true);
            const res = await axios.get(`${API}/api/super-admin/analytics/delivered-sales-per-agent`);
            const sorted = (res.data.agents || []).sort(
                (a, b) => (b.totalDeliveredSales || 0) - (a.totalDeliveredSales || 0)
            );
            setDeliveredAgents(sorted);
        } catch (err) {
            console.error("Delivered Sales Fetch Error:", err);
        } finally {
            setDeliveredLoading(false);
        }
    };

    useEffect(() => {
        loadDeliveredRevenue();
    }, []);

    const { start, end } =
        preset === "Custom Range" && customStart && customEnd
            ? { start: customStart, end: customEnd }
            : getRange(preset);
    // ============================================
    // 🔧 CORRECTED loadAnalytics FUNCTION
    // ============================================
    // Find your loadAnalytics function and REPLACE the funnel section

    const loadAnalytics = async () => {
        try {
            setLoading(true);

            const orderRes = await axios.get(`${API}/api/super-admin/analytics/orders`, { params: { start, end } });
            setData(orderRes.data || {});

            const frRes = await axios.get(`${API}/api/super-admin/analytics/first-vs-returning`, { params: { start, end } });
            setFirstReturning(frRes.data || {});

            const leadsRes = await axios.get(`${API}/api/super-admin/analytics/leads`, { params: { start, end } });
            setLeadStats({ totalLeads: leadsRes.data.totalLeads || 0 });

            const callsRes = await axios.get(`${API}/api/super-admin/analytics/calls`, { params: { start, end } });
            setCallStats(callsRes.data || { incoming: 0, outgoing: 0 });

            const delRes = await axios.get(`${API}/api/super-admin/analytics/delivered`, { params: { start, end } });
            setDeliveredStats(delRes.data || { delivered: 0 });

            const rtoRes = await axios.get(`${API}/api/super-admin/analytics/rto`, { params: { start, end } });
            setRtoStats(rtoRes.data || { rto: 0, rtoDelivered: 0 });

            // 🔥 GET ORDERS VS FULFILLED
            const ovRes = await axios.get(`${API}/api/super-admin/analytics/orders-vs-fulfilled`, {
                params: { start, end }
            });
            setOrderVsConfirmed(ovRes.data || {});

            // ✅ CORRECT: Store entire API response directly
            // The API now returns: { totalOrders, fulfilled, delivered, rto }
            setFunnelStats(ovRes.data || {});
            console.log('✅ Funnel Stats:', ovRes.data);

            const dietRes = await axios.get(`${API}/api/super-admin/analytics/diet-plans`, { params: { start, end } });
            setDietStats(dietRes.data || { totalDietPlans: 0 });

            const fuRes = await axios.get(`${API}/api/super-admin/analytics/followups`, { params: { start, end } });
            setFollowUpStats(fuRes.data || { followUpsDue: 0 });

            const noConsultRes = await axios.get(`${API}/api/super-admin/analytics/no-consult`, { params: { start, end } });
            setNoConsultStats(noConsultRes.data || { noConsult: 0 });

            const ndrRes = await axios.get(`${API}/api/super-admin/analytics/ndr`, { params: { start, end } });
            setNdrStats(ndrRes.data || { ndr: 0 });

            const escRes = await axios.get(`${API}/api/super-admin/analytics/escalations`, { params: { start, end } });
            setEscalationStats(escRes.data || { open: 0, closed: 0 });

            const aovRes = await axios.get(`${API}/api/super-admin/analytics/aov`, { params: { start, end } });
            setAovStats(aovRes.data || {});

            const codRes = await axios.get(`${API}/api/super-admin/analytics/cod-delivered`, { params: { start, end } });
            setCodStats({ totalCount: codRes.data.totalCount || 0, totalAmount: codRes.data.totalAmount || 0 });

            const custRes = await axios.get(`${API}/api/super-admin/analytics/customer-stats`, { params: { start, end } });
            setCustomerStats(custRes.data || {});

            const payRes = await axios.get(`${API}/api/super-admin/analytics/payment-mode-stats`, {
                params: { start, end }
            });
            setPaymentStats(payRes.data);

            const salesRes = await axios.get(`${API}/api/super-admin/analytics/sales-per-day`, {
                params: { start, end }
            });

            // Sum total sales from all days
            const totalSales = salesRes.data.reduce((sum, d) => sum + d.totalSales, 0);
            setSalesStats({ totalSales });

            // -------------------- ORDER TREND --------------------
            setOrderTrendLoading(true);

            const trendRes = await axios.get(
                `${API}/api/super-admin/analytics/orders-over-time`,
                {
                    params: { start, end, filter: orderFilter }
                }
            );

            setOrderTrendData(trendRes.data.trend || []);
            setOrderTrendSummary({
                total: trendRes.data.total || 0,
                percentChange: trendRes.data.percentChange || 0
            });

            setOrderTrendLoading(false);

        } catch (err) {
            console.error("Analytics Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const loadCustomerTrends = async () => {
        try {
            setCustomerTrendLoading(true);
            const res = await axios.get(`${API}/api/super-admin/analytics/customer-trends`, {
                params: {
                    start,
                    end,
                    compareStart: compareStart || undefined,
                    compareEnd: compareEnd || undefined
                }
            });
            setCustomerTrendData(res.data || []);
        } catch (err) {
            console.error("Customer Trends Fetch Error:", err);
            setCustomerTrendData([]);
        } finally {
            setCustomerTrendLoading(false);
        }
    };

    useEffect(() => {
        loadAnalytics();
        loadCustomerTrends();
    }, [preset, customStart, customEnd, compareStart, compareEnd]);
    useEffect(() => {
        const loadOrderTrend = async () => {
            setOrderTrendLoading(true);
            try {
                const trendRes = await axios.get(
                    `${API}/api/super-admin/analytics/orders-over-time`,
                    {
                        params: {
                            start,
                            end,
                            filter: orderFilter,
                            compareStart: compareStart || undefined,
                            compareEnd: compareEnd || undefined
                        }
                    }
                );

                // 🔥 FIX: Filter out zero/null comparison data points
                const processedData = (trendRes.data.trend || []).map(point => ({
                    ...point,
                    previous: point.previous && point.previous > 0 ? point.previous : null
                }));

                setOrderTrendData(processedData);
                setOrderTrendSummary({
                    total: trendRes.data.total || 0,
                    comparison: trendRes.data.comparison || null
                });
            } catch (err) {
                console.error("Order Trend Fetch Error:", err);
            } finally {
                setOrderTrendLoading(false);
            }
        };
        loadOrderTrend();
    }, [start, end, orderFilter, compareStart, compareEnd]); // ADD comparison dates
    useEffect(() => {
        loadSummary();
    }, [start, end]);

    // ------------------- DATA HELPERS -------------------
    const ordersSplitPieData = [
        { name: "Online Orders", value: data.onlineOrders || 0 },
        { name: "Team Orders", value: data.teamOrders || 0 },
    ];

    const firstReturningPieData = [
        { name: "First-Time", value: firstReturning.firstTime || 0 },
        { name: "Returning", value: firstReturning.returning || 0 },
    ];

    // ------------------- UI RENDER -------------------

    // Custom Styles for consistent nice look
    const cardStyle = {
        borderRadius: "16px",
        boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)",
        border: "1px solid #EBF0F7",
        height: "100%",
        backgroundColor: "#fff",
        transition: "transform 0.2s",
        "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: "0px 8px 25px rgba(0, 0, 0, 0.08)",
        }
    };

    return (
        <Box sx={{ p: 3, backgroundColor: "#F4F7FE", minHeight: "100vh" }}>

            {/* --- HEADER TITLE --- */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: "#1B2559", letterSpacing: "-0.5px" }}>
                    Super Admin Analytics
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Overview of your sales, performance, and customer trends.
                </Typography>
            </Box>

            <Card sx={{ p: 2, mb: 4, borderRadius: "16px", boxShadow: "0px 2px 10px rgba(0,0,0,0.03)" }}>
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={2}
                >
                    {/* LEFT: main date range controls */}
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                        <FormControl size="small" sx={{ minWidth: 200, bgcolor: "#F4F7FE", borderRadius: 2 }}>
                            <InputLabel>Date Range</InputLabel>
                            <Select
                                value={preset}
                                label="Date Range"
                                onChange={(e) => setPreset(e.target.value)}
                                sx={{ borderRadius: 2 }}
                            >
                                {RANGE_OPTIONS.map((r) => (
                                    <MenuItem key={r} value={r}>{r}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {preset === "Custom Range" && (
                            <>
                                <TextField
                                    type="date"
                                    size="small"
                                    label="Start"
                                    InputLabelProps={{ shrink: true }}
                                    value={customStart}
                                    onChange={(e) => setCustomStart(e.target.value)}
                                />
                                <TextField
                                    type="date"
                                    size="small"
                                    label="End"
                                    InputLabelProps={{ shrink: true }}
                                    value={customEnd}
                                    onChange={(e) => setCustomEnd(e.target.value)}
                                />
                            </>
                        )}

                        <Box sx={{ bgcolor: "#EAF3FF", px: 2, py: 1, borderRadius: "10px", color: "#1976d2" }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                                📅 {start} → {end}
                            </Typography>
                        </Box>
                    </Stack>

                    {/* RIGHT: Comparison Button */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                        <Button
                            variant={compareStart && compareEnd ? "contained" : "outlined"}
                            color={compareStart && compareEnd ? "primary" : "inherit"}
                            onClick={() => {
                                setTempCompareStart(compareStart);
                                setTempCompareEnd(compareEnd);
                                setCompareDialogOpen(true);
                            }}
                            sx={{
                                borderRadius: "8px",
                                textTransform: "none",
                                fontWeight: 600,
                                minWidth: 120,
                            }}
                        >
                            📊 Compare
                        </Button>

                        {compareStart && compareEnd && (
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                    px: 2,
                                    py: 1,
                                    bgcolor: "#E8F5E9",
                                    borderRadius: "8px",
                                    border: "1px solid #4CAF50",
                                }}
                            >
                                <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#2e7d32" }}>
                                    ✓ {compareStart} to {compareEnd}
                                </Typography>
                                <Button
                                    size="small"
                                    onClick={handleComparisonReset}
                                    sx={{ minWidth: "auto", p: 0.5, color: "#d32f2f", fontSize: 16 }}
                                >
                                    ✕
                                </Button>
                            </Box>
                        )}
                    </Box>
                </Stack>
            </Card>
            <Dialog
                open={compareDialogOpen}
                onClose={() => setCompareDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 700, fontSize: 18 }}>
                    Select Period to Compare
                </DialogTitle>

                <DialogContent dividers sx={{ p: 3 }}>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <Box>
                            <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary", mb: 1 }}>
                                Comparison Start Date
                            </Typography>
                            <TextField
                                type="date"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={tempCompareStart}
                                onChange={(e) => setTempCompareStart(e.target.value)}
                                sx={{ "& input": { padding: "12px" } }}
                            />
                        </Box>

                        <Box>
                            <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary", mb: 1 }}>
                                Comparison End Date
                            </Typography>
                            <TextField
                                type="date"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={tempCompareEnd}
                                onChange={(e) => setTempCompareEnd(e.target.value)}
                                sx={{ "& input": { padding: "12px" } }}
                            />
                        </Box>

                        <Box sx={{ bgcolor: "#FFF3E0", p: 2, borderRadius: "8px", border: "1px solid #FFB74D" }}>
                            <Typography sx={{ fontSize: 12, color: "#E65100" }}>
                                <strong>💡 Tip:</strong> Compare against a past period to see growth or decline.
                            </Typography>
                        </Box>
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button
                        variant="outlined"
                        onClick={() => setCompareDialogOpen(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="outlined"
                        color="error"
                        onClick={handleComparisonReset}
                    >
                        Clear
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleComparisonSave}
                    >
                        Apply
                    </Button>
                </DialogActions>
            </Dialog>
            <Card
                sx={{
                    p: 2.5, // Increased padding slightly for breathing room
                    mb: 4,
                    borderRadius: "12px",
                    border: "1px solid #E0E0E0",
                    boxShadow: "0px 2px 4px rgba(0,0,0,0.02)", // Very subtle shadow
                    bgcolor: "#fff",
                }}
            >
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    divider={
                        <Divider
                            orientation="vertical"
                            flexItem
                            sx={{ display: { xs: "none", md: "block" }, borderColor: "#f0f0f0" }}
                        />
                    }
                    spacing={3}
                    justifyContent="space-between"
                    alignItems="center"
                >
                    {/* 1. Total Sales */}
                    <Box sx={{ textAlign: "center", width: "100%" }}>
                        <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5} mb={1}>
                            <Typography sx={{ fontSize: 13, color: "text.secondary", fontWeight: 500 }}>
                                Total Sales
                            </Typography>
                            <InfoOutlinedIcon sx={{ fontSize: 15, color: "text.disabled" }} />
                        </Stack>
                        {/* TOTAL SALES */}
                        {summaryLoading ? (
                            <Skeleton variant="text" width={100} height={40} sx={{ mx: "auto" }} />
                        ) : (
                            <Typography sx={{ fontSize: 22, fontWeight: 800, color: "#1B2559" }}>
                                ₹{summary.totalSales.toLocaleString("en-IN")}
                            </Typography>
                        )}

                    </Box>

                    {/* 2. Total Orders */}
                    <Box sx={{ textAlign: "center", width: "100%" }}>
                        <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5} mb={1}>
                            <Typography sx={{ fontSize: 13, color: "text.secondary", fontWeight: 500 }}>
                                Total Orders
                            </Typography>
                            <InfoOutlinedIcon sx={{ fontSize: 15, color: "text.disabled" }} />
                        </Stack>
                        {summaryLoading ? (
                            <Skeleton variant="text" width={60} height={40} sx={{ mx: "auto" }} />
                        ) : (
                            <Typography sx={{ fontSize: 22, fontWeight: 800, color: "#1B2559" }}>
                                {summary.totalOrders}
                            </Typography>
                        )}

                    </Box>

                    {/* 3. Average Order Value */}
                    <Box sx={{ textAlign: "center", width: "100%" }}>
                        <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5} mb={1}>
                            <Typography sx={{ fontSize: 13, color: "text.secondary", fontWeight: 500 }}>
                                Avg Order Value
                            </Typography>
                            <InfoOutlinedIcon sx={{ fontSize: 15, color: "text.disabled" }} />
                        </Stack>
                        {summaryLoading ? (
                            <Skeleton variant="text" width={80} height={40} sx={{ mx: "auto" }} />
                        ) : (
                            <Typography sx={{ fontSize: 22, fontWeight: 800, color: "#1B2559" }}>
                                ₹{summary.aov.toLocaleString("en-IN")}
                            </Typography>
                        )}

                    </Box>

                    {/* 4. Prepaid Stats */}
                    <Box sx={{ textAlign: "center", width: "100%" }}>
                        <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5} mb={1}>
                            <Typography sx={{ fontSize: 13, color: "text.secondary", fontWeight: 500 }}>
                                Prepaid %
                            </Typography>
                            <InfoOutlinedIcon sx={{ fontSize: 15, color: "text.disabled" }} />
                        </Stack>
                        {summaryLoading ? (
                            <Box>
                                <Skeleton variant="text" width={60} height={40} sx={{ mx: "auto" }} />
                                <Skeleton variant="text" width={80} height={20} sx={{ mx: "auto" }} />
                            </Box>
                        ) : (
                            <Box>
                                <Typography sx={{ fontSize: 22, fontWeight: 800 }}>
                                    {summary.prepaid.percentage}%
                                </Typography>
                                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                                    (₹{summary.prepaid.amount.toLocaleString("en-IN")})
                                </Typography>
                            </Box>
                        )}

                    </Box>

                    <Box sx={{ textAlign: "center", width: "100%" }}>
                        <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5} mb={1}>
                            <Typography sx={{ fontSize: 13, color: "text.secondary", fontWeight: 500 }}>
                                COD %
                            </Typography>
                            <InfoOutlinedIcon sx={{ fontSize: 15, color: "text.disabled" }} />
                        </Stack>
                        {summaryLoading ? (
                            <Box>
                                <Skeleton variant="text" width={60} height={40} sx={{ mx: "auto" }} />
                                <Skeleton variant="text" width={80} height={20} sx={{ mx: "auto" }} />
                            </Box>
                        ) : (
                            <Box>
                                <Typography sx={{ fontSize: 22, fontWeight: 800 }}>
                                    {summary.cod.percentage}%
                                </Typography>
                                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                                    (₹{summary.cod.amount.toLocaleString("en-IN")})
                                </Typography>
                            </Box>
                        )}

                    </Box>

                </Stack>
            </Card>

            <Grid container spacing={3}>

                {/* ========================== ROW 1 ========================== */}
                <Grid item xs={12} md={6}>
                    {/* AOV Chart */}
                    <AverageOrderValueCard
                        apiBase={API}
                        start={start}
                        end={end}
                        aovStats={aovStats}
                        compareMode={compareStart && compareEnd ? "custom" : "none"}
                        compareStart={compareStart}
                        compareEnd={compareEnd}
                        useCustomCompare={useCustomCompare}
                    />
                </Grid>


                <Grid item xs={12} md={6}>
                    {/* Total Orders Trend */}
                    <Card sx={{ p: 3, borderRadius: 3 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.2 }}>
                            <Typography sx={{ fontWeight: 700 }}>Total Orders</Typography>

                            <Select
                                size="small"
                                value={orderFilter}
                                onChange={(e) => setOrderFilter(e.target.value)}
                                sx={{ height: 32 }}
                            >
                                <MenuItem value="all">All</MenuItem>
                                <MenuItem value="cod">COD</MenuItem>
                                <MenuItem value="prepaid">Prepaid</MenuItem>
                            </Select>
                        </Box>

                        {orderTrendLoading ? (
                            <Skeleton height={40} width={140} />
                        ) : (
                            <Box>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                    <Typography sx={{ fontSize: 32, fontWeight: 900 }}>
                                        {orderTrendSummary.total}
                                    </Typography>

                                    {/* 🔥 ADD COMPARISON PERCENTAGE BADGE */}
                                    {compareStart && compareEnd && orderTrendSummary.comparison?.total && (
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 0.5,
                                                    px: 1.5,
                                                    py: 0.6,
                                                    borderRadius: "20px",
                                                    bgcolor: orderTrendSummary.percentChange >= 0 ? "#E8F5E9" : "#FFEBEE",
                                                    border: orderTrendSummary.percentChange >= 0 ? "1px solid #4CAF50" : "1px solid #F44336"
                                                }}
                                            >
                                                {orderTrendSummary.percentChange >= 0 ? (
                                                    <ArrowDropUpIcon sx={{ color: "#2e7d32", fontSize: 20 }} />
                                                ) : (
                                                    <ArrowDropDownIcon sx={{ color: "#d32f2f", fontSize: 20 }} />
                                                )}
                                                <Typography
                                                    sx={{
                                                        fontSize: 14,
                                                        fontWeight: 700,
                                                        color: orderTrendSummary.percentChange >= 0 ? "#2e7d32" : "#d32f2f"
                                                    }}
                                                >
                                                    {Math.abs(orderTrendSummary.percentChange).toFixed(2)}%
                                                </Typography>
                                            </Box>

                                            <Typography sx={{ fontSize: 12, color: "text.secondary", fontWeight: 600 }}>
                                                vs {orderTrendSummary.comparison.total}
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            </Box>
                        )}

                        <Typography sx={{ fontSize: 13, mt: 1, opacity: 0.7 }}>
                            Orders Over Time {compareStart && compareEnd && `(${start} vs ${compareStart})`}
                        </Typography>

                        {orderTrendLoading ? (
                            <Skeleton height={260} variant="rectangular" sx={{ mt: 2 }} />
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <LineChart data={orderTrendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                    <XAxis
                                        dataKey="time"
                                        tick={{ fontSize: 12 }}
                                        tickFormatter={(value) => {
                                            const isSingle = isSingleDay(start, end);
                                            return isSingle
                                                ? formatHourlyLabel(value)
                                                : formatDateLabel(value);
                                        }}
                                        interval={
                                            orderTrendData.length > 5
                                                ? Math.floor(orderTrendData.length / 3) - 1
                                                : 0
                                        }
                                    />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        content={({ active, payload, label }) => {
                                            if (!active || !payload) return null;

                                            return (
                                                <div style={{
                                                    background: "white",
                                                    padding: "10px",
                                                    borderRadius: "8px",
                                                    boxShadow: "0 2px 10px rgba(0,0,0,0.15)"
                                                }}>
                                                    <strong>{label}</strong>
                                                    {payload.map((entry, i) => (
                                                        <div key={i} style={{ color: entry.color, marginTop: 4 }}>
                                                            {entry.name === "current" ? start : compareStart}: {entry.value}
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        }}
                                    />
                                    <Legend
                                        formatter={(value) => {
                                            if (value === "current") return start;
                                            if (value === "previous") return compareStart;
                                            return value;
                                        }}
                                    />

                                    {/* Current Period Line */}
                                    <Line
                                        type="monotone"
                                        dataKey="current"
                                        name="current"
                                        stroke={COMMON_COLORS[0]}
                                        strokeWidth={3}
                                        dot={false}
                                        activeDot={{ r: 6 }}
                                    />

                                    {/* Comparison Period Line - Clean with connectNulls */}
                                    {orderTrendData.some(d => d.previous !== null && d.previous > 0) && (
                                        <Line
                                            type="monotone"
                                            dataKey="previous"
                                            name="previous"
                                            stroke={COMMON_COLORS[1]}
                                            strokeWidth={3}
                                            dot={false}
                                            activeDot={{ r: 6 }}
                                            strokeDasharray="5 5"
                                            connectNulls={true}  // 🔥 Connects valid points, skips nulls
                                        />
                                    )}
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </Card>
                </Grid>


                <Grid item xs={12} md={6}>

                    <OrdersFunnelCard data={funnelStats} />
                </Grid>

                <Grid item xs={12} md={6}>




                    <Card sx={{ p: 3, ...cardStyle }}>

                        <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            mb={2}
                        >
                            <Typography sx={{ fontWeight: 700, fontSize: 18, color: "#1B2559" }}>
                                Customer Trends Over Time
                            </Typography>

                            <Box sx={{ display: "flex", gap: 1 }}>
                                {/* NEW */}
                                <Button
                                    variant={visibleLines.newCustomers ? "contained" : "outlined"}
                                    size="small"
                                    onClick={() => toggleLine("newCustomers")}
                                    sx={{
                                        fontSize: "10px",
                                        borderRadius: "6px",
                                        borderColor: COMMON_COLORS[0],
                                        bgcolor: visibleLines.newCustomers
                                            ? COMMON_COLORS[0]
                                            : "transparent",
                                        color: visibleLines.newCustomers
                                            ? "white"
                                            : COMMON_COLORS[0],
                                    }}
                                >
                                    NEW
                                </Button>

                                <Button
                                    variant={visibleLines.active ? "contained" : "outlined"}
                                    size="small"
                                    onClick={() => toggleLine("active")}
                                    sx={{
                                        fontSize: "10px",
                                        borderRadius: "6px",
                                        borderColor: COMMON_COLORS[1],
                                        bgcolor: visibleLines.active
                                            ? COMMON_COLORS[1]
                                            : "transparent",
                                        color: visibleLines.active ? "white" : COMMON_COLORS[1],
                                    }}
                                >
                                    ACTIVE
                                </Button>

                                <Button
                                    variant={visibleLines.lost ? "contained" : "outlined"}
                                    size="small"
                                    onClick={() => toggleLine("lost")}
                                    sx={{
                                        fontSize: "10px",
                                        borderRadius: "6px",
                                        borderColor: COMMON_COLORS[2],
                                        bgcolor: visibleLines.lost
                                            ? COMMON_COLORS[2]
                                            : "transparent",
                                        color: visibleLines.lost ? "white" : COMMON_COLORS[2],
                                    }}
                                >
                                    LOST
                                </Button>
                            </Box>
                        </Stack>

                        {/* ---------- Trend Chart ---------- */}
                        {customerTrendLoading ? (
                            <Skeleton variant="rectangular" height={350} />
                        ) : customerTrendData.length === 0 ? (
                            <Box sx={{ textAlign: "center", py: 10 }}>
                                <Typography color="text.secondary">
                                    No customer trend data available
                                </Typography>
                            </Box>
                        ) : (
                            <Box>
                                <ResponsiveContainer width="100%" height={340}>
                                    <LineChart data={customerTrendData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 11 }}
                                            tickFormatter={(value) => {
                                                const isSingle = isSingleDay(start, end);
                                                return isSingle
                                                    ? formatHourlyLabel(value)
                                                    : formatDateLabel(value);
                                            }}
                                            interval={
                                                customerTrendData.length > 5
                                                    ? Math.floor(customerTrendData.length / 3) - 1
                                                    : 0
                                            }
                                        />
                                        <YAxis tick={{ fontSize: 11 }} />

                                        <Tooltip
                                            content={({ active, payload, label }) => {
                                                if (!active || !payload || payload.length === 0) return null;

                                                return (
                                                    <div
                                                        style={{
                                                            background: "white",
                                                            padding: "12px",
                                                            borderRadius: "8px",
                                                            boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
                                                            border: "1px solid #e0e0e0",
                                                            minWidth: "200px"
                                                        }}
                                                    >
                                                        <strong style={{ fontSize: "12px", color: "#333" }}>
                                                            {label}
                                                        </strong>

                                                        {payload.map((entry, i) => {
                                                            let label = entry.name;
                                                            if (entry.name === "newCustomers") {
                                                                label = start === end ? "New (Today)" : "New Customers";
                                                            } else if (entry.name === "compareNewCustomers") {
                                                                label = compareStart === compareEnd ? "New (Comparison)" : "New (Compare)";
                                                            }

                                                            return (
                                                                <div
                                                                    key={i}
                                                                    style={{
                                                                        color: entry.color,
                                                                        marginTop: "6px",
                                                                        fontSize: "12px",
                                                                        fontWeight: 600,
                                                                        display: "flex",
                                                                        justifyContent: "space-between",
                                                                        gap: "20px"
                                                                    }}
                                                                >
                                                                    <span>{label}:</span>
                                                                    <strong>{entry.value?.toLocaleString() || 0}</strong>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            }}
                                        />

                                        <Legend
                                            formatter={(value) => {
                                                if (value === "newCustomers") return `New (${start})`;
                                                if (value === "compareNewCustomers") return `New (${compareStart})`;
                                                if (value === "active") return "Active";
                                                if (value === "lost") return "Lost";
                                                return value;
                                            }}
                                            wrapperStyle={{ paddingTop: "10px" }}
                                        />

                                        {/* NEW CUSTOMERS LINE */}
                                        {visibleLines.newCustomers && (
                                            <Line
                                                dataKey="newCustomers"
                                                stroke={COMMON_COLORS[0]}
                                                strokeWidth={3}
                                                dot={{ r: 4, fill: COMMON_COLORS[0] }}
                                                name="newCustomers"
                                            />
                                        )}

                                        {/* COMPARE NEW CUSTOMERS LINE */}
                                        {visibleLines.newCustomers &&
                                            compareStart &&
                                            compareEnd &&
                                            customerTrendData.some((d) => d.compareNewCustomers > 0) && (
                                                <Line
                                                    dataKey="compareNewCustomers"
                                                    stroke={COMMON_COLORS[1]}
                                                    strokeWidth={3}
                                                    strokeDasharray="5 5"
                                                    dot={{ r: 4, fill: COMMON_COLORS[1] }}
                                                    name="compareNewCustomers"
                                                />
                                            )}

                                        {/* ACTIVE CUSTOMERS LINE */}
                                        {visibleLines.active && (
                                            <Line
                                                dataKey="active"
                                                stroke={COMMON_COLORS[1]}
                                                strokeWidth={3}
                                                dot={{ r: 4, fill: COMMON_COLORS[1] }}
                                                name="active"
                                            />
                                        )}

                                        {/* LOST CUSTOMERS LINE */}
                                        {visibleLines.lost && (
                                            <Line
                                                dataKey="lost"
                                                stroke={COMMON_COLORS[3]}
                                                strokeWidth={3}
                                                dot={{ r: 4, fill: COMMON_COLORS[3] }}
                                                name="lost"
                                            />
                                        )}
                                    </LineChart>
                                </ResponsiveContainer>

                                {/* Summary Stats Below Chart */}
                                <Box
                                    sx={{
                                        mt: 3,
                                        p: 2,
                                        bgcolor: "#F5F5F5",
                                        borderRadius: "8px",
                                        display: "grid",
                                        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
                                        gap: 2
                                    }}
                                >
                                    {visibleLines.newCustomers && (
                                        <Box sx={{ textAlign: "center" }}>
                                            <Typography sx={{ fontSize: 11, color: "text.secondary", fontWeight: 600 }}>
                                                Total New
                                            </Typography>
                                            <Typography sx={{ fontSize: 18, fontWeight: 700, color: COMMON_COLORS[0] }}>
                                                {customerTrendData.reduce((sum, d) => sum + (d.newCustomers || 0), 0).toLocaleString()}
                                            </Typography>
                                        </Box>
                                    )}

                                    {visibleLines.active && (
                                        <Box sx={{ textAlign: "center" }}>
                                            <Typography sx={{ fontSize: 11, color: "text.secondary", fontWeight: 600 }}>
                                                Total Active
                                            </Typography>
                                            <Typography sx={{ fontSize: 18, fontWeight: 700, color: COMMON_COLORS[1] }}>
                                                {customerTrendData.reduce((sum, d) => sum + (d.active || 0), 0).toLocaleString()}
                                            </Typography>
                                        </Box>
                                    )}

                                    {visibleLines.lost && (
                                        <Box sx={{ textAlign: "center" }}>
                                            <Typography sx={{ fontSize: 11, color: "text.secondary", fontWeight: 600 }}>
                                                Total Lost
                                            </Typography>
                                            <Typography sx={{ fontSize: 18, fontWeight: 700, color: COMMON_COLORS[3] }}>
                                                {customerTrendData.reduce((sum, d) => sum + (d.lost || 0), 0).toLocaleString()}
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            </Box>
                        )}
                    </Card>
                </Grid>

                <Grid item xs={12}>

                </Grid>
                <Grid container spacing={3} sx={{ mb: 4 }}>


                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ p: 3, ...cardStyle }}>
                            <LeadsOverviewDonut
                                totalLeads={leadStats.totalLeads}
                                followUpDue={followUpStats.followUpsDue}
                                noConsult={noConsultStats.noConsult}
                            />
                        </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ p: 3, ...cardStyle }}>
                            <OrdersSplitPie
                                onlineOrders={data.onlineOrders}
                                teamOrders={data.teamOrders}
                            />
                        </Card>
                    </Grid>


                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ p: 3, ...cardStyle }}>
                            <FirstReturningDonut
                                firstTime={firstReturning.firstTime}
                                returning={firstReturning.returning}
                            />
                        </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ p: 3, ...cardStyle }}>
                            <EscalationDonut
                                open={escalationStats.open}
                                closed={escalationStats.closed}
                            />
                        </Card>
                    </Grid>

                </Grid>


                <Grid item xs={12}>
                    <CustomerCohortHeatmap />
                </Grid>
            </Grid>




            <Dialog open={deliveredOpen} onClose={() => setDeliveredOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Delivered Sales Per Agent</DialogTitle>
                <DialogContent dividers sx={{ p: 2 }}>
                    {deliveredLoading ? (
                        <Skeleton height={40} />
                    ) : deliveredAgents.length === 0 ? (
                        <Typography>No delivered sales yet</Typography>
                    ) : (
                        deliveredAgents.map((a, index) => {
                            const revenue = a.totalDeliveredSales || 0;
                            let medal = "";
                            if (index === 0) medal = "🥇";
                            else if (index === 1) medal = "🥈";
                            else if (index === 2) medal = "🥉";
                            return (
                                <Box
                                    key={index}
                                    sx={{
                                        p: 1.3, mb: 1, borderRadius: 2,
                                        bgcolor: index < 3 ? "#FFF9E5" : "#F4F9FF",
                                        border: index < 3 ? "1px solid #FFD966" : "1px solid #e0e0e0",
                                        display: "flex", justifyContent: "space-between", alignItems: "center",
                                    }}
                                >
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        <Typography sx={{ fontSize: 20 }}>{medal}</Typography>
                                        <Typography sx={{ fontWeight: 600 }}>{a.fullName}</Typography>
                                    </Box>
                                    <Typography sx={{ fontWeight: 700, color: index < 3 ? "#B8860B" : "#1976d2" }}>
                                        ₹{revenue.toLocaleString()}
                                    </Typography>
                                </Box>
                            );
                        })
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeliveredOpen(false)} variant="contained">Close</Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
}

