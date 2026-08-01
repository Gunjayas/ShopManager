import { LossCard } from "../components/LossCard";
import { useApiList } from "../hooks/useApiList";
import appStyles from "../styles/app.module.css";
import type { Loss } from "../types";
import styles from "./LossesPage.module.css";

// Lists complete loss history and keeps recovery forms attached to immutable event facts.
export function LossesPage() {
  const losses = useApiList<Loss>("/api/losses", "losses");
  function updateLoss(updatedLoss: Loss) { losses.setData((currentLosses) => currentLosses.map((loss) => loss.lossId === updatedLoss.lossId ? updatedLoss : loss)); }
  return <><header className={appStyles.pageHeader}><div><p className={appStyles.eyebrow}>Transit history</p><h1 className={appStyles.title}>Loss & Recovery</h1><p className={appStyles.subtitle}>Original losses and later recoveries remain separate dated events.</p></div></header>{losses.error && <div className={appStyles.error}>{losses.error}</div>}<section className={styles.list}>{losses.loading ? <div className={appStyles.empty}>Loading losses…</div> : losses.data.length === 0 ? <div className={styles.empty}>No loss history.</div> : losses.data.map((loss) => <LossCard key={loss.lossId} loss={loss} onRecovered={updateLoss} />)}</section></>;
}