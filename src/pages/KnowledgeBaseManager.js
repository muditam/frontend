import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./KnowledgeBaseManager.css";


const DEFAULT_API_BASE = (process.env.REACT_APP_API_BASE_URL || "http://localhost:5001").replace(/\/+$/, "");

const API_BASE = String(process.env.REACT_APP_API_BASE || DEFAULT_API_BASE).replace(/\/+$/, "");


const DOCUMENT_CATEGORY_OPTIONS = [
 { value: "product_information", label: "Product Information" },
 { value: "company_information", label: "Company Information" },
 { value: "offers", label: "Offers" },
 { value: "support", label: "Support" },
 { value: "general", label: "General" },
];


const ALL_CHANNELS = [
 "whatsapp_write_reply",
 "whatsapp_voice_call",
 "app_voice_call",
];


const INTENT_OPTIONS = ["sales", "support", "complaint", "order", "refund"];
const STAGE_OPTIONS = ["new_user", "existing_customer"];
const PRIORITY_OPTIONS = ["high", "medium", "low"];
const NEXT_ACTION_OPTIONS = ["none", "collect_lead", "suggest_product", "handoff"];


function safeStr(v) {
 return String(v ?? "").trim();
}


function normalizeLite(v) {
 return String(v || "")
   .toLowerCase()
   .replace(/[^a-z0-9\s]/g, " ")
   .replace(/\s+/g, " ")
   .trim();
}


function asList(value) {
 if (!value) return [];
 if (Array.isArray(value)) return value.map((v) => safeStr(v)).filter(Boolean);
 return String(value)
   .split(/\r?\n|,/g)
   .map((v) => safeStr(v))
   .filter(Boolean);
}


function formatDateTime(value) {
 if (!value) return "-";
 const dt = new Date(value);
 if (Number.isNaN(dt.getTime())) return "-";
 return dt.toLocaleString();
}


function formatMoneyUsd(value) {
 const amount = Number(value);
 const safeAmount = Number.isFinite(amount) ? amount : 0;
 return new Intl.NumberFormat("en-US", {
   style: "currency",
   currency: "USD",
   minimumFractionDigits: 2,
   maximumFractionDigits: 4,
 }).format(safeAmount);
}


function formatCompactNumber(value) {
 const num = Number(value);
 const safeNum = Number.isFinite(num) ? num : 0;
 return new Intl.NumberFormat("en-US", { notation: "compact" }).format(safeNum);
}


function statusTone(status) {
 const s = safeStr(status).toLowerCase();
 if (s === "active" || s === "answered" || s === "success") return "success";
 if (s === "open" || s === "failed") return "warn";
 return "neutral";
}


function parsePayloadObject(value) {
 if (!safeStr(value)) return {};
 try {
   const parsed = JSON.parse(value);
   return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
 } catch {
   return {};
 }
}


function getSessionUserHeader() {
 try {
   const raw = sessionStorage.getItem("user");
   if (!raw) return "";
   const parsed = JSON.parse(raw);
   if (!parsed || typeof parsed !== "object") return "";
   if (!(parsed.id || parsed.email || parsed.fullName || parsed.name)) return "";
   return JSON.stringify(parsed);
 } catch {
   return "";
 }
}


async function api(path, options = {}) {
 const sessionUserHeader = getSessionUserHeader();
 const response = await fetch(`${API_BASE}${path}`, {
   credentials: "include",
   cache: "no-store",
   ...options,
   headers: {
     "Content-Type": "application/json",
     ...(sessionUserHeader ? { "x-session-user": sessionUserHeader } : {}),
     ...(options.headers || {}),
   },
 });


 const text = await response.text();
 let data = null;


 try {
   data = text ? JSON.parse(text) : null;
 } catch {
   data = null;
 }


 if (!response.ok) {
   const err = new Error(data?.message || `Request failed: ${response.status}`);
   err.status = response.status;
   err.data = data;
   throw err;
 }


 return data;
}


async function apiForm(path, formData) {
 const sessionUserHeader = getSessionUserHeader();
 const response = await fetch(`${API_BASE}${path}`, {
   credentials: "include",
   cache: "no-store",
   method: "POST",
   body: formData,
   headers: {
     ...(sessionUserHeader ? { "x-session-user": sessionUserHeader } : {}),
   },
 });


 const text = await response.text();
 let data = null;


 try {
   data = text ? JSON.parse(text) : null;
 } catch {
   data = null;
 }


 if (!response.ok) {
   const err = new Error(data?.message || `Request failed: ${response.status}`);
   err.status = response.status;
   err.data = data;
   throw err;
 }


 return data;
}


function emptyDocumentForm() {
 return {
   title: "",
   category: "product_information",
   domain: "sales",
   tags: "",
   status: "active",
   file: null,
 };
}


function Toast({ toast, onClose }) {
 if (!toast.open) return null;
 return (
   <div className={`kb-toast kb-toast--${toast.severity}`} role="status" aria-live="polite">
     <span>{toast.message}</span>
     <button type="button" className="kb-link-btn" onClick={onClose}>
       Dismiss
     </button>
   </div>
 );
}


function Modal({ open, title, children, onClose, actions }) {
 if (!open) return null;
 return (
   <div className="kb-modal-overlay" onClick={onClose}>
     <div className="kb-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
       <div className="kb-modal-head">
         <h3>{title}</h3>
         <button type="button" className="kb-icon-btn" onClick={onClose}>
           x
         </button>
       </div>
       <div className="kb-modal-body">{children}</div>
       <div className="kb-modal-actions">{actions}</div>
     </div>
   </div>
 );
}


