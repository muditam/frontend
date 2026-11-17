import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import axios from "axios";
import CallBriefCard from "./CallBriefCard";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");
const api = axios.create({ baseURL: API_BASE, withCredentials: true, timeout: 20000 });
const FEATURE_ENABLED = String(process.env.REACT_APP_PATIENT_ANALYSIS_ENABLED || "false") === "true";

const POLL_LIMIT_MS = 5 * 60 * 1000;
function waitForPoll(signal) {
  return new Promise((resolve, reject) => {
    const abort = () => { window.clearTimeout(timer); reject(new Error("Polling cancelled")); };
    const timer = window.setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, 3000);
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
}

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function stripEvidence(value) {
  return String(value || "")
    .replace(/\s*[—-]\s*source:\s*.*$/i, "")
    .trim();
}

function timelineKey(event) {
  const text = String(event?.event || "").toLowerCase();
  const quotedMessage = text.match(/["']([^"']+)["']/)?.[1];
  const eventText = quotedMessage || text.replace(/\b(second|duplicate|inbound|outbound)\b/g, "").replace(/\s+/g, " ").trim();
  return `${event?.date || ""}|${event?.sourceType || ""}|${eventText}`;
}

function uniqueTimeline(events) {
  const seen = new Set();
  return (Array.isArray(events) ? events : [])
    .filter((event) => {
      const key = timelineKey(event);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
}

function SectionCard({ title, children, tone = "default" }) {
  const colors = tone === "attention"
    ? { backgroundColor: "#fff8e1", borderColor: "#ffe082" }
    : { backgroundColor: "#fff", borderColor: "#e5e7eb" };
  return (
    <Box sx={{ border: "1px solid", borderRadius: 2, p: 2, ...colors }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.75 }}>{title}</Typography>
      {children}
    </Box>
  );
}

function TextList({ items }) {
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <List dense disablePadding sx={{ pl: 2, listStyleType: "disc" }}>
      {items.map((item, index) => (
        <ListItem key={index} disableGutters sx={{ display: "list-item", py: 0.25 }}>
          <ListItemText primary={stripEvidence(item)} primaryTypographyProps={{ variant: "body2" }} />
        </ListItem>
      ))}
    </List>
  );
}

function SummaryView({ analysis }) {
  const summary = analysis?.summary;
  if (!summary) return <Alert severity="info">No stored analysis exists for this patient yet.</Alert>;
  const timeline = uniqueTimeline(summary.timeline);
  const actionItems = [
    ...(summary.unresolvedItems || []),
    ...(summary.upcomingFollowups || []),
    ...(summary.commitments || []),
  ];
  const coverage = analysis?.sourceSnapshot?.coverage || {};
  const coverageItems = [
    { label: "Profile & consultation", available: true },
    { label: "WhatsApp chats", available: Number(coverage.messagesReturned || 0) > 0 },
    { label: "Orders", available: Number(coverage.ordersReturned || 0) > 0 },
    { label: "Call recordings", available: Number(coverage.callsReturned || 0) > 0 },
  ];
  const warnings = [...(summary.dataCoverage?.warnings || []), ...(analysis.warnings || [])];
  return (
    <Stack spacing={1.5}>
      <SectionCard title="Overall patient summary">
        <Typography variant="body2" sx={{ lineHeight: 1.65 }}>{summary.overallSummary || summary.patientSnapshot}</Typography>
      </SectionCard>

      <SectionCard title="Patient profile">
        <Typography variant="body2" sx={{ mb: 1 }}>{summary.patientSnapshot}</Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Chip label={summary.currentStage || "Stage unavailable"} color="primary" variant="outlined" size="small" />
          <Chip
            label={`Patient language: ${summary.communicationLanguage?.primary || "Unknown"}`}
            color={summary.communicationLanguage?.confidence === "high" ? "success" : "default"}
            variant="outlined"
            size="small"
          />
        </Stack>
      </SectionCard>

      {actionItems.length > 0 && (
        <SectionCard title="Needs attention" tone="attention"><TextList items={actionItems} /></SectionCard>
      )}

      <SectionCard title="Call summary">
        <Typography variant="body2">{summary.callSummary || "No call conversations found."}</Typography>
      </SectionCard>

      <SectionCard title="WhatsApp summary">
        <Typography variant="body2">{summary.whatsappSummary || "No WhatsApp conversations found."}</Typography>
      </SectionCard>

      <SectionCard title="Consultation summary">
        <Typography variant="body2">{summary.consultationSummary || "No consultation summary available."}</Typography>
      </SectionCard>

      <SectionCard title="Order summary">
        <Typography variant="body2">{summary.orderHistory}</Typography>
      </SectionCard>

      <SectionCard title="Main timeline">
        {timeline.length ? (
          <Stack spacing={1.25}>
            {timeline.map((event, index) => (
              <Box key={`${timelineKey(event)}-${index}`} sx={{ borderLeft: "3px solid #1976d2", pl: 1.5 }}>
                <Typography variant="caption" color="text.secondary">{formatDate(event.date)}</Typography>
                <Typography variant="body2">{event.event}</Typography>
              </Box>
            ))}
          </Stack>
        ) : <Typography variant="body2" color="text.secondary">No dated activity found.</Typography>}
      </SectionCard>

      {summary.risks?.length > 0 && (
        <SectionCard title="Risks to monitor" tone="attention"><TextList items={summary.risks} /></SectionCard>
      )}

      <SectionCard title="Data availability">
        <Stack direction="row" gap={1} flexWrap="wrap">
          {coverageItems.map((item) => (
            <Chip
              key={item.label}
              size="small"
              label={`${item.label}: ${item.available ? "Available" : "Not found"}`}
              color={item.available ? "success" : "default"}
              variant={item.available ? "filled" : "outlined"}
            />
          ))}
        </Stack>
      </SectionCard>

      <Accordion disableGutters elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: "8px !important" }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Data gaps and technical evidence</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="subtitle2">Missing data</Typography>
          <TextList items={summary.dataCoverage?.missing} />
          {warnings.length > 0 && <><Typography variant="subtitle2" sx={{ mt: 1 }}>Coverage warnings</Typography><TextList items={warnings} /></>}
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="subtitle2">Source references</Typography>
          <List dense disablePadding>
            {(summary.timeline || []).map((event, index) => (
              <ListItem key={`${event.sourceType}-${event.sourceId}-${index}`} disableGutters>
                <ListItemText
                  primary={event.event}
                  secondary={`${formatDate(event.date)} · ${event.sourceType}:${event.sourceId}`}
                  primaryTypographyProps={{ variant: "body2" }}
                />
              </ListItem>
            ))}
          </List>
        </AccordionDetails>
      </Accordion>

      <Typography variant="caption" color="text.secondary">
        Summary version {analysis.version} · generated {formatDate(analysis.generatedAt)}
      </Typography>
    </Stack>
  );
}

