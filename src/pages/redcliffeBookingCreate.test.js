import {
  bookingRequestErrorMessage,
  createBookingWithRecovery,
} from "./redcliffeBookingCreate";

const payload = { order_id: "#MA168029" };

test("returns the first successful create response without retrying", async () => {
  const response = { data: { booking_id: "19826969" } };
  const api = { post: jest.fn().mockResolvedValue(response) };
  await expect(createBookingWithRecovery(api, payload)).resolves.toBe(response);
  expect(api.post).toHaveBeenCalledTimes(1);
});

test("retries once when the first request has no HTTP response", async () => {
  const recovered = { data: { booking_id: "19826969", recovered: true } };
  const api = { post: jest.fn()
    .mockRejectedValueOnce({ request: {} })
    .mockResolvedValueOnce(recovered) };
  await expect(createBookingWithRecovery(api, payload)).resolves.toBe(recovered);
  expect(api.post).toHaveBeenCalledTimes(2);
  expect(api.post).toHaveBeenNthCalledWith(1, "/api/redcliffe/bookings/create", payload);
  expect(api.post).toHaveBeenNthCalledWith(2, "/api/redcliffe/bookings/create", payload);
});

test("does not retry an upstream validation or server response", async () => {
  const error = { response: { status: 400, data: { message: "Slot unavailable" } } };
  const api = { post: jest.fn().mockRejectedValue(error) };
  await expect(createBookingWithRecovery(api, payload)).rejects.toBe(error);
  expect(api.post).toHaveBeenCalledTimes(1);
});

test("stops after one response-less retry", async () => {
  const first = { request: {} };
  const second = { request: {}, message: "Network Error" };
  const api = { post: jest.fn().mockRejectedValueOnce(first).mockRejectedValueOnce(second) };
  await expect(createBookingWithRecovery(api, payload)).rejects.toBe(second);
  expect(api.post).toHaveBeenCalledTimes(2);
});

test("shows upstream details and identifies a missing response", () => {
  expect(bookingRequestErrorMessage({ response: { data: { message: "Slot unavailable" } } }, "Failed"))
    .toBe("Slot unavailable");
  expect(bookingRequestErrorMessage({ response: { data: { error: "Invalid package" } } }, "Failed"))
    .toBe("Invalid package");
  expect(bookingRequestErrorMessage({ request: {} }, "Failed to create booking."))
    .toBe("Failed to create booking. The server response was not received.");
});
