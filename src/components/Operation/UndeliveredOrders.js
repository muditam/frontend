import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Snackbar,
  Alert,
  CircularProgress,
  Checkbox,
  Chip,
  MenuItem,
  Select,
  Typography,
  Tooltip,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import dayjs from "dayjs";
import axios from "axios";
import { IconButton } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

const API_BASE = process.env.REACT_APP_API_BASE || "https://muditamleads-14f32a10d7f7.herokuapp.com";

const SUBJECT_TEMPLATES = [
  { key: "fakeRemark", label: "Escalation – Fake Delivery Remark | Order ID {{Order_ID}} | AWB {{tracking_number}}" },
  { key: "notReceived", label: "Urgent – Wrong Delivery Status | Order ID {{Order_ID}} | AWB {{tracking_number}}" },
  { key: "delayed", label: "Delay in Delivery | Order ID {{Order_ID}} | AWB {{tracking_number}}" },
  { key: "doorstep", label: "Request for Doorstep Delivery | Order ID {{Order_ID}} | AWB {{tracking_number}}" },
  { key: "wrongOtp", label: "Escalation – Wrong OTP Taken | Order ID {{Order_ID}} | AWB {{tracking_number}}" },
  { key: "codToPrepaid", label: "Request for Payment Mode Change | Order ID {{Order_ID}} | AWB {{tracking_number}}" },
  { key: "rto", label: "Request for RTO | Order ID {{Order_ID}} | AWB {{tracking_number}}" },
  { key: "urgentDelivery", label: "Urgent Delivery Required | Order ID {{Order_ID}} | AWB {{tracking_number}}" },
];

const CONTENT_TEMPLATES = [
  {
    key: "fakeRemark",
    label:
      "Dear Team,\n\nThe tracking for AWB {{tracking_number}} shows Fake Remark,\nwhich is incorrect.\nCustomer wants the Shipment on priority basis.\nKindly deliver at the earliest.\n\nRegards,\n{{Agent_Name}}",
  },
  {
    key: "notReceived",
    label:
      "Dear Team,\n\nAWB {{tracking_number}} is marked delivered,\nbut the consignee has not received it.\nPlease check and resolve urgently.\n\nRegards,\n{{Agent_Name}}",
  },
  {
    key: "delayed",
    label:
      "Dear Team,\n\nAWB {{tracking_number}} dispatched on {{order date}} has crossed the expected delivery time.\nKindly arrange delivery without further delay.\n\nRegards,\n{{Agent_Name}}",
  },
  {
    key: "doorstep",
    label:
      "Dear Team,\n\nKindly ensure AWB {{tracking_number}} is delivered at the customer’s doorstep as committed.\nPlease arrange delivery on priority.\n\nRegards,\n{{Agent_Name}}",
  },
  {
    key: "wrongOtp",
    label:
      "Dear Team,\n\nFor AWB {{tracking_number}}, the courier boy took OTP from the customer under false pretext for cancellation.\nPlease investigate and reattempt delivery immediately.\n\nRegards,\n{{Agent_Name}}",
  },
  {
    key: "codToPrepaid",
    label:
      "Dear Team,\n\nPlease change the payment mode for AWB {{tracking_number}} from COD to Prepaid and process delivery accordingly.\n\nRegards,\n{{Agent_Name}}",
  },
  {
    key: "rto",
   label:
      "Dear Team,\n\nPlease initiate RTO for AWB {{tracking_number}} and confirm once updated in the system.\n\nRegards,\n{{Agent_Name}}",
  },
  {
    key: "urgentDelivery",
    label:
     "Dear Team,\n\nThis shipment AWB {{tracking_number}} is critical.\nKindly ensure delivery to the customer today without fail.\n\nRegards,\n{{Agent_Name}}",
 },
];

const EMAIL_SUGGESTIONS = [
  "Devesh.muditam@gmail.com",
  "madhur.muditam@gmail.com",
  "operations@muditam.com",
];

