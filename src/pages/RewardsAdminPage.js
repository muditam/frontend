import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
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
  Grid,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
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

  if (value >= 48000) return { id: 8, label: "Milestone 8" };
  if (value >= 42000) return { id: 7, label: "Milestone 7" };
  if (value >= 36000) return { id: 6, label: "Milestone 6" };
  if (value >= 30000) return { id: 5, label: "Milestone 5" };
  if (value >= 24000) return { id: 4, label: "Milestone 4" };
  if (value >= 18000) return { id: 3, label: "Milestone 3" };
  if (value >= 12000) return { id: 2, label: "Milestone 2" };
  if (value >= 6000) return { id: 1, label: "Milestone 1" };
  return { id: null, label: "Below Milestone 1" };
}

const initialRewardForm = {
  title: "",
  image: "",
  link: "",
  price: "",
  note: "",
  isActive: true,
};

const initialApprovalForm = {
  title: "",
  image: "",
  link: "",
  price: "",
  note: "",
  isActive: true,
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

  const fetchRewards = async () => {
    setRewardsLoading(true);
    setRewardsError("");

    try {
      const res = await axios.get(`${API_BASE}/api/rewards`, { headers });

      const list = Array.isArray(res.data?.rewards)
        ? res.data.rewards
        : Array.isArray(res.data)
        ? res.data
        : [];

      setRewards(list);
    } catch (err) {
      console.error("Error fetching rewards:", err);
      setRewards([]);
      setRewardsError(err?.response?.data?.message || "Failed to load rewards.");
    } finally {
      setRewardsLoading(false);
    }
  };

  const fetchRequests = async () => {
    setRequestsLoading(true);
    setRequestsError("");

    try {
      const res = await axios.get(`${API_BASE}/api/custom-reward`, {
        headers,
        params: { status: "pending" },
      });

      const list = Array.isArray(res.data?.requests)
        ? res.data.requests
        : Array.isArray(res.data)
        ? res.data
        : [];

      setRequests(list);
    } catch (err) {
      console.error("Error fetching custom requests:", err);
      setRequests([]);
      setRequestsError(
        err?.response?.data?.message || "Failed to load custom requests."
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
      note: reward.note || "",
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
        note: rewardForm.note.trim(),
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
      fetchRewards();
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
      fetchRewards();
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
      title: "",
      image: "",
      link: request.url || "",
      price: request.requestedCoinBudget || "",
      note: request.note || "",
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
        note: approvalForm.note.trim(),
        isActive: approvalForm.isActive,
      };

      await axios.post(
        `${API_BASE}/api/custom-reward/${approvalRequest._id}/approve`,
        payload,
        { headers }
      );

      setApproveDialogOpen(false);
      fetchRequests();
      fetchRewards();
    } catch (err) {
      console.error("Error approving request:", err);
      setApprovalError(err?.response?.data?.message || "Failed to approve request.");
    } finally {
      setApprovalSaving(false);
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
      fetchRequests();
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
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography sx={{ fontWeight: 700, color: "#101828" }}>
                  Reward Catalog
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
            ) : rewards.length ? (
              <Grid container spacing={2.25}>
                {rewards.map((reward) => {
                  const milestone = getMilestoneByCoinCost(reward.coinCost || reward.price);

                  return (
                    <Grid item xs={12} sm={6} md={4} lg={2.4} key={reward._id}>
                      <Card
                        sx={{
                          height: "100%",
                          borderRadius: 4,
                          overflow: "hidden",
                          border: "1px solid #eaecf0",
                          background: "#ffffff",
                          boxShadow: "0 8px 24px rgba(16,24,40,0.06)",
                          transition: "transform 0.18s ease, box-shadow 0.18s ease",
                          display: "flex",
                          flexDirection: "column",
                          "&:hover": {
                            transform: "translateY(-3px)",
                            boxShadow: "0 14px 32px rgba(16,24,40,0.10)",
                          },
                        }}
                      >
                        <Box sx={{ position: "relative", background: "#f9fafb" }}>
                          {reward.image ? (
                            <Box
                              component="img"
                              src={reward.image}
                              alt={reward.title || "Reward"}
                              sx={{
                                width: "100%",
                                height: 210,
                                objectFit: "contain",
                                display: "block",
                                p: 2,
                                background: "#fff",
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                height: 210,
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
                            label={milestone.label}
                            size="small"
                            sx={{
                              position: "absolute",
                              top: 12,
                              left: 12,
                              borderRadius: 999,
                              fontWeight: 700,
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
                              top: 12,
                              right: 12,
                              borderRadius: 999,
                              fontWeight: 700,
                              background: reward.isActive ? "#ecfdf3" : "#f2f4f7",
                              color: reward.isActive ? "#027a48" : "#667085",
                              border: "1px solid #eaecf0",
                            }}
                          />
                        </Box>

                        <Box
                          sx={{
                            p: 2,
                            display: "flex",
                            flexDirection: "column",
                            flex: 1,
                          }}
                        >
                          <Typography
                            sx={{
                              fontWeight: 700,
                              color: "#1d2939",
                              fontSize: "1rem",
                              lineHeight: 1.35,
                              minHeight: 44,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {reward.title || "Reward"}
                          </Typography>

                          <Box sx={{ mt: 1.5 }}>
                            <Typography
                              sx={{
                                fontWeight: 800,
                                fontSize: "1.12rem",
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

                          {reward.note ? (
                            <Typography
                              variant="body2"
                              sx={{
                                color: "#667085",
                                mt: 1.4,
                                minHeight: 38,
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                            >
                              {reward.note}
                            </Typography>
                          ) : (
                            <Box sx={{ height: 38, mt: 1.4 }} />
                          )}

                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            sx={{ mt: "auto", pt: 1.5 }}
                          >
                            <IconButton
                              component="a"
                              href={reward.link}
                              target="_blank"
                              rel="noreferrer"
                              sx={{
                                width: 40,
                                height: 40,
                                background: "#f2f4f7",
                                color: "#344054",
                                "&:hover": { background: "#e4e7ec" },
                              }}
                            >
                              <LaunchIcon fontSize="small" />
                            </IconButton>

                            <Stack direction="row" spacing={1}>
                              <IconButton
                                onClick={() => openEditRewardDialog(reward)}
                                sx={{
                                  width: 40,
                                  height: 40,
                                  background: "#eef4ff",
                                  color: "#155eef",
                                  "&:hover": { background: "#dbe8ff" },
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>

                              <IconButton
                                onClick={() => openDeleteDialog(reward)}
                                sx={{
                                  width: 40,
                                  height: 40,
                                  background: "#fef3f2",
                                  color: "#d92d20",
                                  "&:hover": { background: "#fee4e2" },
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </Stack>
                        </Box>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            ) : (
              <Alert severity="info">No rewards found.</Alert>
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
              <Grid container spacing={2}>
                {requests.map((request) => {
                  const milestone = getMilestoneByCoinCost(request.requestedCoinBudget);

                  return (
                    <Grid item xs={12} md={6} key={request._id}>
                      <Card
                        sx={{
                          borderRadius: 4,
                          border: "1px solid #eceff3",
                          boxShadow: "0 8px 24px rgba(16,24,40,0.05)",
                        }}
                      >
                        <Box sx={{ p: 2.25 }}>
                          <Stack spacing={1.5}>
                            <Typography sx={{ fontWeight: 800, color: "#101828" }}>
                              Custom Reward Request
                            </Typography>

                            <Typography variant="body2" sx={{ color: "#667085" }}>
                              Agent: {request.agentName || "-"}
                            </Typography>

                            <Typography
                              variant="body2"
                              sx={{ color: "#667085", wordBreak: "break-all" }}
                            >
                              {request.url || "-"}
                            </Typography>

                            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                              <Chip size="small" color="warning" label="Pending" />
                              <Chip size="small" variant="outlined" label={milestone.label} />
                              {request.requestedCoinBudget ? (
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  label={`${formatNumber(request.requestedCoinBudget)} Price`}
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
                                onClick={() => openApproveDialog(request)}
                                sx={{
                                  textTransform: "none",
                                  boxShadow: "none",
                                  borderRadius: 999,
                                }}
                              >
                                Approve
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
                    </Grid>
                  );
                })}
              </Grid>
            ) : (
              <Alert severity="info">No pending custom requests.</Alert>
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

            <TextField
              label="Note"
              multiline
              minRows={2}
              value={rewardForm.note}
              onChange={(e) =>
                setRewardForm((prev) => ({ ...prev, note: e.target.value }))
              }
              fullWidth
            />
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

            <TextField
              label="Note"
              multiline
              minRows={2}
              value={approvalForm.note}
              onChange={(e) =>
                setApprovalForm((prev) => ({ ...prev, note: e.target.value }))
              }
              fullWidth
            />
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
        <DialogTitle>Reject Custom Reward</DialogTitle>
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