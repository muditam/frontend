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
  const agentCard = screen.getByText("Anita").closest(".MuiCard-root");
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
