import React, { useState } from "react";
import "./CallBriefCard.css";

export const DECISION_META = {
  ROUTE_TO_DOCTOR: { band: "Doctor first · don't sell", tag: "Doctor", sayLabel: "Say first" },
  ROUTE_TO_SUPPORT: { band: "Support handoff · don't sell", tag: "Support", sayLabel: "Only if they call in" },
  CALL_NOW: { band: "Call now", tag: "Call", sayLabel: "Say first" },
  CALL_LATER: { band: "Call later", tag: "Later", sayLabel: "Say first" },
  WHATSAPP_ONLY: { band: "WhatsApp only · no call", tag: "WhatsApp", sayLabel: "Send this message" },
  DO_NOT_CALL: { band: "Do not call", tag: "Skip", sayLabel: "" },
};

const shortDate = (iso) => {
  if (!iso) return "";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00+05:30`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
};

const timeOf = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
};

export default function CallBriefCard({ brief, onLog, onRefresh }) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(null);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState("");

  if (!brief) return null;
  const meta = DECISION_META[brief.decision] || DECISION_META.CALL_NOW;
  const showScript = brief.decision !== "DO_NOT_CALL" && brief.confidence !== "low";

  const copyOpener = async () => {
    try {
      await navigator.clipboard.writeText(brief.opener);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch (_) {}
  };

  const log = async (outcome, index) => {
    if (!onLog || saving !== null) return;
    setSaving(index);
    setError("");
    try {
      await onLog(outcome);
      setSaved(index);
    } catch (e) {
      setError(e?.message || "Could not save. Try again.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <article className={`cb-card cb-${brief.decision}`}>
      <header className="cb-band">
        <strong>{meta.band}</strong>
        <span>{brief.when}</span>
      </header>

      <section className="cb-zone cb-dial">
        <div className="cb-zone-label">Before you dial</div>
        <div className="cb-who">
          <h3>{brief.patient?.name || "Unnamed patient"}</h3>
          {brief.patient?.meta && <span className="cb-meta">{brief.patient.meta}</span>}
          {brief.language && <span className="cb-lang">Speak {brief.language}</span>}
        </div>
        <p className="cb-goal"><small>Goal</small>{brief.goal}</p>
        {brief.glance?.length > 0 && (
          <div className="cb-glance">
            {brief.glance.slice(0, 3).map((g, i) => (
              <div className="cb-chip" key={i}>
                <b>{g.text}</b>
                <span>{g.source}{g.date ? ` · ${shortDate(g.date)}` : ""}</span>
              </div>
            ))}
          </div>
        )}
        {brief.confidence === "low" && (
          <div className="cb-warn">Card not reliable{brief.gaps?.length ? `: ${brief.gaps.join(", ")}` : ""}. Check the lead history before calling.</div>
        )}
      </section>

      {showScript && (
        <section className="cb-zone">
          <div className="cb-zone-label">On the call</div>
          {brief.opener && (
            <div className="cb-say">
              <span className="cb-say-label">{meta.sayLabel}</span>
              <p>{brief.opener}</p>
              <button type="button" className="cb-btn" onClick={copyOpener}>{copied ? "Copied" : "Copy"}</button>
            </div>
          )}
          {brief.steps?.length > 0 && (
            <ol className="cb-steps">
              {brief.steps.slice(0, 3).map((s, i) => (
                <li key={i}><span><b>{s.verb}</b> {s.rest}</span></li>
              ))}
            </ol>
          )}
          {brief.offer && (
            <div className="cb-offer">
              <span>Offer</span>
              <b>{brief.offer.product} {brief.offer.pack}</b>
              <span>{brief.offer.basis === "last_order" ? "same as last order" : "as advised in consultation"} · no extra discount</span>
            </div>
          )}
          {brief.ifTheySay?.length > 0 && (
            <div className="cb-ifsay">
              <span className="cb-mini">If they say</span>
              {brief.ifTheySay.slice(0, 2).map((o, i) => (
                <div className="cb-ifrow" key={i}>
                  <q>{o.trigger}</q>
                  <span>{o.reply}</span>
                </div>
              ))}
            </div>
          )}
          {brief.dont && <div className="cb-dont">{brief.dont}</div>}
        </section>
      )}

      {brief.afterCall?.length > 0 && (
        <section className="cb-zone">
          <div className="cb-zone-label">After the call · tap one</div>
          <div className="cb-after">
            {brief.afterCall.map((a, i) => (
              <button
                type="button"
                key={i}
                className={`cb-btn cb-outcome${i === 0 ? " cb-primary" : ""}${saved === i ? " cb-saved" : ""}`}
                disabled={saving !== null || saved !== null}
                onClick={() => log(a, i)}
              >
                {saved === i ? "Saved ✓" : saving === i ? "Saving…" : a.label}
                <small>{a.leadStatus}{a.followUpOn ? ` · ${shortDate(a.followUpOn)}` : ""}</small>
              </button>
            ))}
          </div>
          {error && <div className="cb-error">{error}</div>}
        </section>
      )}

      <footer className="cb-foot">
        <span>Card made {timeOf(brief.generatedAt)}</span>
        {brief.hasNewActivity ? (
          <button type="button" className="cb-link" onClick={onRefresh}>New activity since this card · refresh</button>
        ) : (
          <span>No new activity since</span>
        )}
      </footer>
    </article>
  );
}
