export function managerShipmentGroup(label = "") {
  const status = String(label).trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (status === "DELIVERED") return "delivered";
  if (["RTO_DELIVERED", "RTO_RECEIVED", "RETURN_DELIVERED"].includes(status)) return "rto_delivered";
  if (status === "RTO" || status.startsWith("RTO_") || status.startsWith("RETURN_TO_ORIGIN")) return "rto";
  if (["IN_TRANSIT", "PICKED_UP", "SHIPPED"].includes(status)) return "in_transit";
  if (status === "OUT_FOR_DELIVERY") return "out_for_delivery";
  return "other";
}
