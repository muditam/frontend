import React, { useState, useEffect } from "react";
import { Popover, Box, Typography, Button, IconButton, Slide } from "@mui/material";
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents"; // Trophy

// --- Gift Data ---
const giftPrizes = [
  { rank: 1, label: "Gift worth 5000" },
  { rank: 2, label: "Gift worth 3000" },
  { rank: 3, label: "Gift worth 2000" },
  { rank: 4, label: "Assured Gift" },
  { rank: 5, label: "Assured Gift" },
  { rank: 6, label: "Assured Gift" },
  { rank: 7, label: "Assured Gift" },
  { rank: 8, label: "Assured Gift" },
  { rank: 9, label: "Assured Gift" },
  { rank: 10, label: "Assured Gift" },
];

const GIFT_CONDITION_NOTE = "Condition: Minimum ₹3,00,000 sales required";

const getAvatarUrl = (name) =>
  `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}&backgroundType=gradientLinear&radius=50`;

const podiumColors = [
  // 1st: Gold (modern, vibrant, soft glow)
  "linear-gradient(180deg,#FFD700 60%,#FFB347 95%)",
  // 2nd: Platinum/Silver (modern cool)
  "linear-gradient(180deg,#DCE3EB 50%,#A8B2BD 100%)",
  // 3rd: Rose-bronze
  "linear-gradient(180deg,#E9BFA9 40%,#D88A5B 90%)",
];

const podiumGlow = [
  "0 0 32px 0 #ffe17e99, 0 1px 6px #ffd70044",
  "0 0 28px 0 #d6e0efbb, 0 1px 6px #A8B2BD44",
  "0 0 26px 0 #f1bfa2a5, 0 1px 6px #D88A5B44",
];

const getRankSuffix = (num) => {
  if (num === 1) return "1st";
  if (num === 2) return "2nd";
  if (num === 3) return "3rd";
  if (num % 10 === 1 && num !== 11) return `${num}st`;
  if (num % 10 === 2 && num !== 12) return `${num}nd`;     
  if (num % 10 === 3 && num !== 13) return `${num}rd`; 
  return `${num}th`;
};

const getFirstName = (fullName) => {
  if (!fullName) return "";
  const trimmed = fullName.trim();
  const first = trimmed.split(" ").find((part) => part.length > 0);
  return first || "";
};

const getPodiumDisplay = (data) => [
  data[1], // left: 2nd
  data[0], // center: 1st
  data[2], // right: 3rd
];

