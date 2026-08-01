import { useState } from "react";
import { apiRequest, formatRs, today } from "../api";
import { calculateProfitMarginPercent } from "../../shared/money";
import type { Sale } from "../types";
import buttonStyles from "./Button.module.css";
import cardStyles from "./Card.module.css";
import styles from "./SaleCard.module.css";

type SaleCardProps = { sale: Sale; onReturned: (sale: Sale) => void };

// Shows one preserved sale event and offers return only while it actively contributes profit.
export function SaleCard({ sale, onReturned }: SaleCardProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const margin = sale.profit === null ? null : calculateProfitMarginPercent(sale.profit, sale.sellingPrice);

  // Returns the item to stock while preserving this sale row and removing its active profit.
  async function processReturn() {
    const confirmed = window.confirm("Process this return? The sale history will be preserved, its active profit will be removed from reports, and the item will return to stock.");
    if (!confirmed) return;
    setSaving(true); setError("");
    try {
      const response = await apiRequest<{ sale: Sale }>(`/api/sales/${sale.saleId}/return`, { method: "POST", body: JSON.stringify({ return_date: today() }) });
      onReturned({ ...sale, ...response.sale });
    } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "The return could not be processed."); }
    finally { setSaving(false); }
  }

  return <article className={`${cardStyles.card} ${styles.card}`}>
    <div><p className={styles.date}>Sale {sale.saleDate}</p><h3>{sale.bundleType} · {sale.designName}</h3>{sale.variant && <p className={styles.variant}>{sale.variant}</p>}</div>
    <span className={`${styles.status} ${sale.status === "returned" ? styles.returned : styles.active}`}>{sale.status}</span>
    <div className={styles.metrics}><div><span>Selling price</span><strong>{formatRs(sale.sellingPrice)}</strong></div><div><span>Profit</span><strong>{sale.profit === null ? "Removed" : `${formatRs(sale.profit)} (${margin?.toFixed(1)}%)`}</strong></div></div>
    {sale.status === "active" ? <button className={`${buttonStyles.button} ${buttonStyles.secondary} ${styles.returnAction}`} disabled={saving} onClick={() => void processReturn()}>{saving ? "Processing…" : "Process return"}</button> : <p className={styles.returnedNote}>Returned {sale.returnedDate}. Sale history retained; item restored to stock.</p>}
    {error && <div className={styles.error}>{error}</div>}
  </article>;
}