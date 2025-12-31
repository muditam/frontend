import React, { useEffect, useState } from "react";
import {
    Box,
    Typography,
    Avatar,
    IconButton,
    Button,
    Slide,
    Grid,
    CircularProgress,
} from "@mui/material";
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";

const giftPrizes = [
    { rank: 1, label: "Gift worth 3000", color: "#f39c12" },
    { rank: 2, label: "Gift worth 2000", color: "#999" },
    { rank: 3, label: "Gift worth 1000", color: "#e67e22" },
    { rank: 4, label: "Assured Gift" },
    { rank: 5, label: "Assured Gift" },
    { rank: 6, label: "Assured Gift" },
    { rank: 7, label: "Assured Gift" }, 
    { rank: 8, label: "Assured Gift" },
    { rank: 9, label: "Assured Gift" },
    { rank: 10, label: "Assured Gift" },
];

const getAvatarUrl = (name) =>
    `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}&radius=50&backgroundType=gradientLinear`;

const getRankSuffix = (num) => {
    if (num === 1) return "1st";
    if (num === 2) return "2nd";
    if (num === 3) return "3rd";
    if (num % 10 === 1 && num !== 11) return `${num}st`;
    if (num % 10 === 2 && num !== 12) return `${num}nd`;
    if (num % 10 === 3 && num !== 13) return `${num}rd`; 
    return `${num}th`;
};

const getFirstName = (name) => name.trim().split(" ")[0];
 
const getPromotionMonthStart = (joiningDate) => {
  if (!joiningDate) return new Date(8640000000000000); // far future
  const jd = new Date(joiningDate);
  if (isNaN(jd)) return new Date(8640000000000000);
  const threshold = new Date(jd);
  threshold.setDate(threshold.getDate() + 60); // day they cross 60 days
  return new Date(threshold.getFullYear(), threshold.getMonth() + 1, 1); // next month's 1st
};

// Keep in Bloom until the 1st of the month after 60 days
const isEligibleForBloom = (joiningDate, today = new Date()) =>
  today < getPromotionMonthStart(joiningDate);


const BloomLeaderboard = () => {
    const [data, setData] = useState([]);
    const [showGifts, setShowGifts] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await fetch("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees");
                const all = await res.json();
                const today = new Date();
                const agents = all.filter(
                   (e) =>
                     e.status === "active" &&
                     (e.role === "Sales Agent" || e.role === "Retention Agent") &&
                     e.joiningDate &&
                     isEligibleForBloom(e.joiningDate, today)
                 );

                 
                const agentNames = agents.map((a) => a.fullName);
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

                setData(sorted);
            } catch (err) {
                console.error("Error fetching leaderboard", err);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    const podium = data.slice(0, 3);
    const rest = data.slice(3);

    const podiumStyles = [
        { bg: "#FFD700", height: 160 },
        { bg: "#C0C0C0", height: 130 },
        { bg: "#CD7F32", height: 110 },
    ];

    return (
        <Box sx={{ minHeight: "90vh", px: 2, py: 4, position: "relative", bgcolor: "#f8f6ff" }}>
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
                    <Typography variant="h6" fontWeight={800} color="#7c3aed" mb={2} textAlign="center">
                        Leaderboard Rewards
                    </Typography>
                    <Box sx={{ bgcolor: "#fff", borderRadius: 3, p: 2, mb: 2, border: "1px solid #e0d7ff" }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", fontWeight: 600, color: "#7c3aed", mb: 1 }}>
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

            <Typography variant="h4" fontWeight={700} mb={5} textAlign="center" color="#333">
                🌱 Champions in Training
            </Typography>

            {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
                    <CircularProgress size={60} sx={{ color: "#a259ff" }} />
                </Box>
            ) : (
                <>
                    <Box display="flex" justifyContent="center" alignItems="end" gap={6} mb={5}>
                        {[1, 0, 2].map((i) => {
                            const user = podium[i];
                            if (!user) return <Box width={80} />;
                            const { bg, height } = podiumStyles[i];
                            return (
                                <Box key={user.name} textAlign="center">
                                    <Avatar
                                        src={getAvatarUrl(user.name)}
                                        sx={{ width: 70, height: 70, mb: 1, border: "3px solid #fff", boxShadow: 2 }}
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
                                        <Typography fontWeight={800} color="#7c3aed" fontSize={18} sx={{ width: 24 }}>
                                            {getRankSuffix(idx + 4)}
                                        </Typography>
                                        <Avatar src={getAvatarUrl(user.name)} sx={{ width: 40, height: 40, mx: 1.5 }} />
                                        <Box>
                                            <Typography fontWeight={700}>{getFirstName(user.name)}</Typography>
                                            <Typography fontSize={13} fontWeight={600} color="#4caf50">
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

export default BloomLeaderboard;
