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
const api = axios.create({ baseURL: API_BASE, withCredentials: true });
const FEATURE_ENABLED = String(process.env.REACT_APP_PATIENT_ANALYSIS_ENABLED || "false") === "true";

const terminalStatuses = new Set(["completed", "failed"]);

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
  const pollTimer = useRef(null);
  const patientId = customerId ? `customer:${customerId}` : "";

  const stopPolling = useCallback(() => {
    if (pollTimer.current) window.clearTimeout(pollTimer.current);
    pollTimer.current = null;
  }, []);

  const loadCurrent = useCallback(async () => {
    if (!patientId) return;
    const { data } = await api.get(`/api/v1/patients/${encodeURIComponent(patientId)}/analysis`);
    setAnalysis(data?.analysis || null);
  }, [patientId]);

  const loadBrief = useCallback(async () => {
    if (!patientId) return;
    const { data } = await api.get(`/api/call-briefs/${encodeURIComponent(patientId)}`);
    setBrief(data?.brief || null);
  }, [patientId]);

  const pollJob = useCallback(async (jobId) => {
    try {
      const { data } = await api.get(
        `/api/v1/patients/${encodeURIComponent(patientId)}/analysis/jobs/${encodeURIComponent(jobId)}`
      );
      const next = data?.job || null;
      setJob(next);
      if (next && terminalStatuses.has(next.status)) {
        stopPolling();
        if (next.status === "completed") await loadCurrent();
        else setError(next.errorMessage || "Analysis failed");
        setLoading(false);
        return;
      }
      pollTimer.current = window.setTimeout(() => pollJob(jobId), 3000);
    } catch (requestError) {
      stopPolling();
      setLoading(false);
      setError(requestError?.response?.data?.message || "Unable to check analysis progress");
    }
  }, [loadCurrent, patientId, stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const handleOpen = async () => {
    setOpen(true);
    setError("");
    const [analysisResult, briefResult] = await Promise.allSettled([loadCurrent(), loadBrief()]);
    if (briefResult.status === "rejected") {
      const requestError = briefResult.reason;
      setError(requestError?.response?.data?.message || "Call brief service is unavailable locally");
    } else if (analysisResult.status === "rejected") {
      const requestError = analysisResult.reason;
      setError(requestError?.response?.data?.message || "Source history is unavailable");
    }
  };

  const refreshBrief = async () => {
    setBriefLoading(true);
    setError("");
    try {
      const { data } = await api.post(`/api/call-briefs/${encodeURIComponent(patientId)}/refresh`);
      const jobId = data?.job?.jobId;
      if (!jobId) throw new Error("Call brief job was not created");
      for (let attempt = 0; attempt < 60; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
        const response = await api.get(`/api/call-briefs/${encodeURIComponent(patientId)}/jobs/${encodeURIComponent(jobId)}`);
        const state = response.data?.job?.state;
        if (state === "completed") {
          await loadBrief();
          setBriefLoading(false);
          return;
        }
        if (state === "failed") throw new Error(response.data?.job?.failedReason || "Call brief generation failed");
      }
      throw new Error("Call brief is still processing. Please check again shortly.");
    } catch (requestError) {
      setBriefLoading(false);
      setError(requestError?.response?.data?.message || requestError.message || "Unable to refresh call brief");
    }
  };

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

  const handleAnalyse = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post(`/api/v1/patients/${encodeURIComponent(patientId)}/analysis`);
      if (data?.status === "unchanged") {
        setAnalysis(data.analysis || null);
        setLoading(false);
        return;
      }
      const queuedJob = data?.job;
      setJob(queuedJob || null);
      if (queuedJob?.jobId) await pollJob(queuedJob.jobId);
      else setLoading(false);
    } catch (requestError) {
      setLoading(false);
      setError(requestError?.response?.data?.message || "Unable to start patient analysis");
    }
  };

  if (!FEATURE_ENABLED || !patientId) return null;

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button variant="outlined" startIcon={<AutoAwesomeIcon />} onClick={handleOpen}>
          Patient call brief
        </Button>
      </Box>
      <Dialog open={open} onClose={() => !loading && setOpen(false)} fullWidth maxWidth="md">
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
                <Typography variant="body2">Preparing the latest call brief…</Typography>
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
          <Button onClick={() => setOpen(false)} disabled={loading}>Close</Button>
          <Button variant="contained" onClick={refreshBrief} disabled={briefLoading || loading}>
            {briefLoading ? "Preparing…" : brief ? "Refresh call brief" : "Prepare call brief"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
