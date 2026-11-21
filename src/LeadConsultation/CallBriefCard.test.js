import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CallBriefCard from "./CallBriefCard";

const brief = {
  patient: { name: "Example patient" },
  decision: "CALL_LATER",
  when: "Follow-up 20 Nov",
  confidence: "medium",
  goal: "Confirm delivery and payment",
  glance: [{ text: "Payment pending", source: "Order", date: "2026-11-17" }],
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

test("renders goal and sourced facts while keeping the script and outcomes", () => {
  const card = renderCard(brief);
  expect(card.querySelectorAll(".cb-lines dd")).toHaveLength(1);
  expect(card.querySelector(".cb-lines dd").textContent).toBe(brief.lines.nextStep.text);
  expect(card.querySelector(".cb-goal").textContent).toContain(brief.goal);
  expect(card.querySelector(".cb-fact").textContent).toContain("Payment pending");
  expect(card.querySelector(".cb-fact small").textContent).toContain("Order · 17 Nov");
  expect(card.querySelector(".cb-say p").textContent).toBe(brief.opener);
  expect(card.querySelector(".cb-outcome").textContent).toContain(brief.afterCall[0].label);
});

test("keeps the goal visible when low confidence hides the script", () => {
  const card = renderCard({ ...brief, confidence: "low" });
  expect(card.querySelector(".cb-goal").textContent).toContain(brief.goal);
  expect(card.querySelector(".cb-say")).toBeNull();
  expect(card.querySelector(".cb-warn")).not.toBeNull();
});

test("shows a refresh hint for older cards without goal or facts", () => {
  const card = renderCard({ ...brief, goal: undefined, glance: undefined });
  expect(card.querySelector(".cb-goal")).toBeNull();
  expect(Array.from(card.querySelectorAll("dt"), node => node.textContent)).toEqual(["Situation", "Next step", "Trust"]);
  expect(Array.from(card.querySelectorAll("dd"), node => node.textContent)).toEqual([
    brief.lines.situation.text, brief.lines.nextStep.text, brief.lines.trust.text,
  ]);
  expect(card.querySelectorAll(".cb-fact")).toHaveLength(0);
  expect(renderCard(null).innerHTML).toBe("");
});
