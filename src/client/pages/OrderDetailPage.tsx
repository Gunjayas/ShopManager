import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest, formatRs } from "../api";
import buttonStyles from "../components/Button.module.css";
import cardStyles from "../components/Card.module.css";
import dialogStyles from "../components/Dialog.module.css";
import formStyles from "../components/Form.module.css";
import inputStyles from "../components/Input.module.css";
import { BundleCard } from "../components/BundleCard";
import { useApiList } from "../hooks/useApiList";
import appStyles from "../styles/app.module.css";
import type { Bundle, Order } from "../types";
import styles from "./OrderDetailPage.module.css";

// Shows one order as a contextual workspace for corrections, closure, and bundle entry.
export function OrderDetailPage() {
  const { orderId = "" } = useParams();
  const bundles = useApiList<Bundle>(`/api/orders/${orderId}/bundles`, "bundles");
  const [order, setOrder] = useState<Order | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [editing, setEditing] = useState(false);
  const [bundleDialogOpen, setBundleDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoadingOrder(true);
    apiRequest<{ order: Order }>(`/api/orders/${orderId}`)
      .then((response) => { if (active) setOrder(response.order); })
      .catch((caughtError) => { if (active) setError(caughtError instanceof Error ? caughtError.message : "The order could not be loaded."); })
      .finally(() => { if (active) setLoadingOrder(false); });
    return () => { active = false; };
  }, [orderId]);

  // Saves corrected purchase facts inline so the order and its bundles remain visible.
  async function updateOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const orderForm = new FormData(event.currentTarget);
    setSaving("order"); setError("");
    try {
      const response = await apiRequest<{ order: Order }>(`/api/orders/${orderId}`, { method: "PATCH", body: JSON.stringify({ supplier_or_country: orderForm.get("supplier"), order_date: orderForm.get("date"), transportation_fee: Number(orderForm.get("fee")), expected_bundle_count: Number(orderForm.get("count")) }) });
      setOrder(response.order); setEditing(false);
    } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "The order could not be updated."); }
    finally { setSaving(""); }
  }

  // Adds one bundle, updates progress immediately, and closes the dialog after every save.
  async function createBundle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const bundleForm = new FormData(event.currentTarget);
    setSaving("bundle");
    setError("");
    try {
      const response = await apiRequest<{ bundle: Bundle }>(`/api/orders/${orderId}/bundles`, {
        method: "POST",
        body: JSON.stringify({ type: bundleForm.get("type"), design_name: bundleForm.get("design"), items_ordered: Number(bundleForm.get("items")), cost_per_item: Number(bundleForm.get("cost")) }),
      });
      bundles.setData((currentBundles) => [...currentBundles, response.bundle]);
      setBundleDialogOpen(false);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "The bundle could not be added.");
    } finally { setSaving(""); }
  }

  // Closes the order deliberately while leaving any pending bundle history unchanged.
  async function closeOrder() {
    setSaving("close"); setError("");
    try {
      const response = await apiRequest<{ order: Order }>(`/api/orders/${orderId}/close`, { method: "PATCH" });
      setOrder(response.order); setCloseDialogOpen(false);
    } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "The order could not be closed."); }
    finally { setSaving(""); }
  }

  // Replaces one bundle after an arrival or loss transition without reloading the order workspace.
  function updateBundle(updatedBundle: Bundle) {
    bundles.setData((currentBundles) => currentBundles.map((bundle) => bundle.bundleId === updatedBundle.bundleId ? { ...bundle, ...updatedBundle } : bundle));
  }

  if (loadingOrder) return <div className={appStyles.empty}>Loading order…</div>;
  if (!order) return <><Link to="/orders" className={styles.back}>← Back to orders</Link><div className={appStyles.error}>{error || "The order could not be found."}</div></>;
  const pendingBundles = bundles.data.filter((bundle) => bundle.status === "pending");
  const nextBundleNumber = bundles.data.length + 1;

  return <><Link to="/orders" className={styles.back}>← Back to orders</Link>{error && <div className={appStyles.error}>{error}</div>}
    <article className={`${cardStyles.card} ${styles.orderCard}`}><div><p className={styles.eyebrow}>Order {order.orderDate}</p><h1 className={styles.heading}>{order.supplierOrCountry}</h1></div><span className={`${styles.status} ${order.status === "closed" ? styles.closed : styles.ongoing}`}>{order.status}</span><div className={styles.facts}><span>Transportation fee: {formatRs(order.transportationFee)}</span><span>Expected bundles: {order.expectedBundleCount}</span></div><div className={styles.actions}><button className={`${buttonStyles.button} ${buttonStyles.secondary}`} onClick={() => setEditing((visible) => !visible)}>{editing ? "Hide edit" : "Edit order"}</button>{order.status !== "closed" && <button className={`${buttonStyles.button} ${buttonStyles.primary}`} onClick={() => setCloseDialogOpen(true)}>Close order</button>}</div>
      {editing && <form className={`${formStyles.formGrid} ${styles.editForm}`} onSubmit={updateOrder}><label className={`${inputStyles.field} ${formStyles.full}`}><span className={inputStyles.label}>Supplier or country</span><input required name="supplier" defaultValue={order.supplierOrCountry} className={inputStyles.input} /></label><label className={inputStyles.field}><span className={inputStyles.label}>Order date</span><input required name="date" type="date" defaultValue={order.orderDate} className={inputStyles.input} /></label><label className={inputStyles.field}><span className={inputStyles.label}>Transportation fee</span><input required name="fee" type="number" min="0" defaultValue={order.transportationFee} className={inputStyles.input} /></label><label className={`${inputStyles.field} ${formStyles.full}`}><span className={inputStyles.label}>Expected bundle count</span><input required name="count" type="number" min="1" defaultValue={order.expectedBundleCount} className={inputStyles.input} /></label><div className={`${formStyles.actions} ${formStyles.full}`}><button className={`${buttonStyles.button} ${buttonStyles.primary}`} disabled={saving === "order"}>{saving === "order" ? "Saving…" : "Save changes"}</button><button type="button" className={`${buttonStyles.button} ${buttonStyles.secondary}`} onClick={() => setEditing(false)}>Cancel</button></div></form>}
    </article>
    <section className={styles.bundleSection}><header className={styles.sectionHeader}><div><p className={styles.eyebrow}>Shipment units</p><h2 className={styles.sectionTitle}>Bundles</h2><p className={styles.progress}>{bundles.data.length} of {order.expectedBundleCount} bundles added{bundles.data.length > order.expectedBundleCount ? " · Expected count is guidance only" : ""}</p></div>{order.status !== "closed" && <button className={`${buttonStyles.button} ${buttonStyles.primary}`} onClick={() => setBundleDialogOpen(true)}>Add bundle</button>}</header>{bundles.error && <div className={appStyles.error}>{bundles.error}</div>}{bundles.loading ? <div className={appStyles.empty}>Loading bundles…</div> : bundles.data.length === 0 ? <div className={styles.empty}>No bundles added yet.</div> : <div className={styles.bundleList}>{bundles.data.map((bundle) => <BundleCard key={bundle.bundleId} bundle={bundle} onUpdated={updateBundle} />)}</div>}</section>
    <Dialog.Root open={bundleDialogOpen} onOpenChange={(open) => { setBundleDialogOpen(open); if (!open) setError(""); }}><Dialog.Portal><Dialog.Overlay className={dialogStyles.overlay} /><Dialog.Content className={dialogStyles.content}><div className={dialogStyles.header}><div><Dialog.Title className={styles.dialogTitle}>Add bundle</Dialog.Title><Dialog.Description className={styles.dialogDescription}>Bundle {nextBundleNumber} of {order.expectedBundleCount}. Expected count is guidance only.</Dialog.Description></div><Dialog.Close className={dialogStyles.close} aria-label="Close add bundle dialog">×</Dialog.Close></div>{error && <div className={appStyles.error}>{error}</div>}<form className={formStyles.formGrid} onSubmit={createBundle}><label className={inputStyles.field}><span className={inputStyles.label}>Type</span><input required name="type" className={inputStyles.input} autoFocus /></label><label className={inputStyles.field}><span className={inputStyles.label}>Design name</span><input required name="design" className={inputStyles.input} /></label><label className={inputStyles.field}><span className={inputStyles.label}>Items ordered</span><input required name="items" type="number" min="1" className={inputStyles.input} /></label><label className={inputStyles.field}><span className={inputStyles.label}>Cost per item</span><input required name="cost" type="number" min="0" className={inputStyles.input} /></label><div className={`${formStyles.actions} ${formStyles.full}`}><button className={`${buttonStyles.button} ${buttonStyles.primary}`} disabled={saving === "bundle"}>{saving === "bundle" ? "Saving…" : "Save Bundle"}</button></div></form></Dialog.Content></Dialog.Portal></Dialog.Root>
    <Dialog.Root open={closeDialogOpen} onOpenChange={setCloseDialogOpen}><Dialog.Portal><Dialog.Overlay className={dialogStyles.overlay} /><Dialog.Content className={dialogStyles.content}><div className={dialogStyles.header}><div><Dialog.Title className={styles.dialogTitle}>Close order?</Dialog.Title><Dialog.Description className={styles.dialogDescription}>{pendingBundles.length === 0 ? "This order has no pending bundles." : `${pendingBundles.length} bundle${pendingBundles.length === 1 ? " is" : "s are"} still pending:`}</Dialog.Description></div><Dialog.Close className={dialogStyles.close} aria-label="Cancel closing order">×</Dialog.Close></div>{pendingBundles.length > 0 && <ul className={styles.pendingList}>{pendingBundles.map((bundle) => <li key={bundle.bundleId}>#{bundle.bundleId} · {bundle.type} · {bundle.designName}</li>)}</ul>}<p className={styles.closeNote}>Closing is allowed, but Add bundle will no longer be available.</p><div className={formStyles.actions}><button className={`${buttonStyles.button} ${buttonStyles.primary}`} disabled={saving === "close"} onClick={() => void closeOrder()}>{saving === "close" ? "Closing…" : "Confirm Close"}</button><Dialog.Close asChild><button className={`${buttonStyles.button} ${buttonStyles.secondary}`} disabled={saving === "close"}>Cancel</button></Dialog.Close></div></Dialog.Content></Dialog.Portal></Dialog.Root>
  </>;
}