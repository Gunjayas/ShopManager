import cardStyles from "../../components/Card.module.css";
import styles from "../HelpPage.module.css";

// Explains the owner's regular purchase, arrival, pricing, and checkout work.
export function HelpOperations() {
  return <>
    <section className={`${cardStyles.card} ${styles.section}`}>
      <h2>Getting started</h2>
      <p>Use the app to track what you buy, what reaches the shop, what is available, what sells, and what is lost.</p>
      <ol>
        <li>Record an order and add each bundle or batch.</li>
        <li>Record what arrived and any missing pieces.</li>
        <li>Set prices on the pieces that arrived.</li>
        <li>Record sales from <strong>POS</strong>.</li>
        <li>Record later refunds or replacements under <strong>Loss & Recovery</strong>.</li>
      </ol>
    </section>

    <section id="orders" className={`${cardStyles.card} ${styles.section}`}>
      <h2>Recording a purchase</h2>
      <h3>Create the order</h3>
      <ol>
        <li>Open <strong>Orders</strong>, tap <strong>New order</strong>, and enter the purchase details.</li>
        <li><strong>Supplier or country:</strong> who you bought from or how you identify the source.</li>
        <li><strong>Order date:</strong> when you placed or recorded the purchase.</li>
        <li><strong>Transportation fee:</strong> shipping for the whole order. Do not divide it among the clothes.</li>
        <li><strong>Expected bundle count:</strong> your rough plan. You may add more or fewer without being blocked.</li>
        <li>Tap <strong>Create order</strong>.</li>
      </ol>
      <h3>Add each bundle</h3>
      <ol>
        <li>Tap <strong>Add bundle</strong>.</li>
        <li>Enter the clothing <strong>Type</strong>, your <strong>Design name</strong>, <strong>Items ordered</strong>, and supplier <strong>Cost per item</strong>.</li>
        <li>Tap <strong>Save Bundle</strong> and repeat for the other batches.</li>
      </ol>
      <p>Use <strong>Edit order</strong> to correct purchase details. When no more bundles will be added, use <strong>Close order</strong>. Pending bundles can still be marked arrived or lost after closure.</p>
    </section>

    <section id="shipments" className={`${cardStyles.card} ${styles.section}`}>
      <h2>When a shipment arrives—or does not</h2>
      <h3>Arrival or partial loss</h3>
      <ol>
        <li>Open the order, find the <strong>pending</strong> bundle, and tap <strong>Mark arrived</strong>.</li>
        <li>Enter the actual <strong>Items received</strong>, the <strong>Arrival date</strong>, and an optional shared color or size under <strong>Variant</strong>.</li>
        <li>Check the result shown, then tap <strong>Confirm arrival</strong>.</li>
      </ol>
      <p>Every received piece becomes an inventory item. If 12 were ordered and 10 arrived, all 10 go into stock and the missing 2 become a transit loss automatically. Their absence does not increase the received pieces' cost.</p>
      <h3>Total loss</h3>
      <p>If none of the bundle arrived, tap <strong>Mark lost</strong> and confirm. No inventory is created, and the full bundle value becomes a transit loss.</p>
      <h3>Later refund or replacement</h3>
      <ol>
        <li>Open <strong>Reports</strong> → <strong>Loss & Recovery</strong>, find the loss, and tap <strong>Record recovery</strong>.</li>
        <li>Choose <strong>Refunded</strong> for money back or <strong>Replaced</strong> for replacement goods.</li>
        <li>Enter the value and date, then tap <strong>Save recovery</strong>.</li>
      </ol>
      <p>The original loss stays visible. A replacement creates a new pending bundle; open it from the loss and record whether it arrives.</p>
    </section>

    <section id="inventory" className={`${cardStyles.card} ${styles.section}`}>
      <h2>Setting prices</h2>
      <p>Open <strong>Inventory</strong>, find a piece, and tap <strong>View details / pricing</strong>.</p>
      <dl className={styles.definitions}>
        <div><dt>Fixed inherited cost</dt><dd>What you paid the supplier. It cannot be changed here.</dd></div>
        <div><dt>Marked price</dt><dd>The reference or tag price before an offer.</dd></div>
        <div><dt>Listed price</dt><dd>The normal price shown or quoted.</dd></div>
        <div><dt>Target price</dt><dd>The price you hope to sell at; POS starts here.</dd></div>
        <div><dt>Floor price</dt><dd>Your lowest acceptable amount. Sales below it are blocked.</dd></div>
        <div><dt>Max discount %</dt><dd>Your normal discount limit before a warning appears.</dd></div>
      </dl>
      <p>To price a whole batch, choose its <strong>Bundle</strong>, tap <strong>Bulk price</strong>, enter the prices, and apply them. Only in-stock pieces change. You can then adjust unusual pieces individually.</p>
      <p>Use <strong>Mark damaged</strong> only for a physically unsellable piece—not for slow-moving stock.</p>
    </section>

    <section id="sales" className={`${cardStyles.card} ${styles.section}`}>
      <h2>Making a sale and handling a return</h2>
      <ol>
        <li>Open <strong>POS</strong>. Find the piece by item ID or listed price, or browse by bundle.</li>
        <li>Select it, enter the agreed <strong>Selling price</strong>, and tap <strong>Confirm Sale</strong>.</li>
      </ol>
      <p>A larger-than-usual discount shows a warning but is allowed. A price below your floor changes the button to <strong>Sale Blocked — Below Floor</strong> and cannot continue.</p>
      <p>For a return, find the sale under <strong>Recent sales</strong>, tap <strong>Process return</strong>, and confirm. The sale remains visible as returned, its profit is removed, and the piece becomes sellable again.</p>
    </section>
  </>;
}