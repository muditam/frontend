import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import axios from "axios";

jest.mock("axios", () => ({ create: jest.fn(), get: jest.fn(), post: jest.fn() }));
jest.mock("./CallBriefCard", () => () => <div>Saved brief loaded</div>);
axios.create.mockReturnValue(axios);
process.env.REACT_APP_PATIENT_ANALYSIS_ENABLED = "true";
const PatientAnalysisPanel = require("./PatientAnalysisPanel").default;
const apiOptions = axios.create.mock.calls[0][0];

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
    if (url.includes("/call-briefs/")) return { data: { brief: ++briefReads > 1 && status === "completed" ? { version: 3 } : null } };
    return { data: { analysis: null } };
  });
  axios.post.mockResolvedValue({ data: { job: { jobId: "job-1" } } });
  render(<PatientAnalysisPanel customerId="123" />);
  fireEvent.click(screen.getByRole("button", { name: /patient call brief/i }));
  await act(async () => { jest.advanceTimersByTime(0); });
  fireEvent.click(screen.getByRole("button", { name: /prepare call brief/i }));
  await act(async () => { jest.advanceTimersByTime(0); });
  await act(async () => { jest.advanceTimersByTime(2000); });
  const expectedText = status === "completed" ? "Saved brief loaded" : "Generation failed at provider";
  expect(screen.getByText(expectedText)).toBeTruthy();
  await act(async () => { jest.advanceTimersByTime(120000); });
  expect(axios.get.mock.calls.filter(([url]) => url.includes("/jobs/"))).toHaveLength(1);
});

async function openPanel() {
  await act(async () => { jest.advanceTimersByTime(300); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /patient call brief/i })); });
}
async function startSource() {
  fireEvent.click(screen.getByText("View source history (optional)"));
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /refresh source history/i })); });
}

test("source history accepts raw state and reloads saved analysis on completion", async () => {
  let reads = 0;
  axios.get.mockImplementation(async url => {
    if (url.includes("/jobs/")) return { data: { job: { state: "completed" } } };
    if (url.includes("/call-briefs/")) return { data: { brief: null } };
    return { data: { analysis: ++reads > 1 ? { version: 2, summary: { callSummary: "Verified call summary" } } : null } };
  });
  axios.post.mockResolvedValue({ data: { job: { jobId: "summary-job" } } });
  render(<PatientAnalysisPanel customerId="123" />);
  await openPanel();
  await startSource();
  expect(screen.getByText("Verified call summary")).toBeTruthy();
  expect(screen.queryByRole("progressbar")).toBeNull();
});

test.each(["brief", "analysis"])("%s polling has a deadline and leaves close and retry available", async kind => {
  axios.get.mockImplementation(async url => url.includes("/jobs/")
    ? { data: { job: { status: "queued" } } } : { data: { brief: null, analysis: null } });
  axios.post.mockResolvedValue({ data: { job: { jobId: "waiting-job" } } });
  render(<PatientAnalysisPanel customerId="123" />);
  await openPanel();
  if (kind === "analysis") await startSource();
  else await act(async () => { fireEvent.click(screen.getByRole("button", { name: /prepare call brief/i })); });
  await act(async () => { jest.advanceTimersByTime(5 * 60 * 1000); });
  expect(screen.getByText(/Still processing in the background/)).toBeTruthy();
  expect(screen.queryByRole("progressbar")).toBeNull();
  expect(screen.getByRole("button", { name: /^close$/i }).disabled).toBe(false);
});

