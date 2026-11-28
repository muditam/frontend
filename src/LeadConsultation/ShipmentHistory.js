import React from "react";
import "./CallBriefCard.css";

const timeOf = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
};

export default function ShipmentHistory({ shipments = [], orderFacts = [] }) {
  if (!shipments.length && !orderFacts.length) return null;

  const shipmentTime = shipment => Math.max(...[shipment.latestEventAt, shipment.sourceUpdatedAt]
    .map(value => Date.parse(value) || 0));
  const latestShipment = [...shipments].sort((a, b) => shipmentTime(b) - shipmentTime(a))[0];

  return (
    <section className="cb-shipments" aria-label="Shipment history">
      <h3>Shipment history</h3>
      {orderFacts.length > 0 && (
        <div className="cb-glance">
          {orderFacts.map((fact, index) => (
            <div className="cb-fact" key={`${fact.source || "order"}-${index}`}>
              <strong>{fact.text}</strong>
              <small>{fact.source}{fact.date ? ` · ${new Date(fact.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}` : ""}</small>
            </div>
          ))}
        </div>
      )}
      {latestShipment && <>
        <p>{latestShipment.orderId} · {latestShipment.status || "Tracking unavailable"}{latestShipment.stale ? " · May be stale" : ""}</p>
        <details><summary>Shipment details and events</summary>
          {shipments.map((shipment, index) => <div className="cb-fact" key={shipment.orderId || index}>
            <strong>{shipment.orderId} · {shipment.status || "Tracking unavailable"}</strong>
            <small>{shipment.trackingNumber}{shipment.latestEventAt ? ` · Latest event ${timeOf(shipment.latestEventAt)}` : " · Event time unavailable"}</small>
            <small>Source updated: {timeOf(shipment.sourceUpdatedAt) || "Unknown"} · Fetched: {timeOf(shipment.fetchedAt) || "Unknown"}</small>
            {shipment.stale && <div className="cb-warn">Tracking may be stale. Confirm the latest delivery status before advising the patient.</div>}
            {shipment.events?.length > 0 && <details><summary>Tracking events</summary>
              {shipment.events.map((event, i) => <p key={i}>{event.status} · {timeOf(event.eventAt) || "Time unknown"}{event.location ? ` · ${event.location}` : ""}{event.remarks ? ` · ${event.remarks}` : ""}</p>)}
            </details>}
          </div>)}
        </details>
      </>}
    </section>
  );
}
