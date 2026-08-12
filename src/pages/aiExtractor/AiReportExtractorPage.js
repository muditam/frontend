import React, { useMemo, useRef, useState } from "react";
import {
  cleanupUploadedReport,
  createUploadSession,
  extractUploadedReport,
  uploadFilesDirectly,
  validateBrowserFiles,
} from "./api";
import "./AiReportExtractorPage.css";

const GROUPS = [
  { name: "Diabetes", codes: [["HBA1C", "HbA1c"], ["ESTIMATED_AVERAGE_GLUCOSE", "Estimated average glucose"], ["FASTING_GLUCOSE", "Fasting glucose"]] },
  { name: "Liver", codes: [["AST", "AST / SGOT"], ["ALT", "ALT / SGPT"], ["GGT", "GGT"]] },
  { name: "Kidney", codes: [["BLOOD_UREA", "Blood urea"], ["CREATININE", "Creatinine"], ["EGFR", "eGFR"]] },
  { name: "Cholesterol", codes: [["TOTAL_CHOLESTEROL", "Total cholesterol"], ["TRIGLYCERIDES", "Triglycerides"], ["HDL_CHOLESTEROL", "HDL cholesterol"], ["LDL_CHOLESTEROL", "LDL cholesterol"]] },
  { name: "Heart & inflammation", codes: [["ESR", "ESR"]] },
];

function valueText(value) {
  if (!value) return "—";
  if (value.type === "NUMERIC") return value.numeric;
  if (value.type === "INEQUALITY") return `${value.comparator} ${value.numeric}`;
  if (value.type === "RANGE") return `${value.lower}–${value.upper}`;
  return value.text || "—";
}

function rangeText(range) {
  if (!range) return "Not provided";
  if (range.type === "INTERVAL") return `${range.lower}–${range.upper}`;
  if (range.type === "BOUND") return `${range.comparator} ${range.value}`;
  if (range.type === "CATEGORICAL_BOUND") return `${range.label}: ${range.comparator} ${range.value}`;
  return range.text || "Not provided";
}

function decisionText(decision) {
  if (decision === "AUTO_ACCEPT") return "VALID";
  if (decision === "USER_CONFIRMATION") return "CONFIRM";
  return "REVIEW";
}

function MarkerCard({ code, label, observation, possible }) {
  if (!observation) {
    return <article className="aix-marker aix-marker-missing">
      <div className="aix-marker-top"><div className="aix-marker-name">{label}</div><span className="aix-pill aix-pill-missing">MISSING</span></div>
      <div className="aix-marker-value aix-marker-empty">Not in report</div>
      <div className="aix-marker-meta">Canonical code: {code}</div>
    </article>;
  }
  const flag = observation.raw?.flag;
  const needsReview = observation.decision === "REVIEW_REQUIRED";
  const needsConfirmation = observation.decision === "USER_CONFIRMATION";
  const pillClass = needsReview || needsConfirmation ? "review"
    : flag === "H" || flag === "CRITICAL_HIGH" ? "high"
      : flag === "L" || flag === "CRITICAL_LOW" ? "low" : "valid";
  const pillText = possible ? "POSSIBLE MATCH" : needsReview ? "REVIEW" : needsConfirmation ? "CONFIRM"
    : flag ? String(flag).replace("CRITICAL_", "CRITICAL ") : "VALID";
  const confidence = observation.confidence?.overall;
  return <article className="aix-marker">
    <div className="aix-marker-top"><div className="aix-marker-name">{label}</div><span className={`aix-pill aix-pill-${pillClass}`}>{pillText}</span></div>
    <div className="aix-marker-value">{valueText(observation.normalized?.value)}<span className="aix-marker-unit">{observation.normalized?.unit || ""}</span></div>
    <div className="aix-marker-meta">
      Range: {rangeText(observation.normalized?.referenceRange)}<br />
      Raw name: {observation.raw?.name || "—"}<br />
      Page {observation.source?.pageNumber || "—"}
      {observation.raw?.method && <><br />Method: {observation.raw.method}</>}
      {possible && <><br />Mapping: {(observation.mapping?.evidence || []).join("; ")}</>}
      {Number.isFinite(confidence) && <><br />Confidence: {Math.round(confidence * 100)}% · {observation.mapping?.method || "—"}</>}
    </div>
  </article>;
}

