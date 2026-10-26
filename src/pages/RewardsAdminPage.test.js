import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import axios from "axios";
import RewardsAdminPage from "./RewardsAdminPage";

jest.mock("axios", () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock("../utils/apiCache", () => ({
  clearCachedData: jest.fn(),
  getCachedData: (_key, fetcher) => fetcher(),
}));

const requests = [
  { _id: "a", employeeId: "agent-1", agentName: "Anita", requestedCoinBudget: 100, extractedTitle: "Headphones" },
  { _id: "b", employeeId: "agent-1", agentName: "Anita", requestedCoinBudget: 200, extractedTitle: "Keyboard" },
  { _id: "c", employeeId: "agent-2", agentName: "Bhavna", requestedCoinBudget: 50, extractedTitle: "Mouse" },
];

beforeEach(() => {
  axios.get.mockReset();
  axios.get.mockImplementation(async (url, config) => {
    if (url.endsWith("/api/rewards")) return { data: [] };
    if (url.endsWith("/api/custom-reward")) return { data: { requests: config.params.status === "pending" ? requests : [] } };
    return { data: { walletCoin: { earnedCoins: 100 }, wallet: { availableCoin: 0, totalCoinReceived: 0, totalCoinRedeemed: 150 } } };
  });
});

test("groups multiple rewards into one agent card and preserves negative balances", async () => {
  render(<RewardsAdminPage />);
  fireEvent.click(await screen.findByRole("tab", { name: "Pending Requests (3)" }));
  const agentCard = screen.getByRole("region", { name: "Anita pending rewards" });
  expect(within(agentCard).getByText("Headphones")).toBeTruthy();
  expect(within(agentCard).getByText("Keyboard")).toBeTruthy();
  expect(within(agentCard).getAllByRole("button", { name: "Approve" })).toHaveLength(2);
  expect(within(agentCard).getByText("300")).toBeTruthy();
  await waitFor(() => expect(within(agentCard).getByText("-50")).toBeTruthy());
  expect(within(agentCard).getByText("-350")).toBeTruthy();
  fireEvent.mouseDown(screen.getByRole("combobox"));
  fireEvent.click(await screen.findByRole("option", { name: "Anita" }));
  expect(screen.queryByText("Mouse")).toBeNull();
  expect(screen.getByText("Keyboard")).toBeTruthy();
});

test("a wallet failure keeps rewards visible and does not invent a zero balance", async () => {
  const original = axios.get.getMockImplementation();
  axios.get.mockImplementation((url, config) => url.endsWith("/api/incentives-new")
    ? Promise.reject(new Error("Offline")) : original(url, config));
  render(<RewardsAdminPage />);
  fireEvent.click(await screen.findByRole("tab", { name: "Pending Requests (3)" }));
  await screen.findAllByText("Could not load this agent’s wallet balance.");
  expect(screen.getByText("Headphones")).toBeTruthy();
  expect(screen.getAllByText("Unavailable")).toHaveLength(4);
});

test("shows completed balances while another agent is still loading", async () => {
  const original = axios.get.getMockImplementation();
  let resolveSlow;
  axios.get.mockImplementation((url, config) => {
    if (url.endsWith("/api/incentives-new") && config.params.agentName === "Bhavna") {
      return new Promise((resolve) => { resolveSlow = resolve; });
    }
    return original(url, config);
  });
  render(<RewardsAdminPage />);
  fireEvent.click(await screen.findByRole("tab", { name: "Pending Requests (3)" }));
  const anita = screen.getByRole("region", { name: "Anita pending rewards" });
  const bhavna = screen.getByRole("region", { name: "Bhavna pending rewards" });
  await waitFor(() => expect(within(anita).getByText("-50")).toBeTruthy());
  expect(within(bhavna).getAllByText("Loading…")).toHaveLength(2);
  expect(within(bhavna).getAllByText("50")).toHaveLength(2);
  resolveSlow({ data: { walletCoin: { earnedCoins: 200 }, wallet: { totalCoinReceived: 0, totalCoinRedeemed: 0 } } });
  await waitFor(() => expect(within(bhavna).getByText("150")).toBeTruthy());
});

test("limits simultaneous wallet lookups and aborts them when leaving the tab", async () => {
  const original = axios.get.getMockImplementation();
  const signals = [];
  axios.get.mockImplementation((url, config) => {
    if (url.endsWith("/api/custom-reward") && config.params.status === "pending") {
      return Promise.resolve({ data: { requests: Array.from({ length: 6 }, (_, i) => ({
        _id: `request-${i}`, employeeId: `agent-${i}`, agentName: `Agent ${i}`, requestedCoinBudget: 10,
      })) } });
    }
    if (url.endsWith("/api/incentives-new")) {
      signals.push(config.signal);
      return new Promise(() => {});
    }
    return original(url, config);
  });
  const { unmount } = render(<RewardsAdminPage />);
  fireEvent.click(await screen.findByRole("tab", { name: "Pending Requests (6)" }));
  await waitFor(() => expect(signals).toHaveLength(3));
  unmount();
  expect(signals.every((signal) => signal.aborted)).toBe(true);
});

test("custom approval shows read-only details and sends only after confirmation", async () => {
  axios.post.mockReset();
  axios.post.mockResolvedValue({ data: {} });
  render(<RewardsAdminPage />);
  fireEvent.click(await screen.findByRole("tab", { name: "Pending Requests (3)" }));
  fireEvent.click(within(screen.getByRole("region", { name: "Anita pending rewards" })).getAllByRole("button", { name: "Approve" })[0]);
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText("Headphones")).toBeTruthy();
  expect(within(dialog).getByText("Coins: 100")).toBeTruthy();
  expect(within(dialog).queryByRole("textbox")).toBeNull();
  expect(axios.post).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Yes, Approve" }));
  await waitFor(() => expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/api/custom-reward/a/approve'), {}, expect.any(Object)));
});

test("already-approved response refreshes lists and closes stale confirmation", async () => {
  const original = axios.get.getMockImplementation();
  let approved = false;
  axios.get.mockImplementation((url, config) => {
    if (url.endsWith('/api/custom-reward') && approved) {
      return Promise.resolve({ data: { requests: config.params.status === 'pending'
        ? requests.slice(1) : [{ ...requests[0], status: 'approved' }] } });
    }
    return original(url, config);
  });
  axios.post.mockReset();
  axios.post.mockImplementation(async () => {
    approved = true;
    throw { response: { status: 400, data: { message: 'Request is already approved' } } };
  });
  render(<RewardsAdminPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Pending Requests (3)' }));
  fireEvent.click(within(screen.getByRole('region', { name: 'Anita pending rewards' })).getAllByRole('button', { name: 'Approve' })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Yes, Approve' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  await screen.findByRole('tab', { name: 'Pending Requests (2)' });
  expect(screen.queryByText('Headphones')).toBeNull();
  fireEvent.click(screen.getByRole('tab', { name: /Approved Requests/ }));
  expect(await screen.findByText('Headphones')).toBeTruthy();
  expect(axios.post).toHaveBeenCalledTimes(1);
});
