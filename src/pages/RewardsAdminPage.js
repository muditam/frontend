import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { clearCachedData, getCachedData } from "../utils/apiCache";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  Divider,
} from "@mui/material";
import {
  AddOutlined as AddIcon,
  EditOutlined as EditIcon,
  DeleteOutlineOutlined as DeleteIcon,
  LaunchOutlined as LaunchIcon,
} from "@mui/icons-material";

const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";
const REWARDS_CACHE_TTL_MS = 5 * 60 * 1000;
const REWARD_REQUESTS_CACHE_TTL_MS = 60 * 1000;

const MILESTONE_BUCKETS = [
  { id: 1, label: "Milestone 1", min: 1, max: 6000 },
  { id: 2, label: "Milestone 2", min: 6001, max: 12000 },
  { id: 3, label: "Milestone 3", min: 12001, max: 18000 },
  { id: 4, label: "Milestone 4", min: 18001, max: 24000 },
  { id: 5, label: "Milestone 5", min: 24001, max: 30000 },
  { id: 6, label: "Milestone 6", min: 30001, max: 36000 },
  { id: 7, label: "Milestone 7", min: 36001, max: 42000 },
  { id: 8, label: "Milestone 8", min: 42001, max: 48000 },
  { id: 9, label: "Milestone 9", min: 48001, max: 54000 },
  { id: 10, label: "Milestone 10", min: 54001, max: 60000 },
  { id: 11, label: "Milestone 11", min: 60001, max: 66000 },
  { id: 12, label: "Milestone 12", min: 66001, max: 72000 },
];

