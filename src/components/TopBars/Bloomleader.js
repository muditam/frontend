// Bloomleader.js
import React, { useState, useEffect } from "react";
import { Popover, Box, Typography, Button, IconButton, Slide } from "@mui/material";
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";

const giftPrizes = [
  { rank: 1, label: "Gift worth 3000" },
  { rank: 2, label: "Gift worth 2000" },
  { rank: 3, label: "Gift worth 1000" }, 
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

const getFirstName = (name) => {
  if (!name) return "";
  const parts = name.trim().split(" ").filter(Boolean);  
  return parts[0] || "";
};


const getAvatarUrl = (name) =>
  `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}&backgroundType=gradientLinear&radius=50`;

const podiumColors = [
  "linear-gradient(180deg,#FFD700 60%,#FFB347 95%)",
  "linear-gradient(180deg,#DCE3EB 50%,#A8B2BD 100%)",
  "linear-gradient(180deg,#E9BFA9 40%,#D88A5B 90%)",
];

const podiumGlow = [
  "0 0 32px 0 #ffe17e99, 0 1px 6px #ffd70044",
  "0 0 28px 0 #d6e0efbb, 0 1px 6px #A8B2BD44",
  "0 0 26px 0 #f1bfa2a5, 0 1px 6px #D88A5B44",
];

const getPodiumDisplay = (data) => [data[1], data[0], data[2]];

const isWithinLast90Days = (dateStr) => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  return date >= cutoff;
};

