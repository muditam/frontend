// src/components/ScheduleCallDialog.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Stack, TextField, Button,
  Autocomplete, Chip, Typography, Divider, ToggleButton, ToggleButtonGroup, Box,
  Tooltip, CircularProgress, Snackbar, Alert
} from "@mui/material";
import axios from "axios";

export default function ScheduleCallDialog({
  open,
  onClose, 
  onScheduled,  
  agents = [], 
  orderId,
  customerId,
  createdBy,
 
  apiBase = "https://muditamleads-14f32a10d7f7.herokuapp.com",  
 
  bookedSlots = [],
  slotDurationMin = 15,
  businessStart = "10:30",
  businessEnd = "18:30",
  workingDays = [1, 2, 3, 4, 5, 6],  
  timezoneLabel = "IST (UTC+05:30)",
  disableBeforeMinutesFromNow = 0,  
}) { 
  const pad = (n) => String(n).padStart(2, "0");
  const toDateInputValue = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromHM = (hm) => {
    const [h, m] = hm.split(":").map((x) => parseInt(x, 10));
    return { h: isNaN(h) ? 0 : h, m: isNaN(m) ? 0 : m };
  };
  const fmtTime = (d) => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  const sameMinute = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate() &&
    a.getHours() === b.getHours() &&
    a.getMinutes() === b.getMinutes();

  const minDateStr = useMemo(() => toDateInputValue(new Date()), []);
 
  const bookedProp = useMemo(
    () =>
      (bookedSlots || [])
        .map((iso) => {
          try { return new Date(iso); } catch { return null; }
        })
        .filter(Boolean),
    [bookedSlots]
  );
 
  const defaultDate = useMemo(() => {
    const now = new Date();
    let d = new Date(now);
    for (let i = 0; i < 7 && !workingDays.includes(d.getDay()); i++) d.setDate(d.getDate() + 1);
    return d;
  }, [workingDays]);

  const defaultWhenISO = useMemo(() => {
    const now = new Date();
    const buffer = Math.max(0, Number(disableBeforeMinutesFromNow) || 0);
    now.setMinutes(now.getMinutes() + Math.max(60, buffer));  
    now.setSeconds(0, 0);
    const step = slotDurationMin;
    const remainder = now.getMinutes() % step;
    if (remainder) now.setMinutes(now.getMinutes() + (step - remainder));
    return now.toISOString();
  }, [slotDurationMin, disableBeforeMinutesFromNow]);
 
  const [expert, setExpert] = useState(null);
  const [dateStr, setDateStr] = useState(toDateInputValue(defaultDate));
  const [selectedISO, setSelectedISO] = useState(defaultWhenISO);
  const [notes, setNotes] = useState("");
  const [duration, setDuration] = useState(slotDurationMin);

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [remoteBooked, setRemoteBooked] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [toast, setToast] = useState({ open: false, severity: "success", msg: "" });
 
  useEffect(() => {
    if (open && agents && agents.length === 1) setExpert(agents[0]);
  }, [open, agents]);
 
  useEffect(() => {
    const sel = new Date(selectedISO);
    const picked = new Date(dateStr + "T00:00:00");
    sel.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
    setSelectedISO(sel.toISOString()); 
  }, [dateStr]);
 
  const expertId = expert?.id || expert?.value || expert?.label || undefined;
  useEffect(() => {
    let cancelled = false;
    if (!open) return;
    if (bookedProp.length) { setRemoteBooked([]); return; }  

    (async () => {
      try {
        if (!dateStr) return;
        setLoadingSlots(true);
        const params = new URLSearchParams({
          date: dateStr,
          businessStart,
          businessEnd,
        });
        if (expertId) params.set("expertId", String(expertId));
        const { data } = await axios.get(`${apiBase}/api/schedule-calls/slots?${params.toString()}`);
        if (cancelled) return;
        const norm = (data?.bookedSlots || [])
          .map((iso) => { try { return new Date(iso); } catch { return null; } })
          .filter(Boolean);
        setRemoteBooked(norm);
      } catch (e) {
        if (!cancelled) {
          setRemoteBooked([]);
          setToast({ open: true, severity: "error", msg: "Failed to load booked slots" });
        }
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    })();

    return () => { cancelled = true; };
  }, [open, dateStr, expertId, apiBase, businessStart, businessEnd, bookedProp.length]);

  const effectiveBooked = bookedProp.length ? bookedProp : remoteBooked;

  // Build slots grid
  const slots = useMemo(() => {
    const day = new Date(dateStr + "T00:00:00");
    if (!workingDays.includes(day.getDay())) return [];

    const { h: startH, m: startM } = fromHM(businessStart);
    const { h: endH, m: endM } = fromHM(businessEnd);

    const start = new Date(day); start.setHours(startH, startM, 0, 0);
    const end = new Date(day);   end.setHours(endH, endM, 0, 0);

    const step = duration;
    const gen = [];
    const now = new Date();
    const bufferMs = Math.max(0, Number(disableBeforeMinutesFromNow) || 0) * 60000;

    for (let t = new Date(start); t < end; t = new Date(t.getTime() + step * 60000)) {
      const sameDayAsNow = toDateInputValue(t) === toDateInputValue(now);
      const tooSoon = sameDayAsNow && t.getTime() < now.getTime() + bufferMs;
      const isBooked = effectiveBooked.some((b) => sameMinute(new Date(b), t));

      const disabled = (sameDayAsNow && tooSoon) || isBooked;
      const reason = isBooked ? "Booked" : (sameDayAsNow && tooSoon ? "Past/too soon" : "");
      gen.push({ iso: t.toISOString(), label: fmtTime(t), disabled, reason });
    }
    return gen;
  }, [
    dateStr, businessStart, businessEnd, duration, effectiveBooked, workingDays, disableBeforeMinutesFromNow
  ]);

  // Keep selection valid
  useEffect(() => {
    if (!slots.length) return;
    const current = new Date(selectedISO);
    const match = slots.find((s) => sameMinute(new Date(s.iso), current));
    if (!match || match.disabled) {
      const first = slots.find((s) => !s.disabled);
      if (first) setSelectedISO(first.iso);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots.length, slots.map((s) => `${s.iso}-${s.disabled}`).join("|")]);

  const setQuickDate = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setDateStr(toDateInputValue(d));
  };

  // Submit → directly call API here
  const handleSubmit = async () => {
    if (!expert || !selectedISO || !duration) return;

    try {
      setSubmitting(true);
      const payload = {
        doctorCallNeeded: true,
        assignedExpert: expert?.id || expert?.value || expert?.label || String(expert),
        scheduleCallAt: selectedISO, // UTC ISO
        scheduleDurationMin: duration,
        scheduleCallNotes: (notes || "").trim(),
        orderId,
        customerId,
        createdBy,
      };

      const { data } = await axios.post(`${apiBase}/api/schedule-calls`, payload);
      const created = data?.schedule;

      // Optional: let parent mirror some fields on the order row
      const mirror = {
        doctorCallNeeded: true,
        assignedExpert: payload.assignedExpert,
        scheduleCallAt: payload.scheduleCallAt,
        scheduleDurationMin: payload.scheduleDurationMin,
        scheduleCallNotes: payload.scheduleCallNotes,
      };
      onScheduled?.(mirror, created);

      setToast({ open: true, severity: "success", msg: "Call scheduled" });
      onClose?.();
    } catch (e) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "Failed to schedule";
      setToast({ open: true, severity: "error", msg });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedLocalLabel = useMemo(
    () => (selectedISO ? `${toDateInputValue(new Date(selectedISO))}, ${fmtTime(new Date(selectedISO))}` : ""),
    [selectedISO]
  );

  return (
    <>
      <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="md" fullWidth>
        <DialogTitle>Schedule Doctor Call</DialogTitle>
        <DialogContent dividers>
          <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
            {/* Left: Date & Duration */}
            <Stack minWidth={{ md: 320 }} spacing={2}>
              <Typography variant="subtitle2">Select a date</Typography>
              <Stack direction="row" spacing={1}>
                <Chip label="Today" onClick={() => setQuickDate(0)} />
                <Chip label="Tomorrow" onClick={() => setQuickDate(1)} />
                <Chip label="Next Week" onClick={() => setQuickDate(7)} />
              </Stack>

              <TextField
                type="date"
                label="Pick a date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                inputProps={{ min: minDateStr }}
                helperText={
                  !workingDays.includes(new Date(dateStr + "T00:00:00").getDay())
                    ? "Selected date is a non-working day — pick another."
                    : " "
                }
                InputLabelProps={{ shrink: true }}
              />

              <Divider />

              <Typography variant="subtitle2">Duration</Typography>
              <ToggleButtonGroup
                exclusive
                value={duration}
                onChange={(_e, val) => { if (val) setDuration(val); }}
                size="small"
                color="primary"
              >
                <ToggleButton value={15}>15 min</ToggleButton>
                <ToggleButton value={30}>30 min</ToggleButton> 
              </ToggleButtonGroup>

              <Box>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  All times in {timezoneLabel}.
                </Typography>
                {selectedISO && (
                  <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                    Selected: {selectedLocalLabel}
                  </Typography>
                )}
              </Box>
            </Stack>

            {/* Right: Time Slots */}
            <Stack flex={1} spacing={1}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="subtitle2">Select a time</Typography>
                {loadingSlots && <CircularProgress size={16} />}
              </Stack>

              {slots.length ? (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(4, 1fr)" },
                    gap: 1,
                  }}
                >
                  {slots.map((s) => {
                    const selected = sameMinute(new Date(s.iso), new Date(selectedISO));
                    const btn = (
                      <Button
                        key={s.iso}
                        variant={selected ? "contained" : "outlined"}
                        disabled={s.disabled}
                        onClick={() => setSelectedISO(s.iso)}
                        size="small"
                      >
                        {s.label}
                      </Button>
                    );
                    return s.disabled && s.reason ? (
                      <Tooltip key={s.iso} title={s.reason} arrow>
                        <span>{btn}</span>
                      </Tooltip>
                    ) : (
                      btn
                    );
                  })}
                </Box>
              ) : (
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  {workingDays.includes(new Date(dateStr + "T00:00:00").getDay())
                    ? "No slots in the business window."
                    : "No available slots for the selected date (non-working day)."}
                </Typography>
              )}

              <Divider sx={{ my: 1.5 }} />

              {/* Expert + Notes */}
              <Autocomplete
                size="small"
                options={agents}
                getOptionLabel={(o) => (typeof o === "string" ? o : o?.label || "")}
                value={expert}
                onChange={(_e, val) => setExpert(val)}
                renderInput={(params) => <TextField {...params} label="Assign expert" />}
                isOptionEqualToValue={(opt, val) =>
                  (opt?.id || opt?.value || opt?.label) === (val?.id || val?.value || val?.label)
                }
              />
              <TextField
                label="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                multiline
                minRows={2}
              />
            </Stack>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting || !expert || !selectedISO || !duration}
          >
            {submitting ? "Scheduling…" : "Schedule"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={2200}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </>
  );
}
