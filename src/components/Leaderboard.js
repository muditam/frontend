import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  Button,
  Slide,
  Grid,
  CircularProgress,
  Tabs,
  Tab,
  FormControl,
  Select,
  MenuItem,
} from "@mui/material";
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";

// rewards same as before
const giftPrizes = [
  { rank: 1, label: "Gift worth 1500" },
  { rank: 2, label: "Gift worth 1200" },
  { rank: 3, label: "Gift worth 1000" },
  { rank: 4, label: "Gift worth 800" },
  { rank: 5, label: "Gift worth 500" },
];

const getAvatarUrl = (name) =>
  `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
    name
  )}&radius=50&backgroundType=gradientLinear`;

const getRankSuffix = (num) => {
  if (num === 1) return "1st";
  if (num === 2) return "2nd";
  if (num === 3) return "3rd";
  if (num % 10 === 1 && num !== 11) return `${num}st`;
  if (num % 10 === 2 && num !== 12) return `${num}nd`;
  if (num % 10 === 3 && num !== 13) return `${num}rd`;
  return `${num}th`;
};

const getPromotionMonthStart = (joiningDate) => {
  if (!joiningDate) return new Date(8640000000000000); // far future
  const jd = new Date(joiningDate);
  if (isNaN(jd)) return new Date(8640000000000000);
  const threshold = new Date(jd);
  threshold.setDate(threshold.getDate() + 60); // day they cross 60 days
  return new Date(threshold.getFullYear(), threshold.getMonth() + 1, 1); // next month's 1st
};

// Eligible for leaderboard starting the 1st of the month after 60 days
const isEligibleForLeaderboard = (joiningDate, today = new Date()) =>
  today >= getPromotionMonthStart(joiningDate);

const getFirstName = (name) => (name ? name.trim().split(" ")[0] : "");

// util toISO
const toISODate = (d) => d.toISOString().split("T")[0];

// display dd/mm/yyyy
const toDisplay = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
};

// build last 12 months list for filter
const buildMonthOptions = () => {
  const now = new Date();
  const arr = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-IN", {
      month: "long",
      year: "numeric",
    });
    arr.push({ value, label, year: d.getFullYear(), month: d.getMonth() });
  }
  return arr;
};

// get first and last day for a Y-M
const getMonthRangeFromValue = (ymValue) => {
  const [yStr, mStr] = ymValue.split("-");
  const year = Number(yStr);
  const month = Number(mStr) - 1; // 0-based
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0); // last day of month
  return { from: toISODate(start), to: toISODate(end) };
};

// ------------------------------
// WEEK BUILDER (with carry-over)
// ------------------------------
const getWeeksForCurrentMonth = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-based

  const firstOfMonth = new Date(year, month, 1);
  const firstDay = firstOfMonth.getDay(); // 0=Sun,1=Mon...

  // Find first Monday of this month (for week-1 start)
  let firstMonday = new Date(firstOfMonth);
  if (firstDay !== 1) {
    const toAdd = (8 - firstDay) % 7;
    firstMonday.setDate(firstMonday.getDate() + toAdd);
  }

  // build week ranges (Mon-Sun)
  const weeks = [];
  let currentStart = new Date(firstMonday);
  for (let i = 0; i < 5; i++) {
    const start = new Date(currentStart);
    const end = new Date(currentStart);
    end.setDate(end.getDate() + 6);

    if (start.getMonth() !== month && i > 0) break;

    weeks.push({
      label: `Week ${i + 1}`,
      from: toISODate(start),
      to: toISODate(end),
    });

    currentStart = new Date(currentStart);
    currentStart.setDate(currentStart.getDate() + 7);
  }

  return weeks.slice(0, 4);
};

// monthly range: 1st → today (for current month fast path)
const getCurrentMonthRange = () => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    from: toISODate(start),
    to: toISODate(today),
  };
};

