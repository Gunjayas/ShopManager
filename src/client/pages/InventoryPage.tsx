import { useMemo, useState, type FormEvent } from "react";
import { apiRequest, formatRs } from "../api";
import buttonStyles from "../components/Button.module.css";
import { AppSelect } from "../components/AppSelect";
import { InventoryCard } from "../components/InventoryCard";
import formStyles from "../components/Form.module.css";
import inputStyles from "../components/Input.module.css";
import { useApiList } from "../hooks/useApiList";
import appStyles from "../styles/app.module.css";
import type { Bundle, Item } from "../types";
import styles from "./InventoryPage.module.css";

const statusOptions = [{ value: "all", label: "All statuses" }, { value: "in_stock", label: "In stock" }, { value: "sold", label: "Sold" }, { value: "damaged", label: "Damaged" }, { value: "returned", label: "Returned" }];

// Manages compact inventory facts, safe bundle pricing, and per-item selling guidance.
export function InventoryPage() {
  const items = useApiList<Item>("/api/items", "items");
  const bundles = useApiList<Bundle>("/api/bundles", "bundles");
  const [status, setStatus] = useState("all");
  const [bundleId, setBundleId] = useState("all");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const visibleItems = useMemo(() => items.data.filter((item) => (status === "all" || item.status === status) && (bundleId === "all" || item.bundleId === Number(bundleId))), [items.data, status, bundleId]);
  const selectedBundleItems = items.data.filter((item) => item.bundleId === Number(bundleId));
  const eligibleCount = selectedBundleItems.filter((item) => item.status === "in_stock").length;

  // Updates the selected bundle's in-stock items through the status-guarded backend endpoint.
  async function bulkPrice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const pricingForm = new FormData(event.currentTarget);
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await apiRequest<{ updated_count: number }>(`/api/bundles/${bundleId}/bulk-price`, { method: "POST", body: JSON.stringify({ marked_price: Number(pricingForm.get("marked")), listed_price: Number(pricingForm.get("listed")), target_price: Number(pricingForm.get("target")), floor_price: Number(pricingForm.get("floor")), max_discount_percent: Number(pricingForm.get("discount")) }) });
      setMessage(`${response.updated_count} in-stock item${response.updated_count === 1 ? "" : "s"} repriced. Cost and non-stock items were not changed.`); setBulkOpen(false); await items.refresh();
    } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "Bulk pricing failed."); }
    finally { setSaving(false); }
  }

  // Replaces one card after inline pricing, variant, or damage changes.
  function updateItem(updatedItem: Item) { items.setData((currentItems) => currentItems.map((item) => item.itemId === updatedItem.itemId ? updatedItem : item)); }

  const bundleOptions = [{ value: "all", label: "All bundles" }, ...bundles.data.map((bundle) => ({ value: String(bundle.bundleId), label: `#${bundle.bundleId} · ${bundle.designName}` }))];
  return <><header className={appStyles.pageHeader}><div><p className={appStyles.eyebrow}>Stock control</p><h1 className={appStyles.title}>Inventory</h1><p className={appStyles.subtitle}>{visibleItems.length} items shown</p></div></header><div className={appStyles.contentStack}>{(items.error || bundles.error || error) && <div className={appStyles.error}>{items.error || bundles.error || error}</div>}{message && <div className={appStyles.success}>{message}</div>}
    <section className={`${appStyles.card} ${styles.filters}`}><AppSelect label="Status" value={status} onValueChange={setStatus} options={statusOptions} /><AppSelect label="Bundle" value={bundleId} onValueChange={setBundleId} options={bundleOptions} /><div className={styles.toolbar}><span className={appStyles.muted}>Bulk pricing changes only in-stock items in the selected bundle.</span><button className={`${buttonStyles.button} ${buttonStyles.secondary}`} disabled={bundleId === "all" || eligibleCount === 0} onClick={() => setBulkOpen((open) => !open)}>{bulkOpen ? "Hide bulk pricing" : `Bulk price (${eligibleCount} eligible)`}</button></div>{bulkOpen && <form className={`${formStyles.formGrid} ${styles.bulkForm}`} onSubmit={bulkPrice}><div className={`${styles.bulkNote} ${formStyles.full}`}><strong>Bundle #{bundleId}: {eligibleCount} eligible</strong><span>Cost, sold, damaged, and returned items are protected.</span></div>{[["marked", "Marked price"], ["listed", "Listed price"], ["target", "Target price"], ["floor", "Floor price"], ["discount", "Max discount %"]].map(([name, label]) => <label key={name} className={inputStyles.field}><span className={inputStyles.label}>{label}</span><input required name={name} type="number" min="0" className={inputStyles.input} /></label>)}<div className={`${formStyles.actions} ${formStyles.full}`}><button className={`${buttonStyles.button} ${buttonStyles.primary}`} disabled={saving}>{saving ? "Applying…" : `Apply to ${eligibleCount} in-stock items`}</button><button type="button" className={`${buttonStyles.button} ${buttonStyles.secondary}`} onClick={() => setBulkOpen(false)}>Cancel</button></div></form>}</section>
    <section className={styles.list}>{items.loading ? <div className={appStyles.empty}>Loading inventory…</div> : visibleItems.length === 0 ? <div className={styles.empty}>No matching inventory items.</div> : visibleItems.map((item) => <InventoryCard key={item.itemId} item={item} onUpdated={updateItem} />)}</section>
  </div></>;
}