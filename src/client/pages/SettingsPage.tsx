import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import alertStyles from "../components/Alert.module.css";
import buttonStyles from "../components/Button.module.css";
import cardStyles from "../components/Card.module.css";
import formStyles from "../components/Form.module.css";
import inputStyles from "../components/Input.module.css";
import pageStyles from "../components/Page.module.css";

// Stores device-local reporting preferences for the solo shop owner.
export function SettingsPage() {
  const [deadStockDays, setDeadStockDays] = useState(localStorage.getItem("deadStockThreshold") ?? "90");
  const [saved, setSaved] = useState(false);

  // Persists the dead-stock threshold so reports use the same preference on future visits.
  function saveSettings(event: FormEvent) {
    event.preventDefault();
    localStorage.setItem("deadStockThreshold", deadStockDays);
    setSaved(true);
  }

  // Keeps the saved confirmation honest by clearing it as soon as the value is edited again.
  function editDeadStockDays(nextValue: string) {
    setDeadStockDays(nextValue);
    setSaved(false);
  }

  return <>
    <header className={pageStyles.pageHeader}>
      <div>
        <p className={pageStyles.eyebrow}>Device preferences</p>
        <h1 className={pageStyles.title}>Settings</h1>
      </div>
    </header>

    <form className={`${cardStyles.card} ${pageStyles.contentStack}`} onSubmit={saveSettings}>
      <label className={inputStyles.field}>
        <span className={inputStyles.label}>Dead stock threshold (days)</span>
        <input
          required
          type="number"
          min="0"
          inputMode="numeric"
          className={inputStyles.input}
          value={deadStockDays}
          onChange={(event) => editDeadStockDays(event.target.value)}
        />
      </label>

      <p className={pageStyles.muted}>
        An in-stock item appears in the Dead Stock report after its bundle has been present longer than this many days.
      </p>

      <div className={formStyles.actions}>
        <button className={`${buttonStyles.button} ${buttonStyles.primary}`}>Save Settings</button>
        <Link className={`${buttonStyles.button} ${buttonStyles.secondary}`} to="/reports">Back to Reports</Link>
      </div>

      {saved && <div className={`${alertStyles.alert} ${alertStyles.success}`}>Settings saved on this device.</div>}
    </form>
  </>;
}