const Leaderboard = () => {
  const [data, setData] = useState([]);
  const [showGifts, setShowGifts] = useState(false);
  const [loading, setLoading] = useState(true);

  // 0..3 = Week1..Week4, 4 = Monthly
  const [activeTab, setActiveTab] = useState(0);

  const [eligibleAgents, setEligibleAgents] = useState([]);
  const [weeks] = useState(() => getWeeksForCurrentMonth());

  // monthly filter
  const monthOptions = buildMonthOptions();
  const currentMonthValue = monthOptions[0]?.value; // e.g. 2025-10
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue);

  // 1) fetch employees once
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch(
          "https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees"
        );
        const all = await res.json();
        const today = new Date();
        const agents = all.filter(
          (e) =>
            e.status === "active" &&
            (e.role === "Sales Agent" || e.role === "Retention Agent") &&
            e.joiningDate &&
            isEligibleForLeaderboard(e.joiningDate, today)
        );
        setEligibleAgents(agents);
      } catch (err) {
        console.error("Error fetching employees", err);
        setEligibleAgents([]);
      }
    };
    fetchEmployees();
  }, []);

  // helper to load MONTHLY data (CURRENT month – fast path)
  const loadMonthlyDataCurrent = useCallback(async (agents) => {
    const agentNames = agents.map((a) => a.fullName);
    if (!agentNames.length) return [];
    const progressRes = await fetch(
      "https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales/progress-multiple",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names: agentNames }),
      }
    );
    const salesData = await progressRes.json();
    const withSales = agents.map((agent) => {
      const match = salesData.find((x) => x.name === agent.fullName);
      return {
        name: agent.fullName,
        sales: match?.total || 0,
      };
    });
    const sorted = withSales
      .filter((x) => x.sales > 0 && x.name.trim() !== "Online Order")
      .sort((a, b) => b.sales - a.sales);
    return sorted;
  }, []);

  // helper to load MONTHLY data (ANY selected month – per agent)
  const loadMonthlyDataForMonth = useCallback(
    async (agents, from, to) => {
      const rows = await Promise.all(
        agents.map(async (agent) => {
          try {
            const url = new URL(
              "https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales/progress"
            );
            url.searchParams.set("name", agent.fullName);
            url.searchParams.set("from", from);
            url.searchParams.set("to", to);
            const res = await fetch(url.toString());
            const data = await res.json();
            return {
              name: agent.fullName,
              sales: Number(data?.total || 0),
            };
          } catch (err) {
            return {
              name: agent.fullName,
              sales: 0,
            };
          }
        })
      );
      return rows
        .filter((x) => x.sales > 0 && x.name.trim() !== "Online Order")
        .sort((a, b) => b.sales - a.sales);
    },
    []
  );

  // helper to load WEEKLY data
  const loadWeeklyData = useCallback(
    async (agents, from, to) => {
      const rows = await Promise.all(
        agents.map(async (agent) => {
          try {
            const url = new URL(
              "https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales/progress"
            );
            url.searchParams.set("name", agent.fullName);
            url.searchParams.set("from", from);
            url.searchParams.set("to", to);
            const res = await fetch(url.toString());
            const data = await res.json();
            return {
              name: agent.fullName,
              sales: Number(data?.total || 0),
            };
          } catch (err) {
            return {
              name: agent.fullName,
              sales: 0,
            };
          }
        })
      );

      return rows
        .filter((x) => x.sales > 0 && x.name.trim() !== "Online Order")
        .sort((a, b) => b.sales - a.sales);
    },
    []
  );

  // load data whenever tab / employees / selectedMonth changes
  useEffect(() => {
    const run = async () => {
      if (!eligibleAgents.length) {
        setData([]);
        setLoading(false);
        return;
      }
      setLoading(true);

      try {
        // week tabs
        if (activeTab >= 0 && activeTab <= 3) {
          const weekObj = weeks[activeTab];
          if (!weekObj) {
            setData([]);
          } else {
            const weeklyData = await loadWeeklyData(
              eligibleAgents,
              weekObj.from,
              weekObj.to
            );
            setData(weeklyData);
          }
        } else {
          // monthly tab
          // if selectedMonth is current month → fast path
          if (selectedMonth === currentMonthValue) {
            const monthlyData = await loadMonthlyDataCurrent(eligibleAgents);
            setData(monthlyData);
          } else {
            // else fetch per agent using from/to
            const { from, to } = getMonthRangeFromValue(selectedMonth);
            const monthlyData = await loadMonthlyDataForMonth(
              eligibleAgents,
              from,
              to
            );
            setData(monthlyData);
          }
        }
      } catch (err) {
        console.error("Error loading leaderboard data:", err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [
    activeTab,
    eligibleAgents,
    weeks,
    loadWeeklyData,
    loadMonthlyDataCurrent,
    loadMonthlyDataForMonth,
    selectedMonth,
    currentMonthValue,
  ]);

  // current range text (for UI only)
  const currentRangeText = (() => {
    if (activeTab >= 0 && activeTab <= 3) {
      const wk = weeks[activeTab];
      if (!wk) return "";
      return `${toDisplay(wk.from)} – ${toDisplay(wk.to)}`;
    } else {
      if (selectedMonth === currentMonthValue) {
        const { from, to } = getCurrentMonthRange();
        return `${toDisplay(from)} – ${toDisplay(to)}`;
      } else {
        const { from, to } = getMonthRangeFromValue(selectedMonth);
        return `${toDisplay(from)} – ${toDisplay(to)}`;
      }
    }
  })();

  const podium = data.slice(0, 3);
  const rest = data.slice(3);

  const podiumStyles = [
    { bg: "#FFD700", height: 160 },
    { bg: "#C0C0C0", height: 130 },
    { bg: "#CD7F32", height: 110 },
  ];

  return (
    <Box
      sx={{
        minHeight: "90vh",
        px: 2,
        py: 4,
        position: "relative",
        bgcolor: "#f8f6ff",
      }}
    >
      {/* Gift Button */}
      <IconButton
        onClick={() => setShowGifts(!showGifts)}
        sx={{
          position: "absolute",
          top: 20,
          right: 30,
          backgroundColor: "#fff",
          boxShadow: 2,
        }}
      >
        <CardGiftcardIcon sx={{ color: "#a259ff" }} />
      </IconButton>

      {/* Rewards Panel */}
      <Slide direction="left" in={showGifts} mountOnEnter unmountOnExit>
        <Box
          sx={{
            position: "fixed",
            top: 70,
            right: 30,
            width: 340,
            bgcolor: "#f4ecff",
            borderRadius: 4,
            boxShadow: 4,
            zIndex: 999,
            p: 3,
          }}
        >
          <Typography
            variant="h6"
            fontWeight={800}
            color="#7c3aed"
            mb={2}
            textAlign="center"
          >
            Leaderboard Rewards
          </Typography>
          <Box
            sx={{
              bgcolor: "#fff",
              borderRadius: 3,
              p: 2,
              mb: 2,
              border: "1px solid #e0d7ff",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 600,
                color: "#7c3aed",
                mb: 1,
              }}
            >
              <span>Rank</span>
              <span>Reward</span>
            </Box>
            {giftPrizes.map((gift) => (
              <Box
                key={gift.rank}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1,
                  color: gift.color || "#5b42bd",
                  fontWeight: 500,
                }}
              >
                <span>{getRankSuffix(gift.rank)}</span>
                <span>{gift.label}</span>
              </Box>
            ))}
          </Box>
          <Button
            onClick={() => setShowGifts(false)}
            fullWidth
            variant="contained"
            sx={{ mt: 3, backgroundColor: "#7c3aed", fontWeight: 700 }}
          >
            Close
          </Button>
        </Box>
      </Slide>

      {/* Header */}
      <Typography
        variant="h4"
        fontWeight={700}
        mb={2}
        textAlign="center"
        color="#333"
      >
        🏆 Muditam Leaderboard
      </Typography>

      {/* Tabs + Monthly Filter */}
      <Box
        display="flex"
        justifyContent="center"
        gap={2}
        alignItems="center"
        mb={3.5}
        flexWrap="wrap"
      >
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            bgcolor: "#fff",
            borderRadius: 999,
            px: 1,
            boxShadow: "0 4px 18px rgba(0,0,0,0.05)",
          }}
        >
          {weeks.map((wk, idx) => (
            <Tab
              key={wk.label}
              label={wk.label}
              value={idx}
              sx={{ textTransform: "none", fontWeight: 600, minHeight: 42 }}
            />
          ))}
          <Tab
            label="Monthly"
            value={4}
            sx={{ textTransform: "none", fontWeight: 600, minHeight: 42 }}
          />
        </Tabs>

        {/* RIGHT SIDE → Monthly Filter */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <Select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              setActiveTab(4); // jump to Monthly tab when month is changed
            }}
            sx={{
              bgcolor: "#fff",
              borderRadius: 999,
            }}
          >
            {monthOptions.map((m) => (
              <MenuItem key={m.value} value={m.value}>
                {m.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* date range below */}
      <Box textAlign="center" mb={2}>
        <Typography
          variant="body2"
          sx={{ mt: 0.5, color: "#6b7280", fontWeight: 500 }}
        >
          {activeTab <= 3
            ? `${weeks[activeTab]?.label || ""} · ${currentRangeText}`
            : `Monthly · ${currentRangeText}`}
        </Typography>
      </Box>

      {loading ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="40vh"
        >
          <CircularProgress size={60} sx={{ color: "#a259ff" }} />
        </Box>
      ) : (
        <>
          {/* Podium */}
          <Box
            display="flex"
            justifyContent="center"
            alignItems="end"
            gap={6}
            mb={5}
          >
            {[1, 0, 2].map((i) => {
              const user = podium[i];
              if (!user) return <Box key={i} width={80} />;
              const { bg, height } = podiumStyles[i];
              return (
                <Box key={user.name} textAlign="center">
                  <Avatar
                    src={getAvatarUrl(user.name)}
                    sx={{
                      width: 70,
                      height: 70,
                      mb: 1,
                      border: "3px solid #fff",
                      boxShadow: 2,
                    }}
                  />
                  <Box
                    sx={{
                      background: bg,
                      width: 70,
                      height,
                      borderRadius: 2,
                      position: "relative",
                      mx: "auto",
                    }}
                  >
                    <Box
                      sx={{
                        position: "absolute",
                        top: -20,
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "#fff",
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 2,
                        fontWeight: 600,
                        fontSize: 13,
                        color: "#5b42bd",
                        boxShadow: 1,
                      }}
                    >
                      ₹{Math.round(user.sales).toLocaleString()}
                    </Box>
                    <Typography
                      sx={{
                        position: "absolute",
                        bottom: 8,
                        left: "50%",
                        transform: "translateX(-50%)",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 16,
                      }}
                    >
                      {getRankSuffix(i + 1)}
                    </Typography>
                  </Box>
                  <Typography mt={1} fontWeight={600} fontSize={14}>
                    {getFirstName(user.name)}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          {/* Grid of others */}
          <Box maxWidth="900px" mx="auto">
            <Grid container spacing={1.5}>
              {rest.map((user, idx) => (
                <Grid item xs={12} sm={6} md={4} key={user.name}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      background: "#fff",
                      borderRadius: 2,
                      px: 2,
                      py: 1.5,
                      boxShadow: 1,
                    }}
                  >
                    <Typography
                      fontWeight={800}
                      color="#7c3aed"
                      fontSize={18}
                      sx={{ width: 24 }}
                    >
                      {getRankSuffix(idx + 4)}
                    </Typography>
                    <Avatar
                      src={getAvatarUrl(user.name)}
                      sx={{ width: 40, height: 40, mx: 1.5 }}
                    />
                    <Box>
                      <Typography fontWeight={700}>
                        {getFirstName(user.name)}
                      </Typography>
                      <Typography
                        fontSize={13}
                        fontWeight={600}
                        color="#4caf50"
                      >
                        ₹{Math.round(user.sales).toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </>
      )}
    </Box>
  );
};

export default Leaderboard;
