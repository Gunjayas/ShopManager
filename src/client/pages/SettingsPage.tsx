import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import appStyles from "../styles/app.module.css";

// Stores device-local reporting preferences for the solo shop owner.
export function SettingsPage() {
  const [threshold, setThreshold] = useState(localStorage.getItem("deadStockThreshold") ?? "90"); const [saved, setSaved] = useState(false);
  // Persists the dead-stock threshold so reports use the same preference on future visits.
  function saveSettings(event: FormEvent) { event.preventDefault(); localStorage.setItem("deadStockThreshold", threshold); setSaved(true); }
  return <><header className={appStyles.pageHeader}><div><p className={appStyles.eyebrow}>Device preferences</p><h1 className={appStyles.title}>Settings</h1></div></header><form className={`${appStyles.card} ${appStyles.contentStack}`} onSubmit={saveSettings}><label className={appStyles.field}>Dead stock threshold (days)<input required type="number" min="0" value={threshold} onChange={(event) => { setThreshold(event.target.value); setSaved(false); }} className={appStyles.input} /></label><p className={appStyles.muted}>An in-stock item appears in the Dead Stock report after its bundle has been present longer than this many days.</p><div className={appStyles.actions}><button className={appStyles.button}>Save Settings</button><Link className={`${appStyles.button} ${appStyles.buttonSecondary}`} to="/reports">Back to Reports</Link></div>{saved && <div className={appStyles.success}>Settings saved on this device.</div>}</form></>;
}