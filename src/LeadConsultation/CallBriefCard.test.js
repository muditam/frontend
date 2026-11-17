import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CallBriefCard from "./CallBriefCard";

const brief = {
  patient: { name: "Example patient" },
  decision: "CALL_LATER",
  when: "Follow-up 20 Nov",
  confidence: "medium",
  lines: {
    situation: { text: "The order is awaiting delivery and payment.", evidence: ["e1"] },
    nextStep: { text: "Confirm delivery and payment at the scheduled follow-up.", evidence: ["e1", "e2"] },
    trust: { text: "Acknowledge the delay before discussing another purchase.", evidence: ["e1"] },
  },
  opener: "Hello, I am calling about your order.",
  afterCall: [{ label: "Follow up on delivery", leadStatus: "Follow Up", followUpOn: "2026-11-20" }],
};

function renderCard(value) {
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(<CallBriefCard brief={value} />);
  return container;
}

test("renders all three nested brief lines without legacy fields and keeps the script and outcomes", () => {
  const card = renderCard(brief);
  expect(Array.from(card.querySelectorAll("dt"), (node) => node.textContent)).toEqual(["Situation", "Next step", "Trust"]);
  expect(Array.from(card.querySelectorAll("dd"), (node) => node.textContent)).toEqual([
    brief.lines.situation.text, brief.lines.nextStep.text, brief.lines.trust.text,
  ]);
  expect(card.querySelector(".cb-goal")).toBeNull();
  expect(card.querySelector(".cb-say p").textContent).toBe(brief.opener);
  expect(card.querySelector(".cb-outcome").textContent).toContain(brief.afterCall[0].label);
});

test("keeps rule-based brief lines visible when low confidence hides the script", () => {
  const card = renderCard({ ...brief, confidence: "low" });
  expect(card.querySelectorAll("dd")).toHaveLength(3);
  expect(card.textContent).toContain(brief.lines.trust.text);
  expect(card.querySelector(".cb-say")).toBeNull();
  expect(card.querySelector(".cb-warn")).not.toBeNull();
});

test("shows an explicit refresh hint for missing or blank lines instead of empty sections", () => {
  const card = renderCard({ ...brief, lines: { situation: { text: "   " } } });
  for (const line of card.querySelectorAll("dd")) {
    expect(line.textContent).toBe("Not available. Refresh the call brief to load this detail.");
  }
  expect(renderCard({ ...brief, lines: undefined }).querySelectorAll("dd")).toHaveLength(3);
  expect(renderCard(null).innerHTML).toBe("");
});
