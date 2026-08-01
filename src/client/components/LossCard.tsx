import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { apiRequest, formatRs, today } from "../api";
import type { Loss } from "../types";
import { AppSelect } from "./AppSelect";
import buttonStyles from "./Button.module.css";
import cardStyles from "./Card.module.css";
import formStyles from "./Form.module.css";
import inputStyles from "./Input.module.css";
import styles from "./LossCard.module.css";

type LossCardProps = { loss: Loss; onRecovered: (loss: Loss) => void };

// Presents immutable loss facts and reveals recovery entry only while the claim remains open.
export function LossCard({ loss, onRecovered }: LossCardProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState("refunded");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const finalRecovery = loss.recoveryStatus === "refunded" || loss.recoveryStatus === "replaced";
  const recoveryValue = loss.recoveryValue ?? 0;

  // Appends a final recovery event while preserving the original loss values and date.
  async function recoverLoss(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const recoveryForm = new FormData(event.currentTarget);
    setSaving(true); setError("");
    try {
      const response = await apiRequest<{ loss: Loss }>(`/api/losses/${loss.lossId}/recover`, { method: "PATCH", body: JSON.stringify({ recovery_status: recoveryStatus, recovery_value: Number(recoveryForm.get("value")), recovery_date: recoveryForm.get("date") }) });
      onRecovered({ ...loss, ...response.loss }); setFormOpen(false);
    } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "Recovery could not be recorded."); }
    finally { setSaving(false); }
  }

  return <article className={`${cardStyles.card} ${styles.card}`}>
    <div><p className={styles.identity}>Loss #{loss.lossId} · {loss.lossDate}</p><h2>{loss.bundleType} · {loss.designName}</h2><p className={styles.supplier}>{loss.supplierOrCountry}</p></div>
    <span className={styles.status}>{loss.recoveryStatus.replace("_", " ")}</span>
    <div className={styles.facts}><div><span>Loss type</span><strong>{loss.lossType.replace("_", " ")}</strong></div><div><span>Items lost</span><strong>{loss.itemsLost}</strong></div><div><span>Loss value</span><strong>{formatRs(loss.lossValue)}</strong></div><div className={styles.net}><span>Net loss</span><strong>{formatRs(loss.lossValue - recoveryValue)}</strong></div></div>
    {finalRecovery && <div className={styles.recovery}><div><span>Recovery value</span><strong>{formatRs(recoveryValue)}</strong></div><div><span>Recovery date</span><strong>{loss.recoveryDate}</strong></div>{loss.recoveryStatus === "replaced" && loss.replacementBundleId && <Link className={styles.link} to={`/orders/${loss.orderId}#bundle-${loss.replacementBundleId}`}>Open replacement bundle #{loss.replacementBundleId}</Link>}</div>}
    {!finalRecovery && <button className={`${buttonStyles.button} ${buttonStyles.secondary} ${styles.recoveryAction}`} onClick={() => setFormOpen((open) => !open)}>{formOpen ? "Hide recovery form" : "Record recovery"}</button>}
    {error && <div className={styles.error}>{error}</div>}
    {formOpen && <form className={`${formStyles.formGrid} ${styles.form}`} onSubmit={recoverLoss}><div className={formStyles.full}><AppSelect label="Recovery type" value={recoveryStatus} onValueChange={setRecoveryStatus} options={[{ value: "refunded", label: "Refunded" }, { value: "replaced", label: "Replaced" }]} /></div><label className={inputStyles.field}><span className={inputStyles.label}>Recovery value</span><input required name="value" type="number" min="0" className={inputStyles.input} /></label><label className={inputStyles.field}><span className={inputStyles.label}>Recovery date</span><input required name="date" type="date" defaultValue={today()} className={inputStyles.input} /></label><div className={`${formStyles.actions} ${formStyles.full}`}><button className={`${buttonStyles.button} ${buttonStyles.primary}`} disabled={saving}>{saving ? "Saving…" : "Save recovery"}</button><button type="button" className={`${buttonStyles.button} ${buttonStyles.secondary}`} onClick={() => setFormOpen(false)}>Cancel</button></div></form>}
  </article>;
}