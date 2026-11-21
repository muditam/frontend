export async function createBookingWithRecovery(api, payload) {
  try {
    return await api.post("/api/redcliffe/bookings/create", payload);
  } catch (error) {
    if (error?.response) throw error;
    return api.post("/api/redcliffe/bookings/create", payload);
  }
}

export function bookingRequestErrorMessage(error, fallbackMessage) {
  const payload = error?.response?.data || {};
  return (
    payload.message ||
    payload.detail ||
    payload.error ||
    (error?.request ? `${fallbackMessage} The server response was not received.` : error?.message) ||
    fallbackMessage
  );
}
