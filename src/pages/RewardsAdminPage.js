import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { clearCachedData, getCachedData } from "../utils/apiCache";
import {
  Alert,
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
  CheckCircleOutlineOutlined as ApproveIcon,
  CancelOutlined as RejectIcon,
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
    return user ? { "x-session-user": JSON.stringify(user) } : {};
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

const initialApprovalForm = {
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
  const [requestActionId, setRequestActionId] = useState("");

  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingRewardId, setEditingRewardId] = useState(null);
  const [rewardForm, setRewardForm] = useState(initialRewardForm);
  const [rewardSaving, setRewardSaving] = useState(false);
  const [rewardFormError, setRewardFormError] = useState("");

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approvalRequest, setApprovalRequest] = useState(null);
  const [approvalForm, setApprovalForm] = useState(initialApprovalForm);
  const [approvalSaving, setApprovalSaving] = useState(false);
  const [approvalError, setApprovalError] = useState("");

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

  useEffect(() => {
    fetchRewards();
    fetchRequests();
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

  const openApproveDialog = (request) => {
    setApprovalRequest(request);
    setApprovalForm({
      title: request.extractedTitle || "",
      image: request.extractedImage || "",
      link: request.url || "",
      price: request.requestedCoinBudget || "",
      isActive: true,
    });
    setApprovalError("");
    setApproveDialogOpen(true);
  };

  const handleApproveRequest = async () => {
    if (!approvalRequest?._id) return;

    if (!approvalForm.title.trim()) {
      setApprovalError("Name is required.");
      return;
    }

    if (!approvalForm.link.trim() || !isValidUrl(approvalForm.link.trim())) {
      setApprovalError("Valid product link is required.");
      return;
    }

    if (approvalForm.image.trim() && !isValidUrl(approvalForm.image.trim())) {
      setApprovalError("Valid image link is required.");
      return;
    }

    if (!approvalForm.price || Number(approvalForm.price) <= 0) {
      setApprovalError("Price must be greater than 0.");
      return;
    }

    setApprovalSaving(true);

    try {
      const finalPrice = Number(approvalForm.price || 0);

      const payload = {
        title: approvalForm.title.trim(),
        image: approvalForm.image.trim(),
        link: approvalForm.link.trim(),
        price: finalPrice,
        coinCost: finalPrice,
        isActive: approvalForm.isActive,
      };

      await axios.post(
        `${API_BASE}/api/custom-reward/${approvalRequest._id}/approve`,
        payload,
        { headers }
      );

      setApproveDialogOpen(false);
      setApprovalRequest(null);
      clearCachedData("rewards-admin:");
      clearCachedData("wallet-redeem:");
      fetchRequests(true);
      fetchRewards(true);
    } catch (err) {
      console.error("Error approving request:", err);
      setApprovalError(err?.response?.data?.message || "Failed to approve request.");
    } finally {
      setApprovalSaving(false);
    }
  };

  const handleApprovePendingRequest = async (request) => {
    if (!request?._id) return;

    if (request.requestType !== "curated_redeem") {
      openApproveDialog(request);
      return;
    }

    setRequestActionId(request._id);
    setRequestsError("");

    try {
      await axios.post(
        `${API_BASE}/api/custom-reward/${request._id}/approve`,
        {},
        { headers }
      );

      clearCachedData("rewards-admin:requests");
      clearCachedData("wallet-redeem:requests");
      fetchRequests(true);
    } catch (err) {
      console.error("Error approving redeem request:", err);
      setRequestsError(
        err?.response?.data?.message || "Failed to approve redeem request."
      );
    } finally {
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
                    md: "repeat(2, minmax(0, 1fr))",
                  },
                }}
              >
                {requests.map((request) => {
                  const milestone = getMilestoneByCoinCost(request.requestedCoinBudget);
                  const isCuratedRedeem = request.requestType === "curated_redeem";

                  return (
                    <Card
                      key={request._id}
                      sx={{
                        borderRadius: 4,
                        border: "1px solid #eceff3",
                        boxShadow: "0 8px 24px rgba(16,24,40,0.05)",
                      }}
                    >
                      <Box sx={{ p: 2.25 }}>
                        <Stack spacing={1.5}>
                          <Typography sx={{ fontWeight: 800, color: "#101828" }}>
                            {isCuratedRedeem
                              ? "Curated Reward Redeem Request"
                              : "Custom Reward Request"}
                          </Typography>

                          <Typography variant="body2" sx={{ color: "#667085" }}>
                            Agent: {request.agentName || "-"}
                          </Typography>

                          <Typography sx={{ fontWeight: 700, color: "#1d2939" }}>
                            {request.extractedTitle || "Untitled Reward"}
                          </Typography>

                          <Typography
                            variant="body2"
                            sx={{ color: "#667085", wordBreak: "break-all" }}
                          >
                            {request.url || "-"}
                          </Typography>

                          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                            <Chip size="small" color="warning" label="Pending" />
                            <Chip
                              size="small"
                              variant="outlined"
                              label={isCuratedRedeem ? "Redeem Request" : "Custom Request"}
                            />
                            <Chip
                              size="small"
                              variant="outlined"
                              label={request.milestoneLabel || milestone.label}
                            />
                            {request.requestedCoinBudget ? (
                              <Chip
                                size="small"
                                variant="outlined"
                                label={`${formatNumber(request.requestedCoinBudget)} Coins`}
                              />
                            ) : null}
                          </Stack>

                          {request.note ? (
                            <Typography variant="body2" sx={{ color: "#667085" }}>
                              {request.note}
                            </Typography>
                          ) : null}

                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<LaunchIcon />}
                              href={request.url}
                              target="_blank"
                              rel="noreferrer"
                              sx={{ textTransform: "none", borderRadius: 999 }}
                            >
                              Open Link
                            </Button>

                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<ApproveIcon />}
                              onClick={() => handleApprovePendingRequest(request)}
                              disabled={requestActionId === request._id}
                              sx={{
                                textTransform: "none",
                                boxShadow: "none",
                                borderRadius: 999,
                              }}
                            >
                              {requestActionId === request._id ? "Approving..." : "Approve"}
                            </Button>

                            <Button
                              size="small"
                              color="error"
                              variant="outlined"
                              startIcon={<RejectIcon />}
                              onClick={() => openRejectDialog(request)}
                              sx={{ textTransform: "none", borderRadius: 999 }}
                            >
                              Reject
                            </Button>
                          </Stack>
                        </Stack>
                      </Box>
                    </Card>
                  );
                })}
              </Box>
            ) : (
              <Alert severity="info">No pending requests.</Alert>
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
        open={approveDialogOpen}
        onClose={() => !approvalSaving && setApproveDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Approve Custom Reward</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {approvalError ? <Alert severity="error">{approvalError}</Alert> : null}

            <TextField
              label="Name"
              value={approvalForm.title}
              onChange={(e) =>
                setApprovalForm((prev) => ({ ...prev, title: e.target.value }))
              }
              fullWidth
            />

            <TextField
              label="Image Link"
              value={approvalForm.image}
              onChange={(e) =>
                setApprovalForm((prev) => ({ ...prev, image: e.target.value }))
              }
              fullWidth
            />

            <TextField
              label="Product Link"
              value={approvalForm.link}
              onChange={(e) =>
                setApprovalForm((prev) => ({ ...prev, link: e.target.value }))
              }
              fullWidth
            />

            <TextField
              label="Price"
              type="number"
              value={approvalForm.price}
              onChange={(e) =>
                setApprovalForm((prev) => ({ ...prev, price: e.target.value }))
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
                Same as Price: {approvalForm.price ? formatCurrency(approvalForm.price) : "—"}
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
                {getMilestoneByCoinCost(approvalForm.price).label}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleApproveRequest}
            disabled={approvalSaving}
          >
            {approvalSaving ? "Approving..." : "Approve"}
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