function ReportResults({ report, fileName }) {
  const [search, setSearch] = useState("");
  const [decision, setDecision] = useState("");
  const [mapping, setMapping] = useState("");
  const observations = useMemo(
    () => Array.isArray(report?.observations) ? report.observations : [],
    [report]
  );
  const byCode = useMemo(() => new Map(observations
    .filter((item) => item.biomarker?.canonicalCode)
    .map((item) => [item.biomarker.canonicalCode, item])), [observations]);
  const possibleByCode = useMemo(() => new Map(observations
    .filter((item) => item.mapping?.status === "POSSIBLE_MATCH" && item.mapping?.suggestedCanonicalCode)
    .map((item) => [item.mapping.suggestedCanonicalCode, item])), [observations]);
  const requiredCodes = GROUPS.flatMap((group) => group.codes.map(([code]) => code));
  const found = requiredCodes.filter((code) => byCode.has(code)).length;
  const possible = requiredCodes.filter((code) => !byCode.has(code) && possibleByCode.has(code)).length;
  const statistics = report.statistics || {};
  const layout = report.sourceLayoutAnalysis || {};
  const filtered = observations.filter((item) => {
    const haystack = `${item.raw?.name || ""} ${item.biomarker?.canonicalCode || ""} ${item.mapping?.suggestedCanonicalCode || ""}`.toLowerCase();
    return (!search || haystack.includes(search.toLowerCase()))
      && (!decision || item.decision === decision)
      && (!mapping || item.mapping?.status === mapping);
  });

  function downloadJson() {
    const blobUrl = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `${fileName.replace(/\.[^.]+$/i, "")}-extracted.json`;
    link.click();
    URL.revokeObjectURL(blobUrl);
  }

  return <section className="aix-results" aria-live="polite">
    <div className="aix-summary">
      <div className="aix-summary-card aix-summary-primary"><div className="aix-summary-label">Processed report</div><div className="aix-summary-value">{fileName}</div><div className="aix-summary-note">{report.documentId || "—"}</div></div>
      <div className="aix-summary-card"><div className="aix-summary-label">Useful markers</div><div className="aix-summary-value">{found}/{requiredCodes.length}</div><div className="aix-summary-note">{possible} possible · {requiredCodes.length - found - possible} missing</div></div>
      <div className="aix-summary-card"><div className="aix-summary-label">All observations</div><div className="aix-summary-value">{statistics.observationCount ?? observations.length}</div><div className="aix-summary-note">{statistics.unmappedCount ?? 0} unmapped</div></div>
      <div className="aix-summary-card"><div className="aix-summary-label">Layout</div><div className="aix-summary-value">{layout.strategy || "—"}</div><div className="aix-summary-note">{Number.isFinite(layout.confidence) ? Math.round(layout.confidence * 100) : 0}% structural confidence</div></div>
      <div className="aix-summary-card"><div className="aix-summary-label">Decisions</div><div className="aix-summary-value">{statistics.autoAcceptedCount ?? 0} accepted</div><div className="aix-summary-note">{statistics.userConfirmationCount ?? 0} confirm · {statistics.reviewRequiredCount ?? 0} review</div></div>
    </div>

    {GROUPS.map((group) => <section className="aix-category" key={group.name}>
      <div className="aix-category-head"><h3>{group.name}</h3><span>{group.codes.filter(([code]) => byCode.has(code)).length}/{group.codes.length} found</span></div>
      <div className="aix-marker-grid">{group.codes.map(([code, label]) => {
        const mapped = byCode.get(code);
        const candidate = possibleByCode.get(code);
        return <MarkerCard key={code} code={code} label={label} observation={mapped || candidate} possible={!mapped && Boolean(candidate)} />;
      })}</div>
    </section>)}

    <section className="aix-inspection">
      <div className="aix-inspection-head"><div><h3>All extracted observations</h3><p>Search and review every value returned by the extraction service.</p></div><button type="button" onClick={downloadJson}>Download JSON</button></div>
      <div className="aix-tools">
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search raw name or canonical code" />
        <select value={decision} onChange={(event) => setDecision(event.target.value)}><option value="">All decisions</option><option value="AUTO_ACCEPT">Valid</option><option value="USER_CONFIRMATION">Confirm</option><option value="REVIEW_REQUIRED">Review</option></select>
        <select value={mapping} onChange={(event) => setMapping(event.target.value)}><option value="">All mappings</option><option value="MAPPED">Mapped</option><option value="POSSIBLE_MATCH">Possible match</option><option value="AMBIGUOUS">Ambiguous</option><option value="UNMAPPED">Unmapped</option></select>
      </div>
      <div className="aix-table-wrap"><table><thead><tr><th>Raw test</th><th>Canonical identity</th><th>Value</th><th>Range</th><th>Decision</th><th>Source</th></tr></thead><tbody>
        {filtered.length ? filtered.map((item, index) => <tr key={item.source?.lineId || index}>
          <td><strong>{item.raw?.name || "—"}</strong>{item.mapping?.method || "—"} · {Math.round((item.confidence?.overall || 0) * 100)}%{item.validation?.issues?.length > 0 && <div className="aix-issues">{item.validation.issues.map((issue) => issue.code).join(", ")}</div>}</td>
          <td><strong>{item.biomarker?.canonicalName || item.mapping?.suggestedCanonicalCode || "Not mapped"}</strong>{item.biomarker?.canonicalCode || item.mapping?.status || "—"}</td>
          <td><strong>{valueText(item.normalized?.value)} {item.normalized?.unit || ""}</strong>Raw: {String(item.raw?.value ?? "—")}</td>
          <td>{rangeText(item.normalized?.referenceRange)}</td>
          <td><span className={`aix-pill aix-pill-${item.decision === "AUTO_ACCEPT" ? "valid" : "review"}`}>{decisionText(item.decision)}</span><br />{item.mapping?.status || "—"}</td>
          <td>Page {item.source?.pageNumber || "—"}<br />{item.source?.lineId || "—"}</td>
        </tr>) : <tr><td className="aix-empty-row" colSpan="6">No observations match these filters.</td></tr>}
      </tbody></table></div>
      <details className="aix-unclassified"><summary>{report.unclassifiedContent?.length || 0} unclassified text lines</summary><div className="aix-unclassified-list">{report.unclassifiedContent?.length ? report.unclassifiedContent.map((item, index) => <div className="aix-unclassified-row" key={`${item.source?.lineId || "line"}-${index}`}>Page {item.source?.pageNumber || "—"}: {item.text}</div>) : <div className="aix-unclassified-row">No unclassified text.</div>}</div></details>
    </section>
    <div className="aix-footer-note">Testing aid only. “Missing” means the biomarker was not found in this report. Values marked for review should be confirmed before patient-facing use.</div>
  </section>;
}