test.each(["brief", "analysis"])("closing during %s cancels polling; reopening loads saved results", async kind => {
  let saved = false;
  axios.get.mockImplementation(async url => url.includes("/jobs/")
    ? { data: { job: { status: "queued" } } }
    : { data: { brief: saved ? { version: 2 } : null, analysis: null } });
  axios.post.mockResolvedValue({ data: { job: { jobId: "waiting-job" } } });
  render(<PatientAnalysisPanel customerId="123" />);
  await openPanel();
  if (kind === "analysis") await startSource();
  else await act(async () => { fireEvent.click(screen.getByRole("button", { name: /prepare call brief/i })); });
  const calls = axios.get.mock.calls.length;
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /^close$/i })); });
  await act(async () => { jest.advanceTimersByTime(15000); });
  expect(axios.get).toHaveBeenCalledTimes(calls);
  saved = true;
  await openPanel();
  expect(screen.getByText("Saved brief loaded")).toBeTruthy();
  expect(screen.queryByRole("progressbar")).toBeNull();
});

test("patient change aborts an in-flight request and ignores its late completion", async () => {
  let resolveJob;
  let jobSignal;
  axios.get.mockImplementation((url, options) => {
    if (url.includes("/jobs/")) {
      jobSignal = options.signal;
      return new Promise(resolve => { resolveJob = resolve; });
    }
    return Promise.resolve({ data: { brief: null, analysis: null } });
  });
  axios.post.mockResolvedValue({ data: { job: { jobId: "waiting-job" } } });
  const view = render(<PatientAnalysisPanel customerId="123" />);
  await openPanel();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /prepare call brief/i })); });
  view.rerender(<PatientAnalysisPanel customerId="456" />);
  expect(jobSignal.aborted).toBe(true);
  const calls = axios.get.mock.calls.length;
  await act(async () => { resolveJob({ data: { job: { status: "completed" } } }); });
  expect(axios.get).toHaveBeenCalledTimes(calls);
  await openPanel();
  expect(screen.queryByText("Saved brief loaded")).toBeNull();
  expect(screen.queryByRole("progressbar")).toBeNull();
});

test("lost job status falls back to a newly saved brief", async () => {
  let reads = 0;
  axios.get.mockImplementation(async url => {
    if (url.includes("/jobs/")) throw new Error("Job not found");
    if (url.includes("/call-briefs/")) return { data: { brief: ++reads > 1 ? { version: 2 } : null } };
    return { data: { analysis: null } };
  });
  axios.post.mockResolvedValue({ data: { job: { jobId: "pruned-job" } } });
  render(<PatientAnalysisPanel customerId="123" />);
  await openPanel();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /prepare call brief/i })); });
  expect(screen.getByText("Saved brief loaded")).toBeTruthy();
  expect(screen.queryByRole("progressbar")).toBeNull();
  expect(screen.queryByText("Job not found")).toBeNull();
});

test("unmount aborts outstanding HTTP requests", async () => {
  let signal;
  axios.get.mockImplementation((_url, options) => {
    signal = options.signal;
    return new Promise(() => {});
  });
  const view = render(<PatientAnalysisPanel customerId="123" />);
  fireEvent.click(screen.getByRole("button", { name: /patient call brief/i }));
  view.unmount();
  expect(signal.aborted).toBe(true);
});

test("malformed job responses stop the spinner instead of polling forever", async () => {
  axios.get.mockResolvedValue({ data: {} });
  axios.post.mockResolvedValue({ data: { job: { jobId: "broken-job" } } });
  render(<PatientAnalysisPanel customerId="123" />);
  await openPanel();
  await startSource();
  expect(screen.getByText(/Unable to read generation progress/)).toBeTruthy();
  expect(screen.queryByRole("progressbar")).toBeNull();
});

test("rapid clicks submit only one job and requests have a finite timeout", async () => {
  expect(apiOptions.timeout).toBe(20000);
  axios.get.mockResolvedValue({ data: { brief: null, analysis: null } });
  axios.post.mockImplementation(() => new Promise(() => {}));
  render(<PatientAnalysisPanel customerId="123" />);
  await openPanel();
  const button = screen.getByRole("button", { name: /prepare call brief/i });
  await act(async () => { fireEvent.click(button); fireEvent.click(button); });
  expect(axios.post).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: /^close$/i }));
  expect(axios.post.mock.calls[0][2].signal.aborted).toBe(true);
});