export default function Bloomleader({ open, anchorEl, onClose }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showGifts, setShowGifts] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const empRes = await fetch("https://muditamleads-14f32a10d7f7.herokuapp.com/api/employees"); 
        const employees = await empRes.json();

        const newJoiners = employees.filter(
          (emp) =>
            emp.status === "active" &&
            (emp.role === "Sales Agent" || emp.role === "Retention Agent") &&
            isWithinLast90Days(emp.joiningDate)
        );

        const sales = await Promise.all(
          newJoiners.map(async (emp) => {
            try {
              const res = await fetch(
                `https://muditamleads-14f32a10d7f7.herokuapp.com/api/retention-sales/progress?name=${encodeURIComponent(emp.fullName)}`
              );
              const d = await res.json();
              return { name: emp.fullName, sales: d.total || 0 };
            } catch {
              return { name: emp.fullName, sales: 0 };
            }
          })
        );

        const filtered = sales.filter((s) => s.sales > 0).sort((a, b) => b.sales - a.sales);
        setData(filtered);
      } catch (e) {
        console.error("Bloomleader fetch error", e);
        setData([]);
      }
      setLoading(false);
    };

    if (open) fetchData();
  }, [open]);

  const podiumDisplay = getPodiumDisplay(data.slice(0, 3));

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
          minHeight: 685,
          maxHeight: 720,
          boxShadow: "0 10px 32px 0 rgba(16,18,48,0.26)",
          background: "linear-gradient(120deg,#1f3e42 0%,#504572 100%)",
          color: "#fff",
          p: 0,
          overflow: "visible",
          position: "relative",
          backdropFilter: "blur(5px)",
        },
      }}
    >
      {/* Gift toggle */}
      <Box sx={{ position: "absolute", top: 25, right: 28, zIndex: 12 }}>
        <IconButton
          onClick={() => setShowGifts((prev) => !prev)}
          sx={{
            bgcolor: "#fff",
            color: "#ee6e57",
            boxShadow: "0 2px 8px #b8b7c288",
            "&:hover": { bgcolor: "#ffe4d3" },
            borderRadius: "50%",
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

      {/* Gift panel */}
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
            p: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: 28,
              color: "#7057e6",
              mt: 3.1,
              mb: 1.5,
              textShadow: "0 2px 8px #beadfd23",
            }}
          >
            Bloom Rewards
          </Typography>
          <Box
            sx={{
              width: "86%",
              mt: 2,
              mb: 2.5,
              borderRadius: 5,
              background: "#fff",
              p: 2.5,
              pb: 1,
              boxShadow: "0 2px 8px #a68fff18",
            }}
          >
            {giftPrizes.map((row, idx) => (
              <Box
                key={row.rank}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 17,
                  fontWeight: 700,
                  mb: 1.1,
                  color: "#594e94",
                }}
              >
                <Box>{getRankSuffix(row.rank)}</Box>
                <Box>{row.label}</Box>
              </Box>
            ))}
          </Box>
          <Button
            variant="contained"
            onClick={() => setShowGifts(false)}
            sx={{
              mb: 4,
              bgcolor: "#7057e6",
              color: "#fff",
              fontWeight: 900,
              borderRadius: 5,
              px: 8,
              fontSize: 18,
              textTransform: "none",
              "&:hover": { bgcolor: "#836bce" },
            }}
          >
            Close
          </Button>
        </Box>
      </Slide>

      {/* Podium + List */}
      <Box sx={{ p: 2.5, pt: 3, opacity: showGifts ? 0.18 : 1, pointerEvents: showGifts ? "none" : "auto" }}>
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: 22,
            textAlign: "center",
            mb: 3.5,
            color: "#fff",
            textShadow: "0 3px 14px #6958ab99",
          }}
        >
          Champions in Training
        </Typography>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <img
              src="https://media.tenor.com/I6kN-6X7nhAAAAAj/loading-buffering.gif"
              width={60}
              alt="loading"
            />
          </Box>
        ) : data.length === 0 ? (
          <Typography sx={{ textAlign: "center", color: "#ccc", py: 3 }}>
            No eligible entries found.
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
                gap: 4,
              }}
            >
              {podiumDisplay.map((person, i) => {
                const rank = i === 0 ? 2 : i === 1 ? 1 : 3;
                const podiumHeight = rank === 1 ? 140 : rank === 2 ? 105 : 90;
                const avatarSize = 92;
                if (!person) return <Box key={i} sx={{ flex: 1 }} />;

                return (
                  <Box key={person.name} sx={{ flex: 1, alignItems: "center" }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 20, textAlign: "center", mb: 1.1 }}>
                      {getFirstName(person.name)}
                      {rank === 1 && (
                        <EmojiEventsIcon sx={{ ml: 1, fontSize: 25, color: "#FFD700" }} />
                      )}
                    </Typography>
                    <Box
                      sx={{
                        width: avatarSize,
                        height: avatarSize,
                        borderRadius: "50%",
                        overflow: "hidden",
                        mb: 1,
                        border: "4px solid #fff",
                        boxShadow: podiumGlow[rank - 1],
                      }}
                    >
                      <img
                        src={getAvatarUrl(person.name)}
                        alt={person.name}
                        width="100%"
                        height="100%"
                      />
                    </Box>
                    <Box
                      sx={{
                        width: 85,
                        height: podiumHeight,
                        bgcolor: "transparent",
                        borderRadius: "16px 16px 13px 13px",
                        position: "relative",
                        boxShadow: "0 8px 20px 3px #756dc43a",
                      }}
                    >
                      <Box
                        sx={{
                          position: "absolute",
                          bottom: 0,
                          width: "100%",
                          height: "100%",
                          background: podiumColors[rank - 1],
                          borderRadius: "inherit",
                        }}
                      />
                      <Typography
                        sx={{
                          position: "absolute",
                          bottom: 16,
                          width: "100%",
                          textAlign: "center",
                          fontWeight: 900,
                          fontSize: 30,
                          color: "#fff",
                        }}
                      >
                        {rank}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>

            {/* Remaining */}
            <Box sx={{ maxHeight: 290, overflowY: "auto", px: 1, pt: 1 }}>
              {data.slice(3).map((row, idx) => (
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
                  }}
                >
                  <Box sx={{ minWidth: 44, pr: 1.5 }}>
                    <Typography
                      sx={{ fontWeight: 900, fontSize: 17, color: "#f2be53", textAlign: "right" }}
                    >
                      {getRankSuffix(idx + 4)}
                    </Typography>
                  </Box>
                  <Box sx={{ mr: 1.2 }}>
                    <img
                      src={getAvatarUrl(row.name)}
                      width="45"
                      height="45"
                      alt={row.name}
                      style={{
                        borderRadius: "50%",
                        border: "2.5px solid #fff",
                        background: "#fff",
                      }}
                    />
                  </Box>
                  <Typography sx={{ flex: 1, fontWeight: 700, fontSize: 17 }}>
                    {getFirstName(row.name)}
                  </Typography>
                  <Box sx={{ fontWeight: 900, fontSize: 18, minWidth: 85, textAlign: "right" }}>
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
            mt: 2.5,
            display: "block",
            mx: "auto",
            bgcolor: "#7b5ef4",
            color: "#fff",
            fontWeight: 900,
            borderRadius: 5,
            px: 10,
            fontSize: 20,
            "&:hover": { bgcolor: "#5e44a3" },
          }}
        >
          Close
        </Button>
      </Box>
    </Popover>
  );
}