export default function AiReportExtractorPage() {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState(null);
  const [report, setReport] = useState(null);
  const [fileName, setFileName] = useState("report");

  async function processFiles(fileList) {
    let session;
    try {
      const prepared = validateBrowserFiles(fileList);
      const displayName = prepared.length === 1 ? prepared[0].originalName : `${prepared.length} report photos`;
      setBusy(true);
      setReport(null);
      setFileName(displayName);
      setStatus({ type: "loading", text: "Preparing your report…" });
      session = await createUploadSession(prepared);
      setStatus({ type: "loading", text: `Uploading 0/${prepared.length}…` });
      await uploadFilesDirectly(session.uploads, prepared, (done, total) => {
        setStatus({ type: "loading", text: `Uploading ${done}/${total}…` });
      });
      setStatus({ type: "loading", text: "Reading and extracting the report…" });
      const result = await extractUploadedReport(session.reportId, session.uploads);
      setReport(result);
      setStatus({ type: "success", text: "Report analysis completed successfully." });
    } catch (error) {
      if (session) await cleanupUploadedReport(session.reportId, session.uploads);
      setStatus({ type: "error", text: error.message || "Could not process the report." });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    if (!busy) processFiles(event.dataTransfer.files);
  }

  return <main className="aix-page">
    <div className="aix-shell">
      <header className="aix-header"><div className="aix-brand"><div className="aix-mark">M</div><div><h1>Report Extractor Review</h1><div className="aix-subtitle">Muditam AI platform</div></div></div><div className="aix-private-badge">Secure & confidential</div></header>
      <section className="aix-upload-card"><div className="aix-upload-grid">
        <div><div className="aix-eyebrow">Blood report analysis</div><h2>Upload a report and review its key health values.</h2><p className="aix-intro">Upload your blood report to review important health markers and extracted observations in one place.</p>
          {status && <div className={`aix-status aix-status-${status.type}`} role="status">{status.type === "loading" && <span className="aix-spinner" />}{status.text}</div>}
        </div>
        <label className={`aix-drop ${dragging ? "aix-drop-drag" : ""} ${busy ? "aix-drop-disabled" : ""}`} onDragEnter={(event) => { event.preventDefault(); if (!busy) setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={handleDrop}>
          <input ref={inputRef} type="file" accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg" multiple disabled={busy} onChange={(event) => processFiles(event.target.files)} />
          <div><div className="aix-file-icon" /><div className="aix-drop-title">{busy ? "Please wait while the report is processed" : "Drop a report here or click to browse"}</div><div className="aix-drop-help">One PDF up to 20 MB, or up to 10 PNG/JPEG photos up to 10 MB each</div></div>
        </label>
      </div></section>
      {report && <ReportResults report={report} fileName={fileName} />}
    </div>
  </main>;
}
