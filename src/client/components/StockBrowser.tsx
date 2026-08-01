import { useMemo } from "react";
import { formatRs } from "../api";
import type { Item } from "../types";
import { AppSelect } from "./AppSelect";
import alertStyles from "./Alert.module.css";
import cardStyles from "./Card.module.css";
import inputStyles from "./Input.module.css";
import pageStyles from "./Page.module.css";
import styles from "./StockBrowser.module.css";

type StockBrowserProps = {
  stock: Item[];
  loading: boolean;
  error: string;
  query: string;
  bundle: string;
  selectedItemId?: number;
  onQueryChange: (query: string) => void;
  onBundleChange: (bundle: string) => void;
  onSelect: (item: Item) => void;
};

// Filters sellable stock by item identity or bundle for a fast one-item checkout.
export function StockBrowser(props: StockBrowserProps) {
  const bundleOptions = [
    { value: "all", label: "All bundles" },
    ...Array.from(new Map(props.stock.map((item) => [item.bundleId, { value: String(item.bundleId), label: `#${item.bundleId} · ${item.designName}` }])).values()),
  ];
  const results = useMemo(() => props.stock.filter((item) => {
    const searchMatch = !props.query || String(item.itemId).includes(props.query.trim()) || String(item.listedPrice).includes(props.query.replace(/\D/g, ""));
    return searchMatch && (props.bundle === "all" || item.bundleId === Number(props.bundle));
  }).slice(0, 50), [props.stock, props.query, props.bundle]);

  return <section className={`${cardStyles.card} ${pageStyles.contentStack}`}>
    <label className={inputStyles.field}><span className={inputStyles.label}>Find by item ID or listed price</span><input autoFocus inputMode="numeric" className={`${inputStyles.input} ${styles.search}`} value={props.query} onChange={(event) => props.onQueryChange(event.target.value)} placeholder="e.g. 104 or 2500" /></label>
    <AppSelect label="Browse by bundle" value={props.bundle} onValueChange={props.onBundleChange} options={bundleOptions} />
    {props.error && <div className={`${alertStyles.alert} ${alertStyles.error}`}>{props.error}</div>}
    <div className={styles.results}>{props.loading ? <p className={pageStyles.muted}>Loading available items…</p> : results.length === 0 ? <p className={pageStyles.empty}>No in-stock item matches this search.</p> : results.map((item) => <button key={item.itemId} type="button" onClick={() => props.onSelect(item)} className={`${styles.result} ${props.selectedItemId === item.itemId ? styles.resultSelected : ""}`}><span><span className={styles.resultTitle}>Item #{item.itemId} · {item.designName}</span><br /><span className={styles.resultMeta}>Bundle #{item.bundleId} · floor {formatRs(item.floorPrice)}</span></span><span className={styles.price}>{formatRs(item.listedPrice)}</span></button>)}</div>
  </section>;
}