export default function LeaderboardPopover({ open, anchorEl, onClose }) {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [showGifts, setShowGifts] = useState(false);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoadingLeaderboard(true);
      try {
        const agentsRes = await fetch("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees");
        const agentsArr = await agentsRes.json();

        const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90); 

          const agents = agentsArr.filter(
            (emp) =>
              emp.status === "active" &&
              (emp.role === "Sales Agent" || emp.role === "Retention Agent") &&
              emp.joiningDate && new Date(emp.joiningDate) <= ninetyDaysAgo
          );
        const agentSales = await Promise.all(
          agents.map(async (agent) => {
            try {
              const salesRes = await fetch(
                `https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales/progress?name=${encodeURIComponent(agent.fullName)}`
              );
              const data = await salesRes.json();
              return { name: agent.fullName, sales: data.total || 0 };
            } catch {
              return { name: agent.fullName, sales: 0 };
            }
          })
        );
        const filtered = agentSales.filter((a) => a.sales > 0);
        filtered.sort((a, b) => b.sales - a.sales);
        setLeaderboardData(filtered);
      } catch (e) {
        setLeaderboardData([]);
      }
      setLoadingLeaderboard(false);
    };
    if (open) fetchLeaderboard();
  }, [open]);

  const top3 = leaderboardData.slice(0, 3);
  const podiumDisplay = getPodiumDisplay(top3);

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={() => {
        setShowGifts(false);
        onClose();
      }}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }} 
      transformOrigin={{ vertical: "top", horizontal: "center" }}
      PaperProps={{
        sx: {
          mt: 1,
          borderRadius: 5,
          minWidth: 410,
          maxWidth: 450,
          minHeight: 685, // +15px
          maxHeight: 720,
          boxShadow: "0 10px 32px 0 rgba(16,18,48,0.26)",
          background: "linear-gradient(120deg,#242e4f 0%,#513a6c 100%)",
          color: "#fff",
          p: 0,
          overflow: "visible",
          position: "relative",
          backdropFilter: "blur(5px)",
        },
      }}
    >
      {/* --- Gift Icon Top Right --- */}
      <Box
        sx={{
          position: "absolute",
          top: 25,
          right: 28,
          zIndex: 12,
        }}
      >
        <IconButton
          onClick={() => setShowGifts((prev) => !prev)}
          sx={{
            bgcolor: "#fff",
            color: "#ee6e57",
            boxShadow: "0 2px 8px #b8b7c288",
            "&:hover": { bgcolor: "#ffe4d3" },
            borderRadius: "50%",
            fontSize: 31,
            border: "2px solid #fff5",
            p: 1.4,
            animation: showGifts
              ? "none"
              : "shakeGift 1.1s cubic-bezier(.36,.07,.19,.97) both infinite",
            "@keyframes shakeGift": {
              "0%": { transform: "rotate(-7deg)" },
              "10%": { transform: "rotate(7deg)" },
              "20%": { transform: "rotate(-6deg)" },
              "30%": { transform: "rotate(5deg)" },
              "40%": { transform: "rotate(-4deg)" },
              "50%": { transform: "rotate(3deg)" },
              "60%": { transform: "rotate(-2deg)" },
              "70%": { transform: "rotate(1deg)" },
              "80%": { transform: "rotate(0deg)" },
              "100%": { transform: "rotate(0deg)" },
            },
          }}
        >
          <CardGiftcardIcon sx={{ fontSize: 31 }} />
        </IconButton>
      </Box>

      {/* --- GIFT PANEL (Slide in) --- */}
      <Slide direction="left" in={showGifts} mountOnEnter unmountOnExit>
        <Box
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "100%",
            minHeight: "100%",
            background: "linear-gradient(120deg,#f7f4ff 0%,#ecdbfd 100%)",
            color: "#462b7b",
            zIndex: 50,
            borderRadius: 5,
            boxShadow: "0 0 0 9999px rgba(30, 30, 60, 0.14)",
            p: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            justifyContent: "start",
            alignItems: "center",
          }}
        >
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: 28,
              color: "#7057e6",
              textAlign: "center",
              letterSpacing: 1,
              mt: 3.1,
              mb: 1.5,
              textShadow: "0 2px 8px #beadfd23",
            }}
          >
            Leaderboard Rewards
          </Typography>
          <Box
            sx={{
              width: "86%",
              mt: 2,
              mb: 2.5,
              borderRadius: 5,
              boxShadow: "0 2px 8px #a68fff18",
              background: "#fff",
              p: 2.5,
              pb: 1, 
            }}
          >
            <Box
              sx={{
                display: "flex",
                fontWeight: 800,
                fontSize: 18,
                color: "#8058e7",
                mb: 1.3,
                pb: 0.7,
                borderBottom: "2.5px solid #ece2fd",
              }}
            >
              <Box sx={{ flex: 1 }}>Rank</Box>
              <Box sx={{ flex: 1, textAlign: "right" }}>Reward</Box>
            </Box>
            {giftPrizes.map((row, idx) => (
              <Box
                key={row.rank}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  fontWeight: 700,
                  fontSize: 17,
                  color: "#594e94",
                  mb: 1.1,
                  pl: 0.1,
                }}
              >
                <Box sx={{ flex: 1, color: "#8f63e7" }}>{getRankSuffix(row.rank)}</Box>
                <Box
                  sx={{
                    flex: 1,
                    textAlign: "right",
                    color: idx === 0
                      ? "#f3a139"
                      : idx === 1
                      ? "#8e96a6"
                      : idx === 2
                      ? "#e6985b"
                      : "#7759c4",
                    fontWeight: 800,
                    letterSpacing: 0.2,
                  }}
                >
                  {row.label}
                </Box>
              </Box>
            ))}
          </Box>
          <Box sx={{
            width: "90%",
            color: "#7057e6",
            fontSize: 15.5,
            textAlign: "center",
            letterSpacing: 0.13,
            mb: 4.4,
            fontWeight: 600,
          }}>
            {GIFT_CONDITION_NOTE}
          </Box>
          <Button
            variant="contained"
            onClick={() => setShowGifts(false)}
            sx={{
              mt: "auto",
              mb: 5,
              bgcolor: "#7057e6",
              color: "#fff",
              fontWeight: 900,
              borderRadius: 5,
              px: 10,
              fontSize: 19,
              boxShadow: "0 2px 12px #c8bef7a2",
              textTransform: "none",
              "&:hover": { bgcolor: "#836bce" },
            }}
          >
            Close
          </Button>
        </Box>
      </Slide>

      {/* --- LEADERBOARD CONTENT (hide if gifts open) --- */}
      <Box sx={{
        p: 2.7,
        pt: 2.9,
        opacity: showGifts ? 0.18 : 1,
        pointerEvents: showGifts ? "none" : "auto",
        transition: "opacity 0.2s"
      }}>
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: 28,
            color: "#fff",
            textAlign: "center",
            letterSpacing: 1,
            mb: 3.5,
            textShadow: "0 3px 14px #6958ab99",
          }}
        >
          Leaderboard
        </Typography>
        {loadingLeaderboard ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <img
              src="https://media.tenor.com/I6kN-6X7nhAAAAAj/loading-buffering.gif"
              width={60}
              alt="loading"
            />
          </Box>
        ) : leaderboardData.length === 0 ? (
          <Typography sx={{ textAlign: "center", color: "#ccc", py: 3 }}>
            No data found.
          </Typography>
        ) : (
          <>
            {/* Podium */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "end",
                width: "100%",
                minHeight: 250,
                mb: 3,
                gap: 4.3,
                px: 2,
                position: "relative",
              }}
            >
              {getPodiumDisplay(leaderboardData.slice(0, 3)).map((person, i) => {
                const rank = i === 0 ? 2 : i === 1 ? 1 : 3;
                const podiumHeight = rank === 1 ? 140 : rank === 2 ? 105 : 90;
                const podiumWidth = 85;
                const avatarSize = 92;

                if (!person) return <Box key={i} sx={{ flex: 1 }} />;
                return (
                  <Box
                    key={person.name}
                    sx={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      position: "relative",
                      minWidth: 115,
                    }}
                  >
                    {/* 1st place trophy */}
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 1.1 }}>
                      <Typography
                        sx={{
                          fontWeight: 800,
                          color: "#fff",
                          fontSize: 20,
                          textAlign: "center",
                          letterSpacing: 0.1,
                          textShadow: "0 2px 12px #7367e9a0",
                          whiteSpace: "pre-line",
                          zIndex: 3,
                          position: "relative",
                        }}
                      >
                        {getFirstName(person.name)}
                      </Typography>
                      {rank === 1 && (
                        <EmojiEventsIcon
                          sx={{
                            color: "#FFD700",
                            fontSize: 28,
                            ml: 1,
                            mb: "-2px",
                            filter: "drop-shadow(0 2px 12px #ffd70099)",
                          }}
                        />
                      )}
                    </Box>
                    <Box
                      sx={{
                        width: avatarSize,
                        height: avatarSize,
                        borderRadius: "50%",
                        border: "4px solid #fff",
                        boxShadow: podiumGlow[rank - 1],
                        overflow: "hidden",
                        mb: 1.1,
                        background: "#f7f9fc",
                        zIndex: 2,
                        position: "relative",
                      }}
                    >
                      <img
                        src={getAvatarUrl(person.name)}
                        width={avatarSize}
                        height={avatarSize}
                        alt={person.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </Box>
                    <Box
                      sx={{
                        width: podiumWidth,
                        height: podiumHeight,
                        bgcolor: "transparent",
                        borderRadius: "16px 16px 13px 13px",
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "center",
                        boxShadow:
                          "0 8px 20px 3px #756dc43a, 0 2px 7px #ffffff33",
                        position: "relative",
                        mt: 0,
                      }}
                    >
                      <Box
                        sx={{
                          position: "absolute",
                          bottom: 0,
                          width: "100%",
                          height: "100%",
                          background: podiumColors[rank - 1],
                          borderRadius: "16px 16px 13px 13px",
                          zIndex: 1,
                        }}
                      />
                      <Box
                        sx={{
                          position: "absolute",
                          left: "50%",
                          top: -30,
                          transform: "translateX(-50%)",
                          bgcolor: "#fff",
                          color: "#4d35b3",
                          px: 2.8,
                          py: "7px",
                          fontWeight: 900,
                          borderRadius: 5.5,
                          fontSize: 18,
                          boxShadow: "0 2px 13px #3f2fff29",
                          zIndex: 2,
                          minWidth: 86,
                          textAlign: "center",
                          letterSpacing: 0.13,
                        }}
                      > 
                        ₹{Math.round(person.sales).toLocaleString()} 
                      </Box>
                      <Typography
                        sx={{
                          position: "absolute",
                          bottom: 18,
                          left: "50%",
                          transform: "translateX(-50%)",
                          fontWeight: 900,
                          fontSize: 32,
                          color: "#fff",
                          textShadow: "0 1.5px 6px #6f6e7188",
                          zIndex: 3,
                          width: "100%",
                          textAlign: "center",
                          opacity: 0.98,
                        }}
                      >
                        {rank}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
            {/* 4th and onward */}
            <Box
              sx={{
                maxHeight: 290,
                overflowY: "auto",
                px: 0,
                pt: 1,
                pb: 2.5,
              }}
            >
              {leaderboardData.slice(3).map((row, idx) => (
                <Box
                  key={row.name}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    bgcolor: "rgba(255,255,255,0.13)",
                    borderRadius: 3.5,
                    px: 2,
                    py: 1.3,
                    mb: 0.85,
                    boxShadow:
                      idx === 0 ? "0 2px 10px #7f74d18a" : undefined,
                  }}
                >
                  {/* Rank Number on the left */}
                  <Box
                    sx={{
                      minWidth: 44,
                      pr: 1.5,
                      display: "flex",
                      justifyContent: "flex-end",
                      alignItems: "center",
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight: 900,
                        fontSize: 17,
                        color: "#f2be53",
                        textAlign: "right",
                        mr: 0,
                      }}
                    >
                      {getRankSuffix(idx + 4)}
                    </Typography>
                  </Box>
                  {/* Avatar */}
                  <Box sx={{ position: "relative", mr: 1.2 }}>
                    <img
                      src={getAvatarUrl(row.name)}
                      width="45"
                      height="45"
                      alt={row.name}
                      style={{
                        borderRadius: "50%",
                        border: "2.5px solid #fff",
                        boxShadow: "0 2px 6px #dad4f38c",
                        background: "#fff",
                      }}
                    />
                  </Box>
                  {/* First Name */}
                  <Typography
                    sx={{
                      flex: 1,
                      fontWeight: 700,
                      fontSize: 17,
                      color: "#fff",
                      letterSpacing: 0.02,
                      textShadow: "0 1px 7px #ad99ee15",
                      whiteSpace: "pre-line",
                    }}
                  >
                    {getFirstName(row.name)}
                  </Typography>
                  {/* Sales */}
                  <Box
                    sx={{
                      fontWeight: 900,
                      color: "#7fffc4",
                      fontSize: 18,
                      minWidth: 85,
                      textAlign: "right",
                    }}
                  >
                    ₹{Math.round(row.sales).toLocaleString()}
                  </Box>
                </Box>
              ))}
            </Box>
          </>
        )}
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            mt: 2.8,
            display: "block",
            mx: "auto",
            bgcolor: "#7b5ef4",
            color: "#fff",
            fontWeight: 900,
            borderRadius: 5,
            px: 11,
            textTransform: "none",
            fontSize: 20,
            boxShadow: "0 2px 10px #b6a7f7a3",
            "&:hover": { bgcolor: "#5e44a3" },
          }}
        >
          Close
        </Button>
      </Box>
    </Popover>
  );
}
