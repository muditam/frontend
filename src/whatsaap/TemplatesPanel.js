import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  Button,
  TextField,
  Divider,
  CircularProgress,
  Chip,
  Grid,
  Paper,
  IconButton,
  Dialog,
  DialogContent,
  Tooltip,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import SyncIcon from "@mui/icons-material/Sync";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import CampaignIcon from "@mui/icons-material/Campaign";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import BuildIcon from "@mui/icons-material/Build";
import DescriptionIcon from "@mui/icons-material/Description";
import VideocamIcon from "@mui/icons-material/Videocam";
import ImageIcon from "@mui/icons-material/Image";
import CloseIcon from "@mui/icons-material/Close";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";

const API_BASE = "https://muditamleads-14f32a10d7f7.herokuapp.com";
const ACCENT = "#0aa59a";

async function safeJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error(
      "Non-JSON response:",
      res.status,
      res.headers.get("content-type"),
      text.slice(0, 200)
    );
    return null;
  }
}

function onlyAllowedTemplateName(v) {
  return (v || "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 250);
}

function extractVars(bodyText) {
  const re = /{{\s*(\d+)\s*}}/g;
  const set = new Set();
  let m;
  while ((m = re.exec(bodyText || ""))) set.add(Number(m[1]));
  return Array.from(set).sort((a, b) => a - b);
}

function replaceVarsForPreview(bodyText, sampleMap) {
  if (!bodyText) return "";
  return bodyText.replace(/{{\s*(\d+)\s*}}/g, (full, n) => {
    const key = String(n);
    const val = sampleMap?.[key];
    return val && String(val).trim() ? String(val) : full;
  });
}

function fmtTime(d) {
  try {
    return new Date(d || Date.now()).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "";
  }
}

function fmtDateTime(v) {
  if (!v) return "";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return "";
  }
}

function statusChipStyles(statusRaw) {
  const s = String(statusRaw || "").toLowerCase();
  if (s.includes("approve")) {
    return { bgcolor: "#e7fbf2", color: "#1b7f4b", borderColor: "#b7eed0" };
  }
  if (s.includes("reject")) {
    return { bgcolor: "#ffeceb", color: "#b42318", borderColor: "#ffc7c3" };
  }
  if (s.includes("pend") || s.includes("submitted") || s.includes("review")) {
    return { bgcolor: "#fff3dc", color: "#a15c07", borderColor: "#ffe1b0" };
  }
  return { bgcolor: "#f4f6f8", color: "#344054", borderColor: "#e5e7eb" };
}

function getTemplatePreviewText(t) {
  if (t?.preview) return String(t.preview);
  if (t?.body) return String(t.body);

  const comps = t?.components;
  if (Array.isArray(comps)) {
    const bodyComp = comps.find(
      (c) => String(c?.type || "").toUpperCase() === "BODY"
    );
    if (bodyComp?.text) return String(bodyComp.text);
  }
  return "";
}

function Tile({ selected, onClick, icon, title }) {
  return (
    <Paper
      onClick={onClick}
      elevation={0}
      sx={{
        cursor: "pointer",
        p: 1.25,
        borderRadius: 2,
        border: selected ? `2px solid ${ACCENT}` : "1px solid #e6e6e6",
        bgcolor: "#fff",
        transition: "all .12s ease",
        "&:hover": { borderColor: selected ? ACCENT : "#cfcfcf" },
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: 2,
            display: "grid",
            placeItems: "center",
            bgcolor: "#f5f7f7",
            color: "#111",
          }}
        >
          {icon}
        </Box>
        <Typography fontSize={14} fontWeight={800}>
          {title}
        </Typography>
      </Stack>
    </Paper>
  );
}

function CounterLabel({ label, count, max }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between">
      <Typography fontWeight={800} fontSize={14}>
        {label}
      </Typography>
      <Typography fontSize={12} color="text.secondary">
        {count}/{max}
      </Typography>
    </Stack>
  );
}

