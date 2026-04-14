import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";

const MILESTONES = [
  { id: 1, title: "Milestone 1", coin: 6000 },
  { id: 2, title: "Milestone 2", coin: 12000 },
  { id: 3, title: "Milestone 3", coin: 18000 },
  { id: 4, title: "Milestone 4", coin: 24000 },
  { id: 5, title: "Milestone 5", coin: 30000 },
  { id: 6, title: "Milestone 6", coin: 36000 },
  { id: 7, title: "Milestone 7", coin: 42000 },
  { id: 8, title: "Milestone 8", coin: 48000 },
  { id: 9, title: "Milestone 9", coin: 54000 },
  { id: 10, title: "Milestone 10", coin: 60000 },
  { id: 11, title: "Milestone 11", coin: 66000 },
  { id: 12, title: "Milestone 12", coin: 72000 },
];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

  .wrd-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(4px);
    z-index: 1300;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    font-family: 'DM Sans', sans-serif;
  }

  .wrd-dialog {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    width: 100%;
    max-width: 1040px;
    max-height: 95vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.14), 0 4px 16px rgba(15, 23, 42, 0.06);
  }

  .wrd-header {
    padding: 26px 32px 22px;
    border-bottom: 1px solid #f1f5f9;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    flex-shrink: 0;
    background: #fff;
  }

  .wrd-header-left h2 {
    font-family: 'DM Serif Display', serif;
    font-size: 24px;
    font-weight: 400;
    color: #0f172a;
    margin: 0 0 3px;
    letter-spacing: -0.3px;
  }

  .wrd-header-left p {
    font-size: 13px;
    color: #94a3b8;
    margin: 0;
    font-weight: 400;
  }

  .wrd-header-right {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
    flex-wrap: wrap;
    justify-content: flex-end;
    align-items: flex-start;
  }

  .wrd-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 13px;
    border-radius: 100px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.01em;
    white-space: nowrap;
  }

  .wrd-badge-coin {
    background: #f5f3ff;
    color: #6d28d9;
    border: 1px solid #ddd6fe;
  }

  .wrd-badge-milestone {
    background: #f0fdf4;
    color: #15803d;
    border: 1px solid #bbf7d0;
  }

  .wrd-badge-milestone-none {
    background: #fffbeb;
    color: #b45309;
    border: 1px solid #fde68a;
  }

  .wrd-body {
    overflow-y: auto;
    flex: 1;
    padding: 24px 32px;
    background: #f8fafc;
    scrollbar-width: thin;
    scrollbar-color: #e2e8f0 transparent;
  }

  .wrd-tabs {
    display: flex;
    gap: 2px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 4px;
    margin-bottom: 20px;
  }

  .wrd-tab {
    flex: 1;
    padding: 9px 16px;
    border-radius: 9px;
    font-size: 13px;
    font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    color: #64748b;
    background: none;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .wrd-tab:hover { color: #334155; }

  .wrd-tab.active {
    background: #ffffff;
    color: #0f172a;
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.1);
    font-weight: 600;
  }

  .wrd-milestone-strip {
    display: flex;
    gap: 7px;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }

  .wrd-milestone-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 7px 14px;
    border-radius: 100px;
    font-size: 12px;
    font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    border: 1px solid #e2e8f0;
    background: #ffffff;
    color: #64748b;
    transition: all 0.15s ease;
    white-space: nowrap;
  }

  .wrd-milestone-pill:hover {
    border-color: #c7d2fe;
    color: #4338ca;
    background: #eef2ff;
  }

  .wrd-milestone-pill.active {
    background: #4f46e5;
    border-color: #4f46e5;
    color: #ffffff;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(79, 70, 229, 0.28);
  }

  .wrd-milestone-pill.locked {
    background: #f8fafc;
    color: #94a3b8;
  }

  .wrd-milestone-pill.locked:hover {
    border-color: #cbd5e1;
    color: #64748b;
    background: #f1f5f9;
  }

  .wrd-milestone-pill.active.locked {
    background: #4f46e5;
    border-color: #4f46e5;
    color: #ffffff;
  }

  .wrd-lock-icon { font-size: 10px; opacity: 0.55; }

  .wrd-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
    margin-bottom: 20px;
  }

  .wrd-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  }

  .wrd-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
    border-color: #c7d2fe;
  }

  .wrd-card-img {
    height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f8fafc;
    border-bottom: 1px solid #f1f5f9;
    overflow: hidden;
  }

  .wrd-card-img img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    padding: 16px;
  }

  .wrd-gift-icon { font-size: 40px; opacity: 0.2; }

  .wrd-card-body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 11px;
    flex: 1;
  }

  .wrd-card-title {
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin: 0;
  }

  .wrd-card-brand { font-size: 12px; color: #94a3b8; margin: 2px 0 0; }

  .wrd-tags { display: flex; gap: 6px; flex-wrap: wrap; }

  .wrd-tag {
    padding: 3px 10px;
    border-radius: 100px;
    font-size: 11px;
    font-weight: 500;
  }

  .wrd-tag-ms {
    background: #eff6ff;
    color: #1d4ed8;
    border: 1px solid #bfdbfe;
  }

  .wrd-tag-cat {
    background: #f8fafc;
    color: #64748b;
    border: 1px solid #e2e8f0;
  }

  .wrd-coin-box {
    background: #f5f3ff;
    border: 1px solid #ddd6fe;
    border-radius: 10px;
    padding: 10px 14px;
  }

  .wrd-coin-label {
    font-size: 10px;
    font-weight: 700;
    color: #7c3aed;
    text-transform: uppercase;
    letter-spacing: 0.07em;
  }

  .wrd-coin-value {
    font-size: 19px;
    font-weight: 600;
    color: #5b21b6;
    margin-top: 2px;
    font-family: 'DM Serif Display', serif;
  }

  .wrd-card-note {
    font-size: 12px;
    color: #94a3b8;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: 36px;
  }

  .wrd-card-footer {
    margin-top: auto;
    padding-top: 11px;
    border-top: 1px solid #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .wrd-eligible-badge {
    font-size: 11px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 100px;
  }

  .wrd-eligible-badge.yes {
    background: #f0fdf4;
    color: #15803d;
    border: 1px solid #bbf7d0;
  }

  .wrd-eligible-badge.no {
    background: #f8fafc;
    color: #94a3b8;
    border: 1px solid #e2e8f0;
  }

  .wrd-btn-link {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 7px 14px;
    border-radius: 9px;
    font-size: 12px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    background: #eef2ff;
    color: #4338ca;
    border: 1px solid #c7d2fe;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.15s ease;
  }

  .wrd-btn-link:hover { background: #e0e7ff; border-color: #a5b4fc; }

  .wrd-empty {
    text-align: center;
    padding: 56px 24px;
    background: #ffffff;
    border: 1px dashed #e2e8f0;
    border-radius: 16px;
    margin-bottom: 20px;
  }

  .wrd-empty h3 { font-size: 15px; font-weight: 600; color: #475569; margin: 0 0 6px; }
  .wrd-empty p  { font-size: 13px; color: #94a3b8; margin: 0; }

  .wrd-custom-box {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 24px;
  }

  .wrd-custom-box h3 { font-size: 15px; font-weight: 600; color: #0f172a; margin: 0 0 4px; }
  .wrd-custom-box > p { font-size: 13px; color: #94a3b8; margin: 0 0 18px; line-height: 1.5; }

  .wrd-field { position: relative; margin-bottom: 10px; }

  .wrd-field-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    font-size: 14px;
    pointer-events: none;
  }

  .wrd-input {
    width: 100%;
    padding: 10px 13px 10px 36px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    color: #0f172a;
    font-size: 13px;
    font-family: 'DM Sans', sans-serif;
    outline: none;
    transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
  }

  .wrd-input:focus {
    border-color: #818cf8;
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
  }

  .wrd-input::placeholder { color: #cbd5e1; }

  .wrd-textarea {
    width: 100%;
    padding: 10px 13px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    color: #0f172a;
    font-size: 13px;
    font-family: 'DM Sans', sans-serif;
    outline: none;
    resize: vertical;
    min-height: 72px;
    transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
  }

  .wrd-textarea:focus {
    border-color: #818cf8;
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
  }

  .wrd-textarea::placeholder { color: #cbd5e1; }

  .wrd-btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 20px;
    background: #4f46e5;
    border: none;
    color: #ffffff;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: all 0.15s ease;
    box-shadow: 0 2px 8px rgba(79,70,229,0.25);
  }

  .wrd-btn-primary:hover:not(:disabled) {
    background: #4338ca;
    box-shadow: 0 4px 12px rgba(79,70,229,0.35);
  }

  .wrd-btn-primary:disabled { opacity: 0.45; cursor: default; box-shadow: none; }

  .wrd-btn-close {
    padding: 9px 20px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    color: #475569;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .wrd-btn-close:hover { background: #f8fafc; border-color: #cbd5e1; color: #0f172a; }

  .wrd-footer {
    padding: 16px 32px;
    border-top: 1px solid #f1f5f9;
    display: flex;
    justify-content: flex-end;
    flex-shrink: 0;
    background: #fff;
  }

  .wrd-alert { padding: 10px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 12px; line-height: 1.5; }
  .wrd-alert-error   { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }
  .wrd-alert-success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; }

  .wrd-spinner { display: flex; align-items: center; justify-content: center; min-height: 240px; }

  .wrd-spin {
    width: 26px; height: 26px;
    border: 2px solid #e2e8f0;
    border-top-color: #4f46e5;
    border-radius: 50%;
    animation: wrd-spin 0.7s linear infinite;
  }

  @keyframes wrd-spin { to { transform: rotate(360deg); } }

  .wrd-request-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 18px 20px;
    margin-bottom: 12px;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .wrd-request-card:hover { border-color: #c7d2fe; box-shadow: 0 4px 16px rgba(15,23,42,0.06); }

  .wrd-request-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
  }

  .wrd-request-title  { font-size: 14px; font-weight: 600; color: #0f172a; margin: 0 0 3px; }
  .wrd-request-site   { font-size: 12px; color: #94a3b8; margin: 0; }

  .wrd-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 12px;
    border-radius: 100px;
    font-size: 11px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .wrd-status-approved { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
  .wrd-status-rejected { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
  .wrd-status-pending  { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }

  .wrd-meta-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }

  .wrd-timestamp { font-size: 11px; color: #94a3b8; margin-bottom: 10px; display: block; }

  .wrd-divider { border: none; border-top: 1px solid #f1f5f9; margin: 10px 0; }
`;

function formatNumber(v) {
  return Number(v || 0).toLocaleString("en-IN");
}

function formatCurrency(v) {
  return `₹${Number(v || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

function formatDateTime(v) {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString("en-IN");
}

function getUnlockedMilestone(coins) {
  const unlocked = MILESTONES.filter((m) => Number(coins || 0) >= m.coin);
  return unlocked.length ? unlocked[unlocked.length - 1] : null;
}

function getMilestoneMeta(id) {
  return MILESTONES.find((m) => Number(m.id) === Number(id)) || null;
}

function isValidUrl(v = "") {
  try {
    const u = new URL(v);
    return ["http:", "https:"].includes(u.protocol);
  } catch {
    return false;
  }
}

function StatusBadge({ status }) {
  const s = String(status || "").toLowerCase();
  if (s === "approved") {
    return <span className="wrd-status-badge wrd-status-approved">✓ Approved</span>;
  }
  if (s === "rejected") {
    return <span className="wrd-status-badge wrd-status-rejected">✕ Rejected</span>;
  }
  return <span className="wrd-status-badge wrd-status-pending">⏳ Pending</span>;
}

export default function WalletRedeemDialog({
  open,
  onClose,
  headers,
  agentName,
  startDate,
  endDate,
  availableCoin = 0,
}) {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [rewards, setRewards] = useState([]);
  const [error, setError] = useState("");
  const [selectedMilestone, setSelectedMilestone] = useState(1);

  const [customLink, setCustomLink] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [customSubmitting, setCustomSubmitting] = useState(false);
  const [customError, setCustomError] = useState("");
  const [customSuccess, setCustomSuccess] = useState("");

  const [requestsLoading, setRequestsLoading] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [requestsError, setRequestsError] = useState("");

  const [redeemSubmittingId, setRedeemSubmittingId] = useState("");

  const unlockedMilestone = useMemo(
    () => getUnlockedMilestone(availableCoin),
    [availableCoin]
  );

  useEffect(() => {
    if (!open) return;
    const def = getUnlockedMilestone(availableCoin)?.id || MILESTONES[0].id;
    setSelectedMilestone(def);
  }, [open, availableCoin]);

  useEffect(() => {
    if (!open) return;

    (async () => {
      setLoading(true);
      setError("");

      try {
        const res = await axios.get(`${API_BASE}/api/rewards`, {
          headers,
          params: {
            activeOnly: true,
          },
        });

        const list = Array.isArray(res.data?.rewards)
          ? res.data.rewards
          : Array.isArray(res.data)
          ? res.data
          : [];

        setRewards(list);
      } catch (err) {
        console.error("Error fetching curated rewards:", err);
        setRewards([]);
        setError(
          err?.response?.data?.message || "Failed to load curated rewards."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [open, headers]);

  const fetchMyRequests = async () => {
    setRequestsLoading(true);
    setRequestsError("");

    try {
      const res = await axios.get(`${API_BASE}/api/custom-reward/mine`, {
        headers,
      });

      const list = Array.isArray(res.data?.requests)
        ? res.data.requests
        : Array.isArray(res.data)
        ? res.data
        : [];

      setMyRequests(list);
    } catch (err) {
      setMyRequests([]);
      setRequestsError(
        err?.response?.data?.message || "Failed to load your reward requests."
      );
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    fetchMyRequests();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredRewards = useMemo(() => {
    const selectedMeta = getMilestoneMeta(selectedMilestone);
    const maxCoin = Number(selectedMeta?.coin || 0);

    const previousMeta = MILESTONES.find(
      (m) => Number(m.id) === Number(selectedMilestone) - 1
    );
    const minCoin = Number(previousMeta?.coin || 0);

    return rewards.filter((reward) => {
      const coinCost = Number(reward.coinCost ?? reward.price ?? reward.coins ?? 0);
      return coinCost > minCoin && coinCost <= maxCoin;
    });
  }, [rewards, selectedMilestone]);

  const redeemStatusByRewardId = useMemo(() => {
    const map = {};

    myRequests.forEach((item) => {
      if (item.requestType === "curated_redeem" && item.rewardId) {
        const key = String(item.rewardId);
        if (!map[key]) {
          map[key] = item.status || "pending";
        }
      }
    });

    return map;
  }, [myRequests]);

  const handleSubmitCustomReward = async () => {
    setCustomError("");
    setCustomSuccess("");

    if (!customLink.trim()) {
      setCustomError("Please paste a product link.");
      return;
    }

    if (!isValidUrl(customLink.trim())) {
      setCustomError("Please enter a valid product link (https://...).");
      return;
    }

    if (!customPrice || Number(customPrice) <= 0) {
      setCustomError("Please enter a valid price.");
      return;
    }

    setCustomSubmitting(true);

    try {
      const res = await axios.post(
        `${API_BASE}/api/custom-reward`,
        {
          url: customLink.trim(),
          note: customNotes.trim(),
          agentName,
          availableCoin: Number(customPrice || 0),
          startDate,
          endDate,
          milestoneId: Number(selectedMilestone),
        },
        { headers }
      );

      setCustomSuccess(
        res.data?.message || "Request submitted — pending approval."
      );
      setCustomLink("");
      setCustomPrice("");
      setCustomNotes("");
      await fetchMyRequests();
      setTab(1);
    } catch (err) {
      setCustomError(
        err?.response?.data?.message || "Failed to submit request."
      );
    } finally {
      setCustomSubmitting(false);
    }
  };

  const handleRedeemReward = async (reward) => {
    setCustomError("");
    setCustomSuccess("");

    if (!reward?._id) {
      setCustomError("Reward not found.");
      return;
    }

    setRedeemSubmittingId(String(reward._id));

    try {
      const res = await axios.post(
        `${API_BASE}/api/reward-redeem`,
        {
          rewardId: reward._id,
          agentName,
          availableCoin: Number(availableCoin || 0),
          startDate,
          endDate,
        },
        { headers }
      );

      setCustomSuccess(
        res.data?.message || "Redeem request submitted successfully."
      );
      await fetchMyRequests();
      setTab(1);
    } catch (err) {
      setCustomError(
        err?.response?.data?.message || "Failed to submit redeem request."
      );
    } finally {
      setRedeemSubmittingId("");
    }
  };

  if (!open) return null;

  return (
    <>
      <style>{styles}</style>

      <div
        className="wrd-overlay"
        onClick={(e) => {
          if (
            e.target === e.currentTarget &&
            !loading &&
            !customSubmitting &&
            !redeemSubmittingId
          ) {
            onClose();
          }
        }}
      >
        <div className="wrd-dialog">
          <div className="wrd-header">
            <div className="wrd-header-left">
              <h2>Gift Picker</h2>
              <p>Browse curated rewards or submit a custom request</p>
            </div>

            <div className="wrd-header-right">
              <span className="wrd-badge wrd-badge-coin">
                ◆ {formatNumber(availableCoin)} coins
              </span>

              {unlockedMilestone ? (
                <span className="wrd-badge wrd-badge-milestone">
                  ✓ {unlockedMilestone.title} unlocked
                </span>
              ) : (
                <span className="wrd-badge wrd-badge-milestone-none">
                  No milestone unlocked
                </span>
              )}
            </div>
          </div>

          <div className="wrd-body">
            <div className="wrd-tabs">
              <button
                className={`wrd-tab${tab === 0 ? " active" : ""}`}
                onClick={() => setTab(0)}
              >
                Curated Rewards
              </button>

              <button
                className={`wrd-tab${tab === 1 ? " active" : ""}`}
                onClick={() => setTab(1)}
              >
                My Requests{myRequests.length > 0 ? ` (${myRequests.length})` : ""}
              </button>
            </div>

            {tab === 0 && (
              <>
                <div className="wrd-milestone-strip">
                  {MILESTONES.map((item) => {
                    const locked = Number(availableCoin || 0) < item.coin;
                    const isSelected = Number(selectedMilestone) === item.id;

                    return (
                      <button
                        key={item.id}
                        className={[
                          "wrd-milestone-pill",
                          isSelected ? "active" : "",
                          locked ? "locked" : "",
                        ]
                          .join(" ")
                          .trim()}
                        onClick={() => setSelectedMilestone(item.id)}
                      >
                        {locked && !isSelected && (
                          <span className="wrd-lock-icon">🔒</span>
                        )}
                        {item.title} · {formatCurrency(item.coin)}
                      </button>
                    );
                  })}
                </div>

                {error && <div className="wrd-alert wrd-alert-error">{error}</div>}
                {customError && (
                  <div className="wrd-alert wrd-alert-error">{customError}</div>
                )}
                {customSuccess && (
                  <div className="wrd-alert wrd-alert-success">{customSuccess}</div>
                )}

                {loading ? (
                  <div className="wrd-spinner">
                    <div className="wrd-spin" />
                  </div>
                ) : filteredRewards.length ? (
                  <div className="wrd-grid">
                    {filteredRewards.map((reward) => {
                      const coinCost = Number(
                        reward.coinCost ?? reward.price ?? reward.coins ?? 0
                      );
                      const eligible = Number(availableCoin || 0) >= coinCost;
                      const milestoneMeta = getMilestoneMeta(reward.milestoneId);
                      const currentRedeemStatus =
                        redeemStatusByRewardId[String(reward._id)];

                      return (
                        <div className="wrd-card" key={reward._id || reward.id}>
                          <div className="wrd-card-img">
                            {reward.image ? (
                              <img src={reward.image} alt={reward.title} />
                            ) : (
                              <span className="wrd-gift-icon">🎁</span>
                            )}
                          </div>

                          <div className="wrd-card-body">
                            <div>
                              <p className="wrd-card-title">
                                {reward.title || "Reward"}
                              </p>
                              <p className="wrd-card-brand">
                                {reward.brand || reward.category || "Curated Reward"}
                              </p>
                            </div>

                            <div className="wrd-tags">
                              <span className="wrd-tag wrd-tag-ms">
                                {milestoneMeta
                                  ? milestoneMeta.title
                                  : reward.milestoneLabel || "Suggested"}
                              </span>

                              {reward.category && (
                                <span className="wrd-tag wrd-tag-cat">
                                  {reward.category}
                                </span>
                              )}
                            </div>

                            <div className="wrd-coin-box">
                              <div className="wrd-coin-label">Redemption</div>
                              <div className="wrd-coin-value">
                                {formatNumber(coinCost)} coins
                              </div>
                            </div> 

                            <div className="wrd-card-footer">
                              <span
                                className={`wrd-eligible-badge ${
                                  eligible ? "yes" : "no"
                                }`}
                              >
                                {eligible ? "✓ Eligible" : "Locked"}
                              </span>

                              <div
                                style={{
                                  display: "flex",
                                  gap: 8,
                                  alignItems: "center",
                                  flexWrap: "wrap",
                                  justifyContent: "flex-end",
                                }}
                              >
                                <a
                                  className="wrd-btn-link"
                                  href={reward.link || reward.url || "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={
                                    !(reward.link || reward.url)
                                      ? { opacity: 0.4, pointerEvents: "none" }
                                      : {}
                                  }
                                >
                                  View ↗
                                </a>

                                <button
                                  className="wrd-btn-primary"
                                  style={{
                                    padding: "7px 14px",
                                    fontSize: 12,
                                    boxShadow: "none",
                                  }}
                                  disabled={
                                    !eligible ||
                                    redeemSubmittingId === String(reward._id) ||
                                    currentRedeemStatus === "pending" ||
                                    currentRedeemStatus === "approved"
                                  }
                                  onClick={() => handleRedeemReward(reward)}
                                >
                                  {redeemSubmittingId === String(reward._id)
                                    ? "Submitting..."
                                    : currentRedeemStatus === "pending"
                                    ? "Pending"
                                    : currentRedeemStatus === "approved"
                                    ? "Approved"
                                    : "Redeem"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="wrd-empty">
                    <h3>No rewards for this milestone</h3>
                    <p>Check back later or submit a custom product link below.</p>
                  </div>
                )}

                <div className="wrd-custom-box">
                  <h3>Request a custom reward</h3>
                  <p>
                    Can't find what you want? Paste a product link and we'll
                    review it under the selected milestone.
                  </p>

                  <div className="wrd-field">
                    <span className="wrd-field-icon">🔗</span>
                    <input
                      className="wrd-input"
                      type="url"
                      placeholder="https://..."
                      value={customLink}
                      onChange={(e) => setCustomLink(e.target.value)}
                    />
                  </div>

                  <div className="wrd-field">
                    <input
                      className="wrd-input"
                      type="number"
                      placeholder="Enter price"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      min="0"
                      step="1"
                      style={{ paddingLeft: 13 }}
                    />
                  </div>

                  <textarea
                    className="wrd-textarea"
                    placeholder="Notes — colour, size, model, or any preference (optional)"
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    style={{ marginBottom: 14 }}
                  />

                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      className="wrd-btn-primary"
                      onClick={handleSubmitCustomReward}
                      disabled={customSubmitting || !customLink.trim() || !customPrice.trim()}
                    >
                      {customSubmitting ? "Submitting…" : "Submit Request"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {tab === 1 && (
              <>
                {requestsError && (
                  <div className="wrd-alert wrd-alert-error">{requestsError}</div>
                )}

                {requestsLoading ? (
                  <div className="wrd-spinner">
                    <div className="wrd-spin" />
                  </div>
                ) : myRequests.length ? (
                  myRequests.map((item) => {
                    const isCuratedRedeem =
                      item.requestType === "curated_redeem";

                    return (
                      <div className="wrd-request-card" key={item._id}>
                        <div className="wrd-request-header">
                          <div>
                            <p className="wrd-request-title">
                              {item.extractedTitle ||
                                (isCuratedRedeem
                                  ? "Curated Reward Redeem"
                                  : "Custom Reward Request")}
                            </p>
                            <p className="wrd-request-site">
                              {item.extractedSiteName ||
                                (isCuratedRedeem
                                  ? "Curated Reward"
                                  : "Via product link")}
                            </p>
                          </div>

                          <StatusBadge status={item.status} />
                        </div>

                        <div className="wrd-meta-row">
                          {item.milestoneLabel && (
                            <span className="wrd-tag wrd-tag-ms">
                              {item.milestoneLabel}
                            </span>
                          )}

                          {item.requestType && (
                            <span className="wrd-tag wrd-tag-cat">
                              {isCuratedRedeem ? "Redeem Request" : "Custom Request"}
                            </span>
                          )}

                          {item.requestedCoinBudget ? (
                            <span className="wrd-tag wrd-tag-cat">
                              Budget: {formatNumber(item.requestedCoinBudget)} coins
                            </span>
                          ) : null}
                        </div>

                        {item.note && (
                          <p
                            style={{
                              fontSize: 13,
                              color: "#64748b",
                              margin: "0 0 8px",
                              lineHeight: 1.5,
                            }}
                          >
                            {item.note}
                          </p>
                        )}

                        <span className="wrd-timestamp">
                          Submitted: {formatDateTime(item.createdAt)}
                        </span>

                        {item.rejectionReason && (
                          <div
                            className="wrd-alert wrd-alert-error"
                            style={{ marginBottom: 10 }}
                          >
                            {item.rejectionReason}
                          </div>
                        )}

                        <a
                          className="wrd-btn-link"
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          style={
                            !item.url
                              ? { opacity: 0.4, pointerEvents: "none" }
                              : {}
                          }
                        >
                          Open link ↗
                        </a>
                      </div>
                    );
                  })
                ) : (
                  <div className="wrd-empty">
                    <h3>No requests yet</h3>
                    <p>
                      Submit a product link or redeem a curated reward from the
                      Curated Rewards tab.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="wrd-footer">
            <button
              className="wrd-btn-close"
              onClick={onClose}
              disabled={loading || customSubmitting || !!redeemSubmittingId}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}