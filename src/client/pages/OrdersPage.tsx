import * as Dialog from "@radix-ui/react-dialog";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest, formatRs, today } from "../api";
import buttonStyles from "../components/Button.module.css";
import cardStyles from "../components/Card.module.css";
import dialogStyles from "../components/Dialog.module.css";
import formStyles from "../components/Form.module.css";
import inputStyles from "../components/Input.module.css";
import { useApiList } from "../hooks/useApiList";
import appStyles from "../styles/app.module.css";
import type { Bundle, Order } from "../types";
import styles from "./OrdersPage.module.css";

// Lists purchasing orders and keeps new-order creation focused in a dialog.
export function OrdersPage() {
  const navigate = useNavigate();
  const orders = useApiList<Order>("/api/orders", "orders");
  const bundles = useApiList<Bundle>("/api/bundles", "bundles");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Creates the order and immediately opens its saved summary with bundle entry still closed.
  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const orderForm = new FormData(event.currentTarget);
    setSaving(true);
    setError("");

    try {
      const response = await apiRequest<{ order: Order }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          supplier_or_country: orderForm.get("supplier"),
          order_date: orderForm.get("date"),
          transportation_fee: Number(orderForm.get("fee")),
          expected_bundle_count: Number(orderForm.get("count")),
        }),
      });
      navigate(`/orders/${response.order.orderId}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "The order could not be created.");
    } finally {
      setSaving(false);
    }
  }

  const loadError = orders.error || bundles.error;

  return <>
    <header className={appStyles.pageHeader}>
      <div>
        <p className={appStyles.eyebrow}>Purchasing</p>
        <h1 className={appStyles.title}>Orders</h1>
      </div>
      <Dialog.Root open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setError(""); }}>
        <Dialog.Trigger asChild>
          <button className={`${buttonStyles.button} ${buttonStyles.primary}`}>New order</button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className={dialogStyles.overlay} />
          <Dialog.Content className={dialogStyles.content}>
            <div className={dialogStyles.header}>
              <div>
                <Dialog.Title className={styles.dialogTitle}>New order</Dialog.Title>
                <Dialog.Description className={styles.dialogDescription}>Record the purchase before adding its bundles.</Dialog.Description>
              </div>
              <Dialog.Close className={dialogStyles.close} aria-label="Close new order dialog">×</Dialog.Close>
            </div>
            {error && <div className={appStyles.error}>{error}</div>}
            <form className={formStyles.formGrid} onSubmit={createOrder}>
              <label className={`${inputStyles.field} ${formStyles.full}`}><span className={inputStyles.label}>Supplier or country</span><input required name="supplier" className={inputStyles.input} autoFocus /></label>
              <label className={inputStyles.field}><span className={inputStyles.label}>Order date</span><input required name="date" type="date" defaultValue={today()} className={inputStyles.input} /></label>
              <label className={inputStyles.field}><span className={inputStyles.label}>Transportation fee</span><input required name="fee" type="number" min="0" defaultValue="0" inputMode="numeric" className={inputStyles.input} /></label>
              <label className={`${inputStyles.field} ${formStyles.full}`}><span className={inputStyles.label}>Expected bundle count</span><input required name="count" type="number" min="1" defaultValue="1" inputMode="numeric" className={inputStyles.input} /></label>
              <div className={`${formStyles.actions} ${formStyles.full}`}><button className={`${buttonStyles.button} ${buttonStyles.primary}`} disabled={saving}>{saving ? "Creating…" : "Create order"}</button><Dialog.Close asChild><button type="button" className={`${buttonStyles.button} ${buttonStyles.secondary}`} disabled={saving}>Cancel</button></Dialog.Close></div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </header>

    {loadError && <div className={appStyles.error}>{loadError}</div>}
    <section className={styles.list} aria-label="Orders">
      {orders.loading || bundles.loading ? <div className={appStyles.empty}>Loading orders…</div> : orders.data.length === 0 ? <div className={styles.empty}><strong>No orders yet</strong><span>Create an order to begin recording a purchase.</span></div> : orders.data.map((order) => {
        const bundleCount = bundles.data.filter((bundle) => bundle.orderId === order.orderId).length;
        return <Link key={order.orderId} to={`/orders/${order.orderId}`} className={`${cardStyles.card} ${styles.orderCard}`}>
          <div><p className={styles.orderDate}>Order {order.orderDate}</p><h2 className={styles.supplier}>{order.supplierOrCountry}</h2></div>
          <span className={`${styles.status} ${order.status === "closed" ? styles.closed : styles.ongoing}`}>{order.status}</span>
          <div className={styles.facts}><span>Transportation fee: {formatRs(order.transportationFee)}</span><span>{bundleCount} of {order.expectedBundleCount} bundles added</span></div>
        </Link>;
      })}
    </section>
  </>;
}