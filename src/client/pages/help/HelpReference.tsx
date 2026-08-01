import cardStyles from "../../components/Card.module.css";
import styles from "../HelpPage.module.css";

// Defines shop statuses and prevents common day-to-day recording mistakes.
export function HelpReference() {
  return <section id="quick-reference" className={`${cardStyles.card} ${styles.section}`}>
    <h2>Quick reference</h2>
    <dl className={styles.statuses}>
      <div><dt>ongoing</dt><dd>The order is open for more bundles.</dd></div>
      <div><dt>closed</dt><dd>No more bundles can be added; pending ones can still arrive or be lost.</dd></div>
      <div><dt>pending</dt><dd>The bundle's arrival or loss has not been recorded.</dd></div>
      <div><dt>arrived</dt><dd>At least one piece reached the shop.</dd></div>
      <div><dt>lost</dt><dd>None of the bundle reached the shop.</dd></div>
      <div><dt>refunded / replaced</dt><dd>A shipment loss was settled with money or replacement goods.</dd></div>
      <div><dt>in stock</dt><dd>The piece is available to sell.</dd></div>
      <div><dt>sold</dt><dd>The piece has an active sale.</dd></div>
      <div><dt>damaged</dt><dd>The physical piece cannot be sold.</dd></div>
      <div><dt>active</dt><dd>The sale currently counts toward profit.</dd></div>
      <div><dt>returned</dt><dd>The sale no longer counts toward profit and the piece is back in stock.</dd></div>
      <div><dt>none / pending claim</dt><dd>A loss has no final refund or replacement yet.</dd></div>
    </dl>

    <h3>Lost is not the same as unsold</h3>
    <p><strong>Mark lost</strong> means goods never arrived. Clothes that arrived but are slow to sell remain <strong>in stock</strong> and may appear in <strong>Dead Stock</strong>.</p>
    <h3>Only part of a bundle arrived?</h3>
    <p>Use <strong>Mark arrived</strong> and enter the actual received count. The missing portion becomes a transit loss automatically.</p>
    <h3>Why is cost fixed?</h3>
    <p>It keeps profit honest. Transportation, losses, discounts, and recoveries are tracked separately instead of changing what one piece cost.</p>
  </section>;
}