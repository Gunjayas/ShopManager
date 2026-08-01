import type { Sale } from "../types";
import alertStyles from "./Alert.module.css";
import pageStyles from "./Page.module.css";
import { SaleCard } from "./SaleCard";
import styles from "./SalesLedger.module.css";

type SalesLedgerProps = {
  sales: Sale[];
  loading: boolean;
  error: string;
  onReturned: (sale: Sale) => void;
};

// Lists preserved sale events and keeps returned rows visible as audit history.
export function SalesLedger({ sales, loading, error, onReturned }: SalesLedgerProps) {
  return <section className={styles.ledger}>
    <div><p className={pageStyles.eyebrow}>Sales ledger</p><h2 className={pageStyles.cardTitle}>Recent sales</h2></div>
    {error && <div className={`${alertStyles.alert} ${alertStyles.error}`}>{error}</div>}
    {loading ? <p className={pageStyles.muted}>Loading sales…</p> : sales.length === 0 ? <p className={pageStyles.empty}>No sales recorded yet.</p> : sales.map((sale) => <SaleCard key={sale.saleId} sale={sale} onReturned={onReturned} />)}
  </section>;
}