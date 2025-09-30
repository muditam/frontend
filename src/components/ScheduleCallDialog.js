// src/components/ScheduleCallDialog.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  TextField,
  Button,
  Autocomplete,
  Chip,
  Typography,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Box,
} from "@mui/material";

/**
 * Calendly-style Schedule Call dialog
 *
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - onSubmit: (payload) => Promise<void> | void
 * - agents: [{ id, label }]
 * - row: object (optional)
 * - bookedSlots?: string[] ISO datetimes already taken (disable these)
 * - slotDurationMin?: number (default 30)
 * - businessStart?: "HH:MM" (default "09:00")
 * - businessEnd?: "HH:MM" (default "20:00")
 * - workingDays?: number[] JS day indexes allowed (default [1,2,3,4,5,6]) // Mon–Sat
 * - timezoneLabel?: string (default "IST (UTC+05:30)")
 */
export default function ScheduleCallDialog({
  open,
  onClose,
  onSubmit,
  agents = [],
  row,
  bookedSlots = [],
  slotDurationMin = 30,
  businessStart = "10:30",
  businessEnd = "18:30",
  workingDays = [1, 2, 3, 4, 5, 6], 
  timezoneLabel = "IST (UTC+05:30)",
}) {
  // ----- Helpers -----
  const pad = (n) => String(n).padStart(2, "0");

  const toDateInputValue = (d) => {
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    return `${y}-${m}-${day}`;
  };

  const fromHM = (hm) => {
    const [h, m] = hm.split(":").map((x) => parseInt(x, 10));
    return { h, m };
  };

  const fmtTime = (d) => {
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const sameMinute = (a, b) => {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate() &&
      a.getHours() === b.getHours() &&
      a.getMinutes() === b.getMinutes()
    );
  };

  // normalize bookedSlots into Date objects
  const booked = useMemo(
    () =>
      (bookedSlots || [])
        .map((iso) => {
          try {
            return new Date(iso);
          } catch {
            return null;
          }
        })
        .filter(Boolean),
    [bookedSlots]
  );

  // ----- Defaults -----
  // Default date = today (or next working day if today isn’t)
  const defaultDate = useMemo(() => {
    const now = new Date();
    let d = new Date(now);
    // if not a working day, push to next working day
    for (let i = 0; i < 7 && !workingDays.includes(d.getDay()); i++) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }, [workingDays]);

  const defaultWhenISO = useMemo(() => {
    // default selected slot: +1 hour (rounded up to next step)
    const now = new Date();
    now.setMinutes(now.getMinutes() + 60);
    now.setSeconds(0, 0);
    const step = slotDurationMin;
    const remainder = now.getMinutes() % step;
    if (remainder) now.setMinutes(now.getMinutes() + (step - remainder));
    return now.toISOString();
  }, [slotDurationMin]);

  // ----- State -----
  const [expert, setExpert] = useState(null);
  const [dateStr, setDateStr] = useState(toDateInputValue(defaultDate));
  const [selectedISO, setSelectedISO] = useState(defaultWhenISO);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [duration, setDuration] = useState(slotDurationMin);

  // keep selected slot aligned to chosen date if user changes date
  useEffect(() => {
    const sel = new Date(selectedISO);
    const picked = new Date(dateStr + "T00:00:00");
    sel.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
    setSelectedISO(sel.toISOString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr]);

  // ----- Slot generation (Calendly-like) -----
  const slots = useMemo(() => {
    const day = new Date(dateStr + "T00:00:00");
    const today = new Date();
    if (!workingDays.includes(day.getDay())) return [];

    const { h: startH, m: startM } = fromHM(businessStart);
    const { h: endH, m: endM } = fromHM(businessEnd);

    const start = new Date(day);
    start.setHours(startH, startM, 0, 0);

    const end = new Date(day);
    end.setHours(endH, endM, 0, 0);

    const step = duration;
    const gen = [];
    const now = new Date();

    for (let t = new Date(start); t < end; t = new Date(t.getTime() + step * 60000)) {
      const isPast = t.getTime() <= now.getTime(); // disable past on current day
      const isBooked = booked.some((b) => sameMinute(b, t));
      gen.push({
        iso: t.toISOString(),
        label: fmtTime(t),
        disabled: isPast && toDateInputValue(t) === toDateInputValue(now) ? true : isBooked,
        reason: isBooked ? "Booked" : isPast ? "Past" : "",
      });
    }

    return gen;
  }, [dateStr, businessStart, businessEnd, duration, booked, workingDays]);

  // Ensure selected slot remains valid
  useEffect(() => {
    if (!slots.length) return;
    const current = new Date(selectedISO);
    const match = slots.find((s) => {
      const d = new Date(s.iso);
      return sameMinute(d, current);
    });
    if (!match || match.disabled) {
      // pick the first enabled
      const first = slots.find((s) => !s.disabled);
      if (first) setSelectedISO(first.iso);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots.length]);

  const setQuickDate = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setDateStr(toDateInputValue(d));
  };

  const handleSubmit = async () => {
    if (!expert) return;
    if (!selectedISO) return;

    try {
      setSubmitting(true);
      await onSubmit?.({
        doctorCallNeeded: true,
        assignedExpert: expert?.id || expert?.label || "",
        scheduleCallAt: selectedISO,
        scheduleCallNotes: notes?.trim() || "",
        scheduleDurationMin: duration,
      });
      onClose?.();
    } finally {
      setSubmitting(false);
    }
  };

  // ----- UI -----
  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>Schedule Doctor Call</DialogTitle>
      <DialogContent dividers>
        <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
          {/* Left: Date & Duration (Calendly-style) */}
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
              InputLabelProps={{ shrink: true }}
            />

            <Divider />

            <Typography variant="subtitle2">Duration</Typography>
            <ToggleButtonGroup
              exclusive
              value={duration}
              onChange={(_e, val) => {
                if (val) setDuration(val);
              }}
              size="small"
              color="primary"
            >
              <ToggleButton value={15}>15 min</ToggleButton> 
            </ToggleButtonGroup>

            <Box>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                All times in {timezoneLabel}.
              </Typography>
            </Box>
          </Stack>

          {/* Right: Time Slots */}
          <Stack flex={1} spacing={1}>
            <Typography variant="subtitle2">Select a time</Typography>

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
                  return (
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
                })}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                No available slots for the selected date (non-working day).
              </Typography>
            )}

            <Divider sx={{ my: 1.5 }} />

            {/* Expert + Notes */}
            <Autocomplete
              size="small"
              options={agents}
              getOptionLabel={(o) => o?.label || ""}
              value={expert}
              onChange={(_e, val) => setExpert(val)}
              renderInput={(params) => <TextField {...params} label="Assign expert" />}
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
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || !expert || !selectedISO || !duration}
        >
          {submitting ? "Scheduling…" : "Schedule"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
