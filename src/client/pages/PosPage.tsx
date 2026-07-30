import { useMemo, useState, type FormEvent } from "react";
import { apiRequest, formatRs, today } from "../api";
import { AppSelect } from "../components/AppSelect";
import { useApiList } from "../hooks/useApiList";
import appStyles from "../styles/app.module.css";
import type { Item } from "../types";
import styles from "./PosPage.module.css";

// Runs the fast one-item POS workflow with live discount and floor-price safeguards.
export function PosPage() {
  const { data: items, loading, error: loadError, refresh } = useApiList<Item>("/api/items", "items");
  const [query, setQuery] = useState(""); const [bundle, setBundle] = useState("all");
  const [selected, setSelected] = useState<Item | null>(null); const [sellingPrice, setSellingPrice] = useState("");
  const [saving, setSaving] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const stock = items.filter((item) => item.status === "in_stock");
  const bundleOptions = [{ value: "all", label: "All bundles" }, ...Array.from(new Map(stock.map((item) => [item.bundleId, { value: String(item.bundleId), label: `#${item.bundleId} · ${item.designName}` }])).values())];
  const results = useMemo(() => stock.filter((item) => {
    const searchMatch = !query || String(item.itemId).includes(query.trim()) || String(item.listedPrice).includes(query.replace(/\D/g, ""));
    return searchMatch && (bundle === "all" || item.bundleId === Number(bundle));
  }).slice(0, 50), [stock, query, bundle]);
  const enteredPrice = Number(sellingPrice); const hasPrice = sellingPrice !== "" && Number.isFinite(enteredPrice);
  const floorBlocked = Boolean(selected && hasPrice && enteredPrice < selected.floorPrice);
  const discountPercent = selected && hasPrice && selected.listedPrice > 0 && enteredPrice < selected.listedPrice ? ((selected.listedPrice - enteredPrice) / selected.listedPrice) * 100 : 0;
  const discountWarning = Boolean(selected && discountPercent > selected.maxDiscountPercent);

  // Selects one item and starts with its target price to minimize cashier typing.
  function selectItem(item: Item) { setSelected(item); setSellingPrice(String(item.targetPrice)); setMessage(""); setError(""); }

  // Confirms one valid sale and removes the sold item from the available-stock list.
  async function confirmSale(event: FormEvent) {
    event.preventDefault(); if (!selected || !hasPrice || floorBlocked) return;
    setSaving(true); setError(""); setMessage("");
    try {
      await apiRequest("/api/sales", { method: "POST", body: JSON.stringify({ item_id: selected.itemId, sale_date: today(), selling_price: enteredPrice }) });
      setMessage(`Item #${selected.itemId} sold for ${formatRs(enteredPrice)}.`); setSelected(null); setSellingPrice(""); setQuery(""); await refresh();
    } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "The sale could not be completed."); }
    finally { setSaving(false); }
  }

  return <><header className={appStyles.pageHeader}><div><p className={appStyles.eyebrow}>Fast checkout</p><h1 className={appStyles.title}>Point of Sale</h1><p className={appStyles.subtitle}>{stock.length} items ready to sell</p></div></header>
    <div className={styles.posGrid}><section className={`${appStyles.card} ${appStyles.contentStack}`}><label className={appStyles.field}>Find by item ID or listed price<input autoFocus inputMode="numeric" className={`${appStyles.input} ${styles.search}`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. 104 or 2500" /></label><div className={styles.browseRow}><AppSelect label="Browse by bundle" value={bundle} onValueChange={setBundle} options={bundleOptions} /></div>{loadError && <div className={appStyles.error}>{loadError}</div>}<div className={styles.results}>{loading ? <p className={appStyles.muted}>Loading available items…</p> : results.length === 0 ? <p className={appStyles.empty}>No in-stock item matches this search.</p> : results.map((item) => <button key={item.itemId} type="button" onClick={() => selectItem(item)} className={`${styles.result} ${selected?.itemId === item.itemId ? styles.resultSelected : ""}`}><span><span className={styles.resultTitle}>Item #{item.itemId} · {item.designName}</span><br /><span className={styles.resultMeta}>Bundle #{item.bundleId} · floor {formatRs(item.floorPrice)}</span></span><span className={styles.price}>{formatRs(item.listedPrice)}</span></button>)}</div></section>
      <form className={`${appStyles.card} ${styles.salePanel}`} onSubmit={confirmSale}><h2 className={appStyles.cardTitle}>Complete sale</h2>{!selected ? <p className={appStyles.empty}>Choose an item to begin.</p> : <><div className={styles.selectedDetails}><div className={styles.metric}><span>Item</span><strong>#{selected.itemId}</strong></div><div className={styles.metric}><span>Listed</span><strong>{formatRs(selected.listedPrice)}</strong></div><div className={styles.metric}><span>Target</span><strong>{formatRs(selected.targetPrice)}</strong></div><div className={styles.metric}><span>Floor</span><strong>{formatRs(selected.floorPrice)}</strong></div></div><label className={appStyles.field}>Selling price<input required inputMode="numeric" min="0" className={`${appStyles.input} ${styles.sellingPrice}`} value={sellingPrice} onChange={(event) => setSellingPrice(event.target.value)} /></label>{floorBlocked && <div className={appStyles.hardBlock}>HARD BLOCK: Price is {formatRs(selected.floorPrice - enteredPrice)} below the floor.</div>}{discountWarning && !floorBlocked && <div className={appStyles.warning}>Discount is {discountPercent.toFixed(1)}%, above the allowed {selected.maxDiscountPercent}%.</div>}<button className={`${appStyles.button} ${styles.confirm}`} disabled={saving || floorBlocked || !hasPrice}>{saving ? "Confirming…" : "Confirm Sale"}</button></>}{error && <div className={appStyles.error}>{error}</div>}{message && <div className={appStyles.success}>{message}</div>}</form>
    </div></>;
}