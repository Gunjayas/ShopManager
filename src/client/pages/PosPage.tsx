import { useState, type FormEvent } from "react";
import { apiRequest, formatRs, today } from "../api";
import alertStyles from "../components/Alert.module.css";
import buttonStyles from "../components/Button.module.css";
import inputStyles from "../components/Input.module.css";
import pageStyles from "../components/Page.module.css";
import { SalesLedger } from "../components/SalesLedger";
import { StockBrowser } from "../components/StockBrowser";
import { useApiList } from "../hooks/useApiList";
import type { Item, Sale } from "../types";
import styles from "./PosPage.module.css";

// Runs the fast one-item POS workflow with live discount and floor-price safeguards.
export function PosPage() {
  const { data: items, loading, error: loadError, refresh } = useApiList<Item>("/api/items", "items");
  const sales = useApiList<Sale>("/api/sales", "sales");
  const [query, setQuery] = useState("");
  const [bundle, setBundle] = useState("all");
  const [selected, setSelected] = useState<Item | null>(null);
  const [sellingPrice, setSellingPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const stock = items.filter((item) => item.status === "in_stock");
  const enteredPrice = Number(sellingPrice);
  const hasPrice = sellingPrice !== "" && Number.isFinite(enteredPrice);

  // Business rule: a price under the floor is a hard block, never a warning.
  const floorBlocked = Boolean(selected && hasPrice && enteredPrice < selected.floorPrice);

  // Business rule: an over-limit discount only warns the owner; the sale is still allowed.
  const discountPercent = selected && hasPrice && selected.listedPrice > 0 && enteredPrice < selected.listedPrice
    ? ((selected.listedPrice - enteredPrice) / selected.listedPrice) * 100
    : 0;
  const discountWarning = Boolean(selected && discountPercent > selected.maxDiscountPercent);

  // Selects one item and starts with its target price to minimize cashier typing.
  function selectItem(item: Item) {
    setSelected(item);
    setSellingPrice(String(item.targetPrice));
    setMessage("");
    setError("");
  }

  // Confirms one valid sale and removes the sold item from the available-stock list.
  async function confirmSale(event: FormEvent) {
    event.preventDefault();
    if (!selected || !hasPrice || floorBlocked) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiRequest("/api/sales", {
        method: "POST",
        body: JSON.stringify({ item_id: selected.itemId, sale_date: today(), selling_price: enteredPrice }),
      });
      setMessage(`Item #${selected.itemId} sold for ${formatRs(enteredPrice)}.`);
      setSelected(null);
      setSellingPrice("");
      setQuery("");
      await Promise.all([refresh(), sales.refresh()]);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "The sale could not be completed.");
    } finally {
      setSaving(false);
    }
  }

  const confirmButtonVariant = floorBlocked ? buttonStyles.danger : buttonStyles.primary;
  const confirmButtonText = saving ? "Confirming…" : floorBlocked ? "Sale Blocked — Below Floor" : "Confirm Sale";

  // Replaces the preserved ledger row immediately after a return without deleting history.
  function updateReturnedSale(returnedSale: Sale) {
    sales.setData((currentSales) => currentSales.map((sale) => sale.saleId === returnedSale.saleId ? returnedSale : sale));
    void refresh();
  }

  return <div className={styles.page}>
    <header className={pageStyles.pageHeader}>
      <div>
        <p className={pageStyles.eyebrow}>Fast checkout</p>
        <h1 className={pageStyles.title}>Point of Sale</h1>
        <p className={pageStyles.subtitle}>{stock.length} items ready to sell</p>
      </div>
    </header>

    <div className={styles.posGrid}>
      <StockBrowser stock={stock} loading={loading} error={loadError} query={query} bundle={bundle} selectedItemId={selected?.itemId} onQueryChange={setQuery} onBundleChange={setBundle} onSelect={selectItem} />

      <form className={`${styles.salePanel} ${styles.saleCard}`} onSubmit={confirmSale}>
        <h2 className={pageStyles.cardTitle}>Complete sale</h2>

        {!selected ? <p className={pageStyles.empty}>Choose an item to begin.</p> : <>
          <div className={styles.selectedDetails}>
            <div className={styles.metric}><span>Item</span><strong>#{selected.itemId}</strong></div>
            <div className={styles.metric}><span>Fixed cost</span><strong>{formatRs(selected.costPrice)}</strong></div>
            <div className={styles.metric}><span>Listed</span><strong>{formatRs(selected.listedPrice)}</strong></div>
            <div className={styles.metric}><span>Target</span><strong>{formatRs(selected.targetPrice)}</strong></div>
            <div className={styles.metric}><span>Floor</span><strong>{formatRs(selected.floorPrice)}</strong></div>
          </div>

          <label className={inputStyles.field}>
            <span className={inputStyles.label}>Selling price</span>
            <input
              required
              inputMode="numeric"
              min="0"
              className={`${inputStyles.input} ${styles.sellingPrice}`}
              value={sellingPrice}
              onChange={(event) => setSellingPrice(event.target.value)}
            />
          </label>

          {floorBlocked && <div className={alertStyles.hardBlock}>
            HARD BLOCK: Price is {formatRs(selected.floorPrice - enteredPrice)} below the floor.
          </div>}

          {discountWarning && !floorBlocked && <div className={`${alertStyles.alert} ${alertStyles.warning}`}>
            Discount is {discountPercent.toFixed(1)}%, above the allowed {selected.maxDiscountPercent}%.
          </div>}

          <div className={styles.saleAction}>
            <button
              className={`${buttonStyles.button} ${confirmButtonVariant} ${styles.confirm}`}
              disabled={saving || floorBlocked || !hasPrice}
            >
              {confirmButtonText}
            </button>
          </div>
        </>}

        {error && <div className={`${alertStyles.alert} ${alertStyles.error}`}>{error}</div>}
        {message && <div className={`${alertStyles.alert} ${alertStyles.success}`}>{message}</div>}
      </form>
    </div>
    <SalesLedger sales={sales.data} loading={sales.loading} error={sales.error} onReturned={updateReturnedSale} />
  </div>;
}
