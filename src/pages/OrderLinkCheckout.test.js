import axios from "axios";
import {
  classifyPaymentInitiationResponse,
  buildOrderTrackingUrl,
  copyAddress,
  mergeOrderLink,
  fmt,
  getPaymentProcessingMessage,
  isPaymentActionLocked,
  isPrimaryActionDisabled,
  markPaymentAttemptPending,
  verifyPaymentWithTimeout,
} from "./OrderLinkCheckout";

jest.mock("axios", () => ({
  post: jest.fn(),
}));

describe("order-link Razorpay verification recovery", () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test.each([
    ["completed", { orderLink: { status: "order_created", shopifyOrder: { name: "#TEST" } } }],
    ["processing", { orderLink: { status: "creating_order" } }],
  ])("classifies %s initiation responses without opening Razorpay", (kind, data) => {
    expect(classifyPaymentInitiationResponse(data)).toMatchObject({ kind, orderLink: data.orderLink });
  });

  test("accepts valid new checkout credentials", () => {
    const data = { keyId: "rzp_test", orderId: "order_1", amount: 46500, currency: "INR" };
    expect(classifyPaymentInitiationResponse(data)).toEqual({ kind: "checkout", data });
  });

  test("rejects malformed initiation responses", () => {
    expect(classifyPaymentInitiationResponse({ orderId: undefined, amount: undefined })).toEqual({ kind: "invalid" });
  });

  test("preserves paise in checkout amounts and savings", () => {
    expect(fmt(441.75)).toBe("₹441.75");
    expect(fmt(23.25)).toBe("₹23.25");
  });

  test("opens the order tracking page without an unsupported order-id query", () => {
    expect(buildOrderTrackingUrl("#MA163246")).toBe("https://www.muditam.com/pages/order-tracking");
  });

  test.each([
    ["payment_creating", "Your payment setup is still in progress."],
    ["payment_pending", "A payment attempt is already in progress."],
    ["creating_order", "Your payment was received and your order is being confirmed."],
  ])("restores processing guidance for %s after reload", (status, message) => {
    expect(getPaymentProcessingMessage(status)).toContain(message);
  });

  test("does not show processing guidance for an idle link", () => {
    expect(getPaymentProcessingMessage("viewed")).toBe("");
  });

  test("copies address drafts without mutating the saved address", () => {
    const saved = { address1: "A", city: "Delhi" };
    const draft = copyAddress(saved);
    draft.address1 = "B";
    expect(saved.address1).toBe("A");
    expect(draft.address1).toBe("B");
  });

  test("preserves the expert profile when an update response omits presentation data", () => {
    const current = { expertProfile: { displayName: "Banika Ahuja" }, status: "viewed" };
    const merged = mergeOrderLink(current, { status: "cart_updated" });
    expect(merged.expertProfile.displayName).toBe("Banika Ahuja");
    expect(merged.status).toBe("cart_updated");
  });

  test("clears an explicitly unpublished profile on authoritative refresh", () => {
    const current = { id: "link-1", expert: { name: "Banika Ahuja" }, expertProfile: { displayName: "Banika Ahuja" } };
    const merged = mergeOrderLink(current, { id: "link-1", expert: { name: "Banika Ahuja" }, expertProfile: null }, { authoritative: true });
    expect(merged.expertProfile).toBeUndefined();
  });

  test("does not carry a profile to a different link or expert", () => {
    const current = { id: "link-1", expert: { name: "Banika Ahuja" }, expertProfile: { displayName: "Banika Ahuja" } };
    expect(mergeOrderLink(current, { id: "link-2", expert: { name: "Nehal Joshi" }, expertProfile: null }).expertProfile).toBeUndefined();
  });

  test("marks the local link payment-pending when checkout is dismissed", () => {
    const link = { status: "viewed", token: "token-1" };
    expect(markPaymentAttemptPending(link)).toEqual({ status: "payment_pending", token: "token-1" });
  });

  test("keeps payment actions locked while verification is in progress", () => {
    expect(isPaymentActionLocked({ paymentState: "verifying" })).toBe(true);
    expect(isPaymentActionLocked({ paymentState: "starting" })).toBe(true);
    expect(isPaymentActionLocked({ paymentState: "idle" })).toBe(false);
  });

  test("restores the lock from backend pending states after refresh", () => {
    expect(isPaymentActionLocked({ linkStatus: "payment_creating", paymentState: "idle" })).toBe(true);
    expect(isPaymentActionLocked({ linkStatus: "payment_pending", paymentState: "idle" })).toBe(true);
    expect(isPaymentActionLocked({ linkStatus: "creating_order", paymentState: "idle" })).toBe(true);
    expect(isPaymentActionLocked({ linkStatus: "viewed", paymentState: "idle" })).toBe(false);
  });

  test("disables COD action while an online payment attempt is pending", () => {
    expect(isPrimaryActionDisabled({ selected: "cod", locked: true, busy: "", codOtpBusy: false })).toBe(true);
    expect(isPrimaryActionDisabled({ selected: "cod", locked: false, busy: "", codOtpBusy: false })).toBe(false);
  });

  test("returns the verified order when verification succeeds", async () => {
    const response = { data: { orderLink: { status: "order_created" } } };
    axios.post.mockResolvedValue(response);

    await expect(verifyPaymentWithTimeout("/verify", { razorpay_payment_id: "pay_1" }, 100)).resolves.toBe(response);
  });

  test("preserves provider verification failures for the customer recovery state", async () => {
    const error = Object.assign(new Error("verification failed"), { response: { status: 500 } });
    axios.post.mockRejectedValue(error);

    await expect(verifyPaymentWithTimeout("/verify", {}, 100)).rejects.toBe(error);
  });

  test("preserves 409 in-progress responses instead of allowing a new payment", async () => {
    const error = Object.assign(new Error("already processing"), { response: { status: 409 } });
    axios.post.mockRejectedValue(error);

    await expect(verifyPaymentWithTimeout("/verify", {}, 100)).rejects.toMatchObject({ response: { status: 409 } });
  });

  test("rejects a verification request that never returns", async () => {
    jest.useFakeTimers();
    axios.post.mockReturnValue(new Promise(() => {}));

    const pending = verifyPaymentWithTimeout("/verify", {}, 1000);
    jest.advanceTimersByTime(1000);

    await expect(pending).rejects.toMatchObject({ code: "PAYMENT_VERIFICATION_TIMEOUT" });
  });
});
