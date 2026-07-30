import { useState, type FormEvent } from "react";
import { apiRequest, formatRs, today } from "../api";
import { AppSelect } from "../components/AppSelect";
import { useApiList } from "../hooks/useApiList";
import appStyles from "../styles/app.module.css";
import type { Bundle, Order } from "../types";
import styles from "./IntakePage.module.css";

// Coordinates order creation, bundle entry, and physical arrival recording in one intake workspace.
export function IntakePage() {
  const orders = useApiList<Order>("/api/orders", "orders"); const bundles = useApiList<Bundle>("/api/bundles", "bundles");
  const [orderId, setOrderId] = useState(""); const [bundleId, setBundleId] = useState("");
  const [received, setReceived] = useState(""); const [arrivalDate, setArrivalDate] = useState(today());
  const [saving, setSaving] = useState(""); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const selectedBundle = bundles.data.find((bundle) => bundle.bundleId === Number(bundleId));
  const receivedCount = Number(received || 0); const itemsLost = selectedBundle ? Math.max(0, selectedBundle.itemsOrdered - receivedCount) : 0;
  const pendingBundles = bundles.data.filter((bundle) => bundle.status === "pending");

  // Creates the purchase header while keeping transportation cost at order level.
  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setSaving("order"); setError(""); setMessage("");
    try { const response = await apiRequest<{ order: Order }>("/api/orders", { method: "POST", body: JSON.stringify({ supplier_or_country: form.get("supplier"), order_date: form.get("date"), transportation_fee: Number(form.get("fee")), expected_bundle_count: Number(form.get("count")) }) }); setOrderId(String(response.order.orderId)); setMessage(`Order #${response.order.orderId} created.`); event.currentTarget.reset(); await orders.refresh(); }
    catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "The order could not be created."); } finally { setSaving(""); }
  }

  // Adds a purchase bundle to the selected ongoing order without changing per-item cost rules.
  async function createBundle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!orderId) return; const form = new FormData(event.currentTarget); setSaving("bundle"); setError(""); setMessage("");
    try { const response = await apiRequest<{ bundle: Bundle }>(`/api/orders/${orderId}/bundles`, { method: "POST", body: JSON.stringify({ type: form.get("type"), design_name: form.get("design"), items_ordered: Number(form.get("items")), cost_per_item: Number(form.get("cost")) }) }); setBundleId(String(response.bundle.bundleId)); setMessage(`Bundle #${response.bundle.bundleId} added.`); event.currentTarget.reset(); await bundles.refresh(); }
    catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "The bundle could not be added."); } finally { setSaving(""); }
  }

  // Records received units and makes the pending transit loss visible before committing it.
  async function markArrived(event: FormEvent) {
    event.preventDefault(); if (!selectedBundle) return; setSaving("arrival"); setError(""); setMessage("");
    try { await apiRequest(`/api/bundles/${selectedBundle.bundleId}/arrive`, { method: "POST", body: JSON.stringify({ items_received: receivedCount, arrival_date: arrivalDate }) }); setMessage(`Bundle #${selectedBundle.bundleId} received. ${receivedCount} inventory items created.`); setBundleId(""); setReceived(""); await bundles.refresh(); }
    catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "The arrival could not be recorded."); } finally { setSaving(""); }
  }

  return <><header className={appStyles.pageHeader}><div><p className={appStyles.eyebrow}>Purchase workflow</p><h1 className={appStyles.title}>Intake</h1><p className={appStyles.subtitle}>Create the order, add bundles, then record what arrived.</p></div></header>{(orders.error || bundles.error || error) && <div className={appStyles.error}>{orders.error || bundles.error || error}</div>}{message && <div className={appStyles.success}>{message}</div>}<div className={`${styles.columns} ${appStyles.contentStack}`}>
    <form className={`${appStyles.card} ${appStyles.formGrid}`} onSubmit={createOrder}><h2 className={`${appStyles.cardTitle} ${appStyles.full}`}>1. New order</h2><label className={`${appStyles.field} ${appStyles.full}`}>Supplier or country<input required name="supplier" className={appStyles.input} /></label><label className={appStyles.field}>Order date<input required name="date" type="date" defaultValue={today()} className={appStyles.input} /></label><label className={appStyles.field}>Transport fee<input required name="fee" type="number" min="0" defaultValue="0" className={appStyles.input} /></label><label className={appStyles.field}>Expected bundles<input required name="count" type="number" min="1" defaultValue="1" className={appStyles.input} /></label><button className={`${appStyles.button} ${appStyles.full}`} disabled={saving === "order"}>{saving === "order" ? "Creating…" : "Create Order"}</button></form>
    <form className={`${appStyles.card} ${appStyles.formGrid}`} onSubmit={createBundle}><h2 className={`${appStyles.cardTitle} ${appStyles.full}`}>2. Add bundle</h2><div className={appStyles.full}><AppSelect label="Order" value={orderId} onValueChange={setOrderId} placeholder="Select order" options={orders.data.filter((order) => order.status === "ongoing").map((order) => ({ value: String(order.orderId), label: `#${order.orderId} · ${order.supplierOrCountry}` }))} /></div><label className={appStyles.field}>Type<input required name="type" className={appStyles.input} placeholder="e.g. shirt" /></label><label className={appStyles.field}>Design name<input required name="design" className={appStyles.input} /></label><label className={appStyles.field}>Items ordered<input required name="items" type="number" min="1" className={appStyles.input} /></label><label className={appStyles.field}>Cost per item<input required name="cost" type="number" min="0" className={appStyles.input} /></label><button className={`${appStyles.button} ${appStyles.full}`} disabled={!orderId || saving === "bundle"}>{saving === "bundle" ? "Adding…" : "Add Bundle"}</button></form>
    <form className={`${appStyles.card} ${appStyles.formGrid} ${appStyles.full}`} onSubmit={markArrived}><h2 className={`${appStyles.cardTitle} ${appStyles.full}`}>3. Mark bundle arrived</h2><div className={appStyles.full}><AppSelect label="Pending bundle" value={bundleId} onValueChange={(value) => { setBundleId(value); setReceived(""); }} placeholder="Select pending bundle" options={pendingBundles.map((bundle) => ({ value: String(bundle.bundleId), label: `#${bundle.bundleId} · ${bundle.designName} (${bundle.itemsOrdered} ordered)` }))} /></div>{selectedBundle && <><div className={`${styles.summary} ${appStyles.full}`}><div><span>Ordered</span><strong>{selectedBundle.itemsOrdered}</strong></div><div><span>Cost per item</span><strong>{formatRs(selectedBundle.costPerItem)}</strong></div></div><label className={appStyles.field}>Items received<input required type="number" min="0" max={selectedBundle.itemsOrdered} value={received} onChange={(event) => setReceived(event.target.value)} className={appStyles.input} /></label><label className={appStyles.field}>Arrival date<input required type="date" value={arrivalDate} onChange={(event) => setArrivalDate(event.target.value)} className={appStyles.input} /></label>{received !== "" && itemsLost > 0 && <div className={`${styles.loss} ${appStyles.full}`}>Transit loss: {itemsLost} item{itemsLost === 1 ? "" : "s"}<strong>{formatRs(itemsLost * selectedBundle.costPerItem)}</strong></div>}<button className={`${appStyles.button} ${appStyles.full}`} disabled={received === "" || saving === "arrival"}>{saving === "arrival" ? "Recording…" : "Mark Bundle Arrived"}</button></>}</form>
  </div></>;
}