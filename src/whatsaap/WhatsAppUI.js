import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Stack,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Paper,
  CircularProgress,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Chip,
  Autocomplete,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";

const API_BASE = "http://localhost:5001";

function digitsOnly(v = "") {
  return String(v || "").replace(/\D/g, "");
}

function phoneLabel(v = "") {
  const p = digitsOnly(v);
  return p.length >= 10 ? p.slice(-10) : p;
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg = data?.message || `Request failed: ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatLastActive(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function statusChipProps(statusRaw) {
  const s = String(statusRaw || "").toUpperCase();
  if (s.includes("APPROV")) return { label: "APPROVED", sx: { bgcolor: "#e7fbf2", color: "#1b7f4b" } };
  if (s.includes("REJECT")) return { label: "REJECTED", sx: { bgcolor: "#ffeceb", color: "#b42318" } };
  if (s.includes("PEND") || s.includes("SUBMIT") || s.includes("REVIEW"))
    return { label: "PENDING", sx: { bgcolor: "#fff3dc", color: "#a15c07" } };
  return { label: s || "UNKNOWN", sx: { bgcolor: "#f4f6f8", color: "#344054" } };
}

function pickBodyTextFromTemplate(tpl) {
  if (!tpl) return "";
  if (tpl.body) return String(tpl.body || "");
  const comps =
    (Array.isArray(tpl.components) && tpl.components) ||
    (Array.isArray(tpl.raw360?.components) && tpl.raw360.components) ||
    (Array.isArray(tpl.raw360?.template?.components) && tpl.raw360.template.components) ||
    [];
  const body = comps.find((c) => String(c?.type || "").toUpperCase() === "BODY");
  return String(body?.text || "");
}

function extractVarIndexes(bodyText = "") {
  const text = String(bodyText || "");
  const set = new Set();
  for (const m of text.matchAll(/{{\s*(\d+)\s*}}/g)) {
    const n = Number(m[1] || 0);
    if (n > 0) set.add(n);
  }
  return Array.from(set).sort((a, b) => a - b);
}

function applyVarsToBody(bodyText = "", varsMap = {}) {
  let out = String(bodyText || "");
  for (const [k, v] of Object.entries(varsMap)) {
    const idx = Number(k);
    if (!idx) continue;
    const safe = String(v ?? "");
    out = out.replace(new RegExp(`{{\\s*${idx}\\s*}}`, "g"), safe || `{{${idx}}}`);
  }
  return out;
}

export default function WhatsAppUI() {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [search, setSearch] = useState("");
  const [errorChats, setErrorChats] = useState("");
  const [errorMessages, setErrorMessages] = useState("");

  // templates
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // New chat dialog
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [creatingChat, setCreatingChat] = useState(false);
  const [newChatError, setNewChatError] = useState("");

  // variables UI state: { "1": "value", "2": "value" }
  const [tplVars, setTplVars] = useState({});

  const bottomRef = useRef(null);

  const filteredConversations = useMemo(() => {
    const s = phoneLabel(search);
    if (!s) return conversations;
    return conversations.filter((c) => phoneLabel(c.phone).includes(s));
  }, [conversations, search]);

  const canShowQuickChat = useMemo(() => phoneLabel(search).length === 10, [search]);

  const refreshConversations = async (selectPhone = null) => {
    setErrorChats("");
    setLoadingChats(true);
    try {
      const data = (await api(`/api/whatsapp/conversations`)) || [];
      setConversations(Array.isArray(data) ? data : []);
      if (selectPhone) {
        setActiveChat({ phone: selectPhone });
      } else if (!activeChat?.phone && Array.isArray(data) && data.length) {
        setActiveChat({ phone: digitsOnly(data[0].phone) });
      }
    } catch (e) {
      setErrorChats(e.message || "Failed to load conversations");
      setConversations([]);
    } finally {
      setLoadingChats(false);
    }
  };

  const refreshMessages = async (phoneAnyDigits) => {
    const q = digitsOnly(phoneAnyDigits);
    if (!q) return;
    setErrorMessages("");
    setLoadingMessages(true);
    try {
      const data = (await api(`/api/whatsapp/messages?phone=${encodeURIComponent(q)}`)) || [];
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      setErrorMessages(e.message || "Failed to load messages");
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const data = await api(`/api/whatsapp/templates`); // this should map to whatsappTemplates.routes.js (GET "/")
      setTemplates(Array.isArray(data) ? data : data?.templates || []);
    } catch (e) {
      console.error("Fetch templates failed:", e);
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  useEffect(() => {
    refreshConversations();
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const p = digitsOnly(activeChat?.phone);
    if (!p) return;
    refreshMessages(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChat?.phone]);

  useEffect(() => {
    const p = digitsOnly(activeChat?.phone);
    if (!p) return;

    const id = setInterval(() => {
      refreshMessages(p);
      // optional: refresh conversations every 10s
      // refreshConversations();
    }, 3000);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChat?.phone]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openChat = (phone) => {
    const p = digitsOnly(phone);
    if (!p) return;
    setActiveChat({ phone: p });
    setSearch("");
  };

  const sendText = async () => {
    const to = digitsOnly(activeChat?.phone);
    const text = input.trim();
    if (!to || !text) return;

    const optimistic = {
      _id: `tmp_${Date.now()}`,
      direction: "OUTBOUND",
      text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");

    try {
      await api(`/api/whatsapp/send-text`, {
        method: "POST",
        body: JSON.stringify({ to, text }),
      });

      await refreshMessages(to);
      await refreshConversations(to);
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m._id !== optimistic._id));
      setInput(text);
      setErrorMessages(e.message || "Send failed");
    }
  };

  const templateOptions = useMemo(() => {
    const list = Array.isArray(templates) ? templates : [];
    return list.sort((a, b) => {
      const as = String(a?.status || "").toUpperCase();
      const bs = String(b?.status || "").toUpperCase();
      const aApproved = as.includes("APPROV") ? 1 : 0;
      const bApproved = bs.includes("APPROV") ? 1 : 0;
      if (aApproved !== bApproved) return bApproved - aApproved;
      return String(a?.name || "").localeCompare(String(b?.name || ""));
    });
  }, [templates]);

  // When template changes -> build vars
  useEffect(() => {
    const body = pickBodyTextFromTemplate(selectedTemplate);
    const idxs = extractVarIndexes(body);
    const next = {};
    idxs.forEach((i) => (next[String(i)] = ""));
    setTplVars(next);
  }, [selectedTemplate]);

  const previewBody = useMemo(() => {
    const body = pickBodyTextFromTemplate(selectedTemplate);
    return applyVarsToBody(body, tplVars);
  }, [selectedTemplate, tplVars]);

  const startNewChatWithTemplate = async () => {
    const to = digitsOnly(newChatPhone);
    const templateName = String(selectedTemplate?.name || "").trim();
    const body = pickBodyTextFromTemplate(selectedTemplate);
    const idxs = extractVarIndexes(body);

    if (!to) return setNewChatError("Enter phone (10 digits or 91xxxxxxxxxx).");
    if (!templateName) return setNewChatError("Select a template.");
    if (!body) return setNewChatError("Template body missing in DB. Run templates sync.");

    // Build parameters in order 1..max
    const maxIdx = idxs.length ? Math.max(...idxs) : 0;
    const params = [];
    for (let i = 1; i <= maxIdx; i++) {
      params.push(String(tplVars[String(i)] || "").trim());
    }

    // require all vars filled
    if (maxIdx > 0 && params.some((x) => !x)) {
      return setNewChatError("Please fill all template variables before sending.");
    }

    setNewChatError("");
    setCreatingChat(true);

    try {
      await api(`/api/whatsapp/send-template`, {
        method: "POST",
        body: JSON.stringify({
          to,
          templateName,
          language: "en",
          parameters: params,
        }),
      });

      setNewChatOpen(false);
      setNewChatPhone("");
      setSelectedTemplate(null);
      setTplVars({});

      await refreshConversations(to);
      await refreshMessages(to);
      setActiveChat({ phone: to });
    } catch (e) {
      // show server/provider debug if available
      const provider = e?.data?.providerError;
      setNewChatError(
        provider
          ? `${e.message} | Provider: ${JSON.stringify(provider)}`
          : e.message || "Failed to start chat"
      );
    } finally {
      setCreatingChat(false);
    }
  };

  return (
    <Box height="100vh" display="flex" bgcolor="#ece5dd">
      {/* LEFT SIDEBAR */}
      <Box width={360} bgcolor="#fff" display="flex" flexDirection="column" borderRight="1px solid #ddd">
        <Box px={2} py={1.5} display="flex" alignItems="center" justifyContent="space-between">
          <Typography fontWeight={700} fontSize={18}>
            WhatsApp
          </Typography>

          <Stack direction="row" spacing={1}>
            <IconButton size="small" onClick={() => setNewChatOpen(true)} title="New chat">
              <AddIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => {
                refreshConversations();
                fetchTemplates();
              }}
              title="Refresh"
              disabled={loadingChats}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>

        <Box px={2} pb={1}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search / type phone to open chat"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Divider />

        <Box flex={1} overflow="auto">
          {loadingChats ? (
            <Stack alignItems="center" mt={4}>
              <CircularProgress size={24} />
            </Stack>
          ) : errorChats ? (
            <Box px={2} py={2}>
              <Typography color="error" fontSize={13}>
                {errorChats}
              </Typography>
            </Box>
          ) : (
            <>
              {canShowQuickChat && (
                <Box
                  px={2}
                  py={1.25}
                  onClick={() => openChat(digitsOnly(search))}
                  sx={{
                    cursor: "pointer",
                    bgcolor:
                      phoneLabel(activeChat?.phone) === phoneLabel(search) ? "#f0f2f5" : "transparent",
                    "&:hover": { bgcolor: "#f5f5f5" },
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar>{phoneLabel(search).slice(-2)}</Avatar>
                    <Box flex={1}>
                      <Typography fontSize={14} fontWeight={600}>
                        Chat with {phoneLabel(search)}
                      </Typography>
                      <Typography fontSize={12} color="text.secondary">
                        Open chat
                      </Typography>
                    </Box>
                    <Chip size="small" label="Open" />
                  </Stack>
                </Box>
              )}

              {filteredConversations.map((chat) => {
                const isActive = phoneLabel(activeChat?.phone) === phoneLabel(chat.phone);
                return (
                  <Box
                    key={chat._id || chat.phone}
                    px={2}
                    py={1.25}
                    onClick={() => openChat(chat.phone)}
                    sx={{
                      cursor: "pointer",
                      bgcolor: isActive ? "#f0f2f5" : "transparent",
                      "&:hover": { bgcolor: "#f5f5f5" },
                    }}
                  >
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar>{phoneLabel(chat.phone).slice(-2)}</Avatar>
                      <Box>
                        <Typography fontSize={14} fontWeight={600}>
                          {phoneLabel(chat.phone)}
                        </Typography>
                        <Typography fontSize={12} color="text.secondary">
                          Last active: {formatLastActive(chat.lastMessageAt)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                );
              })}

              {!filteredConversations.length && !canShowQuickChat && (
                <Box px={2} py={2}>
                  <Typography fontSize={13} color="text.secondary">
                    No conversations found. (Webhook must receive messages to create chats.)
                  </Typography>
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* CHAT WINDOW */}
      <Box flex={1} display="flex" flexDirection="column">
        <Box px={2} py={1.5} bgcolor="#f0f2f5" borderBottom="1px solid #ddd">
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar>{phoneLabel(activeChat?.phone).slice(-2) || "—"}</Avatar>
              <Typography fontWeight={700}>{phoneLabel(activeChat?.phone) || "Select a chat"}</Typography>
            </Stack>

            <Button size="small" variant="outlined" onClick={() => setNewChatOpen(true)} startIcon={<AddIcon />}>
              New Chat
            </Button>
          </Stack>
        </Box>

        <Box
          flex={1}
          p={2}
          overflow="auto"
          sx={{ backgroundImage: "url('https://web.whatsapp.com/img/bg-chat-tile-light.png')" }}
        >
          {!activeChat?.phone ? (
            <Stack alignItems="center" justifyContent="center" height="100%">
              <Typography color="text.secondary">Select a chat from left</Typography>
            </Stack>
          ) : loadingMessages ? (
            <Stack alignItems="center" mt={4}>
              <CircularProgress size={24} />
            </Stack>
          ) : errorMessages ? (
            <Box px={1} py={1}>
              <Typography color="error" fontSize={13}>
                {errorMessages}
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1}>
              {messages.map((msg) => {
                const isOutbound = msg.direction === "OUTBOUND";
                return (
                  <Box key={msg._id} alignSelf={isOutbound ? "flex-end" : "flex-start"}>
                    <Paper
                      elevation={0}
                      sx={{
                        px: 1.5,
                        py: 1,
                        maxWidth: 520,
                        bgcolor: isOutbound ? "#dcf8c6" : "#fff",
                        border: "1px solid rgba(0,0,0,0.06)",
                      }}
                    >
                      <Typography fontSize={14} whiteSpace="pre-wrap">
                        {msg.text || ""}
                      </Typography>
                      <Typography fontSize={10} textAlign="right" color="text.secondary">
                        {formatTime(msg.timestamp)}
                      </Typography>
                    </Paper>
                  </Box>
                );
              })}
              <div ref={bottomRef} />
            </Stack>
          )}
        </Box>

        <Box p={1.5} bgcolor="#f0f2f5">
          <Stack direction="row" spacing={1}>
            <TextField
              fullWidth
              size="small"
              placeholder="Type a message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendText()}
              disabled={!activeChat?.phone}
            />
            <IconButton color="primary" onClick={sendText} disabled={!activeChat?.phone || !input.trim()}>
              <SendIcon />
            </IconButton>
          </Stack>
        </Box>
      </Box>

      {/* New Chat Dialog (Screenshot-style) */}
      <Dialog
        open={newChatOpen}
        onClose={() => (creatingChat ? null : setNewChatOpen(false))}
        maxWidth="md"
        fullWidth
        onEntered={() => fetchTemplates()}
      >
        <DialogTitle>Start New Chat (Template)</DialogTitle>

        <DialogContent>
          <Stack spacing={2} pt={1}>
            {newChatError ? (
              <Typography color="error" fontSize={13}>
                {newChatError}
              </Typography>
            ) : null}

            <TextField
              label="Phone (10 digits or 91xxxxxxxxxx)"
              size="small"
              value={newChatPhone}
              onChange={(e) => setNewChatPhone(e.target.value)}
              placeholder="e.g. 9694638351 or 919694638351"
              inputProps={{ inputMode: "numeric" }}
              disabled={creatingChat}
            />

            <Autocomplete
              loading={loadingTemplates}
              options={templateOptions}
              value={selectedTemplate}
              onChange={(e, val) => setSelectedTemplate(val)}
              getOptionLabel={(opt) => String(opt?.name || "")}
              isOptionEqualToValue={(a, b) => String(a?.name) === String(b?.name)}
              renderOption={(props, opt) => {
                const st = statusChipProps(opt?.status);
                return (
                  <li {...props} key={opt?._id || opt?.name}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
                      <Typography sx={{ flex: 1 }} fontWeight={700} noWrap>
                        {opt?.name}
                      </Typography>
                      <Chip size="small" label={st.label} sx={st.sx} />
                    </Stack>
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField {...params} label="Search Template" size="small" placeholder="Search Template" />
              )}
              disabled={creatingChat}
            />

            {/* Preview + Inputs */}
            <Box display="flex" gap={3} mt={1}>
              {/* LEFT: preview bubble */}
              <Box flex={1} minWidth={280}>
                <Typography fontWeight={700} mb={1}>
                  Template Body (Preview)
                </Typography>

                <Box
                  sx={{
                    bgcolor: "#e7f6f2",
                    borderRadius: 2,
                    p: 2,
                    border: "1px solid rgba(0,0,0,0.08)",
                    maxWidth: 360,
                  }}
                >
                  <Typography fontSize={14} whiteSpace="pre-wrap">
                    {previewBody || "Select a template to preview"}
                  </Typography>
                </Box>

                {!pickBodyTextFromTemplate(selectedTemplate) && selectedTemplate ? (
                  <Typography mt={1} fontSize={12} color="error">
                    Body text not available in DB for this template. Fix sync to store BODY text.
                  </Typography>
                ) : null}
              </Box>

              {/* RIGHT: variable inputs */}
              <Box flex={1} minWidth={320}>
                <Typography fontWeight={700} mb={1}>
                  Input Variables
                </Typography>

                {selectedTemplate ? (
                  (() => {
                    const body = pickBodyTextFromTemplate(selectedTemplate);
                    const idxs = extractVarIndexes(body);

                    if (!body) {
                      return (
                        <Typography fontSize={13} color="text.secondary">
                          No body found for this template.
                        </Typography>
                      );
                    }

                    if (!idxs.length) {
                      return (
                        <Typography fontSize={13} color="text.secondary">
                          No input variables detected in body.
                        </Typography>
                      );
                    }

                    return (
                      <Stack spacing={1.5}>
                        <Typography fontSize={12} color="text.secondary">
                          Body
                        </Typography>
                        {idxs.map((i) => (
                          <TextField
                            key={i}
                            size="small"
                            placeholder="Enter Variable"
                            value={tplVars[String(i)] || ""}
                            onChange={(e) =>
                              setTplVars((prev) => ({ ...prev, [String(i)]: e.target.value }))
                            }
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">{`{{${i}}}`}</InputAdornment>
                              ),
                            }}
                            disabled={creatingChat}
                          />
                        ))}
                      </Stack>
                    );
                  })()
                ) : (
                  <Typography fontSize={13} color="text.secondary">
                    Select a template to see variables.
                  </Typography>
                )}
              </Box>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setNewChatOpen(false)} disabled={creatingChat}>
            Cancel
          </Button>
          <Button variant="contained" onClick={startNewChatWithTemplate} disabled={creatingChat}>
            {creatingChat ? "Sending..." : "Send"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