function getAuthHeaders() {
  try {
    const raw = sessionStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : null;
    return {};
  } catch {
    return {};
  }
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

function isValidUrl(value = "") {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function getMilestoneByCoinCost(coinCost) {
  const value = Number(coinCost || 0);
  return (
    MILESTONE_BUCKETS.find(
      (bucket) => value >= bucket.min && value <= bucket.max
    ) || { id: null, label: "Outside Milestones", min: 0, max: 0 }
  );
}

const initialRewardForm = {
  title: "",
  image: "",
  link: "",
  price: "",
  isActive: true,
};

const cardStyles = {
  height: "100%",
  borderRadius: 3,
  overflow: "hidden",
  border: "1px solid #e7ebf0",
  background: "#ffffff",
  boxShadow: "0 6px 18px rgba(16,24,40,0.05)",
  transition: "transform 0.18s ease, box-shadow 0.18s ease",
  display: "flex",
  flexDirection: "column",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 12px 24px rgba(16,24,40,0.09)",
  },
};

export default function RewardsAdminPage() {
  const headers = useMemo(() => getAuthHeaders(), []);

  const [tab, setTab] = useState(0);

  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [rewardsError, setRewardsError] = useState("");
  const [rewards, setRewards] = useState([]);

  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState("");
  const [requests, setRequests] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agentBalances, setAgentBalances] = useState({});
  const [balancesLoading, setBalancesLoading] = useState(false);

  const agentGroups = useMemo(() => {
    const groups = new Map();
    requests.forEach((request) => {
      const name = String(request.agentName || "").trim();
      const id = request.employeeId?._id || request.employeeId || name.toLowerCase() || request._id;
      if (!groups.has(id)) groups.set(id, { id, name: name || "Unknown agent", requests: [], totalCoins: 0 });
      const group = groups.get(id);
      group.requests.push(request);
      group.totalCoins += Number(request.requestedCoinBudget || 0);
    });
    return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [requests]);

  useEffect(() => {
    if (tab !== 1 || !agentGroups.length) return;
    let cancelled = false;
    setBalancesLoading(true);
    setAgentBalances({});
    const endDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
    const controller = new AbortController();
    let nextIndex = 0;
    // Avoid flooding the incentives API, and render each result independently.
    const loadBalances = async () => {
      while (!cancelled && nextIndex < agentGroups.length) {
        const group = agentGroups[nextIndex++];
        let balance = null;
        try {
          balance = await getCachedData(
            `rewards-admin:balance:${group.id}:${group.name}:${endDate}`,
            async () => {
              const { data } = await axios.get(`${API_BASE}/api/incentives-new`, {
                headers,
                signal: controller.signal,
                timeout: 30000,
                params: { agentName: group.name, startDate: "2026-04-01", endDate, summaryOnly: true },
              });
              // Preserve negative balances rather than using clamped availableCoin.
              const earned = data.walletCoin?.earnedCoins;
              const received = data.wallet?.totalCoinReceived;
              const redeemed = data.wallet?.totalCoinRedeemed;
              if (![earned, received, redeemed].every((value) => value != null && Number.isFinite(Number(value)))) {
                throw new Error("Wallet totals unavailable");
              }
              return Math.round((Number(earned) + Number(received) - Number(redeemed)) * 100) / 100;
            },
            30 * 1000
          );
        } catch {
          // Failed lookups are not cached or represented as zero coins.
        }
        if (!cancelled) setAgentBalances((previous) => ({ ...previous, [group.id]: balance }));
      }
    };
    Promise.all(Array.from({ length: Math.min(3, agentGroups.length) }, loadBalances)).then(() => {
      if (!cancelled) setBalancesLoading(false);
    });
    return () => { cancelled = true; controller.abort(); };
  }, [tab, agentGroups, headers]);
  const [approvedRequestsLoading, setApprovedRequestsLoading] = useState(false);
  const [approvedRequestsError, setApprovedRequestsError] = useState("");
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [requestActionId, setRequestActionId] = useState("");
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState("");
  const [confirmationRequest, setConfirmationRequest] = useState(null);
  const [confirmationPayload, setConfirmationPayload] = useState({});
  const [confirmationSaving, setConfirmationSaving] = useState(false);
  const [confirmationError, setConfirmationError] = useState("");

  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingRewardId, setEditingRewardId] = useState(null);
  const [rewardForm, setRewardForm] = useState(initialRewardForm);
  const [rewardSaving, setRewardSaving] = useState(false);
  const [rewardFormError, setRewardFormError] = useState("");

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectSaving, setRejectSaving] = useState(false);
  const [rejectError, setRejectError] = useState("");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingReward, setDeletingReward] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const fetchRewards = async (forceFresh = false) => {
    setRewardsLoading(true);
    setRewardsError("");

    try {
      const cacheKey = "rewards-admin:rewards";
      if (forceFresh) {
        clearCachedData(cacheKey);
      }

      const list = await getCachedData(
        cacheKey,
        async () => {
          const res = await axios.get(`${API_BASE}/api/rewards`, { headers });

          return Array.isArray(res.data?.rewards)
            ? res.data.rewards
            : Array.isArray(res.data)
            ? res.data
            : [];
        },
        REWARDS_CACHE_TTL_MS
      );

      setRewards(list);
    } catch (err) {
      console.error("Error fetching rewards:", err);
      setRewards([]);
      setRewardsError(err?.response?.data?.message || "Failed to load rewards.");
    } finally {
      setRewardsLoading(false);
    }
  };

  const fetchRequests = async (forceFresh = false) => {
    setRequestsLoading(true);
    setRequestsError("");

    try {
      const cacheKey = "rewards-admin:requests:pending";
      if (forceFresh) {
        clearCachedData(cacheKey);
      }

      const list = await getCachedData(
        cacheKey,
        async () => {
          const res = await axios.get(`${API_BASE}/api/custom-reward`, {
            headers,
            params: { status: "pending" },
          });

          return Array.isArray(res.data?.requests)
            ? res.data.requests
            : Array.isArray(res.data)
            ? res.data
            : [];
        },
        REWARD_REQUESTS_CACHE_TTL_MS
      );

      setRequests(list);
    } catch (err) {
      console.error("Error fetching custom requests:", err);
      setRequests([]);
      setRequestsError(
        err?.response?.data?.message || "Failed to load pending requests."
      );
    } finally {
      setRequestsLoading(false);
    }
  };

  const fetchApprovedRequests = async (forceFresh = false) => {
    setApprovedRequestsLoading(true);
    setApprovedRequestsError("");

    try {
      const cacheKey = "rewards-admin:requests:approved";
      if (forceFresh) clearCachedData(cacheKey);

      const list = await getCachedData(
        cacheKey,
        async () => {
          const res = await axios.get(`${API_BASE}/api/custom-reward`, {
            headers,
            params: { status: "approved,reverted" },
          });
          return Array.isArray(res.data?.requests)
            ? res.data.requests
            : Array.isArray(res.data)
            ? res.data
            : [];
        },
        REWARD_REQUESTS_CACHE_TTL_MS
      );

      setApprovedRequests(list);
    } catch (err) {
      console.error("Error fetching approved requests:", err);
      setApprovedRequests([]);
      setApprovedRequestsError(
        err?.response?.data?.message || "Failed to load approved requests."
      );
    } finally {
      setApprovedRequestsLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards();
    fetchRequests();
    fetchApprovedRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groupedRewards = useMemo(() => {
    return MILESTONE_BUCKETS.map((bucket) => {
      const items = rewards.filter((reward) => {
        const value = Number(reward.coinCost || reward.price || 0);
        return value >= bucket.min && value <= bucket.max;
      });

      return {
        ...bucket,
        items,
      };
    });
  }, [rewards]);

  const openCreateRewardDialog = () => {
    setIsEditMode(false);
    setEditingRewardId(null);
    setRewardForm(initialRewardForm);
    setRewardFormError("");
    setRewardDialogOpen(true);
  };

  const openEditRewardDialog = (reward) => {
    setIsEditMode(true);
    setEditingRewardId(reward._id);
    setRewardForm({
      title: reward.title || "",
      image: reward.image || "",
      link: reward.link || "",
      price: reward.price || reward.coinCost || "",
      isActive: reward.isActive !== false,
    });
    setRewardFormError("");
    setRewardDialogOpen(true);
  };

  const validateRewardForm = () => {
    if (!rewardForm.title.trim()) {
      setRewardFormError("Name is required.");
      return false;
    }

    if (!rewardForm.link.trim() || !isValidUrl(rewardForm.link.trim())) {
      setRewardFormError("Valid product link is required.");
      return false;
    }

    if (rewardForm.image.trim() && !isValidUrl(rewardForm.image.trim())) {
      setRewardFormError("Valid image link is required.");
      return false;
    }

    if (!rewardForm.price || Number(rewardForm.price) <= 0) {
      setRewardFormError("Price must be greater than 0.");
      return false;
    }

    setRewardFormError("");
    return true;
  };

  const handleSaveReward = async () => {
    if (!validateRewardForm()) return;

    setRewardSaving(true);

    try {
      const finalPrice = Number(rewardForm.price || 0);

      const payload = {
        title: rewardForm.title.trim(),
        image: rewardForm.image.trim(),
        link: rewardForm.link.trim(),
        price: finalPrice,
        coinCost: finalPrice,
        isActive: rewardForm.isActive,
      };

      if (isEditMode && editingRewardId) {
        await axios.put(`${API_BASE}/api/rewards/${editingRewardId}`, payload, {
          headers,
        });
      } else {
        await axios.post(`${API_BASE}/api/rewards`, payload, {
          headers,
        });
      }

      setRewardDialogOpen(false);
      clearCachedData("rewards-admin:rewards");
      clearCachedData("wallet-redeem:rewards");
      fetchRewards(true);
    } catch (err) {
      console.error("Error saving reward:", err);
      setRewardFormError(err?.response?.data?.message || "Failed to save reward.");
    } finally {
      setRewardSaving(false);
    }
  };

  const openDeleteDialog = (reward) => {
    setDeletingReward(reward);
    setDeleteError("");
    setDeleteDialogOpen(true);
  };

  const handleDeleteReward = async () => {
    if (!deletingReward?._id) return;

    setDeleteLoading(true);
    setDeleteError("");

    try {
      await axios.delete(`${API_BASE}/api/rewards/${deletingReward._id}`, {
        headers,
      });

      setDeleteDialogOpen(false);
      setDeletingReward(null);
      clearCachedData("rewards-admin:rewards");
      clearCachedData("wallet-redeem:rewards");
      fetchRewards(true);
    } catch (err) {
      console.error("Error deleting reward:", err);
      setDeleteError(err?.response?.data?.message || "Failed to delete reward.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleApprovePendingRequest = async (request) => {
    if (!request?._id) return;

    setConfirmationError("");
    setConfirmationAction("approve");
    setConfirmationRequest(request);
    setConfirmationPayload({});
    setConfirmationOpen(true);
  };

  const openRevertConfirmation = (request) => {
    setConfirmationError("");
    setConfirmationAction("revert");
    setConfirmationRequest(request);
    setConfirmationPayload({});
    setConfirmationOpen(true);
  };

  const refreshAfterConfirmation = () => {
    const id = confirmationRequest._id;
    setConfirmationOpen(false);
    setConfirmationRequest(null);
    setRequests((current) => current.filter((request) => request._id !== id));
    clearCachedData("rewards-admin:");
    clearCachedData("wallet-redeem:");
    fetchRequests(true);
    fetchApprovedRequests(true);
    fetchRewards(true);
  };

  const handleConfirmation = async () => {
    if (!confirmationRequest?._id) return;

    setConfirmationSaving(true);
    setConfirmationError("");
    setRequestActionId(confirmationRequest._id);

    try {
      const endpoint = confirmationAction === "revert" ? "revert" : "approve";
      await axios.post(
        `${API_BASE}/api/custom-reward/${confirmationRequest._id}/${endpoint}`,
        confirmationPayload,
        { headers }
      );

      refreshAfterConfirmation();
    } catch (err) {
      // Also reconcile responses from older backend deployments.
      if (confirmationAction === "approve" && err?.response?.status === 400 &&
          err?.response?.data?.message === "Request is already approved") {
        refreshAfterConfirmation();
        return;
      }
      console.error(`Error ${confirmationAction}ing request:`, err);
      setConfirmationError(
        err?.response?.data?.message ||
          `Failed to ${confirmationAction} request.`
      );
    } finally {
      setConfirmationSaving(false);
      setRequestActionId("");
    }
  };

  const openRejectDialog = (request) => {
    setRejectingRequest(request);
    setRejectionReason("");
    setRejectError("");
    setRejectDialogOpen(true);
  };

  const handleRejectRequest = async () => {
    if (!rejectingRequest?._id) return;

    setRejectSaving(true);

    try {
      await axios.post(
        `${API_BASE}/api/custom-reward/${rejectingRequest._id}/reject`,
        { rejectionReason },
        { headers }
      );

      setRejectDialogOpen(false);
      setRejectingRequest(null);
      clearCachedData("rewards-admin:requests");
      clearCachedData("wallet-redeem:requests");
      fetchRequests(true);
      fetchApprovedRequests(true);
    } catch (err) {
      console.error("Error rejecting request:", err);
      setRejectError(err?.response?.data?.message || "Failed to reject request.");
    } finally {
      setRejectSaving(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", p: { xs: 2, md: 3 }, background: "#f6f7fb" }}>
      <Stack spacing={3}>
        <Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: 800, color: "#152033", letterSpacing: "-0.02em" }}
          >
            Rewards Admin
          </Typography>
        </Box>

        <Box
          sx={{
            background: "#fff",
            borderRadius: 4,
            border: "1px solid #eceff3",
            overflow: "hidden",
            boxShadow: "0 8px 24px rgba(16,24,40,0.05)",
          }}
        >
          <Tabs value={tab} onChange={(_, next) => setTab(next)}>
            <Tab label="Curated Rewards" />
            <Tab label={`Pending Requests (${requests.length})`} />
            <Tab label={`Approved Requests (${approvedRequests.length})`} />
          </Tabs>
        </Box>

        {tab === 0 && (
          <Stack spacing={3}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography sx={{ fontWeight: 700, color: "#101828", fontSize: 18 }}>
                  Reward Catalog by Milestone
                </Typography>
              </Box>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openCreateRewardDialog}
                sx={{
                  textTransform: "none",
                  borderRadius: 999,
                  px: 2.25,
                  boxShadow: "none",
                  fontWeight: 700,
                }}
              >
                Add Reward
              </Button>
            </Stack>

            {rewardsError ? <Alert severity="error">{rewardsError}</Alert> : null}

            {rewardsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Stack spacing={3}>
                {groupedRewards.map((group) => (
                  <Box
                    key={group.id}
                    sx={{
                      background: "#fff",
                      border: "1px solid #e8edf3",
                      borderRadius: 4,
                      boxShadow: "0 8px 22px rgba(16,24,40,0.04)",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        px: 2.5,
                        py: 1.75,
                        background: "linear-gradient(180deg, #ffffff 0%, #fafbfc 100%)",
                        borderBottom: "1px solid #eef2f6",
                      }}
                    >
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", sm: "center" }}
                        spacing={1}
                      >
                        <Box>
                          <Typography sx={{ fontWeight: 800, color: "#111827" }}>
                            {group.label}
                          </Typography>
                          <Typography variant="body2" sx={{ color: "#667085", mt: 0.25 }}>
                            ₹{formatNumber(group.min)} to ₹{formatNumber(group.max)}
                          </Typography>
                        </Box>

                        <Chip
                          label={`${group.items.length} item${group.items.length === 1 ? "" : "s"}`}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            background: "#f8fafc",
                            border: "1px solid #e5e7eb",
                            color: "#475467",
                          }}
                        />
                      </Stack>
                    </Box>

                    <Box sx={{ p: 2 }}>
                      {group.items.length ? (
                        <Box
                          sx={{
                            display: "grid",
                            gap: 1.5,
                            gridTemplateColumns: {
                              xs: "repeat(1, minmax(0, 1fr))",
                              sm: "repeat(2, minmax(0, 1fr))",
                              md: "repeat(3, minmax(0, 1fr))",
                              lg: "repeat(5, minmax(0, 1fr))",
                            },
                          }}
                        >
                          {group.items.map((reward) => (
                            <Card key={reward._id} sx={cardStyles}>
                              <Box sx={{ position: "relative", background: "#f9fafb" }}>
                                {reward.image ? (
                                  <Box
                                    component="img"
                                    src={reward.image}
                                    alt={reward.title || "Reward"}
                                    sx={{
                                      width: "100%",
                                      height: 150,
                                      objectFit: "contain",
                                      display: "block",
                                      p: 1.25,
                                      background: "#fff",
                                    }}
                                  />
                                ) : (
                                  <Box
                                    sx={{
                                      height: 150,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      color: "#98a2b3",
                                      background: "#f8fafc",
                                    }}
                                  >
                                    <Typography variant="body2">No image</Typography>
                                  </Box>
                                )}

                                <Chip
                                  label={group.label}
                                  size="small"
                                  sx={{
                                    position: "absolute",
                                    top: 8,
                                    left: 8,
                                    borderRadius: 999,
                                    fontWeight: 700,
                                    fontSize: 11,
                                    height: 24,
                                    background: "#fff7d6",
                                    color: "#8a6400",
                                    border: "1px solid #f5df8b",
                                  }}
                                />

                                <Chip
                                  label={reward.isActive ? "Active" : "Inactive"}
                                  size="small"
                                  sx={{
                                    position: "absolute",
                                    top: 8,
                                    right: 8,
                                    borderRadius: 999,
                                    fontWeight: 700,
                                    fontSize: 11,
                                    height: 24,
                                    background: reward.isActive ? "#ecfdf3" : "#f2f4f7",
                                    color: reward.isActive ? "#027a48" : "#667085",
                                    border: "1px solid #eaecf0",
                                  }}
                                />
                              </Box>

                              <Box
                                sx={{
                                  p: 1.5,
                                  display: "flex",
                                  flexDirection: "column",
                                  flex: 1,
                                }}
                              >
                                <Typography
                                  sx={{
                                    fontWeight: 700,
                                    color: "#1d2939",
                                    fontSize: "0.92rem",
                                    lineHeight: 1.35,
                                    minHeight: 38,
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                  }}
                                >
                                  {reward.title || "Reward"}
                                </Typography>

                                <Box sx={{ mt: 1 }}>
                                  <Typography
                                    sx={{
                                      fontWeight: 800,
                                      fontSize: "1rem",
                                      color: "#101828",
                                      lineHeight: 1.1,
                                    }}
                                  >
                                    {reward.price > 0 ? formatCurrency(reward.price) : "—"}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: "#98a2b3" }}>
                                    Price / Coins
                                  </Typography>
                                </Box>

                                <Divider sx={{ mt: 1.25 }} />

                                <Stack
                                  direction="row"
                                  justifyContent="space-between"
                                  alignItems="center"
                                  sx={{ mt: "auto", pt: 1.1 }}
                                >
                                  <IconButton
                                    component="a"
                                    href={reward.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    size="small"
                                    sx={{
                                      width: 34,
                                      height: 34,
                                      background: "#f2f4f7",
                                      color: "#344054",
                                      "&:hover": { background: "#e4e7ec" },
                                    }}
                                  >
                                    <LaunchIcon sx={{ fontSize: 18 }} />
                                  </IconButton>

                                  <Stack direction="row" spacing={0.75}>
                                    <IconButton
                                      onClick={() => openEditRewardDialog(reward)}
                                      size="small"
                                      sx={{
                                        width: 34,
                                        height: 34,
                                        background: "#eef4ff",
                                        color: "#155eef",
                                        "&:hover": { background: "#dbe8ff" },
                                      }}
                                    >
                                      <EditIcon sx={{ fontSize: 18 }} />
                                    </IconButton>

                                    <IconButton
                                      onClick={() => openDeleteDialog(reward)}
                                      size="small"
                                      sx={{
                                        width: 34,
                                        height: 34,
                                        background: "#fef3f2",
                                        color: "#d92d20",
                                        "&:hover": { background: "#fee4e2" },
                                      }}
                                    >
                                      <DeleteIcon sx={{ fontSize: 18 }} />
                                    </IconButton>
                                  </Stack>
                                </Stack>
                              </Box>
                            </Card>
                          ))}
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            border: "1px dashed #e5e7eb",
                            borderRadius: 3,
                            py: 4,
                            textAlign: "center",
                            background: "#fcfcfd",
                          }}
                        >
                          <Typography sx={{ fontWeight: 700, color: "#475467" }}>
                            No rewards in {group.label}
                          </Typography>
                          <Typography variant="body2" sx={{ color: "#98a2b3", mt: 0.5 }}>
                            Add products whose price falls in this range.
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>
        )}

        {tab === 1 && (
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems={{ sm: "center" }}>
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: 20, color: "#101828" }}>Pending rewards by agent</Typography>
                <Typography variant="body2" color="text.secondary">
                  {requests.length} requests · {agentGroups.length} agents · Review balances and rewards together.
                </Typography>
              </Box>
              <Autocomplete
                options={agentGroups}
                value={agentGroups.find((group) => group.id === selectedAgent) || null}
                getOptionLabel={(group) => group.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onChange={(_, group) => setSelectedAgent(group?.id || null)}
                sx={{ width: { xs: "100%", sm: 280 } }}
                renderInput={(params) => <TextField {...params} label="Filter by agent" placeholder="All agents" size="small" />}
              />
            </Stack>
            {requestsError ? <Alert severity="error">{requestsError}</Alert> : null}

            {requestsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress />
              </Box>
            ) : requests.length ? (
              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: {
                    xs: "repeat(1, minmax(0, 1fr))",
                    lg: "minmax(0, 1fr)",
                  },
                }}
              >
                {agentGroups.filter((group) => !selectedAgent || !agentGroups.some((agent) => agent.id === selectedAgent) || group.id === selectedAgent).map((group) => {
                  const balance = agentBalances[group.id];
                  const remaining = balance == null ? null : Math.round((balance - group.totalCoins) * 100) / 100;
                  return (
                    <Card component="section" aria-label={`${group.name} pending rewards`} key={group.id} sx={{ borderRadius: 3, border: "1px solid #e4e7ec", alignSelf: "start", minWidth: 0, boxShadow: "0 2px 6px rgba(16,24,40,0.03)" }}>
                      <Box sx={{ p: { xs: 2, sm: 2.5 }, background: "#fafbfc", borderBottom: "1px solid #e4e7ec", display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(230px, 1fr) minmax(480px, 1.4fr)" }, alignItems: "center", gap: 2 }}>
                        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
                          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                            <Box aria-hidden="true" sx={{ width: 42, height: 42, flexShrink: 0, borderRadius: 2, display: "grid", placeItems: "center", bgcolor: "#e8edf3", color: "#344054", fontSize: 13, fontWeight: 800 }}>{group.name.split(/\s+/).slice(0, 2).map((name) => name[0]).join("")}</Box>
                            <Typography sx={{ fontWeight: 800, overflowWrap: "anywhere" }}>{group.name}</Typography>
                          </Stack>
                          <Chip size="small" label={`${group.requests.length} pending`} sx={{ bgcolor: "#fff4e5", color: "#93370d", fontWeight: 700, flexShrink: 0 }} />
                        </Stack>
                        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 0 }}>
                          {[
                            { label: "Current coins", value: balance },
                            { label: "Pending reward coins", value: group.totalCoins },
                            { label: "After pending requests", value: remaining },
                          ].map(({ label, value }) => (
                            <Box key={label} sx={{ px: { xs: 1, sm: 2.5 }, py: 0.5, borderLeft: "1px solid #e4e7ec", "&:first-of-type": { borderLeft: { xs: 0, md: "1px solid #e4e7ec" }, pl: { xs: 0, md: 2.5 } } }}>
                              <Typography variant="caption" color="text.secondary">{label}</Typography>
                              <Typography sx={{ fontWeight: 800, fontSize: { xs: 16, sm: 20 }, overflowWrap: "anywhere", color: value < 0 ? "error.main" : "#101828" }}>
                                {value == null ? (balancesLoading && balance === undefined ? "Loading…" : "Unavailable") : formatNumber(value)}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                        {remaining < 0 && <Typography variant="body2" color="error.main" sx={{ gridColumn: "1 / -1", p: 1, borderRadius: 1.5, bgcolor: "#fff1f0", fontSize: 12 }}>Shortfall: {formatNumber(-remaining)} coins after all pending requests.</Typography>}
                        {balance === null && <Typography variant="caption" color="text.secondary">Could not load this agent’s wallet balance.</Typography>}
                      </Box>
                {group.requests.map((request, requestIndex) => {
                  const milestone = getMilestoneByCoinCost(request.requestedCoinBudget);
                  const isCuratedRedeem = request.requestType === "curated_redeem";
                  const links = [...new Set((request.url || "").match(/https?:\/\/[^\s<>"']+/g) || [])].filter(isValidUrl);

                  return (
                    <Box
                      key={request._id}
                      sx={{
                        borderBottom: "1px solid #eceff3",
                        "&:last-child": { borderBottom: 0 },
                      }}
                    >
                      <Box sx={{ p: { xs: 2, sm: 2.5 }, display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1.5fr) minmax(0, 1fr) 120px 210px" }, gap: { xs: 2, md: 3 }, alignItems: "center", "&:hover": { bgcolor: "#fcfcfd" } }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                            <Typography variant="caption" sx={{ color: "#98a2b3", fontWeight: 700 }}>#{String(requestIndex + 1).padStart(2, "0")}</Typography>
                            <Typography sx={{ fontWeight: 700, color: "#101828", fontSize: 14, overflowWrap: "anywhere" }}>
                              {request.extractedTitle || (isCuratedRedeem ? "Curated reward" : "Custom reward")}
                            </Typography>
                          </Stack>
                          <Typography variant="caption" sx={{ color: "#667085" }}>
                            {request.milestoneLabel || milestone.label} · {isCuratedRedeem ? "Catalogue request" : "Custom request"}
                          </Typography>
                          {request.note && <Typography sx={{ mt: 1, color: "#475467", fontSize: 13, whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.6 }}>{request.note}</Typography>}
                        </Box>

                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontSize: 11, fontWeight: 600, color: "#98a2b3", mb: 0.75 }}>PRODUCT LINKS</Typography>
                          <Stack direction="row" useFlexGap flexWrap="wrap" gap={0.75}>
                            {links.map((link, index) => (
                              <Button key={link} size="small" variant="text" endIcon={<LaunchIcon sx={{ fontSize: "14px !important" }} />} href={link} target="_blank" rel="noopener noreferrer" title={link}
                                sx={{ textTransform: "none", justifyContent: "flex-start", px: 1, py: 0.5, bgcolor: "#f2f4f7", borderRadius: 1, color: "#344054", maxWidth: "100%", fontSize: 12 }}>
                                <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {links.length > 1 ? `${index + 1}. ` : ""}{new URL(link).hostname.replace(/^www\./, "")}
                                </Box>
                              </Button>
                            ))}
                            {!links.length && <Typography variant="caption" color="text.secondary">No link provided</Typography>}
                          </Stack>
                        </Box>

                        <Box sx={{ textAlign: { xs: "left", md: "right" } }}>
                          <Typography sx={{ fontSize: 11, fontWeight: 600, color: "#98a2b3", mb: 0.5 }}>REQUESTED COINS</Typography>
                          <Typography sx={{ fontWeight: 800, color: "#101828", fontSize: 20, fontVariantNumeric: "tabular-nums" }}>{formatNumber(request.requestedCoinBudget)}</Typography>
                        </Box>

                        <Stack direction="row" spacing={1} justifyContent={{ xs: "flex-start", md: "flex-end" }} sx={{ pt: { xs: 1.5, md: 0 }, borderTop: { xs: "1px solid #f2f4f7", md: 0 } }}>
                          <Button size="small" variant="contained" onClick={() => handleApprovePendingRequest(request)} disabled={requestActionId === request._id}
                            sx={{ textTransform: "none", fontWeight: 600, boxShadow: "none", borderRadius: 1.5, px: 2, py: 0.8, bgcolor: "#101828", "&:hover": { bgcolor: "#344054", boxShadow: "none" } }}>
                            {requestActionId === request._id ? "Approving..." : "Approve"}
                          </Button>
                          <Button size="small" color="error" variant="outlined" onClick={() => openRejectDialog(request)}
                            sx={{ textTransform: "none", fontWeight: 600, borderRadius: 1.5, px: 2, py: 0.8, borderColor: "#fecdca", color: "#b42318" }}>
                            Reject
                          </Button>
                        </Stack>
                      </Box>
                    </Box>
                  );
                })}
                    </Card>
                  );
                })}
              </Box>
            ) : (
              <Alert severity="info">No pending requests.</Alert>
            )}
          </Stack>
        )}

        {tab === 2 && (
          <Stack spacing={2}>
            {approvedRequestsError ? (
              <Alert severity="error">{approvedRequestsError}</Alert>
            ) : null}

            {approvedRequestsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress />
              </Box>
            ) : approvedRequests.length ? (
              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: {
                    xs: "repeat(1, minmax(0, 1fr))",
                    md: "repeat(2, minmax(0, 1fr))",
                  },
                }}
              >
                {approvedRequests.map((request) => {
                  const milestone = getMilestoneByCoinCost(request.requestedCoinBudget);
                  const isCuratedRedeem = request.requestType === "curated_redeem";

                  return (
                    <Card
                      key={request._id}
                      sx={{
                        borderRadius: 4,
                        border: "1px solid #d1fadf",
                        boxShadow: "0 8px 24px rgba(16,24,40,0.05)",
                      }}
                    >
                      <Box sx={{ p: 2.25 }}>
                        <Stack spacing={1.25}>
                          <Stack direction="row" justifyContent="space-between" spacing={1}>
                            <Typography sx={{ fontWeight: 800, color: "#101828" }}>
                              {request.extractedTitle ||
                                (isCuratedRedeem ? "Curated Reward Redeem" : "Custom Reward Request")}
                            </Typography>
                            <Chip
                              size="small"
                              color={request.status === "reverted" ? "default" : "success"}
                              label={request.status === "reverted" ? "Reverted" : "Approved"}
                            />
                          </Stack>
                          <Typography variant="body2" sx={{ color: "#667085" }}>
                            Agent: {request.agentName || "-"}
                          </Typography>
                          <Typography variant="body2" sx={{ color: "#667085", wordBreak: "break-all" }}>
                            {request.url || "-"}
                          </Typography>
                          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                            <Chip size="small" variant="outlined" label={isCuratedRedeem ? "Redeem Request" : "Custom Request"} />
                            <Chip size="small" variant="outlined" label={request.milestoneLabel || milestone.label} />
                            {request.requestedCoinBudget ? (
                              <Chip size="small" variant="outlined" label={`${formatNumber(request.requestedCoinBudget)} Coins`} />
                            ) : null}
                          </Stack>
                          <Typography variant="caption" sx={{ color: "#667085" }}>
                            Approved: {request.reviewedAt ? new Date(request.reviewedAt).toLocaleString("en-IN") : "-"}
                          </Typography>
                          {request.status === "approved" ? (
                            <Button
                              size="small"
                              color="warning"
                              variant="outlined"
                              onClick={() => openRevertConfirmation(request)}
                              disabled={requestActionId === request._id}
                              sx={{ textTransform: "none", borderRadius: 999, alignSelf: "flex-start" }}
                            >
                              Revert Request
                            </Button>
                          ) : (
                            <Typography variant="body2" sx={{ color: "#667085" }}>
                              This request was reverted. No further action is available.
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    </Card>
                  );
                })}
              </Box>
            ) : (
              <Alert severity="info">No approved requests.</Alert>
            )}
          </Stack>
        )}
      </Stack>

      <Dialog
        open={rewardDialogOpen}
        onClose={() => !rewardSaving && setRewardDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{isEditMode ? "Edit Reward" : "Add Reward"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {rewardFormError ? <Alert severity="error">{rewardFormError}</Alert> : null}

            <TextField
              label="Name"
              value={rewardForm.title}
              onChange={(e) =>
                setRewardForm((prev) => ({ ...prev, title: e.target.value }))
              }
              fullWidth
            />

            <TextField
              label="Image Link"
              value={rewardForm.image}
              onChange={(e) =>
                setRewardForm((prev) => ({ ...prev, image: e.target.value }))
              }
              fullWidth
            />

            <TextField
              label="Product Link"
              value={rewardForm.link}
              onChange={(e) =>
                setRewardForm((prev) => ({ ...prev, link: e.target.value }))
              }
              fullWidth
            />

            <TextField
              label="Price"
              type="number"
              value={rewardForm.price}
              onChange={(e) =>
                setRewardForm((prev) => ({ ...prev, price: e.target.value }))
              }
              fullWidth
            />

            <Box
              sx={{
                p: 1.5,
                borderRadius: 2.5,
                border: "1px solid #e6ebf2",
                background: "#f8fafc",
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Coin Cost
              </Typography>
              <Typography variant="body2" sx={{ color: "#667085", mt: 0.5 }}>
                Same as Price: {rewardForm.price ? formatCurrency(rewardForm.price) : "—"}
              </Typography>
            </Box>

            <Box
              sx={{
                p: 1.5,
                borderRadius: 2.5,
                border: "1px solid #e6ebf2",
                background: "#f8fafc",
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Auto milestone
              </Typography>
              <Typography variant="body2" sx={{ color: "#667085", mt: 0.5 }}>
                {getMilestoneByCoinCost(rewardForm.price).label}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRewardDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveReward} disabled={rewardSaving}>
            {rewardSaving ? "Saving..." : isEditMode ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={rejectDialogOpen}
        onClose={() => !rejectSaving && setRejectDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Reject Request</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {rejectError ? <Alert severity="error">{rejectError}</Alert> : null}

            <TextField
              label="Rejection Reason"
              multiline
              minRows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleRejectRequest}
            disabled={rejectSaving}
          >
            {rejectSaving ? "Rejecting..." : "Reject"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmationOpen}
        onClose={() => !confirmationSaving && setConfirmationOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {confirmationAction === "revert" ? "Revert Request" : "Approve Request"}
        </DialogTitle>
        <DialogContent dividers>
          {confirmationError ? <Alert severity="error">{confirmationError}</Alert> : null}
          <Typography variant="body2" sx={{ color: "#475467" }}>
            {confirmationAction === "revert"
              ? "Are you sure you want to revert this approved request? The coins will be refunded to the agent wallet."
              : "Are you sure you want to approve this reward? The requested coins will be deducted from the agent wallet."}
          </Typography>
          {confirmationRequest?.agentName ? (
            <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 700 }}>
              Agent: {confirmationRequest.agentName}
            </Typography>
          ) : null}
          {confirmationRequest && (
            <Stack spacing={1.25} sx={{ mt: 2, p: 2, bgcolor: "#f8fafc", borderRadius: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{confirmationRequest.extractedTitle || "Custom reward"}</Typography>
              <Typography variant="body2">Coins: {formatNumber(confirmationRequest.requestedCoinBudget)}</Typography>
              {confirmationRequest.note && <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{confirmationRequest.note}</Typography>}
              {(String(confirmationRequest.url || "").match(/https?:\/\/[^\s<>"']+/g) || []).filter(isValidUrl).map((link, index) => (
                <Button key={`${link}-${index}`} href={link} target="_blank" rel="noopener noreferrer" endIcon={<LaunchIcon />} sx={{ justifyContent: "flex-start", textTransform: "none", overflowWrap: "anywhere" }}>
                  Product link {index + 1} · {new URL(link).hostname}
                </Button>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmationOpen(false)}
            disabled={confirmationSaving}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color={confirmationAction === "revert" ? "warning" : "primary"}
            onClick={handleConfirmation}
            disabled={confirmationSaving}
          >
            {confirmationSaving
              ? confirmationAction === "revert"
                ? "Reverting..."
                : "Approving..."
              : confirmationAction === "revert"
              ? "Yes, Revert"
              : "Yes, Approve"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleteLoading && setDeleteDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete Reward</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            {deleteError ? <Alert severity="error">{deleteError}</Alert> : null}

            <Typography variant="body2" sx={{ color: "#475467" }}>
              Are you sure you want to delete this reward permanently?
            </Typography>

            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                background: "#f8fafc",
                border: "1px solid #eaecf0",
              }}
            >
              <Typography sx={{ fontWeight: 700 }}>
                {deletingReward?.title || "Reward"}
              </Typography>
              {deletingReward?.price > 0 ? (
                <Typography variant="body2" sx={{ color: "#667085", mt: 0.5 }}>
                  {formatCurrency(deletingReward.price)}
                </Typography>
              ) : null}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteReward}
            disabled={deleteLoading}
          >
            {deleteLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