export default function PatientAnalysisPanel({ customerId }) {
  const [open, setOpen] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const controllers = useRef(new Set());
  const running = useRef({});
  const patientId = customerId ? `customer:${customerId}` : "";
  const currentPatient = useRef(patientId);
  currentPatient.current = patientId;

  const stopPolling = useCallback(() => {
    controllers.current.forEach(controller => controller.abort());
    controllers.current.clear();
    running.current = {};
  }, []);

  const loadCurrent = useCallback(async (signal) => {
    if (!patientId) return;
    const { data } = await api.get(`/api/v1/patients/${encodeURIComponent(patientId)}/analysis`, { signal });
    if (!signal?.aborted && currentPatient.current === patientId) setAnalysis(data?.analysis || null);
    return data?.analysis || null;
  }, [patientId]);

  const loadBrief = useCallback(async (signal) => {
    if (!patientId) return;
    const { data } = await api.get(`/api/call-briefs/${encodeURIComponent(patientId)}`, { signal });
    if (!signal?.aborted && currentPatient.current === patientId) setBrief(data?.brief || null);
    return data?.brief || null;
  }, [patientId]);

  useEffect(() => {
    stopPolling();
    setOpen(false);
    setAnalysis(null);
    setBrief(null);
    setJob(null);
    setLoading(false);
    setBriefLoading(false);
    setError("");
    return stopPolling;
  }, [patientId, stopPolling]);

  const handleClose = () => {
    stopPolling();
    setLoading(false);
    setBriefLoading(false);
    setJob(null);
    setOpen(false);
  };

  const handleOpen = async () => {
    stopPolling();
    setLoading(false);
    setBriefLoading(false);
    setJob(null);
    setOpen(true);
    setError("");
    const controller = new AbortController();
    controllers.current.add(controller);
    const [analysisResult, briefResult] = await Promise.allSettled([loadCurrent(controller.signal), loadBrief(controller.signal)]);
    controllers.current.delete(controller);
    if (controller.signal.aborted) return;
    if (briefResult.status === "rejected") {
      const requestError = briefResult.reason;
      setError(requestError?.response?.data?.message || "Call brief service is unavailable locally");
    } else if (analysisResult.status === "rejected") {
      const requestError = analysisResult.reason;
      setError(requestError?.response?.data?.message || "Source history is unavailable");
    }
  };

  const runGeneration = async (kind) => {
    if (running.current[kind]) return;
    const controller = new AbortController();
    const { signal } = controller;
    running.current[kind] = controller;
    controllers.current.add(controller);
    const isBrief = kind === "brief";
    const setBusy = isBrief ? setBriefLoading : setLoading;
    const load = isBrief ? loadBrief : loadCurrent;
    const previous = isBrief ? brief : analysis;
    const base = isBrief ? `/api/call-briefs/${encodeURIComponent(patientId)}`
      : `/api/v1/patients/${encodeURIComponent(patientId)}/analysis`;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post(isBrief ? `${base}/refresh` : base, undefined, { signal });
      if (signal.aborted) return;
      if (data?.status === "unchanged" || data?.status === "completed") {
        await load(signal);
        return;
      }
      const jobId = data?.job?.jobId;
      if (!jobId) throw new Error("Generation job was not created. Please try again.");
      const deadline = Date.now() + POLL_LIMIT_MS;
      while (!signal.aborted && Date.now() < deadline) {
        const response = await api.get(`${base}/jobs/${encodeURIComponent(jobId)}`, { signal });
        if (signal.aborted) return;
        const currentJob = response.data?.job;
        const state = currentJob?.status || currentJob?.state;
        if (!state) throw new Error("Unable to read generation progress. Close and reopen this panel to check the saved result.");
        setJob({ ...currentJob, status: state });
        if (state === "completed") {
          await load(signal);
          return;
        }
        if (state === "failed") throw new Error(currentJob?.errorMessage || currentJob?.failedReason || "Generation failed");
        await waitForPoll(signal);
      }
      if (!signal.aborted) throw new Error("Still processing in the background. Close and reopen this panel shortly to check the result; no website refresh is needed.");
    } catch (requestError) {
      if (signal.aborted) return;
      // A job can finish after its status request fails, or be pruned from Redis. Check the saved
      // result before reporting an error, but don't mistake an unchanged old card for success.
      try {
        const saved = await load(signal);
        if (saved && (!previous || saved.version !== previous.version || saved.generatedAt !== previous.generatedAt)) return;
      } catch (_) { /* Keep the original error if reading the saved result also fails. */ }
      if (!signal.aborted) setError(requestError?.response?.data?.message || requestError.message || "Unable to check generation progress");
    } finally {
      controllers.current.delete(controller);
      if (running.current[kind] === controller) {
        delete running.current[kind];
        setBusy(false);
      }
    }
  };

  const refreshBrief = () => runGeneration("brief");
  const handleAnalyse = () => runGeneration("analysis");

  const saveOutcome = async (outcome) => {
    setError("");
    try {
      await api.post(`/api/call-briefs/${encodeURIComponent(patientId)}/outcome`, { ...outcome, briefVersion: brief?.version });
    } catch (requestError) {
      const message = requestError?.response?.data?.message || "Unable to save outcome";
      setError(message);
      throw new Error(message);
    }
  };

  let canUseBrief = false;
  try {
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    canUseBrief = user?.permissions?.menubar?.["ai-brief"] === true;
  } catch {
    // Missing or invalid session data must not expose the feature.
  }
  if (!FEATURE_ENABLED || !patientId || !canUseBrief) return null;

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button variant="outlined" startIcon={<AutoAwesomeIcon />} onClick={handleOpen}>
          Patient call brief
        </Button>
      </Box>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Patient call brief
          {job?.status && <Chip size="small" label={job.status} />}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            {brief ? (
              <CallBriefCard brief={brief} onLog={saveOutcome} onRefresh={refreshBrief} />
            ) : (
              <Alert severity="info">No call brief exists yet. Prepare one to get the next best action.</Alert>
            )}
            {(briefLoading || loading) && (
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <CircularProgress size={20} />
                <Typography variant="body2">{loading ? "Refreshing source history…" : "Preparing the latest call brief…"}</Typography>
              </Box>
            )}
            <Accordion disableGutters elevation={0} sx={{ border: 0, "&:before": { display: "none" } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="caption" color="text.secondary">View source history (optional)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={1.5}>
                  <SummaryView analysis={analysis} />
                  <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <Button size="small" onClick={handleAnalyse} disabled={loading}>Refresh source history</Button>
                  </Box>
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
          <Button variant="contained" onClick={refreshBrief} disabled={briefLoading || loading}>
            {briefLoading ? "Preparing…" : brief ? "Refresh call brief" : "Prepare call brief"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
