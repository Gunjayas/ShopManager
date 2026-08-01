import { Link } from "react-router-dom";
import cardStyles from "../components/Card.module.css";
import pageStyles from "../components/Page.module.css";
import { HelpOperations } from "./help/HelpOperations";
import { HelpReference } from "./help/HelpReference";
import { HelpReports } from "./help/HelpReports";
import styles from "./HelpPage.module.css";

// Gives the shop owner a task-focused guide that is easy to scan while working.
export function HelpPage() {
  return <>
    <header className={pageStyles.pageHeader}>
      <div>
        <p className={pageStyles.eyebrow}>Day-to-day help</p>
        <h1 className={pageStyles.title}>Shop Manager Guide</h1>
        <p className={pageStyles.subtitle}>How to record purchases, manage stock, sell items, and understand your results.</p>
      </div>
      <Link className={styles.backLink} to="/reports">Back to Reports</Link>
    </header>

    <nav className={`${cardStyles.card} ${styles.contents}`} aria-label="Guide contents">
      <strong>Jump to</strong>
      <div className={styles.contentsLinks}>
        <a href="#orders">Orders</a>
        <a href="#shipments">Shipments</a>
        <a href="#inventory">Pricing</a>
        <a href="#sales">Sales</a>
        <a href="#reports-guide">Reports</a>
        <a href="#quick-reference">Status guide</a>
      </div>
    </nav>

    <main className={styles.guide}>
      <HelpOperations />
      <HelpReports />
      <HelpReference />
    </main>
  </>;
}