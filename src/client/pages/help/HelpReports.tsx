import cardStyles from "../../components/Card.module.css";
import styles from "../HelpPage.module.css";

// Helps the owner turn each report into a practical shop decision.
export function HelpReports() {
  return <section id="reports-guide" className={`${cardStyles.card} ${styles.section}`}>
    <h2>Understanding the reports</h2>
    <p>Choose a <strong>Month</strong> and <strong>Dead stock days</strong>, then tap <strong>Refresh reports</strong>.</p>

    <article className={styles.report}>
      <h3>Profit & Loss</h3>
      <p><strong>Answers:</strong> Did the shop make or lose money this month after item profit, shipping, transit losses, and recoveries?</p>
      <p><strong>Check:</strong> At month-end, or weekly when cash feels tight. A positive, improving Net P&amp;L is healthy. A negative or falling result needs attention. Rent, electricity, and other unrecorded expenses are not included.</p>
    </article>

    <article className={styles.report}>
      <h3>Dead Stock</h3>
      <p><strong>Answers:</strong> Which sellable pieces have sat longer than your chosen limit?</p>
      <p><strong>Check:</strong> Weekly and before restocking. A growing list—or many pieces from one batch—suggests changing the display, using a controlled discount, or avoiding that design next time.</p>
    </article>

    <article className={styles.report}>
      <h3>Fastest / Slowest Movers</h3>
      <p><strong>Answers:</strong> Which types and designs sell quickly, and which take longest?</p>
      <p><strong>Check:</strong> Before restocking and at season-end. More units sold in fewer days is encouraging; few sales with a high average needs cautious reordering.</p>
    </article>

    <article className={styles.report}>
      <h3>Transit Loss</h3>
      <p><strong>Answers:</strong> What shipment value was lost, recovered, and still remains unrecovered?</p>
      <p><strong>Check:</strong> While chasing a supplier or carrier, and monthly. Zero unrecovered value is best. Repeated or rising losses may justify changing carrier or buying terms.</p>
    </article>

    <article className={styles.report}>
      <h3>Discount Leakage</h3>
      <p><strong>Answers:</strong> How much did you give up this month by selling below listed prices?</p>
      <p><strong>Check:</strong> Weekly when bargaining is common, then with monthly profit. A rising amount without stronger sales means discounting may be eating too much margin.</p>
    </article>

    <article className={styles.report}>
      <h3>Bundle Profitability</h3>
      <p><strong>Answers:</strong> Which batches produce profit, and which are pulled down by transit loss?</p>
      <p><strong>Check:</strong> Before reordering, after enough pieces have sold. A positive result and comfortable margin are good. Do not judge a new bundle too early while most pieces remain unsold.</p>
      <p>Refunds and replacements appear in <strong>Transit Loss</strong> and <strong>Profit & Loss</strong>. Transportation fees remain in <strong>Profit & Loss</strong>, not in one bundle.</p>
    </article>
  </section>;
}