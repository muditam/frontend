import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogContent, DialogTitle, Divider, MenuItem, Paper, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";

const API_BASE = typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname)
  ? "http://localhost:5001"
  : String(process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_BASE || "").replace(/\/+$/, "");
const API = `${API_BASE}/api`;

function label(value) {
  return String(value || "—").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function orderNumber(ticket) {
  return String(ticket?.order?.orderName || ticket?.references?.orderSourceId || "—").replace(/^#/, "");
}
const postRequiredOptions = [["refund_required", "Refund required"], ["replacement_required", "Replacement required"], ["return_pickup_required", "Return pickup / RTO required"], ["expert_review_required", "Expert / doctor review required"], ["manual_dispatch_required", "Manual dispatch required"], ["customer_explanation_only", "Customer explanation only"], ["no_valid_action", "No valid action / unfair demand"], ["investigation_required", "Investigation required"], ["wrong_item_received", "Wrong item received"], ["damaged_item_received", "Damaged item received"], ["incomplete_item_received", "Incomplete item received"]];
const postDoneOptions = {
  refund_required: [["return_pickup_initiated", "Return pickup initiated"], ["pickup_done", "Pickup done"], ["received_at_warehouse", "Received at warehouse"], ["refund_initiated", "Refund initiated"], ["customer_informed", "Customer informed"]],
  replacement_required: [["return_pickup_initiated", "Return pickup initiated"], ["pickup_done", "Pickup done"], ["replacement_order_created", "Replacement order created"], ["replacement_dispatched", "Replacement dispatched"], ["customer_informed", "Customer informed"]],
  return_pickup_required: [["return_pickup_initiated", "Return pickup initiated"], ["pickup_done", "Pickup done"], ["rto_initiated", "RTO initiated"], ["customer_informed", "Customer informed"]],
  expert_review_required: [["sent_to_expert", "Sent to expert"], ["expert_replied", "Expert / doctor replied"], ["customer_informed", "Customer informed"]],
  manual_dispatch_required: [["manual_dispatch_created", "Manual dispatch created"], ["replacement_dispatched", "Replacement dispatched"], ["customer_informed", "Customer informed"]],
  customer_explanation_only: [["customer_informed", "Customer informed"], ["customer_acknowledged", "Customer acknowledged"]],
  no_valid_action: [["customer_informed", "Customer informed"], ["rejected_as_unfair", "Rejected as unfair demand"], ["no_action_needed", "No action needed"]],
  investigation_required: [["courier_contacted", "Courier contacted"], ["branch_contacted", "Branch contacted"], ["shipment_team_mailed", "Shipment team mailed"], ["evidence_checked", "Evidence checked"], ["customer_informed", "Customer informed"]],
  wrong_item_received: [["return_pickup_initiated", "Return pickup initiated"], ["pickup_done", "Pickup done"], ["replacement_dispatched", "Replacement dispatched"], ["refund_initiated", "Refund initiated"], ["customer_informed", "Customer informed"]],
  damaged_item_received: [["return_pickup_initiated", "Return pickup initiated"], ["pickup_done", "Pickup done"], ["replacement_dispatched", "Replacement dispatched"], ["refund_initiated", "Refund initiated"], ["customer_informed", "Customer informed"]],
  incomplete_item_received: [["replacement_dispatched", "Replacement / missing item dispatched"], ["refund_initiated", "Refund initiated"], ["customer_informed", "Customer informed"]],
};
const postFinalOptions = {
  refund_required: [["refund_completed", "Refund completed"], ["customer_refused_refund", "Customer refused refund"], ["closed_manually", "Closed manually"]],
  replacement_required: [["replacement_completed", "Replacement completed"], ["customer_refused_replacement", "Customer refused replacement"], ["closed_manually", "Closed manually"]],
  return_pickup_required: [["rto_completed", "RTO completed"], ["customer_refused_pickup", "Customer refused pickup"], ["closed_manually", "Closed manually"]],
  expert_review_required: [["expert_resolved", "Expert resolved"], ["customer_informed_closed", "Customer informed and closed"], ["closed_manually", "Closed manually"]],
  manual_dispatch_required: [["dispatch_completed", "Dispatch completed"], ["closed_manually", "Closed manually"]],
  customer_explanation_only: [["explanation_given", "Explanation given"], ["no_action_needed", "No action needed"], ["closed_manually", "Closed manually"]],
  no_valid_action: [["rejected_as_unfair", "Rejected as unfair demand"], ["no_action_needed", "No action needed"], ["closed_manually", "Closed manually"]],
  investigation_required: [["investigation_resolved", "Investigation resolved"], ["no_action_needed", "No action needed"], ["closed_manually", "Closed manually"]],
  wrong_item_received: [["replacement_completed", "Replacement completed"], ["refund_completed", "Refund completed"], ["closed_manually", "Closed manually"]],
  damaged_item_received: [["replacement_completed", "Replacement completed"], ["refund_completed", "Refund completed"], ["closed_manually", "Closed manually"]],
  incomplete_item_received: [["replacement_completed", "Replacement completed"], ["refund_completed", "Refund completed"], ["closed_manually", "Closed manually"]],
};
const preRequiredOptions = [["delayed_delivery_required", "Delayed delivery resolution required"], ["fake_delivery_remark", "Fake delivery remark investigation"], ["customer_unreachable", "Customer unreachable"], ["address_correction_required", "Address / contact correction required"], ["rto_required", "RTO required"], ["new_dispatch_required", "New dispatch required"], ["order_cancellation_required", "Order cancellation required"], ["delivery_confirmation_needed", "Delivery confirmation needed"], ["other_investigation_required", "Other investigation required"]];
const preDoneOptions = {
  delayed_delivery_required: [["courier_contacted", "Courier contacted"], ["branch_contacted", "Branch contacted"], ["shipment_team_mailed", "Shipment team mailed"], ["courier_escalated", "Escalated to courier"], ["customer_informed", "Customer informed"]],
  fake_delivery_remark: [["customer_contacted", "Customer contacted"], ["courier_contacted", "Courier contacted"], ["branch_contacted", "Branch contacted"], ["proof_requested", "Proof requested"], ["fake_remark_confirmed", "Fake remark confirmed"]],
  customer_unreachable: [["called_customer", "Called customer"], ["whatsapp_sent", "WhatsApp sent"], ["follow_up_scheduled", "Follow-up scheduled"], ["no_answer_recorded", "No answer recorded"]],
  address_correction_required: [["customer_contacted", "Customer contacted"], ["address_updated", "Address updated"], ["phone_updated", "Phone updated"], ["courier_informed", "Courier informed"], ["reattempt_requested", "Reattempt requested"]],
  rto_required: [["rto_instructed", "RTO instructed"], ["courier_contacted", "Courier contacted"], ["shipment_team_mailed", "Shipment team mailed"], ["customer_informed", "Customer informed"]],
  new_dispatch_required: [["old_shipment_rto_instructed", "Old shipment RTO instructed"], ["replacement_dispatch_requested", "Replacement dispatch requested"], ["new_awb_recorded", "New AWB recorded"], ["customer_informed", "Customer informed"]],
  order_cancellation_required: [["cancellation_confirmed", "Cancellation confirmed with customer"], ["shopify_cancellation_done", "Shopify cancellation done"], ["courier_rto_instructed", "Courier RTO instructed"], ["customer_informed", "Customer informed"]],
  delivery_confirmation_needed: [["called_customer", "Called customer"], ["customer_confirmed_delivered", "Customer confirmed delivered"], ["courier_status_checked", "Courier status checked"], ["proof_collected", "Proof collected"]],
  other_investigation_required: [["courier_contacted", "Courier contacted"], ["customer_contacted", "Customer contacted"], ["internal_team_checked", "Internal team checked"], ["customer_informed", "Customer informed"]],
};
const preFinalOptions = {
  delayed_delivery_required: [["delivered", "Delivered"], ["rto_initiated", "RTO initiated"], ["customer_refused_delivery", "Customer refused delivery"], ["closed_manually", "Closed manually"]],
  fake_delivery_remark: [["delivered", "Delivered"], ["fake_remark_resolved", "Fake remark resolved"], ["rto_initiated", "RTO initiated"], ["closed_manually", "Closed manually"]],
  customer_unreachable: [["customer_responded", "Customer responded"], ["rto_initiated", "RTO initiated"], ["cancelled_by_customer", "Cancelled by customer"], ["closed_manually", "Closed manually"]],
  address_correction_required: [["delivered", "Delivered"], ["rto_initiated", "RTO initiated"], ["customer_refused_delivery", "Customer refused delivery"], ["closed_manually", "Closed manually"]],
  rto_required: [["rto_completed", "RTO completed"], ["delivered_after_reattempt", "Delivered after reattempt"], ["closed_manually", "Closed manually"]],
  new_dispatch_required: [["new_dispatch_completed", "New dispatch completed"], ["delivered", "Delivered"], ["closed_manually", "Closed manually"]],
  order_cancellation_required: [["cancelled_and_closed", "Cancelled and closed"], ["rto_completed", "RTO completed"], ["closed_manually", "Closed manually"]],
  delivery_confirmation_needed: [["delivered", "Delivered"], ["fake_remark_raised", "Fake remark raised"], ["closed_manually", "Closed manually"]],
  other_investigation_required: [["issue_resolved", "Issue resolved"], ["rto_initiated", "RTO initiated"], ["closed_manually", "Closed manually"]],
};
function optionLabel(options, value) {
  return (options || []).find(([key]) => key === value)?.[1] || label(value);
}
function workflowIssueKey(value) {
  const key = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (key === "refund") return "refund_required";
  if (key === "replacement") return "replacement_required";
  if (["pod", "pod_required", "pod_needed", "delivery_proof", "delivery_proof_required"].includes(key)) return "investigation_required";
  if (key === "customer_explanation_required") return "customer_explanation_only";
  return key;
}
function workflowFor(ticket) {
  return ticket?.type === "pre"
    ? ticket?.preDeliveryWorkflow || ticket?.preDelivery?.workflow || null
    : ticket?.type === "post"
      ? ticket?.postDeliveryWorkflow || ticket?.postDelivery?.workflow || null
      : null;
}
function workflowLabels(ticket, step, value, requiredValue) {
  if (ticket?.type === "pre") {
    if (step === "required") return optionLabel(preRequiredOptions, value);
    if (step === "done") return optionLabel(preDoneOptions[requiredValue] || [], value);
    return optionLabel(preFinalOptions[requiredValue] || [], value);
  }
  if (ticket?.type === "post") {
    const issueKey = workflowIssueKey(requiredValue || value);
    if (step === "required") return optionLabel(postRequiredOptions, issueKey || value);
    if (step === "done") return optionLabel(postDoneOptions[issueKey] || [], value);
    return optionLabel(postFinalOptions[issueKey] || [], value);
  }
  return label(value);
}
function eventTitle(ticket, event) {
  const value = String(event?.data?.value || event?.data?.action || "");
  const workflow = workflowFor(ticket);
  const requiredValue = event?.type?.startsWith("PRE_") || event?.type?.startsWith("POST_")
    ? event.type.includes("_REQUIRED_") ? value : workflow?.required?.value
    : "";
  if (event?.type === "CALL_INITIATED") return "Call initiated";
  if (event?.type === "CALL_ENDED") return String(event.data?.result || "").toLowerCase() === "connected" ? "Call connected" : "Call ended";
  if (event?.type === "CALL_FAILED") return "Call failed";
  if (event?.type === "PRE_REQUIRED_RECORDED" || event?.type === "POST_REQUIRED_RECORDED") return `Action required${value ? ` · ${workflowLabels(ticket, "required", value, requiredValue)}` : ""}`;
  if (event?.type === "PRE_DONE_RECORDED" || event?.type === "POST_DONE_RECORDED") return `Action done${value ? ` · ${workflowLabels(ticket, "done", value, requiredValue)}` : ""}`;
  if (event?.type === "PRE_FINAL_RECORDED" || event?.type === "POST_FINAL_RECORDED") return `Ticket closed${value ? ` · ${workflowLabels(ticket, "final", value, requiredValue)}` : ""}`;
  if (event?.type === "LMS_ESCALATION_ADDED" || event?.type === "LMS_ESCALATION_BACKFILLED") return "LMS escalation added";
  if (event?.type === "AUTO_CLOSED_DUPLICATE_TICKET") return "Duplicate ticket merged";
  return label(event?.type);
}
function eventRemark(event) {
  const data = event?.data || {};
  return [data.remark || data.notes || data.reason || "", data.awbNumber ? `AWB: ${data.awbNumber}` : "", data.reference ? `Reference: ${data.reference}` : "", data.provider ? `Partner: ${data.provider}` : ""].filter(Boolean).join("\n");
}

function WorkflowCard({ ticket }) {
  const workflow = workflowFor(ticket);
  const requiredValue = workflow?.required?.value;
  const steps = [
    ["required", "Action required", workflow?.required],
    ["done", "Action done", workflow?.done],
    ["final", "Final action", workflow?.final],
  ].filter(([, , step]) => step);
  if (!workflow && !ticket?.workflowStatus && !ticket?.lastAction) return null;
  return <Paper elevation={0} sx={{ p: 2, border: "1px solid #e2e8f0", borderRadius: 2, bgcolor: "#fbfafc" }}>
    <Stack spacing={1.5}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between">
        <Typography sx={{ fontWeight: 900 }}>Ticket progress</Typography>
        <Chip size="small" label={`Work stage: ${label(ticket?.workflowStatus || ticket?.status)}`} />
      </Stack>
      {steps.length ? <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 1.25 }}>
        {steps.map(([key, title, step]) => <Tooltip key={key} title={step.remark || ""} arrow disableHoverListener={!step.remark}>
          <Box sx={{ p: 1.25, border: "1px solid #ddd6e8", borderRadius: 1.5, bgcolor: "#fff" }}>
            <Typography variant="caption" color="text.secondary">{title}</Typography>
            <Typography sx={{ mt: 0.25, fontWeight: 800 }}>{workflowLabels(ticket, key, step.value, requiredValue)}</Typography>
            {step.remark && <Typography sx={{ mt: 0.75, fontSize: 12, color: "#64748b", whiteSpace: "pre-wrap" }}>{step.remark}</Typography>}
            {step.by?.name && <Typography sx={{ mt: 0.75, fontSize: 11, color: "#94a3b8" }}>{step.at ? new Date(step.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : ""} · {step.by.name}</Typography>}
          </Box>
        </Tooltip>)}
      </Box> : ticket?.lastAction && <Box sx={{ p: 1.25, border: "1px solid #ddd6e8", borderRadius: 1.5, bgcolor: "#fff" }}><Typography variant="caption" color="text.secondary">Last action</Typography><Typography sx={{ fontWeight: 800 }}>{label(ticket.lastAction.code)}</Typography>{ticket.lastAction.notes && <Typography sx={{ fontSize: 12, color: "#64748b", whiteSpace: "pre-wrap" }}>{ticket.lastAction.notes}</Typography>}</Box>}
    </Stack>
  </Paper>;
}

export default function SupportTicketsPage() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState("");

  const openTicket = async (ticket) => {
    setSelected(ticket); setDetailsLoading(true); setError("");
    try {
      const response = await axios.get(`${API}/ticketing-integration/tickets/${encodeURIComponent(ticket.id)}`, { withCredentials: true });
      setSelected(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Could not load ticket details");
    } finally { setDetailsLoading(false); }
  };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await axios.get(`${API}/ticketing-integration/tickets`, {
        withCredentials: true,
        params: { page: page + 1, limit: 25, status, type, search, dateFrom, dateTo },
      });
      setItems(response.data?.items || []);
      setPagination(response.data?.pagination || { page: 1, pageSize: 25, total: 0, totalPages: 1 });
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Could not load support tickets");
    } finally { setLoading(false); }
  }, [dateFrom, dateTo, page, search, status, type]);

  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer); }, [load]);

  return <Box>
    <Paper elevation={0} sx={{ mb: 2, p: 2, border: "1px solid #dbe2ea", borderRadius: 2.5 }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
        <TextField size="small" label="Search ticket, order or AWB" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} sx={{ minWidth: 260, flex: 1 }} />
        <TextField select size="small" label="Status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }} sx={{ minWidth: 150 }}><MenuItem value="">All</MenuItem><MenuItem value="open">Open</MenuItem><MenuItem value="closed">Closed</MenuItem></TextField>
        <TextField select size="small" label="Type" value={type} onChange={(event) => { setType(event.target.value); setPage(0); }} sx={{ minWidth: 170 }}><MenuItem value="">All</MenuItem><MenuItem value="confirmation">Confirmation</MenuItem><MenuItem value="pre">Pre-Delivery</MenuItem><MenuItem value="post">Post-Delivery</MenuItem></TextField>
        <TextField size="small" label="From" type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} />
        <TextField size="small" label="To" type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} />
      </Stack>
    </Paper>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dbe2ea", borderRadius: 2.5 }}>
      <Table size="small">
        <TableHead><TableRow><TableCell>Ticket</TableCell><TableCell>Order</TableCell><TableCell>Issue</TableCell><TableCell>Type</TableCell><TableCell>Priority</TableCell><TableCell>Assigned to</TableCell><TableCell>Status</TableCell><TableCell>Created</TableCell></TableRow></TableHead>
        <TableBody>
          {loading ? <TableRow><TableCell colSpan={8} align="center" sx={{ py: 7 }}><CircularProgress size={24} /></TableCell></TableRow> : items.length ? items.map((ticket) => <TableRow key={ticket.id} hover onClick={() => openTicket(ticket)} sx={{ cursor: "pointer" }}>
            <TableCell><Button variant="text" sx={{ minWidth: 0, p: 0, fontSize: 13, fontWeight: 800, textTransform: "none" }}>{ticket.ticketNo}</Button></TableCell>
            <TableCell>{orderNumber(ticket)}</TableCell>
            <TableCell sx={{ maxWidth: 300 }}><Typography noWrap sx={{ fontSize: 13 }}>{ticket.reason?.summary || "—"}</Typography></TableCell>
            <TableCell>{label(ticket.type)}</TableCell>
            <TableCell><Chip size="small" label={label(ticket.priority)} /></TableCell>
            <TableCell>{ticket.assignee?.name || "Waiting for assignment"}</TableCell>
            <TableCell><Chip size="small" color={ticket.status === "closed" ? "success" : "warning"} label={label(ticket.status)} /></TableCell>
            <TableCell>{ticket.createdAt ? new Date(ticket.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}</TableCell>
          </TableRow>) : <TableRow><TableCell colSpan={8} align="center" sx={{ py: 7 }}><Typography sx={{ color: "#64748b" }}>No support tickets found</Typography></TableCell></TableRow>}
        </TableBody>
      </Table>
      <TablePagination component="div" count={pagination.total || 0} page={page} rowsPerPage={25} rowsPerPageOptions={[25]} onPageChange={(_, next) => setPage(next)} />
    </TableContainer>
    <Dialog open={Boolean(selected)} onClose={() => !detailsLoading && setSelected(null)} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}><Box><Typography sx={{ fontSize: 12, color: "#64748b" }}>SUPPORT TICKET</Typography><Typography sx={{ fontSize: 20, fontWeight: 800 }}>{selected?.ticketNo || "Loading ticket…"}</Typography></Box><Button onClick={() => setSelected(null)} disabled={detailsLoading}>Close</Button></DialogTitle>
      <DialogContent dividers>
        {detailsLoading ? <Box sx={{ py: 7, display: "grid", placeItems: "center" }}><CircularProgress size={26} /></Box> : selected && <Stack spacing={2.5}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}><Chip label={label(selected.type)} /><Chip color={selected.status === "closed" ? "success" : "warning"} label={label(selected.status)} /><Chip label={`${label(selected.priority)} priority`} /></Stack>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2 }}>
            <Box><Typography variant="caption" color="text.secondary">Order</Typography><Typography fontWeight={700}>{orderNumber(selected)}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">Assigned to</Typography><Typography fontWeight={700}>{selected.assignee?.name || "Waiting for assignment"}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">Created</Typography><Typography fontWeight={700}>{selected.createdAt ? new Date(selected.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}</Typography></Box>
          </Box>
          <Divider />
          <Box><Typography variant="caption" color="text.secondary">Issue</Typography><Typography sx={{ mt: .5 }}>{selected.reason?.summary || "—"}</Typography></Box>
          <WorkflowCard ticket={selected} />
          {selected.resolution && <Box sx={{ p: 2, borderRadius: 2, bgcolor: "#f0fdf4" }}><Typography variant="caption" color="text.secondary">Resolution</Typography><Typography fontWeight={700}>{selected.resolution.notes || label(selected.resolution.code)}</Typography></Box>}
          <Box><Typography sx={{ mb: 1, fontWeight: 800 }}>Ticket history</Typography><Stack spacing={1}>{selected.events?.length ? selected.events.map((event) => {
            const remark = eventRemark(event);
            return <Tooltip key={event.id} title={remark || ""} arrow disableHoverListener={!remark}>
              <Box sx={{ p: 1.25, border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{eventTitle(selected, event)}</Typography>
                {remark && <Typography sx={{ mt: 0.5, fontSize: 12, color: "#475569", whiteSpace: "pre-wrap" }}>{remark}</Typography>}
                <Typography sx={{ fontSize: 12, color: "#64748b" }}>{event.createdAt ? new Date(event.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}{event.actor?.name ? ` · ${event.actor.name}` : ""}</Typography>
              </Box>
            </Tooltip>;
          }) : <Typography color="text.secondary">No history available.</Typography>}</Stack></Box>
        </Stack>}
      </DialogContent>
    </Dialog>
  </Box>;
}
