import * as Dialog from "@radix-ui/react-dialog";
import { useMemo, useState, type FormEvent } from "react";
import { apiRequest, formatRs } from "../api";
import { AppSelect } from "../components/AppSelect";
import { useApiList } from "../hooks/useApiList";
import appStyles from "../styles/app.module.css";
import type { Bundle, Item } from "../types";
import styles from "./InventoryPage.module.css";

const statusOptions = [{ value: "all", label: "All statuses" }, { value: "in_stock", label: "In stock" }, { value: "sold", label: "Sold" }, { value: "damaged", label: "Damaged" }];

// Manages stock visibility, bundle-level pricing, and physical damage actions.
export function InventoryPage() {
  const items = useApiList<Item>("/api/items", "items"); const bundles = useApiList<Bundle>("/api/bundles", "bundles");
  const [status, setStatus] = useState("all"); const [bundleId, setBundleId] = useState("all"); const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const visibleItems = useMemo(() => items.data.filter((item) => (status === "all" || item.status === status) && (bundleId === "all" || item.bundleId === Number(bundleId))), [items.data, status, bundleId]);

  // Updates every in-stock item in the selected bundle with one validated pricing set.
  async function bulkPrice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (bundleId === "all") return; const form = new FormData(event.currentTarget); setSaving(true); setError(""); setMessage("");
    try { const response = await apiRequest<{ updated_count: number }>(`/api/bundles/${bundleId}/bulk-price`, { method: "POST", body: JSON.stringify({ marked_price: Number(form.get("marked")), listed_price: Number(form.get("listed")), target_price: Number(form.get("target")), floor_price: Number(form.get("floor")), max_discount_percent: Number(form.get("discount")) }) }); setMessage(`${response.updated_count} in-stock items repriced.`); setDialogOpen(false); await items.refresh(); }
    catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "Bulk pricing failed."); } finally { setSaving(false); }
  }

  // Marks one physically damaged in-stock item without deleting its stock history.
  async function markDamaged(item: Item) {
    setSaving(true); setError(""); setMessage("");
    try { await apiRequest(`/api/items/${item.itemId}/damage`, { method: "POST" }); setMessage(`Item #${item.itemId} marked damaged.`); await items.refresh(); }
    catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "The item could not be marked damaged."); } finally { setSaving(false); }
  }

  const bundleOptions = [{ value: "all", label: "All bundles" }, ...bundles.data.map((bundle) => ({ value: String(bundle.bundleId), label: `#${bundle.bundleId} · ${bundle.designName}` }))];
  return <><header className={appStyles.pageHeader}><div><p className={appStyles.eyebrow}>Stock control</p><h1 className={appStyles.title}>Inventory</h1><p className={appStyles.subtitle}>{visibleItems.length} items shown</p></div></header><div className={appStyles.contentStack}>{(items.error || bundles.error || error) && <div className={appStyles.error}>{items.error || bundles.error || error}</div>}{message && <div className={appStyles.success}>{message}</div>}<section className={`${appStyles.card} ${styles.filters}`}><AppSelect label="Status" value={status} onValueChange={setStatus} options={statusOptions} /><AppSelect label="Bundle" value={bundleId} onValueChange={setBundleId} options={bundleOptions} /><div className={styles.toolbar}><span className={appStyles.muted}>Cost price is inherited and cannot be edited.</span><Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}><Dialog.Trigger asChild><button className={`${appStyles.button} ${appStyles.buttonSecondary}`} disabled={bundleId === "all"}>Bulk Price</button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className={appStyles.dialogOverlay} /><Dialog.Content className={appStyles.dialogContent}><div className={appStyles.dialogHeader}><Dialog.Title className={appStyles.cardTitle}>Bulk price bundle #{bundleId}</Dialog.Title><Dialog.Close className={appStyles.close} aria-label="Close">×</Dialog.Close></div><Dialog.Description className={styles.dialogDescription}>Only unsold in-stock items will be changed. Cost price stays untouched.</Dialog.Description><form className={styles.dialogForm} onSubmit={bulkPrice}>{[["marked", "Marked price"], ["listed", "Listed price"], ["target", "Target price"], ["floor", "Floor price"], ["discount", "Max discount %"]].map(([name, label]) => <label key={name} className={appStyles.field}>{label}<input required name={name} type="number" min="0" className={appStyles.input} /></label>)}<button className={appStyles.button} disabled={saving}>{saving ? "Applying…" : "Apply to unsold items"}</button></form></Dialog.Content></Dialog.Portal></Dialog.Root></div></section><section className={appStyles.card}><div className={appStyles.tableWrap}><table className={appStyles.table}><thead><tr><th>Item</th><th>Bundle</th><th>Prices</th><th>Status</th><th>Action</th></tr></thead><tbody>{items.loading ? <tr><td colSpan={5} className={appStyles.empty}>Loading inventory…</td></tr> : visibleItems.length === 0 ? <tr><td colSpan={5} className={appStyles.empty}>No matching inventory items.</td></tr> : visibleItems.map((item) => <tr key={item.itemId}><td><strong>#{item.itemId}</strong><br /><span className={appStyles.muted}>{item.variant || "No variant"}</span></td><td>#{item.bundleId}<br /><span className={appStyles.muted}>{item.designName}</span></td><td>List {formatRs(item.listedPrice)}<br />Floor {formatRs(item.floorPrice)}</td><td><span className={appStyles.pill}>{item.status}</span></td><td>{item.status === "in_stock" && <button className={`${appStyles.button} ${appStyles.buttonDanger}`} disabled={saving} onClick={() => void markDamaged(item)}>Damaged</button>}</td></tr>)}</tbody></table></div></section></div></>;
}