export default function TemplatesPanel() {
  const [mode, setMode] = useState("list");

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [lastSync, setLastSync] = useState(null);
  const [inSync, setInSync] = useState(true);

  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [language] = useState("en");
  const [headerType, setHeaderType] = useState("NONE");
  const [headerText, setHeaderText] = useState("");
  const [mediaType, setMediaType] = useState("DOCUMENT");
  const [body, setBody] = useState("");
  const [footer, setFooter] = useState("");
  const [sending, setSending] = useState(false);

  const [sampleOpen, setSampleOpen] = useState(false);
  const [sampleFilename, setSampleFilename] = useState("");
  const [sampleHeaderText, setSampleHeaderText] = useState("");
  const [sampleVars, setSampleVars] = useState({});

  const bodyVars = useMemo(() => extractVars(body), [body]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return templates;
    return templates.filter((t) =>
      String(t.name || "").toLowerCase().includes(s)
    );
  }, [templates, search]);

  const canSend = useMemo(
    () => Boolean(category && name.trim() && body.trim()),
    [category, name, body]
  );

  useEffect(() => {
    const vars = bodyVars;
    setSampleVars((prev) => {
      const next = { ...prev };
      for (const n of vars) {
        const k = String(n);
        if (!(k in next)) next[k] = "";
      }
      for (const k of Object.keys(next)) {
        if (!vars.includes(Number(k))) delete next[k];
      }
      return next;
    });
  }, [JSON.stringify(bodyVars)]);

  async function fetchTemplates({ silent = false } = {}) {
    if (!silent) setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/whatsapp/templates`, {
        credentials: "omit",
        headers: { Accept: "application/json" },
      });

      const data = await safeJson(res);

      if (!res.ok) {
        console.error("Templates API failed:", res.status, data);
        setTemplates([]);
        return;
      }

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.templates)
        ? data.templates
        : [];

      setTemplates(list);

      const meta = !Array.isArray(data) ? data?.meta : null;
      if (meta?.lastSyncAt) setLastSync(meta.lastSyncAt);
      if (typeof meta?.inSync === "boolean") setInSync(meta.inSync);
    } catch (e) {
      console.error("Fetch templates failed", e);
      setTemplates([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function syncTemplates() {
    setSyncing(true);
    setInSync(false);

    try {
      const res = await fetch(`${API_BASE}/api/whatsapp/templates/sync`, {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
      });

      const data = await safeJson(res);

      if (!res.ok) {
        console.error("Sync failed:", res.status, data);
        setInSync(false);
        alert(data?.error?.message || data?.message || "Template sync failed");
        return;
      }

      if (data?.meta?.lastSyncAt) setLastSync(data.meta.lastSyncAt);
      if (typeof data?.meta?.inSync === "boolean") setInSync(data.meta.inSync);
      else setInSync(true);

      await fetchTemplates({ silent: true });
    } catch (e) {
      console.error("Sync failed", e);
      setInSync(false);
      alert("Template sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function deleteTemplate(t) {
    const id = t?._id || t?.id;
    if (!id) return;
    if (!window.confirm(`Delete template "${t.name}"?`)) return;

    setTemplates((prev) => prev.filter((x) => (x?._id || x?.id) !== id));

    try {
      const res = await fetch(`${API_BASE}/api/whatsapp/templates/${id}`, {
        method: "DELETE",
        credentials: "omit",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) await fetchTemplates({ silent: true });
    } catch (e) {
      console.error("Delete failed", e);
      await fetchTemplates({ silent: true });
    }
  }

  function resetCreateForm() {
    setCategory("");
    setName("");
    setHeaderType("NONE");
    setHeaderText("");
    setMediaType("DOCUMENT");
    setBody("");
    setFooter("");
    setSampleFilename("");
    setSampleHeaderText("");
    setSampleVars({});
  }

  function openCreate() {
    resetCreateForm();
    setMode("create");
  }

  function backToList() {
    setMode("list");
  }

  function addNextVariable() {
    const vars = extractVars(body);
    const next = vars.length ? Math.max(...vars) + 1 : 1;
    const insertion = `${body && !body.endsWith(" ") ? " " : ""}{{${next}}}`;
    setBody((prev) => (prev || "") + insertion);
    setSampleVars((m) => (m[String(next)] ? m : { ...m, [String(next)]: "" }));
  }

  async function sendForApproval() {
    if (!canSend) return;

    setSending(true);
    try {
      const cleanName = onlyAllowedTemplateName(name);
      const components = [];

      if (headerType === "TEXT") {
        if ((headerText || "").trim()) {
          components.push({
            type: "HEADER",
            format: "TEXT",
            text: headerText.trim(),
            example: sampleHeaderText?.trim()
              ? { header_text: [sampleHeaderText.trim()] }
              : undefined,
          });
        }
      }

      if (headerType === "MEDIA") {
        components.push({
          type: "HEADER",
          format: mediaType,
          example: sampleFilename ? { header_handle: [sampleFilename] } : undefined,
        });
      }

      components.push({
        type: "BODY",
        text: body,
        example:
          bodyVars.length > 0
            ? {
                body_text: [
                  bodyVars.map((n) => {
                    const v = sampleVars[String(n)];
                    return v && String(v).trim() ? String(v) : `sample_${n}`;
                  }),
                ],
              }
            : undefined,
      });

      if (footer.trim()) {
        components.push({ type: "FOOTER", text: footer.trim() });
      }

      const payload = {
        name: cleanName,
        language,
        category,
        components,
      };

      const res = await fetch(`${API_BASE}/api/whatsapp/templates`, {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      const out = await safeJson(res);

      if (!res.ok) {
        console.error("Create failed:", out);
        alert(out?.error?.message || out?.error || "Template create failed");
        return;
      }

      await fetchTemplates({ silent: true });
      setMode("list");
    } catch (e) {
      console.error("Send for approval error", e);
      alert("Template create failed (network/server error)");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    fetchTemplates();
    const id = setInterval(() => {
      if (mode === "list") fetchTemplates({ silent: true });
    }, 20000);
    return () => clearInterval(id);
  }, [mode]);

  const previewBody = useMemo(
    () => replaceVarsForPreview(body, sampleVars),
    [body, sampleVars]
  );

  const previewHeaderText = useMemo(() => {
    if (headerType !== "TEXT") return "";
    return (sampleHeaderText || headerText || "").trim();
  }, [headerType, headerText, sampleHeaderText]);

  const HeaderMediaIcon = useMemo(() => {
    if (mediaType === "VIDEO") return <VideocamIcon fontSize="small" />;
    if (mediaType === "IMAGE") return <ImageIcon fontSize="small" />;
    return <DescriptionIcon fontSize="small" />;
  }, [mediaType]);

  if (mode === "list") {
    return (
      <Box sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ gap: 2 }}>
          <Box sx={{ width: 320, maxWidth: "100%" }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <Box sx={{ display: "flex", alignItems: "center", mr: 1, color: "#98A2B3" }}>
                    <SearchIcon fontSize="small" />
                  </Box>
                ),
              }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#fff" } }}
            />
          </Box>

          <Stack direction="row" alignItems="center" spacing={1}>
            <Chip
              label={inSync ? "In sync" : "Out of sync"}
              size="small"
              sx={{
                fontWeight: 800,
                borderRadius: 2,
                border: `1px solid ${inSync ? "#b7eed0" : "#ffe1b0"}`,
                bgcolor: inSync ? "#e7fbf2" : "#fff3dc",
                color: inSync ? "#1b7f4b" : "#a15c07",
              }}
            />

            <Button
              variant="outlined"
              startIcon={<SyncIcon />}
              onClick={syncTemplates}
              disabled={syncing}
              sx={{
                borderRadius: 2,
                px: 2,
                borderColor: "#D0D5DD",
                color: "#101828",
                bgcolor: "#fff",
                "&:hover": { borderColor: "#D0D5DD", bgcolor: "#fafafa" },
              }}
            >
              {syncing ? "Syncing..." : "Sync from TrustSignal"}
            </Button>

            <Button
              variant="contained"
              onClick={openCreate}
              sx={{ borderRadius: 2, px: 2, bgcolor: "#11A4B8", "&:hover": { bgcolor: "#0f92a4" } }}
            >
              Add template
            </Button>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={2} sx={{ mt: 1 }} alignItems="center">
          {lastSync ? (
            <Typography fontSize={12} color="text.secondary">
              Last sync: {fmtDateTime(lastSync)}
            </Typography>
          ) : null}
        </Stack>

        <Box sx={{ mt: 3 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "2.2fr 1.2fr 3.6fr 1.2fr 1.2fr 0.6fr",
              alignItems: "center",
              px: 2,
              py: 1,
              color: "#667085",
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            <Box>NAME</Box>
            <Box>CATEGORY</Box>
            <Box>PREVIEW</Box>
            <Box>STATUS</Box>
            <Box>LANGUAGE</Box>
            <Box />
          </Box>

          <Divider />

          {loading ? (
            <Stack alignItems="center" mt={4}>
              <CircularProgress size={22} />
            </Stack>
          ) : filtered.length === 0 ? (
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              No templates found.
            </Typography>
          ) : (
            <Stack spacing={1.25} sx={{ mt: 1.5 }}>
              {filtered.map((t) => {
                const preview = getTemplatePreviewText(t);
                const st = statusChipStyles(t.status);
                const lang = (t.language || "en").toUpperCase();

                return (
                  <Paper
                    key={t._id || t.name}
                    elevation={0}
                    sx={{
                      border: "1px solid #EEF2F6",
                      borderRadius: 1.5,
                      bgcolor: "#F9FBFF",
                      px: 2,
                      py: 1.6,
                    }}
                  >
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "2.2fr 1.2fr 3.6fr 1.2fr 1.2fr 0.6fr",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Typography fontWeight={700} sx={{ color: "#101828" }}>
                        {t.name}
                      </Typography>

                      <Typography sx={{ color: "#101828" }}>
                        {t.category
                          ? String(t.category)[0] + String(t.category).slice(1).toLowerCase()
                          : "—"}
                      </Typography>

                      <Typography sx={{ color: "#101828" }} noWrap>
                        {preview || "—"}
                      </Typography>

                      <Chip
                        label={String(t.status || "UNKNOWN")}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          borderRadius: 1,
                          bgcolor: st.bgcolor,
                          color: st.color,
                          border: `1px solid ${st.borderColor}`,
                          width: "fit-content",
                        }}
                      />

                      <Chip
                        label={lang}
                        size="small"
                        sx={{
                          fontWeight: 900,
                          borderRadius: 999,
                          bgcolor: "#FDE68A",
                          color: "#111827",
                          width: "fit-content",
                        }}
                      />

                      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                        <Tooltip title="Delete">
                          <IconButton
                            onClick={() => deleteTemplate(t)}
                            size="small"
                            sx={{ color: "#667085", "&:hover": { bgcolor: "rgba(0,0,0,0.04)" } }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton onClick={backToList}>
            <ArrowBackIcon />
          </IconButton>
          <Typography fontWeight={900} fontSize={18}>
            Add Template
          </Typography>
        </Stack>

        <Button
          variant="outlined"
          onClick={() => setSampleOpen(true)}
          sx={{
            borderColor: ACCENT,
            color: ACCENT,
            "&:hover": { borderColor: "#078a82", bgcolor: "transparent" },
            borderRadius: 999,
            px: 2.2,
            fontWeight: 800,
          }}
        >
          Add Sample
        </Button>
      </Stack>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={7}>
          <Stack spacing={2}>
            <Paper elevation={0} sx={{ border: "1px solid #e6e6e6", borderRadius: 2, p: 2, bgcolor: "#fff" }}>
              <Typography fontWeight={800} fontSize={14}>
                Category <span style={{ color: "#d32f2f" }}>*</span>
              </Typography>
              <Typography fontSize={12} color="text.secondary" mt={0.5}>
                Choose what type of message template you want to create.
              </Typography>

              <Grid container spacing={1.25} sx={{ mt: 1.25 }}>
                <Grid item xs={12} sm={4}>
                  <Tile
                    selected={category === "MARKETING"}
                    onClick={() => setCategory("MARKETING")}
                    icon={<CampaignIcon fontSize="small" />}
                    title="Marketing"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Tile
                    selected={category === "AUTHENTICATION"}
                    onClick={() => setCategory("AUTHENTICATION")}
                    icon={<VerifiedUserIcon fontSize="small" />}
                    title="Authentication"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Tile
                    selected={category === "UTILITY"}
                    onClick={() => setCategory("UTILITY")}
                    icon={<BuildIcon fontSize="small" />}
                    title="Utility"
                  />
                </Grid>
              </Grid>
            </Paper>

            <Paper elevation={0} sx={{ border: "1px solid #e6e6e6", borderRadius: 2, p: 2, bgcolor: "#fff" }}>
              <CounterLabel
                label={
                  <>
                    Name <span style={{ color: "#d32f2f" }}>*</span>
                  </>
                }
                count={name.length}
                max={250}
              />
              <Typography fontSize={12} color="text.secondary" mt={0.5}>
                Use lowercase letters, numbers, and underscores only. (e.g., order_confirmation)
              </Typography>

              <TextField
                fullWidth
                size="small"
                value={name}
                onChange={(e) => setName(onlyAllowedTemplateName(e.target.value))}
                placeholder="e.g. order_confirmation"
                sx={{ mt: 1.25 }}
              />
            </Paper>

            <Paper elevation={0} sx={{ border: "1px solid #e6e6e6", borderRadius: 2, p: 2, bgcolor: "#fff" }}>
              <Typography fontWeight={800} fontSize={14}>
                Header (optional)
              </Typography>

              <TextField
                select
                SelectProps={{ native: true }}
                fullWidth
                size="small"
                value={headerType}
                onChange={(e) => setHeaderType(e.target.value)}
                sx={{ mt: 1.25 }}
              >
                <option value="NONE">None</option>
                <option value="TEXT">Text</option>
                <option value="MEDIA">Media</option>
              </TextField>

              {headerType === "TEXT" ? (
                <Box mt={1.25}>
                  <CounterLabel label="Header text" count={headerText.length} max={60} />
                  <TextField
                    fullWidth
                    size="small"
                    value={headerText}
                    onChange={(e) => setHeaderText(e.target.value.slice(0, 60))}
                    placeholder="Header text"
                    sx={{ mt: 1 }}
                  />
                </Box>
              ) : null}

              {headerType === "MEDIA" ? (
                <Grid container spacing={1.25} sx={{ mt: 1.25 }}>
                  <Grid item xs={12} sm={4}>
                    <Tile selected={mediaType === "DOCUMENT"} onClick={() => setMediaType("DOCUMENT")} icon={<DescriptionIcon fontSize="small" />} title="Document" />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Tile selected={mediaType === "VIDEO"} onClick={() => setMediaType("VIDEO")} icon={<VideocamIcon fontSize="small" />} title="Video" />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Tile selected={mediaType === "IMAGE"} onClick={() => setMediaType("IMAGE")} icon={<ImageIcon fontSize="small" />} title="Image" />
                  </Grid>
                </Grid>
              ) : null}
            </Paper>

            <Paper elevation={0} sx={{ border: "1px solid #e6e6e6", borderRadius: 2, p: 2, bgcolor: "#fff" }}>
              <CounterLabel
                label={
                  <>
                    Body <span style={{ color: "#d32f2f" }}>*</span>
                  </>
                }
                count={body.length}
                max={1024}
              />
              <Typography fontSize={12} color="text.secondary" mt={0.5}>
                Enter the text for your message in the language you’ve selected.
              </Typography>

              <TextField
                fullWidth
                size="small"
                multiline
                minRows={5}
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, 1024))}
                placeholder="e.g. Hi {{1}}, your order {{2}} is confirmed."
                sx={{ mt: 1.25 }}
              />

              <Stack direction="row" alignItems="center" justifyContent="flex-end" sx={{ mt: 1 }}>
                <Button variant="text" onClick={addNextVariable} sx={{ color: ACCENT, fontWeight: 900 }}>
                  + Add variable
                </Button>
              </Stack>
            </Paper>

            <Paper elevation={0} sx={{ border: "1px solid #e6e6e6", borderRadius: 2, p: 2, bgcolor: "#fff" }}>
              <CounterLabel label="Footer (optional)" count={footer.length} max={60} />
              <TextField
                fullWidth
                size="small"
                value={footer}
                onChange={(e) => setFooter(e.target.value.slice(0, 60))}
                placeholder="Message Footer"
                sx={{ mt: 1.25 }}
              />
            </Paper>

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="outlined" onClick={backToList} disabled={sending}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={sendForApproval}
                disabled={!canSend || sending}
                startIcon={<AddIcon />}
                sx={{ bgcolor: ACCENT, "&:hover": { bgcolor: "#078a82" }, fontWeight: 900 }}
              >
                {sending ? "Sending..." : "Create & send for approval"}
              </Button>
            </Stack>
          </Stack>
        </Grid>

        <Grid item xs={12} md={5}>
          <Box
            sx={{
              minHeight: 520,
              borderRadius: 2,
              border: "1px solid #e6e6e6",
              background: "linear-gradient(180deg, #f7f9f9 0%, #ffffff 100%)",
              p: 2,
              display: "grid",
              placeItems: "center",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                width: 300,
                height: 620,
                borderRadius: 6,
                border: "10px solid #111",
                position: "relative",
                bgcolor: "#f0f2f5",
                overflow: "hidden",
                boxShadow: "0 18px 40px rgba(0,0,0,.16)",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: 6,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 140,
                  height: 22,
                  borderRadius: 999,
                  bgcolor: "#111",
                  zIndex: 3,
                }}
              />

              <Box sx={{ height: 58, bgcolor: ACCENT, color: "#fff", display: "flex", alignItems: "center", px: 1.5 }}>
                <Typography fontWeight={900} fontSize={14}>
                  Muditam
                </Typography>
              </Box>

              <Box
                sx={{
                  height: "calc(100% - 58px - 56px)",
                  px: 1.5,
                  py: 1.5,
                  overflow: "auto",
                  background:
                    "radial-gradient(circle at 20% 20%, rgba(0,0,0,0.03) 0 2px, transparent 2px 100%)",
                  backgroundSize: "18px 18px",
                }}
              >
                <Box sx={{ maxWidth: "92%", ml: "auto", bgcolor: "#dcf8c6", borderRadius: 2, p: 1.1, boxShadow: "0 1px 0 rgba(0,0,0,.06)" }}>
                  {headerType === "MEDIA" ? (
                    mediaType === "DOCUMENT" ? (
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 0.75, borderRadius: 1.5, bgcolor: "rgba(255,255,255,.6)", mb: 0.75 }}>
                        {HeaderMediaIcon}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography fontSize={12} fontWeight={900} noWrap>
                            {sampleFilename || "Document.pdf"}
                          </Typography>
                          <Typography fontSize={11} color="text.secondary">
                            {mediaType}
                          </Typography>
                        </Box>
                        <Box sx={{ width: 26, height: 26, borderRadius: 999, bgcolor: "#fff", display: "grid", placeItems: "center", border: "1px solid rgba(0,0,0,.12)" }}>
                          <DownloadRoundedIcon sx={{ fontSize: 18 }} />
                        </Box>
                      </Stack>
                    ) : (
                      <Box sx={{ borderRadius: 1.5, bgcolor: "rgba(255,255,255,.6)", mb: 0.75, overflow: "hidden", border: "1px solid rgba(0,0,0,.06)" }}>
                        <Box sx={{ height: 120, display: "grid", placeItems: "center", bgcolor: "rgba(0,0,0,.06)", position: "relative" }}>
                          {mediaType === "VIDEO" ? (
                            <Box sx={{ width: 44, height: 44, borderRadius: 999, bgcolor: "rgba(0,0,0,.35)", display: "grid", placeItems: "center" }}>
                              <PlayArrowRoundedIcon sx={{ color: "#fff", fontSize: 28 }} />
                            </Box>
                          ) : (
                            <ImageIcon sx={{ color: "rgba(0,0,0,.45)" }} />
                          )}
                        </Box>
                        <Box sx={{ px: 1, py: 0.75, display: "flex", gap: 1, alignItems: "center" }}>
                          {HeaderMediaIcon}
                          <Typography fontSize={12} fontWeight={900} noWrap sx={{ flex: 1 }}>
                            {sampleFilename || (mediaType === "VIDEO" ? "Video" : "Image")}
                          </Typography>
                        </Box>
                      </Box>
                    )
                  ) : null}

                  {headerType === "TEXT" && previewHeaderText ? (
                    <Typography fontSize={12} fontWeight={900} sx={{ mb: 0.5 }}>
                      {previewHeaderText}
                    </Typography>
                  ) : null}

                  <Typography fontSize={13} sx={{ whiteSpace: "pre-wrap" }}>
                    {previewBody || " "}
                  </Typography>

                  {footer.trim() ? (
                    <Typography fontSize={11} color="text.secondary" sx={{ mt: 0.75, whiteSpace: "pre-wrap" }}>
                      {footer.trim()}
                    </Typography>
                  ) : null}

                  <Stack direction="row" justifyContent="flex-end" sx={{ mt: 0.6 }}>
                    <Typography fontSize={10} color="text.secondary">
                      {fmtTime(Date.now())}
                    </Typography>
                  </Stack>
                </Box>
              </Box>

              <Box sx={{ height: 56, bgcolor: "#f0f2f5", borderTop: "1px solid rgba(0,0,0,.08)", display: "flex", alignItems: "center", px: 1, gap: 1 }}>
                <Box sx={{ flex: 1, height: 36, borderRadius: 999, bgcolor: "#fff", border: "1px solid rgba(0,0,0,.08)" }} />
                <Box sx={{ width: 36, height: 36, borderRadius: 999, bgcolor: ACCENT, color: "#fff", display: "grid", placeItems: "center", fontWeight: 900 }}>
                  ➤
                </Box>
              </Box>
            </Box>
          </Box>
        </Grid>
      </Grid>

      <Dialog open={Boolean(sampleOpen)} onClose={() => setSampleOpen(false)} fullWidth maxWidth="md">
        <Box sx={{ bgcolor: ACCENT, color: "#fff", px: 2, py: 1.25, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography fontWeight={900}>Add Sample Content</Typography>
          <IconButton onClick={() => setSampleOpen(false)} sx={{ color: "#fff" }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <DialogContent dividers sx={{ bgcolor: "#fff" }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <Typography fontSize={12} color="text.secondary" sx={{ mb: 2 }}>
                Provide sample content examples. Do not include real customer information.
              </Typography>

              <Typography fontWeight={900} fontSize={13} sx={{ mb: 1 }}>
                Header
              </Typography>

              {headerType === "NONE" ? (
                <Typography fontSize={12} color="text.secondary" sx={{ mb: 2 }}>
                  Header is set to “None”.
                </Typography>
              ) : null}

              {headerType === "TEXT" ? (
                <Stack spacing={1.25} sx={{ mb: 2 }}>
                  <Typography fontSize={12} color="text.secondary">
                    Sample header text (optional)
                  </Typography>
                  <TextField
                    size="small"
                    value={sampleHeaderText}
                    onChange={(e) => setSampleHeaderText(e.target.value.slice(0, 60))}
                    placeholder="Sample header"
                  />
                </Stack>
              ) : null}

              {headerType === "MEDIA" ? (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <Button
                    variant="outlined"
                    component="label"
                    sx={{ borderColor: "#cfeeed", color: ACCENT, fontWeight: 900, borderRadius: 999, textTransform: "none" }}
                  >
                    {mediaType === "DOCUMENT" ? "Choose PDF file" : mediaType === "VIDEO" ? "Choose video" : "Choose image"}
                    <input
                      hidden
                      type="file"
                      accept={mediaType === "DOCUMENT" ? "application/pdf" : mediaType === "VIDEO" ? "video/*" : "image/*"}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        setSampleFilename(f.name || "");
                      }}
                    />
                  </Button>

                  <Typography fontSize={12} color="text.secondary" noWrap>
                    {sampleFilename ? sampleFilename : "No file chosen"}
                  </Typography>
                </Stack>
              ) : null}

              <Typography fontWeight={900} fontSize={13} sx={{ mb: 1 }}>
                Body
              </Typography>

              <Stack spacing={1}>
                {bodyVars.length === 0 ? (
                  <Typography fontSize={12} color="text.secondary">
                    No variables detected.
                  </Typography>
                ) : (
                  bodyVars.map((n) => {
                    const k = String(n);
                    return (
                      <Stack key={k} direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={`{{${n}}}`}
                          size="small"
                          sx={{ bgcolor: "#eef7f6", color: ACCENT, fontWeight: 900, borderRadius: 1, minWidth: 56 }}
                        />
                        <TextField
                          fullWidth
                          size="small"
                          value={sampleVars[k] ?? ""}
                          onChange={(e) => setSampleVars((m) => ({ ...m, [k]: e.target.value }))}
                          placeholder="Enter sample content"
                        />
                      </Stack>
                    );
                  })
                )}
              </Stack>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{ border: "1px solid #e6e6e6", borderRadius: 2, p: 2, bgcolor: "#fbfbfb" }}>
                <Typography fontWeight={900} fontSize={13} sx={{ mb: 1 }}>
                  Preview
                </Typography>

                <Box sx={{ border: "1px solid #e6e6e6", borderRadius: 2, bgcolor: "#f0f2f5", p: 1.25 }}>
                  <Box sx={{ maxWidth: "100%", ml: "auto", bgcolor: "#dcf8c6", borderRadius: 2, p: 1 }}>
                    <Typography fontSize={12} sx={{ whiteSpace: "pre-wrap" }}>
                      {replaceVarsForPreview(body, sampleVars) || " "}
                    </Typography>
                    <Stack direction="row" justifyContent="flex-end" sx={{ mt: 0.75 }}>
                      <Typography fontSize={10} color="text.secondary">
                        {fmtTime(Date.now())}
                      </Typography>
                    </Stack> 
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>

        <Box sx={{ p: 2, display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <Button onClick={() => setSampleOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => setSampleOpen(false)}
            sx={{ bgcolor: ACCENT, "&:hover": { bgcolor: "#078a82" }, borderRadius: 999, px: 2.5, fontWeight: 900 }}
          >
            Done
          </Button>
        </Box>
      </Dialog>
    </Box>
  );
}