export default function KnowledgeBaseManager() {
 const [tab, setTab] = useState("prompt");
 const [promptLoading, setPromptLoading] = useState(false);
 const [promptSaving, setPromptSaving] = useState(false);
 const [promptActionLoadingId, setPromptActionLoadingId] = useState("");
 const [promptDraftText, setPromptDraftText] = useState("");
 const [promptName, setPromptName] = useState("");
 const [promptList, setPromptList] = useState([]);
 const [activePromptId, setActivePromptId] = useState("");
 const [createPromptOpen, setCreatePromptOpen] = useState(false);
 const [viewPromptOpen, setViewPromptOpen] = useState(false);
 const [viewPromptItem, setViewPromptItem] = useState(null);
 const [viewPromptEditMode, setViewPromptEditMode] = useState(false);
 const [viewPromptName, setViewPromptName] = useState("");
 const [viewPromptText, setViewPromptText] = useState("");
 const [viewPromptSaving, setViewPromptSaving] = useState(false);
 const [promptUpdatedAt, setPromptUpdatedAt] = useState("");
 const [promptUpdatedBy, setPromptUpdatedBy] = useState({ name: "", email: "" });


 const [gaps, setGaps] = useState([]);
 const [documents, setDocuments] = useState([]);


 const [gapsLoading, setGapsLoading] = useState(false);
 const [documentsLoading, setDocumentsLoading] = useState(false);


 const [gapQuery, setGapQuery] = useState("");
 const [gapStatus, setGapStatus] = useState("open");


 const [documentQuery, setDocumentQuery] = useState("");
 const [documentStatus, setDocumentStatus] = useState("all");
 const [documentCategory, setDocumentCategory] = useState("all");


 const [documentModalOpen, setDocumentModalOpen] = useState(false);
 const [documentUploading, setDocumentUploading] = useState(false);
 const [documentForm, setDocumentForm] = useState(emptyDocumentForm());
 const [documentActionLoadingId, setDocumentActionLoadingId] = useState("");


 const [gapDraftAnswers, setGapDraftAnswers] = useState({});
 const [gapIntent, setGapIntent] = useState("support");
 const [gapStage, setGapStage] = useState("new_user");
 const [gapPriority, setGapPriority] = useState("medium");
 const [gapNextActionType, setGapNextActionType] = useState("none");
 const [gapNextActionPayload, setGapNextActionPayload] = useState("{}");
 const [gapSubmittingId, setGapSubmittingId] = useState("");


 const [askQuestion, setAskQuestion] = useState("");
 const [askLoading, setAskLoading] = useState(false);
 const [askResult, setAskResult] = useState(null);
 const [askImproving, setAskImproving] = useState(false);
 const [askDraftAnswer, setAskDraftAnswer] = useState("");
 const [askSaving, setAskSaving] = useState(false);
 const [askIntent, setAskIntent] = useState("support");
 const [askStage, setAskStage] = useState("new_user");
 const [askPriority, setAskPriority] = useState("medium");
 const [askNextActionType, setAskNextActionType] = useState("none");
 const [askNextActionPayload, setAskNextActionPayload] = useState("{}");
 const [duplicateWarning, setDuplicateWarning] = useState(null);
 const [leadName, setLeadName] = useState("");
 const [leadPhone, setLeadPhone] = useState("");
 const [leadSaving, setLeadSaving] = useState(false);
 const [lastAskedQuestion, setLastAskedQuestion] = useState("");
 const [aiCredits, setAiCredits] = useState(null);
 const [aiCreditsLoading, setAiCreditsLoading] = useState(false);
 const [aiCreditsError, setAiCreditsError] = useState("");
 const [toast, setToast] = useState({ open: false, severity: "success", message: "" });


 const showToast = useCallback((message, severity = "success") => {
   const normalized = severity === "warning" ? "warn" : severity;
   setToast({ open: true, severity: normalized, message });
 }, []);


 const closeToast = useCallback(() => {
   setToast((prev) => ({ ...prev, open: false }));
 }, []);


 const fetchPromptSettings = useCallback(async () => {
   setPromptLoading(true);
   try {
     const result = await api("/api/whatsapp/ai-prompt-settings");
     const settings = result?.settings || {};
     const prompts = Array.isArray(settings?.prompts) ? settings.prompts : [];
     const resolvedActivePromptId =
       safeStr(settings?.activeVersionId) ||
       safeStr(prompts.find((p) => p?.isActive)?.id);


     setPromptList(prompts);
     setActivePromptId(resolvedActivePromptId);
     setPromptUpdatedAt(safeStr(settings?.updatedAt));
     setPromptUpdatedBy({
       name: safeStr(settings?.updatedBy?.name),
       email: safeStr(settings?.updatedBy?.email),
     });
   } catch (e) {
     showToast(e.message || "Failed to fetch AI prompt settings", "error");
   } finally {
     setPromptLoading(false);
   }
 }, [showToast]);


 const createPrompt = async () => {
   const name = safeStr(promptName);
   const text = safeStr(promptDraftText);
   if (!name) {
     showToast("Prompt name is required", "error");
     return;
   }
   if (!text) {
     showToast("Prompt cannot be empty", "error");
     return;
   }


   setPromptSaving(true);
   try {
     await api("/api/whatsapp/ai-prompt-settings/prompts", {
       method: "POST",
       body: JSON.stringify({
         name,
         helpMeWriteInstructions: text,
         activate: false,
       }),
     });
     setPromptName("");
     setPromptDraftText("");
     setCreatePromptOpen(false);
     await fetchPromptSettings();
     showToast("New prompt created", "success");
   } catch (e) {
     showToast(e.message || "Failed to create prompt", "error");
   } finally {
     setPromptSaving(false);
   }
 };


 const activatePrompt = async (promptId) => {
   const id = safeStr(promptId);
   if (!id) return;
   if (id === safeStr(activePromptId)) return;
   setPromptActionLoadingId(`activate:${id}`);
   try {
     await api(`/api/whatsapp/ai-prompt-settings/prompts/${id}/activate`, {
       method: "POST",
     });
     await fetchPromptSettings();
     showToast("Prompt marked active", "success");
   } catch (e) {
     showToast(e.message || "Failed to activate prompt", "error");
   } finally {
     setPromptActionLoadingId("");
   }
 };


 const copyPrompt = async (promptId) => {
   const id = safeStr(promptId);
   if (!id) return;
   setPromptActionLoadingId(`copy:${id}`);
   try {
     const result = await api(`/api/whatsapp/ai-prompt-settings/prompts/${id}/copy`, {
       method: "POST",
     });
     await fetchPromptSettings();
     showToast("Prompt copied", "success");
   } catch (e) {
     showToast(e.message || "Failed to copy prompt", "error");
   } finally {
     setPromptActionLoadingId("");
   }
 };


 const openViewPrompt = useCallback((prompt) => {
   setViewPromptItem(prompt || null);
   setViewPromptName(safeStr(prompt?.name));
   setViewPromptText(safeStr(prompt?.helpMeWriteInstructions));
   setViewPromptEditMode(false);
   setViewPromptOpen(true);
 }, []);


 const closeViewPrompt = useCallback(() => {
   if (viewPromptSaving) return;
   setViewPromptOpen(false);
   setViewPromptEditMode(false);
   setViewPromptItem(null);
   setViewPromptName("");
   setViewPromptText("");
 }, [viewPromptSaving]);


 const saveViewedPrompt = async () => {
   const id = safeStr(viewPromptItem?.id);
   const name = safeStr(viewPromptName);
   const text = safeStr(viewPromptText);
   if (!id) return;
   if (!name) {
     showToast("Prompt name is required", "error");
     return;
   }
   if (!text) {
     showToast("Prompt text is required", "error");
     return;
   }


   setViewPromptSaving(true);
   try {
     const result = await api(`/api/whatsapp/ai-prompt-settings/prompts/${id}`, {
       method: "PATCH",
       body: JSON.stringify({
         name,
         helpMeWriteInstructions: text,
       }),
     });
     const updatedPrompt = result?.prompt || null;
     setViewPromptItem(updatedPrompt);
     setViewPromptName(safeStr(updatedPrompt?.name || name));
     setViewPromptText(safeStr(updatedPrompt?.helpMeWriteInstructions || text));
     setViewPromptEditMode(false);
     await fetchPromptSettings();
     showToast("Prompt updated", "success");
   } catch (e) {
     showToast(e.message || "Failed to update prompt", "error");
   } finally {
     setViewPromptSaving(false);
   }
 };


 const deletePrompt = async (promptId) => {
   const id = safeStr(promptId);
   if (!id) return;
   if (!window.confirm("Delete this prompt? This action cannot be undone.")) return;
   setPromptActionLoadingId(`delete:${id}`);
   try {
     await api(`/api/whatsapp/ai-prompt-settings/prompts/${id}`, {
       method: "DELETE",
     });
     if (safeStr(viewPromptItem?.id) === id) closeViewPrompt();
     await fetchPromptSettings();
     showToast("Prompt deleted", "success");
   } catch (e) {
     showToast(e.message || "Failed to delete prompt", "error");
   } finally {
     setPromptActionLoadingId("");
   }
 };


 useEffect(() => {
   if (!toast.open) return undefined;
   const timer = setTimeout(closeToast, 3500);
   return () => clearTimeout(timer);
 }, [toast.open, closeToast]);


 const fetchGaps = useCallback(async () => {
   setGapsLoading(true);
   try {
     const params = new URLSearchParams();
     params.set("limit", "200");
     if (gapQuery.trim()) params.set("q", gapQuery.trim());
     if (gapStatus !== "all") params.set("status", gapStatus);


     const result = await api(`/api/knowledge-base/gaps?${params.toString()}`);
     setGaps(Array.isArray(result?.gaps) ? result.gaps : []);
   } catch (e) {
     showToast(e.message || "Failed to fetch unanswered questions", "error");
   } finally {
     setGapsLoading(false);
   }
 }, [gapQuery, gapStatus, showToast]);


 const fetchDocuments = useCallback(async () => {
   setDocumentsLoading(true);
   try {
     const params = new URLSearchParams();
     params.set("limit", "200");
     if (documentQuery.trim()) params.set("q", documentQuery.trim());
     if (documentStatus !== "all") params.set("status", documentStatus);
     if (documentCategory !== "all") params.set("category", documentCategory);


     const result = await api(`/api/knowledge-base/documents?${params.toString()}`);
     setDocuments(Array.isArray(result?.documents) ? result.documents : []);
   } catch (e) {
     showToast(e.message || "Failed to fetch documents", "error");
   } finally {
     setDocumentsLoading(false);
   }
 }, [documentQuery, documentStatus, documentCategory, showToast]);


 const fetchAICredits = useCallback(async () => {
   setAiCreditsLoading(true);
   setAiCreditsError("");
   try {
     const result = await api("/api/knowledge-base/ai-credits");
     setAiCredits(result?.credits || null);
   } catch (e) {
     setAiCredits(null);
     setAiCreditsError(safeStr(e?.message || "Failed to fetch AI credits"));
   } finally {
     setAiCreditsLoading(false);
   }
 }, []);


 const refreshAll = useCallback(async () => {
   await Promise.all([fetchGaps(), fetchDocuments()]);
 }, [fetchGaps, fetchDocuments]);


 useEffect(() => {
   refreshAll();
 }, [refreshAll]);


 useEffect(() => {
   fetchPromptSettings();
 }, [fetchPromptSettings]);


 useEffect(() => {
   if (tab !== "credits") return;
   if (aiCredits || aiCreditsLoading) return;
   fetchAICredits();
 }, [tab, aiCredits, aiCreditsLoading, fetchAICredits]);


 const askKnowledgeBase = async () => {
   const question = safeStr(askQuestion);
   if (!question) {
     showToast("Enter a question first", "error");
     return;
   }


   setAskLoading(true);
   setAskImproving(false);
   setAskDraftAnswer("");
   setDuplicateWarning(null);
   setLeadName("");
   setLeadPhone("");
   try {
     const repeatQuery = normalizeLite(question) && normalizeLite(question) === normalizeLite(lastAskedQuestion);
     const result = await api("/api/knowledge-base/ask", {
       method: "POST",
       body: JSON.stringify({ question, isRepeat: repeatQuery }),
     });
     setAskResult(result || null);
     setLastAskedQuestion(question);


     const entry = result?.entry || {};
     setAskIntent(safeStr(entry.intent || "support"));
     setAskStage(safeStr(entry.stage || "new_user"));
     setAskPriority(safeStr(entry.priority || "medium"));
     setAskNextActionType(safeStr(entry?.nextAction?.type || "none"));
     setAskNextActionPayload(
       JSON.stringify(
         entry?.nextAction?.payload && typeof entry.nextAction.payload === "object"
           ? entry.nextAction.payload
           : {},
         null,
         2
       )
     );


     if (!safeStr(result?.answer)) {
       showToast("AI could not generate an answer", "warn");
     }
   } catch (e) {
     showToast(e.message || "Failed to test AI answer", "error");
   } finally {
     setAskLoading(false);
   }
 };


 const startImproveAnswer = () => {
   setAskDraftAnswer(safeStr(askResult?.answer));
   setAskIntent(safeStr(askResult?.entry?.intent || "support"));
   setAskStage(safeStr(askResult?.entry?.stage || "new_user"));
   setAskPriority(safeStr(askResult?.entry?.priority || "medium"));
   setAskNextActionType(safeStr(askResult?.entry?.nextAction?.type || "none"));
   setAskNextActionPayload(
     JSON.stringify(
       askResult?.entry?.nextAction?.payload && typeof askResult.entry.nextAction.payload === "object"
         ? askResult.entry.nextAction.payload
         : {},
       null,
       2
     )
   );
   setDuplicateWarning(null);
   setAskImproving(true);
 };


 const saveImprovedAnswer = async () => {
   const question = safeStr(askQuestion);
   const answer = safeStr(askDraftAnswer);
   const nextAction = {
     type: safeStr(askNextActionType || "none"),
     payload: parsePayloadObject(askNextActionPayload),
   };


   if (!question) {
     showToast("Question is required", "error");
     return;
   }
   if (!answer) {
     showToast("Answer is required", "error");
     return;
   }


   setAskSaving(true);
   try {
     const entryId = safeStr(askResult?.entry?._id);


     if (entryId) {
       await api(`/api/knowledge-base/entries/${entryId}`, {
         method: "PATCH",
         body: JSON.stringify({
           answer,
           intent: askIntent,
           stage: askStage,
           priority: askPriority,
           nextAction,
           status: "active",
           channels: ALL_CHANNELS,
         }),
       });
       showToast("Answer updated in memory", "success");
     } else {
       const created = await api(`/api/knowledge-base/entries`, {
         method: "POST",
         body: JSON.stringify({
           canonicalQuestion: question,
           alternateQuestions: [],
           answer,
           domain: "general",
           tags: ["ask_ai_improved"],
           intent: askIntent,
           stage: askStage,
           priority: askPriority,
           nextAction,
           channels: ALL_CHANNELS,
           status: "active",
         }),
       });
       setDuplicateWarning(created?.duplicateWarning || null);


       setAskResult((prev) => ({
         ...(prev || {}),
         entry: {
           ...(prev?.entry || {}),
           _id: safeStr(created?.entry?._id),
           intent: safeStr(created?.entry?.intent || askIntent),
           stage: safeStr(created?.entry?.stage || askStage),
           priority: safeStr(created?.entry?.priority || askPriority),
           nextAction: created?.entry?.nextAction || nextAction,
         },
       }));
       if (created?.duplicateWarning) {
         showToast("Similar entry found. Please review duplicate warning.", "warn");
       }
       showToast("Answer saved to memory", "success");
     }


     setAskResult((prev) => ({
       ...(prev || {}),
       answer,
       entry: {
         ...(prev?.entry || {}),
         intent: askIntent,
         stage: askStage,
         priority: askPriority,
         nextAction,
       },
     }));
     setAskImproving(false);
   } catch (e) {
     showToast(e.message || "Failed to save improved answer", "error");
   } finally {
     setAskSaving(false);
   }
 };


 const submitLeadCapture = async () => {
   const name = safeStr(leadName);
   const phone = safeStr(leadPhone);
   if (!name) {
     showToast("Lead name is required", "error");
     return;
   }
   if (!phone) {
     showToast("Lead phone is required", "error");
     return;
   }


   setLeadSaving(true);
   try {
     await api("/api/knowledge-leads", {
       method: "POST",
       body: JSON.stringify({
         name,
         phone,
         source: "knowledge_base",
         kbEntryId: safeStr(askResult?.entry?._id),
         metadata: {
           question: safeStr(askQuestion),
           intent: safeStr(askResult?.entry?.intent),
         },
       }),
     });


     showToast("Lead captured successfully", "success");
     setLeadName("");
     setLeadPhone("");
   } catch (e) {
     showToast(e.message || "Failed to capture lead", "error");
   } finally {
     setLeadSaving(false);
   }
 };


 const updateGapStatus = async (gap, status) => {
   try {
     await api(`/api/knowledge-base/gaps/${gap?._id}/status`, {
       method: "PATCH",
       body: JSON.stringify({ status }),
     });
     showToast(`Question marked ${status}`, "success");
     await fetchGaps();
   } catch (e) {
     showToast(e.message || "Failed to update question status", "error");
   }
 };


 const submitGapAnswer = async (gap) => {
   const gapId = safeStr(gap?._id);
   const answer = safeStr(gapDraftAnswers[gapId]);


   if (!gapId) return;
   if (!answer) {
     showToast("Please enter an answer before submitting", "error");
     return;
   }


   setGapSubmittingId(gapId);
   try {
     const result = await api(`/api/knowledge-base/gaps/${gapId}/resolve`, {
       method: "POST",
       body: JSON.stringify({
         canonicalQuestion: safeStr(gap?.questionText),
         answer,
         domain: "general",
         tags: [],
         intent: gapIntent,
         stage: gapStage,
         priority: gapPriority,
         nextAction: {
           type: gapNextActionType,
           payload: parsePayloadObject(gapNextActionPayload),
         },
         channels: ALL_CHANNELS,
         status: "active",
       }),
     });
     if (result?.duplicateWarning) {
       setDuplicateWarning(result.duplicateWarning);
       showToast("Similar entry found. Please review duplicate warning.", "warn");
     }


     setGapDraftAnswers((prev) => ({ ...prev, [gapId]: "" }));
     showToast("Answer submitted and saved to memory", "success");
     await fetchGaps();
   } catch (e) {
     showToast(e.message || "Failed to submit answer", "error");
   } finally {
     setGapSubmittingId("");
   }
 };


 const openUploadDocumentDialog = () => {
   setDocumentForm(emptyDocumentForm());
   setDocumentModalOpen(true);
 };


 const uploadDocument = async () => {
   if (!documentForm.file) {
     showToast("Please choose a document file", "error");
     return;
   }


   setDocumentUploading(true);
   try {
     const formData = new FormData();
     formData.append("file", documentForm.file);
     formData.append("title", safeStr(documentForm.title) || documentForm.file.name);
     formData.append("category", safeStr(documentForm.category || "general"));
     formData.append("domain", safeStr(documentForm.domain || "sales").toLowerCase());
     formData.append("tags", asList(documentForm.tags).join(","));
     formData.append("channels", ALL_CHANNELS.join(","));
     formData.append("status", safeStr(documentForm.status || "active"));


     const result = await apiForm("/api/knowledge-base/documents/upload", formData);
     const extractionStatus = safeStr(result?.document?.extractionStatus);


     if (extractionStatus === "failed") {
       showToast(safeStr(result?.document?.extractionError) || "Document upload failed", "warn");
     } else {
       showToast("Document uploaded and indexed", "success");
     }


     setDocumentModalOpen(false);
     await fetchDocuments();
   } catch (e) {
     showToast(e.message || "Failed to upload document", "error");
   } finally {
     setDocumentUploading(false);
   }
 };


 const updateDocumentStatus = async (doc, status) => {
   const docId = safeStr(doc?._id);
   if (!docId) return;


   setDocumentActionLoadingId(docId);
   try {
     await api(`/api/knowledge-base/documents/${docId}`, {
       method: "PATCH",
       body: JSON.stringify({ status }),
     });
     showToast(`Document marked ${status}`, "success");
     await fetchDocuments();
   } catch (e) {
     showToast(e.message || "Failed to update document", "error");
   } finally {
     setDocumentActionLoadingId("");
   }
 };


 const reprocessDocument = async (doc) => {
   const docId = safeStr(doc?._id);
   if (!docId) return;


   setDocumentActionLoadingId(docId);
   try {
     const result = await api(`/api/knowledge-base/documents/${docId}/reprocess`, {
       method: "POST",
     });
     const extractionStatus = safeStr(result?.document?.extractionStatus);


     if (extractionStatus === "failed") {
       showToast(safeStr(result?.document?.extractionError) || "Reprocessing failed", "warn");
     } else {
       showToast("Document reprocessed", "success");
     }


     await fetchDocuments();
   } catch (e) {
     showToast(e.message || "Failed to reprocess document", "error");
   } finally {
     setDocumentActionLoadingId("");
   }
 };


 const deleteDocument = async (doc) => {
   const docId = safeStr(doc?._id);
   if (!docId) return;


   const confirmed = window.confirm(`Delete document "${safeStr(doc?.title) || "Untitled"}" from AI brain?`);
   if (!confirmed) return;


   setDocumentActionLoadingId(docId);
   try {
     await api(`/api/knowledge-base/documents/${docId}`, { method: "DELETE" });
     showToast("Document deleted", "success");
     await fetchDocuments();
   } catch (e) {
     showToast(e.message || "Failed to delete document", "error");
   } finally {
     setDocumentActionLoadingId("");
   }
 };


 const anyLoading = useMemo(
   () => gapsLoading || documentsLoading,
   [gapsLoading, documentsLoading]
 );


 return (
   <div className="kb-page">
     <div className="kb-bg-shape kb-bg-shape--one" />
     <div className="kb-bg-shape kb-bg-shape--two" />


     <div className="kb-shell">
       <header className="kb-header">
         <div>
           <h1>AI Guidelines</h1>
           <p>Define and maintain response rules for the AI across all channels.</p>
         </div>
         <button type="button" className="kb-btn kb-btn--ghost" onClick={refreshAll} disabled={anyLoading}>
           {anyLoading ? "Refreshing..." : "Refresh"}
         </button>
       </header>


       <nav className="kb-tabs" aria-label="Knowledge base sections">
         <button type="button" className={`kb-tab ${tab === "prompt" ? "is-active" : ""}`} onClick={() => setTab("prompt")}>Prompt Settings</button>
         <button type="button" className={`kb-tab ${tab === "gaps" ? "is-active" : ""}`} onClick={() => setTab("gaps")}>Unanswered Questions</button>
         <button type="button" className={`kb-tab ${tab === "docs" ? "is-active" : ""}`} onClick={() => setTab("docs")}>Documents Brain</button>
         <button type="button" className={`kb-tab ${tab === "ask" ? "is-active" : ""}`} onClick={() => setTab("ask")}>Ask AI</button>
         <button type="button" className={`kb-tab ${tab === "credits" ? "is-active" : ""}`} onClick={() => setTab("credits")}>AI Credits</button>
       </nav>


       {duplicateWarning && (
         <div className="kb-ask-result" style={{ marginTop: 12 }}>
           <div className="kb-ask-meta">
             <span className="kb-badge kb-badge--warn">DUPLICATE WARNING</span>
             <span className="kb-meta-pill">Score: {duplicateWarning.score}</span>
           </div>
           <p className="kb-subtle" style={{ marginBottom: 0 }}>
             Similar entry found: {safeStr(duplicateWarning.canonicalQuestion)} (matched text:{" "}
             {safeStr(duplicateWarning.matchedText)})
           </p>
         </div>
       )}


       {tab === "prompt" && (
         <section className="kb-panel">
           <div className="kb-section-head">
             <h2>AI Prompt Settings</h2>
             <button
               type="button"
               className="kb-btn kb-btn--primary"
               onClick={() => {
                 setCreatePromptOpen(true);
                 setPromptName("");
                 setPromptDraftText("");
               }}
               disabled={promptLoading || promptSaving}
             >
               Add New Prompt
             </button>
           </div>
           <p className="kb-subtle">
             Edit the system prompt used by AI Write. Supported variables: <code>{"{{tone}}"}</code>,{" "}
             <code>{"{{session_active}}"}</code>, <code>{"{{conversation_in_progress}}"}</code>.
           </p>


           <div className="kb-table-wrap" style={{ marginBottom: 14 }}>
             {promptLoading ? (
               <p className="kb-empty">Loading prompts...</p>
             ) : promptList.length ? (
               <div className="kb-table-scroll">
                 <table className="kb-table">
                   <thead>
                     <tr>
                       <th>Active</th>
                       <th>Prompt Name</th>
                       <th>Created</th>
                       <th className="is-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody>
                     {promptList.map((p) => {
                       const id = safeStr(p.id);
                       const isActive = Boolean(p.isActive);
                       const activateBusy = promptActionLoadingId === `activate:${id}`;
                       const copyBusy = promptActionLoadingId === `copy:${id}`;
                       const deleteBusy = promptActionLoadingId === `delete:${id}`;
                       return (
                         <tr key={id}>
                           <td>
                             <input
                               type="checkbox"
                               checked={isActive}
                               onChange={(e) => {
                                 if (e.target.checked && !isActive) activatePrompt(id);
                               }}
                               disabled={activateBusy || promptSaving}
                             />
                           </td>
                           <td>
                             {safeStr(p.name || "Untitled Prompt")}
                           </td>
                           <td>{formatDateTime(p.createdAt)}</td>
                           <td className="is-right">
                             <button
                               type="button"
                               className="kb-link-btn kb-link-btn--icon"
                               title="View prompt"
                               aria-label="View prompt"
                               onClick={() => openViewPrompt(p)}
                               style={{ marginLeft: 0 }}
                             >
                               👁
                             </button>
                             <button
                               type="button"
                               className="kb-link-btn kb-link-btn--icon"
                               title="Make a copy"
                               aria-label="Make a copy"
                               onClick={() => copyPrompt(id)}
                               disabled={copyBusy || promptSaving}
                             >
                               ⧉
                             </button>
                             <button
                               type="button"
                               className="kb-link-btn kb-link-btn--danger kb-link-btn--icon"
                               title="Delete prompt"
                               aria-label="Delete prompt"
                               onClick={() => deletePrompt(id)}
                               disabled={deleteBusy || promptSaving || promptList.length <= 1}
                             >
                               🗑
                             </button>
                           </td>
                         </tr>
                       );
                     })}
                   </tbody>
                 </table>
               </div>
             ) : (
               <p className="kb-empty">No prompts yet. Click “Add New Prompt”.</p>
             )}
           </div>


           <div className="kb-subtle" style={{ marginTop: 6 }}>
             Last updated: {formatDateTime(promptUpdatedAt)}{" "}
             {safeStr(promptUpdatedBy?.name || promptUpdatedBy?.email)
               ? `by ${safeStr(promptUpdatedBy?.name || promptUpdatedBy?.email)}`
               : ""}
           </div>
         </section>
       )}


       {tab === "gaps" && (
         <section className="kb-panel">
           <div className="kb-section-head"><h2>Questions AI Could Not Answer</h2></div>
           <p className="kb-subtle">When AI misses an answer, add the approved response below and submit.</p>


           <div className="kb-filters">
             <input className="kb-input" value={gapQuery} onChange={(e) => setGapQuery(e.target.value)} placeholder="Search unanswered question" />
             <select className="kb-input kb-select" value={gapStatus} onChange={(e) => setGapStatus(e.target.value)}>
               <option value="open">Open</option><option value="answered">Answered</option><option value="ignored">Ignored</option><option value="all">All</option>
             </select>
             <button type="button" className="kb-btn kb-btn--ghost" onClick={fetchGaps} disabled={gapsLoading}>{gapsLoading ? "Searching..." : "Search"}</button>
           </div>


           {gapsLoading ? (
             <p className="kb-empty">Loading unanswered questions...</p>
           ) : gaps.length ? (
             <div className="kb-gap-list">
               {gaps.map((gap) => {
                 const gapId = safeStr(gap._id);
                 const isOpen = safeStr(gap.status) === "open";
                 const busy = gapSubmittingId === gapId;


                 return (
                   <article key={gapId} className="kb-gap-card">
                     <div className="kb-gap-top">
                       <div>
                         <h3>{safeStr(gap.questionText) || "Untitled question"}</h3>
                         {!!safeStr(gap.transcriptSnippet) && <p>{safeStr(gap.transcriptSnippet).slice(0, 220)}</p>}
                       </div>
                       <div className="kb-gap-meta">
                         <span className="kb-meta-pill">Occurrences: {gap.occurrenceCount || 1}</span>
                         <span className="kb-meta-pill">Last Seen: {formatDateTime(gap.lastSeenAt)}</span>
                         <span className={`kb-badge kb-badge--${statusTone(gap.status)}`}>{safeStr(gap.status || "open").toUpperCase()}</span>
                       </div>
                     </div>


                     {isOpen ? (
                       <div className="kb-answer-box">
                         <label className="kb-field">
                           <span>Approved Answer</span>
                           <textarea rows={4} placeholder="Enter the answer AI should give for this question" value={gapDraftAnswers[gapId] || ""} onChange={(e) => setGapDraftAnswers((prev) => ({ ...prev, [gapId]: e.target.value }))} />
                         </label>


                         <div className="kb-form-grid">
                           <label className="kb-field">
                             <span>Intent</span>
                             <select className="kb-input kb-select" value={gapIntent} onChange={(e) => setGapIntent(e.target.value)}>
                               {INTENT_OPTIONS.map((opt) => (
                                 <option key={opt} value={opt}>{opt}</option>
                               ))}
                             </select>
                           </label>
                           <label className="kb-field">
                             <span>Stage</span>
                             <select className="kb-input kb-select" value={gapStage} onChange={(e) => setGapStage(e.target.value)}>
                               {STAGE_OPTIONS.map((opt) => (
                                 <option key={opt} value={opt}>{opt}</option>
                               ))}
                             </select>
                           </label>
                           <label className="kb-field">
                             <span>Priority</span>
                             <select className="kb-input kb-select" value={gapPriority} onChange={(e) => setGapPriority(e.target.value)}>
                               {PRIORITY_OPTIONS.map((opt) => (
                                 <option key={opt} value={opt}>{opt}</option>
                               ))}
                             </select>
                           </label>
                           <label className="kb-field">
                             <span>Next Action</span>
                             <select className="kb-input kb-select" value={gapNextActionType} onChange={(e) => setGapNextActionType(e.target.value)}>
                               {NEXT_ACTION_OPTIONS.map((opt) => (
                                 <option key={opt} value={opt}>{opt}</option>
                               ))}
                             </select>
                           </label>
                           <label className="kb-field kb-field--full">
                             <span>Next Action Payload (JSON)</span>
                             <textarea rows={2} value={gapNextActionPayload} onChange={(e) => setGapNextActionPayload(e.target.value)} />
                           </label>
                         </div>


                         <div className="kb-inline-actions">
                           <button type="button" className="kb-btn kb-btn--primary" onClick={() => submitGapAnswer(gap)} disabled={busy}>{busy ? "Submitting..." : "Submit Answer"}</button>
                           <button type="button" className="kb-btn kb-btn--ghost" onClick={() => updateGapStatus(gap, "ignored")}>Ignore</button>
                         </div>
                       </div>
                     ) : (
                       <div className="kb-inline-actions">
                         {safeStr(gap.status) === "ignored" && <button type="button" className="kb-btn kb-btn--ghost" onClick={() => updateGapStatus(gap, "open")}>Reopen</button>}
                       </div>
                     )}
                   </article>
                 );
               })}
             </div>
           ) : (
             <p className="kb-empty">No unanswered questions found.</p>
           )}
         </section>
       )}


       {tab === "docs" && (
         <section className="kb-panel">
           <div className="kb-section-head"><h2>Documents Brain</h2><button type="button" className="kb-btn kb-btn--primary" onClick={openUploadDocumentDialog}>Upload Document</button></div>
           <p className="kb-subtle">Documents are shared for all channels by default.</p>


           <div className="kb-filters">
             <input className="kb-input" value={documentQuery} onChange={(e) => setDocumentQuery(e.target.value)} placeholder="Search document, title, tag" />
             <select className="kb-input kb-select" value={documentStatus} onChange={(e) => setDocumentStatus(e.target.value)}>
               <option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option>
             </select>
             <select className="kb-input kb-select" value={documentCategory} onChange={(e) => setDocumentCategory(e.target.value)}>
               <option value="all">All Categories</option>
               {DOCUMENT_CATEGORY_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
             </select>
             <button type="button" className="kb-btn kb-btn--ghost" onClick={fetchDocuments} disabled={documentsLoading}>{documentsLoading ? "Searching..." : "Search"}</button>
           </div>


           {documentsLoading ? (
             <p className="kb-empty">Loading documents...</p>
           ) : documents.length ? (
             <div className="kb-table-scroll">
               <table className="kb-table">
                 <thead><tr><th>Document</th><th>Category</th><th>Chunks</th><th>Extraction</th><th>Status</th><th className="is-right">Actions</th></tr></thead>
                 <tbody>
                   {documents.map((doc) => {
                     const docId = safeStr(doc?._id);
                     const docBusy = docId && documentActionLoadingId === docId;


                     return (
                       <tr key={docId || safeStr(doc?.title)}>
                         <td><div className="kb-strong">{doc.title || doc.originalFileName || "Untitled"}</div><div className="kb-muted-line">{doc.originalFileName || "-"}</div><div className="kb-faint-line">Updated: {formatDateTime(doc.updatedAt)}</div></td>
                         <td>{DOCUMENT_CATEGORY_OPTIONS.find((c) => c.value === doc.category)?.label || safeStr(doc.category || "general")}</td>
                         <td>{doc.chunkCount || 0}</td>
                         <td>
                           <span className={`kb-badge kb-badge--${statusTone(doc.extractionStatus)}`}>{safeStr(doc.extractionStatus || "pending").toUpperCase()}</span>
                           {!!safeStr(doc.extractionError) && <div className="kb-error-line">{safeStr(doc.extractionError).slice(0, 120)}</div>}
                         </td>
                         <td><span className={`kb-badge kb-badge--${statusTone(doc.status)}`}>{safeStr(doc.status || "active").toUpperCase()}</span></td>
                         <td className="is-right">
                           <button type="button" className="kb-link-btn" onClick={() => reprocessDocument(doc)} disabled={docBusy}>Reprocess</button>
                           <button type="button" className="kb-link-btn" onClick={() => updateDocumentStatus(doc, safeStr(doc.status) === "active" ? "inactive" : "active")} disabled={docBusy}>{safeStr(doc.status) === "active" ? "Deactivate" : "Activate"}</button>
                           <button type="button" className="kb-link-btn kb-link-btn--danger" onClick={() => deleteDocument(doc)} disabled={docBusy}>Delete</button>
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             </div>
           ) : (
             <p className="kb-empty">No documents uploaded yet.</p>
           )}
         </section>
       )}


       {tab === "ask" && (
         <section className="kb-panel">
           <div className="kb-section-head"><h2>Ask AI</h2></div>
           <p className="kb-subtle">Ask a question and review the LLM answer. Improve and save if needed.</p>


           <div className="kb-filters kb-ask-filters">
             <input className="kb-input" value={askQuestion} onChange={(e) => setAskQuestion(e.target.value)} placeholder="Type a customer question" />
             <button type="button" className="kb-btn kb-btn--primary" onClick={askKnowledgeBase} disabled={askLoading}>{askLoading ? "Asking..." : "Ask AI"}</button>
           </div>


           {askResult && (
             <div className="kb-ask-result">
               <div className="kb-ask-meta">
                 <span className={`kb-badge kb-badge--${safeStr(askResult?.answer) ? "success" : "warn"}`}>
                   {safeStr(askResult?.answer) ? "ANSWER GENERATED" : "NO ANSWER"}
                 </span>
                 {!!safeStr(askResult?.match?.score) && <span className="kb-meta-pill">KB Match: {askResult.match.score}</span>}
                 <span className={`kb-badge kb-badge--${askResult?.confident ? "success" : "warn"}`}>
                   {askResult?.confident ? "CONFIDENT" : "LOW CONFIDENCE"}
                 </span>
                 {askResult?.handoff && <span className="kb-badge kb-badge--warn">HANDOFF</span>}
                 <span className="kb-meta-pill">
                   Usage/Success/Failure: {Number(askResult?.entry?.usageCount || 0)}/
                   {Number(askResult?.entry?.successCount || 0)}/
                   {Number(askResult?.entry?.failureCount || 0)}
                 </span>
               </div>


               <label className="kb-field">
                 <span>AI Answer</span>
                 {askImproving ? (
                   <textarea rows={6} value={askDraftAnswer} onChange={(e) => setAskDraftAnswer(e.target.value)} placeholder="Write the improved answer" />
                 ) : (
                   <textarea rows={6} value={safeStr(askResult?.answer) || "No answer generated."} readOnly />
                 )}
               </label>


               {askImproving && (
                 <div className="kb-form-grid">
                   <label className="kb-field">
                     <span>Intent</span>
                     <select className="kb-input kb-select" value={askIntent} onChange={(e) => setAskIntent(e.target.value)}>
                       {INTENT_OPTIONS.map((opt) => (
                         <option key={opt} value={opt}>{opt}</option>
                       ))}
                     </select>
                   </label>
                   <label className="kb-field">
                     <span>Stage</span>
                     <select className="kb-input kb-select" value={askStage} onChange={(e) => setAskStage(e.target.value)}>
                       {STAGE_OPTIONS.map((opt) => (
                         <option key={opt} value={opt}>{opt}</option>
                       ))}
                     </select>
                   </label>
                   <label className="kb-field">
                     <span>Priority</span>
                     <select className="kb-input kb-select" value={askPriority} onChange={(e) => setAskPriority(e.target.value)}>
                       {PRIORITY_OPTIONS.map((opt) => (
                         <option key={opt} value={opt}>{opt}</option>
                       ))}
                     </select>
                   </label>
                   <label className="kb-field">
                     <span>Next Action</span>
                     <select className="kb-input kb-select" value={askNextActionType} onChange={(e) => setAskNextActionType(e.target.value)}>
                       {NEXT_ACTION_OPTIONS.map((opt) => (
                         <option key={opt} value={opt}>{opt}</option>
                       ))}
                     </select>
                   </label>
                   <label className="kb-field kb-field--full">
                     <span>Next Action Payload (JSON)</span>
                     <textarea rows={3} value={askNextActionPayload} onChange={(e) => setAskNextActionPayload(e.target.value)} />
                   </label>
                 </div>
               )}


               {!askImproving ? (
                 <button type="button" className="kb-btn kb-btn--ghost" onClick={startImproveAnswer}>Improve Answer</button>
               ) : (
                 <div className="kb-inline-actions">
                   <button type="button" className="kb-btn kb-btn--primary" onClick={saveImprovedAnswer} disabled={askSaving}>{askSaving ? "Saving..." : "Save"}</button>
                   <button type="button" className="kb-btn kb-btn--ghost" onClick={() => setAskImproving(false)} disabled={askSaving}>Cancel</button>
                 </div>
               )}


               {safeStr(askResult?.entry?.nextAction?.type || askNextActionType) === "collect_lead" && (
                 <div className="kb-form-grid" style={{ marginTop: 14 }}>
                   <label className="kb-field">
                     <span>Lead Name</span>
                     <input className="kb-input" value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Enter customer name" />
                   </label>
                   <label className="kb-field">
                     <span>Phone</span>
                     <input className="kb-input" value={leadPhone} onChange={(e) => setLeadPhone(e.target.value)} placeholder="Enter phone number" />
                   </label>
                   <div className="kb-inline-actions">
                     <button type="button" className="kb-btn kb-btn--primary" onClick={submitLeadCapture} disabled={leadSaving}>
                       {leadSaving ? "Saving..." : "Capture Lead"}
                     </button>
                   </div>
                 </div>
               )}
             </div>
           )}


         </section>
       )}


       {tab === "credits" && (
         <section className="kb-panel">
           <div className="kb-credits-card" style={{ marginTop: 0 }}>
             <div className="kb-section-head">
               <h2>AI Credits</h2>
               <button
                 type="button"
                 className="kb-btn kb-btn--ghost"
                 onClick={fetchAICredits}
                 disabled={aiCreditsLoading}
               >
                 {aiCreditsLoading ? "Refreshing..." : "Refresh Credits"}
               </button>
             </div>
             <p className="kb-subtle" style={{ marginBottom: 10 }}>
               Spend and usage insights from your connected OpenAI account.
             </p>


             {aiCreditsError && (
               <p className="kb-error-line">{aiCreditsError}</p>
             )}


             {!aiCreditsError && aiCreditsLoading && (
               <p className="kb-empty">Loading AI credits...</p>
             )}


             {!aiCreditsError && !aiCreditsLoading && aiCredits && (
               <>
                 <div className="kb-credit-metrics">
                   <div className="kb-credit-metric">
                     <div className="kb-credit-label">Today's Spend</div>
                     <div className="kb-credit-value">
                       {formatMoneyUsd(aiCredits?.spend?.today)}
                     </div>
                   </div>
                   <div className="kb-credit-metric">
                     <div className="kb-credit-label">Last 7 Days Spend</div>
                     <div className="kb-credit-value">
                       {formatMoneyUsd(aiCredits?.spend?.last7Days)}
                     </div>
                   </div>
                   <div className="kb-credit-metric">
                     <div className="kb-credit-label">Last 30 Days Spend</div>
                     <div className="kb-credit-value">
                       {formatMoneyUsd(aiCredits?.spend?.last30Days)}
                     </div>
                   </div>
                   <div className="kb-credit-metric">
                     <div className="kb-credit-label">Requests (30d)</div>
                     <div className="kb-credit-value">
                       {formatCompactNumber(aiCredits?.usage?.requestsLast30Days)}
                     </div>
                   </div>
                   <div className="kb-credit-metric">
                     <div className="kb-credit-label">Input Tokens (30d)</div>
                     <div className="kb-credit-value">
                       {formatCompactNumber(aiCredits?.usage?.inputTokensLast30Days)}
                     </div>
                   </div>
                   <div className="kb-credit-metric">
                     <div className="kb-credit-label">Output Tokens (30d)</div>
                     <div className="kb-credit-value">
                       {formatCompactNumber(aiCredits?.usage?.outputTokensLast30Days)}
                     </div>
                   </div>
                 </div>


                 {!!(Array.isArray(aiCredits?.daily) && aiCredits.daily.length) && (
                   <div className="kb-table-scroll" style={{ marginTop: 12 }}>
                     <table className="kb-table">
                       <thead>
                         <tr>
                           <th>Date</th>
                           <th>Spend</th>
                           <th>Requests</th>
                           <th>Input Tokens</th>
                           <th>Output Tokens</th>
                         </tr>
                       </thead>
                       <tbody>
                         {[...aiCredits.daily].slice(-10).reverse().map((day) => (
                           <tr key={day.date}>
                             <td>{safeStr(day.date)}</td>
                             <td>{formatMoneyUsd(day.cost)}</td>
                             <td>{formatCompactNumber(day.requests)}</td>
                             <td>{formatCompactNumber(day.inputTokens)}</td>
                             <td>{formatCompactNumber(day.outputTokens)}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 )}


                 {!!(Array.isArray(aiCredits?.warnings) &&
                   aiCredits.warnings.filter((w) => !/credit balance/i.test(safeStr(w))).length) && (
                   <div style={{ marginTop: 10 }}>
                     {aiCredits.warnings
                       .filter((warning) => !/credit balance/i.test(safeStr(warning)))
                       .map((warning) => (
                       <p key={warning} className="kb-subtle" style={{ margin: "4px 0" }}>
                         {warning}
                       </p>
                     ))}
                   </div>
                 )}


                 <p className="kb-faint-line" style={{ marginTop: 10 }}>
                   Last refreshed: {formatDateTime(aiCredits?.refreshedAt)}
                 </p>
               </>
             )}
           </div>
         </section>
       )}
     </div>


     <Modal
       open={createPromptOpen}
       title="Add New Prompt"
       onClose={() => !promptSaving && setCreatePromptOpen(false)}
       actions={
         <>
           <button type="button" className="kb-btn kb-btn--ghost" onClick={() => setCreatePromptOpen(false)} disabled={promptSaving}>Cancel</button>
           <button type="button" className="kb-btn kb-btn--primary" onClick={createPrompt} disabled={promptSaving}>{promptSaving ? "Saving..." : "Create Prompt"}</button>
         </>
       }
     >
       <div className="kb-form-grid">
         <label className="kb-field kb-field--full">
           <span>Prompt Name</span>
           <input
             className="kb-input"
             value={promptName}
             onChange={(e) => setPromptName(e.target.value)}
             placeholder="Enter prompt name"
             disabled={promptSaving}
           />
         </label>
         <label className="kb-field kb-field--full">
           <span>Help Me Write Instructions</span>
           <textarea
             rows={12}
             value={promptDraftText}
             onChange={(e) => setPromptDraftText(e.target.value)}
             placeholder="Enter AI instructions"
             disabled={promptSaving}
           />
         </label>
       </div>
     </Modal>


     <Modal
       open={viewPromptOpen}
       title={safeStr(viewPromptItem?.name || "Prompt")}
       onClose={closeViewPrompt}
       actions={
         <>
           {viewPromptEditMode ? (
             <button
               type="button"
               className="kb-btn kb-btn--ghost"
               onClick={() => {
                 setViewPromptEditMode(false);
                 setViewPromptName(safeStr(viewPromptItem?.name));
                 setViewPromptText(safeStr(viewPromptItem?.helpMeWriteInstructions));
               }}
               disabled={viewPromptSaving}
             >
               Cancel
             </button>
           ) : (
             <button
               type="button"
               className="kb-btn kb-btn--ghost"
               onClick={() => setViewPromptEditMode(true)}
               disabled={viewPromptSaving}
             >
               Edit
             </button>
           )}
           {viewPromptEditMode ? (
             <button
               type="button"
               className="kb-btn kb-btn--primary"
               onClick={saveViewedPrompt}
               disabled={viewPromptSaving}
             >
               {viewPromptSaving ? "Saving..." : "Save"}
             </button>
           ) : (
             <button type="button" className="kb-btn kb-btn--ghost" onClick={closeViewPrompt}>
               Close
             </button>
           )}
         </>
       }
     >
       <div className="kb-faint-line" style={{ marginBottom: 10 }}>
         Created: {formatDateTime(viewPromptItem?.createdAt)}
       </div>
       {viewPromptEditMode ? (
         <div className="kb-form-grid">
           <label className="kb-field kb-field--full">
             <span>Prompt Name</span>
             <input
               className="kb-input"
               value={viewPromptName}
               onChange={(e) => setViewPromptName(e.target.value)}
               placeholder="Enter prompt name"
               disabled={viewPromptSaving}
             />
           </label>
           <label className="kb-field kb-field--full">
             <span>Prompt</span>
             <textarea
               rows={15}
               value={viewPromptText}
               onChange={(e) => setViewPromptText(e.target.value)}
               placeholder="Enter prompt text"
               disabled={viewPromptSaving}
               style={{ maxHeight: "54vh", overflowY: "auto" }}
             />
           </label>
         </div>
       ) : (
         <div
           style={{
             maxHeight: "58vh",
             overflowY: "auto",
             border: "1px solid #dbe4db",
             borderRadius: 10,
             padding: 12,
             background: "#fbfefb",
             whiteSpace: "pre-wrap",
             lineHeight: 1.55,
           }}
         >
           {safeStr(viewPromptItem?.helpMeWriteInstructions)}
         </div>
       )}
     </Modal>


     <Modal
       open={documentModalOpen}
       title="Upload Sales Expert Brain Document"
       onClose={() => !documentUploading && setDocumentModalOpen(false)}
       actions={
         <>
           <button type="button" className="kb-btn kb-btn--ghost" onClick={() => setDocumentModalOpen(false)} disabled={documentUploading}>Cancel</button>
           <button type="button" className="kb-btn kb-btn--primary" onClick={uploadDocument} disabled={documentUploading}>{documentUploading ? "Uploading..." : "Upload & Index"}</button>
         </>
       }
     >
       <div className="kb-form-grid">
         <label className="kb-field kb-field--full">
           <span>Document File</span>
           <input className="kb-input" type="file" accept=".pdf,.doc,.docx,.txt,.md,.csv,.tsv" onChange={(e) => setDocumentForm((prev) => ({ ...prev, file: e.target.files?.[0] || null, title: prev.title || safeStr(e.target.files?.[0]?.name) }))} />
           <small>Best extraction quality comes from PDF or DOCX.</small>
         </label>
         <label className="kb-field kb-field--full"><span>Document Title</span><input className="kb-input" value={documentForm.title} onChange={(e) => setDocumentForm((prev) => ({ ...prev, title: e.target.value }))} /></label>
         <label className="kb-field"><span>Category</span><select className="kb-input kb-select" value={documentForm.category} onChange={(e) => setDocumentForm((prev) => ({ ...prev, category: e.target.value }))}>{DOCUMENT_CATEGORY_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select></label>
         <label className="kb-field"><span>Status</span><select className="kb-input kb-select" value={documentForm.status} onChange={(e) => setDocumentForm((prev) => ({ ...prev, status: e.target.value }))}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
         <label className="kb-field kb-field--full"><span>Domain</span><input className="kb-input" value={documentForm.domain} onChange={(e) => setDocumentForm((prev) => ({ ...prev, domain: e.target.value }))} /></label>
         <label className="kb-field kb-field--full"><span>Tags (comma/new line)</span><input className="kb-input" value={documentForm.tags} onChange={(e) => setDocumentForm((prev) => ({ ...prev, tags: e.target.value }))} /></label>
       </div>
     </Modal>


     <Toast toast={toast} onClose={closeToast} />
   </div>
 );
}
