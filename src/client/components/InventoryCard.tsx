import { useState, type FormEvent } from "react";
import { apiRequest, formatRs } from "../api";
import type { Item } from "../types";
import buttonStyles from "./Button.module.css";
import cardStyles from "./Card.module.css";
import formStyles from "./Form.module.css";
import inputStyles from "./Input.module.css";
import styles from "./InventoryCard.module.css";

type InventoryCardProps = { item: Item; onUpdated: (item: Item) => void };

// Calculates stock age from the bundle arrival event without storing a second derived value.
function daysInStock(arrivalDate: string | null) {
  if (!arrivalDate) return 0;
  const arrivalTime = new Date(`${arrivalDate}T00:00:00`).getTime();
  return Math.max(0, Math.floor((Date.now() - arrivalTime) / 86_400_000));
}

// Keeps compact selling facts visible and reveals mutable item detail only when requested.
export function InventoryCard({ item, onUpdated }: InventoryCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Saves one item's optional variant and pricing while inherited cost remains outside the payload.
  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const itemForm = new FormData(event.currentTarget);
    setSaving(true); setError("");
    try {
      const response = await apiRequest<{ item: Item }>(`/api/items/${item.itemId}`, {
        method: "PATCH",
        body: JSON.stringify({ variant: itemForm.get("variant"), marked_price: Number(itemForm.get("marked")), listed_price: Number(itemForm.get("listed")), target_price: Number(itemForm.get("target")), floor_price: Number(itemForm.get("floor")), max_discount_percent: Number(itemForm.get("discount")) }),
      });
      onUpdated({ ...item, ...response.item }); setDetailOpen(false);
    } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "The item could not be updated."); }
    finally { setSaving(false); }
  }

  // Marks physical damage only after a clear irreversible-action confirmation.
  async function markDamaged() {
    if (!window.confirm(`Mark item #${item.itemId} as damaged? It will no longer be sellable.`)) return;
    setSaving(true); setError("");
    try {
      const response = await apiRequest<{ item: Item }>(`/api/items/${item.itemId}/damage`, { method: "POST" });
      onUpdated({ ...item, ...response.item });
    } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "The item could not be marked damaged."); }
    finally { setSaving(false); }
  }

  return <article className={`${cardStyles.card} ${styles.card}`}>
    <div><p className={styles.identity}>Item #{item.itemId}</p><h2>{item.bundleType} · {item.designName}</h2>{item.variant && <p className={styles.variant}>{item.variant}</p>}</div>
    <span className={`${styles.status} ${styles[item.status]}`}>{item.status.replace("_", " ")}</span>
    <div className={styles.summary}><div><span>Listed price</span><strong>{formatRs(item.listedPrice)}</strong></div><div><span>Days in stock</span><strong>{daysInStock(item.arrivalDate)}</strong></div><small>min {formatRs(item.floorPrice)}</small></div>
    <div className={styles.actions}><button className={`${buttonStyles.button} ${buttonStyles.secondary}`} onClick={() => setDetailOpen((open) => !open)}>{detailOpen ? "Hide details" : "View details / pricing"}</button>{item.status === "in_stock" && <button className={`${buttonStyles.button} ${buttonStyles.danger}`} disabled={saving} onClick={() => void markDamaged()}>Mark damaged</button>}</div>
    {error && <div className={styles.error}>{error}</div>}
    {detailOpen && <form className={`${formStyles.formGrid} ${styles.detail}`} onSubmit={saveItem}>
      <div className={`${styles.fixedCost} ${formStyles.full}`}><span>Fixed inherited cost</span><strong>{formatRs(item.costPrice)}</strong><small>Immutable — never changed by pricing.</small></div>
      <label className={`${inputStyles.field} ${formStyles.full}`}><span className={inputStyles.label}>Variant (optional)</span><input name="variant" defaultValue={item.variant ?? ""} className={inputStyles.input} /></label>
      {[["marked", "Marked price", item.markedPrice], ["listed", "Listed price", item.listedPrice], ["target", "Target price", item.targetPrice], ["floor", "Floor price", item.floorPrice], ["discount", "Max discount %", item.maxDiscountPercent]].map(([name, label, value]) => <label key={String(name)} className={inputStyles.field}><span className={inputStyles.label}>{label}</span><input required name={String(name)} type="number" min="0" defaultValue={Number(value)} className={inputStyles.input} /></label>)}
      <div className={`${formStyles.actions} ${formStyles.full}`}><button className={`${buttonStyles.button} ${buttonStyles.primary}`} disabled={saving}>{saving ? "Saving…" : "Save item"}</button><button type="button" className={`${buttonStyles.button} ${buttonStyles.secondary}`} onClick={() => setDetailOpen(false)}>Cancel</button></div>
    </form>}
  </article>;
}