const UndeliveredOrdersTabs = () => {
  const [tab, setTab] = useState("High");
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ High: 0, Medium: 0, Low: 0 });
  const [replyItems, setReplyItems] = useState([]); // [{from, at, text}]
  const [replyIndex, setReplyIndex] = useState(0);  // current visible index
  const [replyHasMore, setReplyHasMore] = useState(false);
  const [replyOffset, setReplyOffset] = useState(0);
  const REPLIES_PAGE_SIZE = 5;


  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Backend-driven email status: { [order_id]: { emailed: true, count: number, lastReply?: { text, at, from } } }
  const [emailStatus, setEmailStatus] = useState({});

  // Email modal state
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({
    from: "operations@muditam.com",
    to: ["Devesh.muditam@gmail.com", "madhur.muditam@gmail.com"],
    subjectTemplateKey: "notDelivered",
    contentTemplateKey: "statusNotDelivered",
  });
  const [attachments, setAttachments] = useState([]); // File[]
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState({ open: false, severity: "success", msg: "" });

  // Reply dialog (on-demand)
  const [replyDlg, setReplyDlg] = useState({
    open: false,
    loading: false,
    orderId: null,
    data: null, // { text, at, from } | null
  });

  // Load emailed state (and latest replies snapshot) from backend on mount
  useEffect(() => {
    const loadSentFromBackend = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/zoho/sent?withReplies=1`);
        const sentOrderIds = data?.sentOrderIds || [];
        const counts = data?.counts || {};
        const replies = data?.replies || {};
        const map = {};
        sentOrderIds.forEach((oid) => {
          map[oid] = {
            emailed: (counts[oid] || 0) > 0,   // highlights “emailed” rows for all with count
            count: counts[oid] || 0,
            ...(replies[oid] ? { lastReply: replies[oid] } : {}),
          };
        });
        setEmailStatus(prev => {
          const next = { ...prev };
          Object.entries(map).forEach(([oid, v]) => {
            next[oid] = { ...(next[oid] || {}), ...v };
          });
          return next;
        });
      } catch (e) {
        console.error("Failed to load sent orders:", e);
      }
    };
    loadSentFromBackend();
  }, []);

  // Fetch orders when tab/page/rows change
  useEffect(() => {
    fetchOrders(tab, page + 1, rowsPerPage);
    setSelectedIds(new Set());
  }, [tab, page, rowsPerPage]);

  const fetchOrders = async (priority, pageNum, limit) => {
    try {
      const res = await axios.get(
        `https://muditamleads-14f32a10d7f7.herokuapp.com/api/orders/undelivered?priority=${priority}&page=${pageNum}&limit=${limit}`
      );
      setOrders(res.data.data || []);
      setTotal(res.data.total || 0);
      setCounts(res.data.counts || { High: 0, Medium: 0, Low: 0 });
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  // Selection helpers
  const allVisibleSelected = useMemo(
    () => orders.length > 0 && orders.every((o) => selectedIds.has(o._id)),
    [orders, selectedIds]
  );
  const someVisibleSelected = useMemo(
    () => orders.some((o) => selectedIds.has(o._id)) && !allVisibleSelected,
    [orders, selectedIds, allVisibleSelected]
  );
  const selectedOrders = useMemo(
    () => orders.filter((o) => selectedIds.has(o._id)),
    [orders, selectedIds]
  );

  // --- add these with your other useState hooks ---
const [replyComposeOpen, setReplyComposeOpen] = useState(false);
const [replySending, setReplySending] = useState(false);
const [replyForm, setReplyForm] = useState({
  subjectTemplateKey: "notDelivered",
  contentTemplateKey: "statusNotDelivered",
});

// Render helper to reuse your template renderer
const renderReplyPreview = (orderId) => {
  const ord = orders.find((o) => o.order_id === orderId);
  if (!ord) return { subject: "", content: "" };
  const vars = {
    "order_id": ord.order_id || "-",
     "order id": ord.order_id || "-",
    "tracking_number": ord.tracking_number || "-",
    "awb": ord.tracking_number || "-",
    "order date": ord.order_date ? dayjs(ord.order_date).format("DD/MM/YYYY") : "-", 
   "agent_name": getAgentName(), 
  };
  const subjectTpl =
    SUBJECT_TEMPLATES.find((t) => t.key === replyForm.subjectTemplateKey)?.label ||
    SUBJECT_TEMPLATES[0].label;
  const contentTpl =
    CONTENT_TEMPLATES.find((t) => t.key === replyForm.contentTemplateKey)?.label ||
    CONTENT_TEMPLATES[0].label;

  return {
    subject: replaceTokens(subjectTpl, vars),
    content: replaceTokens(contentTpl, vars),
  };
};

// reply dropdown handlers
const handleReplySubjectChange = (e) =>
  setReplyForm((p) => ({ ...p, subjectTemplateKey: e.target.value }));
const handleReplyContentChange = (e) =>
  setReplyForm((p) => ({ ...p, contentTemplateKey: e.target.value }));

// send reply (calls your backend)
const handleSendReply = async () => {
  if (!replyDlg.orderId) return;
  try {
    setReplySending(true);
    const payload = {
      orderId: replyDlg.orderId,
      subjectTemplateKey: replyForm.subjectTemplateKey,
      contentTemplateKey: replyForm.contentTemplateKey,
    };
    await axios.post(`${API_BASE}/api/zoho/reply`, payload);

    // refresh this order's latest reply after sending
    try {
      const qs = encodeURIComponent(replyDlg.orderId);
      const { data } = await axios.get(`${API_BASE}/api/zoho/replies?orderIds=${qs}`);
      const rep = data?.replies?.[replyDlg.orderId] || null;
      setEmailStatus((prev) => ({
        ...prev,
        [replyDlg.orderId]: {
          ...(prev[replyDlg.orderId] || { emailed: true, count: prev[replyDlg.orderId]?.count || 0 }),
          ...(rep ? { lastReply: rep } : {}),
        },
      }));
      setReplyDlg((d) => ({ ...d, data: rep }));
    } catch {}

    setToast({ open: true, severity: "success", msg: "Reply sent." });
    setReplyComposeOpen(false);
  } catch (err) {
    setToast({
      open: true,
      severity: "error",
      msg: err?.response?.data?.message || err?.message || "Failed to send reply.",
    });
  } finally {
    setReplySending(false);
  }
};
 
// Get agent name from sessionStorage
const getAgentName = () => {
  const user = JSON.parse(sessionStorage.getItem("user")); // Assuming the user data is stored in sessionStorage with key "user"
  if (user && user.fullName) {
    return user.fullName; // Use fullName from the logged-in user data
  }
  return "Agent"; // Fallback to "Agent" if no name found
};


// Robust token replacement for both {{token}} and {token}, case-insensitive
const replaceTokens = (tpl, vars) => {
  if (!tpl) return "";
  let out = String(tpl);
  // Handle {{ token }} style
  out = out.replace(/{{\s*([^}]+)\s*}}/gi, (_, raw) => {
    const key = String(raw).trim().toLowerCase();
    return vars[key] ?? "";
  });
  // Back-compat for {token} style already used in older UI
  out = out.replace(/{\s*([^}]+)\s*}/gi, (_, raw) => {
    const key = String(raw).trim().toLowerCase();
    return vars[key] ?? "";
  });
  return out;
};

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (allVisibleSelected) {
        orders.forEach((o) => s.delete(o._id));
      } else {
        orders.forEach((o) => s.add(o._id));
      }
      return s;
    });
  };

  const loadRepliesPage = async ({ orderId, offset = 0, append = false }) => {
  try {
    const { data } = await axios.get(
      `${API_BASE}/api/zoho/replies/list`,
      { params: { orderId, offset, limit: REPLIES_PAGE_SIZE } }
    );
    const rawItems = Array.isArray(data?.items) ? data.items : [];

    // Prefer only external replies (not from us). If none, show all.
    const external = rawItems.filter((it) => !it.isSelf);
    const items = external.length ? external : rawItems;

    setReplyItems((prev) => (append ? [...prev, ...items] : items));
    setReplyHasMore(!!data?.hasMore);
    setReplyOffset(offset + rawItems.length); // advance by raw length so paging stays correct

    if (!append) setReplyIndex(0);

    if (!items.length) {
      setToast({ open: true, severity: "info", msg: "No replies found in this thread yet." });
    }
  } catch (e) {
    console.error("Failed to load replies list:", e);
    setToast({ open: true, severity: "error", msg: "Failed to load replies." });
  }
};



  // Email modal handlers
  const handleOpenEmail = () => {
    if (selectedOrders.length === 0) {
      setToast({ open: true, severity: "error", msg: "Select at least one order." });
      return;
    }
    setEmailOpen(true);
  };
  const handleCloseEmail = () => {
    if (!sending) setEmailOpen(false);
  };

  const SUBJECT_TO_CONTENT_MAP = {
  fakeRemark: "fakeRemark",
  notReceived: "notReceived",
  delayed: "delayed",
  doorstep: "doorstep",
  wrongOtp: "wrongOtp",
  codToPrepaid: "codToPrepaid",
  rto: "rto",
  urgentDelivery: "urgentDelivery",
};

  const handleFromChange = (e) =>
    setEmailForm((p) => ({ ...p, from: e.target.value }));
  const handleToChange = (_, values) =>
    setEmailForm((p) => ({ ...p, to: values }));
  const handleSubjectTemplateChange = (e) => {
  const selectedSubjectTemplateKey = e.target.value;
  setEmailForm((p) => ({
    ...p,
    subjectTemplateKey: selectedSubjectTemplateKey,
    contentTemplateKey: SUBJECT_TO_CONTENT_MAP[selectedSubjectTemplateKey],  
  }));
};
  const handleContentTemplateChange = (e) =>
    setEmailForm((p) => ({ ...p, contentTemplateKey: e.target.value }));
  const handleAttachmentsChange = (e) => {
    setAttachments(Array.from(e.target.files || []));
  };

  // Template preview
  const fmt = (d) => (d ? dayjs(d).format("DD/MM/YYYY") : "-");
  const first = selectedOrders[0];
  const previewVars = first
   ? {
      // normalized, lower-cased keys for replaceTokens
       "order_id": first.order_id || "-",
       "order id": first.order_id || "-",
       "tracking_number": first.tracking_number || "-",
      "awb": first.tracking_number || "-",
       "order date": fmt(first.order_date),
      "agent_name": getAgentName(emailForm.from),
     }
   : null;

  const renderTemplate = (tpl, v) =>
    tpl
      .replace(/{order_id}/g, v.order_id)
      .replace(/{carrier}/g, v.carrier)
      .replace(/{tracking_number}/g, v.tracking_number)
      .replace(/{shipment_status}/g, v.shipment_status)
      .replace(/{order_date}/g, v.order_date);

  const previewSubject =
   first &&
   replaceTokens(
     SUBJECT_TEMPLATES.find((t) => t.key === emailForm.subjectTemplateKey)?.label ||
      SUBJECT_TEMPLATES[0].label,
    previewVars
   );
 
 const previewContent =
   first &&
   replaceTokens(
     CONTENT_TEMPLATES.find((t) => t.key === emailForm.contentTemplateKey)?.label ||
       CONTENT_TEMPLATES[0].label,
     previewVars
   );

  // Send email (batch) then refresh emailed state from backend
  const handleSendEmail = async () => {
    const { from, to, subjectTemplateKey, contentTemplateKey } = emailForm;
    if (!from || !to?.length || !subjectTemplateKey || !contentTemplateKey) {
      setToast({
        open: true,
        severity: "error",
        msg: "From, To, Subject and Content templates are required.",
      });
      return;
    }

    try {
      setSending(true);

      const payloadOrders = selectedOrders.map((o) => ({
        order_id: o.order_id || "",
        carrier: o.carrier_title || "",
        tracking_number: o.tracking_number || "",
        shipment_status: o.shipment_status || "",
        order_date: o.order_date || "",
      }));

      if (attachments.length > 0) {
        const fd = new FormData();
        fd.append("from", from);
        fd.append("to", JSON.stringify(to));
        fd.append("subjectTemplateKey", subjectTemplateKey);
        fd.append("contentTemplateKey", contentTemplateKey);
        fd.append("orders", JSON.stringify(payloadOrders));
        fd.append("gapSeconds", String(60));
        fd.append("agentName", getAgentName(from));
        attachments.forEach((file) => fd.append("attachments", file, file.name));

        await axios.post(`${API_BASE}/api/zoho/send-batch`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await axios.post(`${API_BASE}/api/zoho/send-batch`, {
          from,
          to,
          subjectTemplateKey,
          contentTemplateKey,
          orders: payloadOrders,
          gapSeconds: 60,
          agentName: getAgentName(from),
        });
      }

      // Optimistic mark + then hard refresh from backend for counts/replies snapshot
      setEmailStatus((prev) => {
        const next = { ...prev };
        payloadOrders.forEach((o) => {
          if (!o.order_id) return;
          next[o.order_id] = { ...(next[o.order_id] || {}), emailed: true };
        });
        return next;
      });

      try {
        const { data } = await axios.get(`${API_BASE}/api/zoho/sent?withReplies=1`);
        const sentOrderIds = data?.sentOrderIds || [];
        const counts = data?.counts || {};
        const replies = data?.replies || {};
        const map = {};
        sentOrderIds.forEach((oid) => {
          map[oid] = {
            emailed: (counts[oid] || 0) > 0,   // highlights “emailed” rows for all with count
            count: counts[oid] || 0,
            ...(replies[oid] ? { lastReply: replies[oid] } : {}),
          };
        });
        setEmailStatus(prev => {
          const next = { ...prev };
          Object.entries(map).forEach(([oid, v]) => {
            next[oid] = { ...(next[oid] || {}), ...v };
          });
          return next;
        });
      } catch { }

      setToast({
        open: true,
        severity: "success",
        msg: `Scheduled ${payloadOrders.length} email(s) (1 min apart).`,
      });
      setEmailOpen(false);
      setAttachments([]);
    } catch (err) {
      console.error(err);
      setToast({
        open: true,
        severity: "error",
        msg:
          err?.response?.data?.message ||
          err?.message ||
          "Failed to schedule emails.",
      });
    } finally {
      setSending(false);
    }
  };

  // On-demand: open reply dialog for a single order, fetching only if needed
  const openReplyDialog = async (orderId) => {
    const existing = emailStatus[orderId]?.lastReply || null;
    setReplyDlg({ open: true, loading: true, orderId, data: existing });

    await loadRepliesPage({ orderId, offset: 0, append: false });

    try {
      const qs = encodeURIComponent(orderId);
      const { data } = await axios.get(`${API_BASE}/api/zoho/replies?orderIds=${qs}`);
      const rep = data?.replies?.[orderId] || null;

      // update local emailStatus cache
      setEmailStatus((prev) => ({
        ...prev,
        [orderId]: {
          ...(prev[orderId] || { emailed: true, count: prev[orderId]?.count || 0 }),
          ...(rep ? { lastReply: rep } : {}),
        },
      }));

      setReplyDlg((d) => ({ ...d, loading: false, data: rep }));
    } catch {
    setReplyDlg((d) => ({ ...d, loading: false }));
  }
  };

  const showPrevReply = () => {
  setReplyIndex((idx) => Math.max(0, idx - 1));
};

const showNextReply = async () => {
  const isLastLoaded = replyIndex >= replyItems.length - 1;
  if (isLastLoaded && replyHasMore && replyDlg.orderId) {
    // Fetch next page and then move forward
    await loadRepliesPage({ orderId: replyDlg.orderId, offset: replyOffset, append: true });
    setReplyIndex((idx) => Math.min(idx + 1, replyItems.length)); // move to first of the new page
  } else {
    setReplyIndex((idx) => Math.min(replyItems.length - 1, idx + 1));
  }
};


  const closeReplyDialog = () =>
    setReplyDlg({ open: false, loading: false, orderId: null, data: null });

  const renderSelectedChips = () => (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
      {selectedOrders.map((o) => (
        <Chip key={o._id} label={o.order_id || o._id} />
      ))}
    </Box>
  );

  const renderEmailStatusCell = (order) => {
    const status = emailStatus[order.order_id];
    if (!status?.emailed) {
      return (
        <Chip
          size="small"
          label="Not emailed"
          variant="outlined"
          onClick={() => openReplyDialog(order.order_id)}
          clickable
        />
      );
    }

    const label = status.lastReply
      ? `Replied${status.count ? ` • ${status.count}` : ""}`
      : `Emailed${status.count ? ` • ${status.count}` : ""}`;

    const chipProps = status.lastReply
      ? { color: "success" }
      : { sx: { bgcolor: "black", color: "white" } };

    return (
      <Chip
        size="small"
        label={label}
        onClick={() => openReplyDialog(order.order_id)}
        clickable
        {...chipProps}
      />
    );
  };

  return (
    <Box p={2}>
      {/* Header row: Tabs (left) + Send Email (right) */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          TabIndicatorProps={{ style: { backgroundColor: "black" } }}
          sx={{
            "& .MuiTab-root.Mui-selected": { color: "black" },
          }}
        >
          <Tab value="High" label={`High (${counts.High ?? 0})`} />
          <Tab value="Medium" label={`Medium (${counts.Medium})`} />
          <Tab value="Low" label={`Low (${counts.Low})`} />
        </Tabs>

        <Button
          variant="contained"
          disabled={selectedOrders.length === 0}
          onClick={handleOpenEmail}
          sx={{
            bgcolor: "black",
            color: "white",
            "&:hover": { bgcolor: "#333" },
          }}
        >
          Send Email
        </Button>
      </Box>

      {/* Orders Table */}
      <Paper sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "black" }}>
              <TableCell
                padding="checkbox"
                align="center"
                sx={{ color: "white", fontWeight: "bold" }}
              >
                <Checkbox
                  indeterminate={someVisibleSelected}
                  checked={allVisibleSelected && orders.length > 0}
                  onChange={toggleAllVisible}
                  sx={{
                    color: "white",
                    "&.Mui-checked": { color: "white" },
                    "&.MuiCheckbox-indeterminate": { color: "white" },
                  }}
                />
              </TableCell>
              <TableCell align="center" sx={{ color: "white", fontWeight: "bold" }}>
                Order ID
              </TableCell>
              <TableCell align="center" sx={{ color: "white", fontWeight: "bold" }}>
                Status
              </TableCell>
              <TableCell align="center" sx={{ color: "white", fontWeight: "bold" }}>
                Order Date
              </TableCell>
              <TableCell align="center" sx={{ color: "white", fontWeight: "bold" }}>
                Due Days
              </TableCell>
              <TableCell align="center" sx={{ color: "white", fontWeight: "bold" }}>
                Tracking No.
              </TableCell>
              <TableCell align="center" sx={{ color: "white", fontWeight: "bold" }}>
                Carrier
              </TableCell>
              <TableCell align="center" sx={{ color: "white", fontWeight: "bold" }}>
                Email / Reply
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {orders.length > 0 ? (
              orders.map((order) => {
                const isEmailed = !!emailStatus[order.order_id]?.emailed;
                return (
                  <TableRow
                    key={order._id}
                    hover
                    sx={{
                      backgroundColor: isEmailed ? "rgba(46, 125, 50, 0.08)" : "inherit",
                      transition: "background-color 0.2s ease",
                    }}
                  >
                    <TableCell padding="checkbox" align="center">
                      <Checkbox
                        checked={selectedIds.has(order._id)}
                        onChange={() => toggleOne(order._id)}
                        sx={{ "&.Mui-checked": { color: "black" } }}
                      />
                    </TableCell>
                    <TableCell align="center">{order.order_id || "-"}</TableCell>
                    <TableCell align="center">{order.shipment_status || "-"}</TableCell>
                    <TableCell align="center">
                      {order.order_date ? dayjs(order.order_date).format("DD/MM/YYYY") : "-"}
                    </TableCell>
                    <TableCell align="center">
                      {order.order_date
                        ? Math.max(0, dayjs().diff(dayjs(order.order_date), "day"))
                        : "-"}
                    </TableCell>
                    <TableCell align="center">{order.tracking_number || "-"}</TableCell>
                    <TableCell align="center">{order.carrier_title || "-"}</TableCell>
                    <TableCell align="center">{renderEmailStatusCell(order)}</TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No orders found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Paper>

      {/* Email Dialog */}
      <Dialog open={emailOpen} onClose={handleCloseEmail} fullWidth maxWidth="md">
        <DialogTitle>Send Email</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            {/* Selected Order IDs */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Selected Order IDs:
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {selectedOrders.map((o) => (
                  <Chip key={o._id} label={o.order_id || o._id} />
                ))}
              </Box>
            </Box>

            {/* From */}
            <TextField
              label="From"
              value={emailForm.from}
              onChange={handleFromChange}
              fullWidth
              sx={{
                "& label.Mui-focused": { color: "black" },
                "& .MuiOutlinedInput-root": {
                  "&.Mui-focused fieldset": { borderColor: "black" },
                },
              }}
            />

            {/* To (multi + freeSolo) */}
            <Autocomplete
              multiple
              freeSolo
              options={EMAIL_SUGGESTIONS}
              value={emailForm.to}
              onChange={handleToChange}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    variant="outlined"
                    label={option}
                    {...getTagProps({ index })}
                    sx={{
                      bgcolor: "black",
                      color: "white",
                      "& .MuiChip-deleteIcon": { color: "white" },
                    }}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="To (add multiple)"
                  sx={{
                    "& label.Mui-focused": { color: "black" },
                    "& .MuiOutlinedInput-root": {
                      "&.Mui-focused fieldset": { borderColor: "black" },
                    },
                  }}
                />
              )}
            />

            {/* Subject template */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Subject Template
              </Typography>
              <Select
                fullWidth
                value={emailForm.subjectTemplateKey}
                onChange={handleSubjectTemplateChange}
                sx={{
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(0,0,0,0.23)" },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "black" },
                }}
              >
                {SUBJECT_TEMPLATES.map((t) => (
                  <MenuItem key={t.key} value={t.key}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
              {first && (
                <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.8 }}>
                  Preview: {previewSubject}
                </Typography>
              )}
            </Box>

            {/* Content template */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Content Template
              </Typography>
              <Select
                fullWidth
                value={emailForm.contentTemplateKey}
                onChange={handleContentTemplateChange}
                sx={{
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(0,0,0,0.23)" },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "black" },
                }}
              >
                {CONTENT_TEMPLATES.map((t) => (
                  <MenuItem key={t.key} value={t.key}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
              {first && (
                <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: "pre-wrap", opacity: 0.8 }}>
                  Preview: {previewContent}
                </Typography>
              )}
            </Box>

            {/* Attachments */}
            <Box>
              <Button
                variant="outlined"
                component="label"
                sx={{
                  borderColor: "black",
                  color: "black",
                  "&:hover": { borderColor: "#333", bgcolor: "rgba(0,0,0,0.04)" },
                }}
              >
                Add Attachments
                <input type="file" hidden multiple onChange={handleAttachmentsChange} />
              </Button>
              {!!attachments.length && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {attachments.length} file(s) selected
                </Typography>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseEmail} disabled={sending}>Cancel</Button>
          <Button
            onClick={handleSendEmail}
            variant="contained"
            disabled={sending}
            startIcon={sending ? <CircularProgress size={18} /> : null}
            sx={{
              bgcolor: "black",
              color: "white",
              "&:hover": { bgcolor: "#333" },
            }}
          >
            {sending ? "Scheduling..." : "Schedule Send"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reply Dialog (on-demand) */}
      <Dialog open={replyDlg.open} onClose={closeReplyDialog} fullWidth maxWidth="sm">
  <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
  <span>Reply</span>
  <Box>
    <IconButton
      size="small"
      onClick={showPrevReply}
      disabled={replyDlg.loading || replyIndex <= 0}
      aria-label="Previous reply"
    >
      <ChevronLeftIcon />
    </IconButton>
    <IconButton
      size="small"
      onClick={showNextReply}
      disabled={replyDlg.loading || (!replyHasMore && replyIndex >= replyItems.length - 1)}
      aria-label="Next reply"
    >
      <ChevronRightIcon />
    </IconButton>
  </Box>
</DialogTitle>


  <DialogContent dividers>
    {replyDlg.loading ? (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <CircularProgress size={18} /> <Typography>Loading reply…</Typography>
      </Box>
    ) : (
      <Stack spacing={2}>
        {/* Existing reply preview (if any) */}
        {replyItems.length > 0 ? (
      <Stack spacing={1}>
        <Typography variant="body2"><b>Order ID:</b> {replyDlg.orderId}</Typography>
        <Typography variant="body2"><b>From:</b> {replyItems[replyIndex]?.from || "-"}</Typography>
        <Typography variant="body2">
          <b>At:</b>{" "}
          {replyItems[replyIndex]?.at ? dayjs(replyItems[replyIndex].at).format("DD/MM/YYYY HH:mm") : "-"}
        </Typography>
        <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
          {replyItems[replyIndex]?.text || "(no preview)"}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          {replyItems.length > 0 ? `Reply ${replyIndex + 1} of ${replyHasMore ? `${replyItems.length}+` : replyItems.length}` : ""}
        </Typography>
      </Stack>
    ) : replyDlg.data ? (
      // Fallback: old single reply (if list was empty)
      <Stack spacing={1}>
        <Typography variant="body2"><b>Order ID:</b> {replyDlg.orderId}</Typography>
        <Typography variant="body2"><b>From:</b> {replyDlg.data.from || "-"}</Typography>
        <Typography variant="body2">
          <b>At:</b>{" "}
          {replyDlg.data.at ? dayjs(replyDlg.data.at).format("DD/MM/YYYY HH:mm") : "-"}
        </Typography>
        <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
          {replyDlg.data.text || "(no preview)"}
        </Typography>
      </Stack>
    ) : (
      <Typography variant="body2">No reply found.</Typography>
    )}

        {/* Compose area toggled by the Reply button */}
        {replyComposeOpen && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Compose reply (same thread)
            </Typography>

            {/* Subject template */}
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" sx={{ mb: 0.5, display: "block" }}>
                Subject Template
              </Typography>
              <Select
                fullWidth
                size="small"
                value={replyForm.subjectTemplateKey}
                onChange={handleReplySubjectChange}
                sx={{
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(0,0,0,0.23)" },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "black" },
                }}
              >
                {SUBJECT_TEMPLATES.map((t) => (
                  <MenuItem key={t.key} value={t.key}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.8 }}>
                Preview: {replyDlg.orderId ? renderReplyPreview(replyDlg.orderId).subject : ""}
              </Typography>
            </Box>

            {/* Content template */}
            <Box>
              <Typography variant="caption" sx={{ mb: 0.5, display: "block" }}>
                Content Template
              </Typography>
              <Select
                fullWidth
                size="small"
                value={replyForm.contentTemplateKey}
                onChange={handleReplyContentChange}
                sx={{
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(0,0,0,0.23)" },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "black" },
                }}
              >
                {CONTENT_TEMPLATES.map((t) => (
                  <MenuItem key={t.key} value={t.key}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
              <Typography
                variant="body2"
                sx={{ mt: 0.5, whiteSpace: "pre-wrap", opacity: 0.8 }}
              >
                Preview: {replyDlg.orderId ? renderReplyPreview(replyDlg.orderId).content : ""}
              </Typography>
            </Box>
          </Box>
        )}
      </Stack>
    )}
  </DialogContent>

  <DialogActions>
    {/* Toggle compose UI */}
    <Button
      onClick={() => setReplyComposeOpen((v) => !v)}
      disabled={replyDlg.loading}
      sx={{ mr: "auto" }}
    >
      {replyComposeOpen ? "Cancel Reply" : "Reply"}
    </Button>

    {/* Send button only shown when composing */}
    {replyComposeOpen && (
      <Button
        onClick={handleSendReply}
        variant="contained"
        disabled={replySending}
        startIcon={replySending ? <CircularProgress size={18} /> : null}
        sx={{ bgcolor: "black", color: "white", "&:hover": { bgcolor: "#333" } }}
      >
        {replySending ? "Sending..." : "Send Reply"}
      </Button>
    )}

    <Button onClick={closeReplyDialog}>Close</Button>
  </DialogActions>
</Dialog>


      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          variant="filled"
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UndeliveredOrdersTabs;
