import { useState, type FormEvent } from "react";
import { apiRequest, formatRs, today } from "../api";
import type { Bundle } from "../types";
import buttonStyles from "./Button.module.css";
import cardStyles from "./Card.module.css";
import formStyles from "./Form.module.css";
import inputStyles from "./Input.module.css";
import styles from "./BundleCard.module.css";

type BundleCardProps = {
  bundle: Bundle;
  onUpdated: (updatedBundle: Bundle) => void;
};

// Presents one shipment unit and keeps its arrival verification beside the immutable order facts.
export function BundleCard({ bundle, onUpdated }: BundleCardProps) {
  const [arrivalOpen, setArrivalOpen] = useState(false);
  const [itemsReceived, setItemsReceived] = useState(String(bundle.itemsOrdered));
  const [arrivalDate, setArrivalDate] = useState(today());
  const [variant, setVariant] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const receivedCount = Number(itemsReceived);
  const itemsLost = Number.isFinite(receivedCount) ? Math.max(0, bundle.itemsOrdered - receivedCount) : 0;

  // Records received units, shared variant, and any partial transit loss in one transaction.
  async function markArrived(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      const response = await apiRequest<{ bundle: Bundle }>(`/api/bundles/${bundle.bundleId}/arrive`, {
        method: "POST",
        body: JSON.stringify({ items_received: receivedCount, arrival_date: arrivalDate, variant }),
      });
      onUpdated(response.bundle); setArrivalOpen(false);
    } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "The arrival could not be recorded."); }
    finally { setSaving(false); }
  }

  // Routes total non-arrival through the verified full-bundle loss outcome after owner confirmation.
  async function markLost() {
    if (!window.confirm(`Mark ${bundle.type} · ${bundle.designName} as fully lost? No inventory items will be created.`)) return;
    setSaving(true); setError("");
    try {
      const response = await apiRequest<{ bundle: Bundle }>(`/api/bundles/${bundle.bundleId}/arrive`, {
        method: "POST",
        body: JSON.stringify({ items_received: 0, arrival_date: today() }),
      });
      onUpdated(response.bundle);
    } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "The loss could not be recorded."); }
    finally { setSaving(false); }
  }

  return <article id={`bundle-${bundle.bundleId}`} className={`${cardStyles.card} ${styles.card}`}>
    <h3>{bundle.type} · {bundle.designName}</h3><span className={`${styles.status} ${styles[bundle.status] ?? ""}`}>{bundle.status}</span>
    <p className={styles.summary}>{bundle.itemsOrdered} ordered · Cost {formatRs(bundle.costPerItem)} each · Total {formatRs(bundle.bundleTotalCost)}</p>
    {bundle.status === "pending" && <div className={styles.actions}><button className={`${buttonStyles.button} ${buttonStyles.secondary}`} onClick={() => setArrivalOpen((open) => !open)}>{arrivalOpen ? "Cancel arrival" : "Mark arrived"}</button><button className={`${buttonStyles.button} ${buttonStyles.danger}`} disabled={saving} onClick={() => void markLost()}>Mark lost</button></div>}
    {error && <div className={styles.error}>{error}</div>}
    {arrivalOpen && <form className={`${formStyles.formGrid} ${styles.arrival}`} onSubmit={markArrived}>
      <div className={`${styles.context} ${formStyles.full}`}><div><span>Ordered</span><strong>{bundle.itemsOrdered}</strong></div><div><span>Fixed cost each</span><strong>{formatRs(bundle.costPerItem)}</strong></div></div>
      <label className={inputStyles.field}><span className={inputStyles.label}>Items received</span><input required type="number" min="1" max={bundle.itemsOrdered} inputMode="numeric" value={itemsReceived} onChange={(event) => setItemsReceived(event.target.value)} className={inputStyles.input} /></label>
      <label className={inputStyles.field}><span className={inputStyles.label}>Arrival date</span><input required type="date" value={arrivalDate} onChange={(event) => setArrivalDate(event.target.value)} className={inputStyles.input} /></label>
      <label className={`${inputStyles.field} ${formStyles.full}`}><span className={inputStyles.label}>Variant (optional)</span><input value={variant} onChange={(event) => setVariant(event.target.value)} className={inputStyles.input} placeholder="Shared by all received items" /></label>
      <div className={`${styles.outcome} ${formStyles.full}`}><strong>{receivedCount || 0} inventory item{receivedCount === 1 ? "" : "s"} will be created.</strong>{itemsLost > 0 ? <span>{itemsLost} missing item{itemsLost === 1 ? "" : "s"} will create a partial transit loss of {formatRs(itemsLost * bundle.costPerItem)}.</span> : <span>No transit loss will be created.</span>}</div>
      <div className={`${formStyles.actions} ${formStyles.full}`}><button className={`${buttonStyles.button} ${buttonStyles.primary}`} disabled={saving || receivedCount < 1 || receivedCount > bundle.itemsOrdered}>{saving ? "Receiving…" : "Confirm arrival"}</button><button type="button" className={`${buttonStyles.button} ${buttonStyles.secondary}`} disabled={saving} onClick={() => setArrivalOpen(false)}>Cancel</button></div>
    </form>}
  </article>;
}