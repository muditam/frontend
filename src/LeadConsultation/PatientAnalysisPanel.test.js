import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import axios from "axios";

jest.mock("axios", () => ({ create: jest.fn(), get: jest.fn(), post: jest.fn() }));
jest.mock("./CallBriefCard", () => () => <div>Saved brief loaded</div>);
axios.create.mockReturnValue(axios);
process.env.REACT_APP_PATIENT_ANALYSIS_ENABLED = "true";
const PatientAnalysisPanel = require("./PatientAnalysisPanel").default;

beforeEach(() => {
  jest.useFakeTimers();
  axios.get.mockReset();
  axios.post.mockReset();
  sessionStorage.setItem("user", JSON.stringify({ permissions: { menubar: { "ai-brief": true } } }));
});
afterEach(() => {
  jest.useRealTimers();
  sessionStorage.clear();
});

test("consultation permission alone hides the AI button and makes no requests", () => {
  sessionStorage.setItem("user", JSON.stringify({ permissions: { menubar: { consultation: true } } }));
  render(<PatientAnalysisPanel customerId="123" />);
  expect(screen.queryByRole("button")).toBeNull();
  expect(axios.get).not.toHaveBeenCalled();
});

test.each(["completed", "failed"])("stops polling on API job.status=%s", async status => {
  let briefReads = 0;
  axios.get.mockImplementation(async url => {
    if (url.includes("/jobs/")) return { data: { job: {
      status, errorMessage: "Generation failed at provider",
      result: status === "completed" ? { status: "unchanged" } : null,
    } } };
    if (url.includes("/call-briefs/")) return { data: { brief: ++briefReads > 1 ? { version: 3 } : null } };
    return { data: { analysis: null } };
  });
  axios.post.mockResolvedValue({ data: { job: { jobId: "job-1" } } });
  render(<PatientAnalysisPanel customerId="123" />);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /patient call brief/i })); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /prepare call brief/i })); });
  await act(async () => { jest.advanceTimersByTime(2000); });
  if (status === "completed") expect(screen.getByText("Saved brief loaded")).toBeTruthy();
  else expect(screen.getByText("Generation failed at provider")).toBeTruthy();
  await act(async () => { jest.advanceTimersByTime(120000); });
  expect(axios.get.mock.calls.filter(([url]) => url.includes("/jobs/"))).toHaveLength(1);
});
