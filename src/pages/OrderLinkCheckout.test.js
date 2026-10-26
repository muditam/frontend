import axios from "axios";
import {
  classifyPaymentInitiationResponse,
  isPaymentActionLocked,
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
