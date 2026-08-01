# Shop Manager: Day-to-Day Guide

**Verified:** All screen names, button labels, workflows, and the six reports in this guide match the current app. The existing checks also confirm that arrivals, losses, pricing, sales, returns, recoveries, and reports work as described.

## Getting started

Shop Manager helps you track what you buy, what reaches the shop, what you have in stock, what you sell, and what you lose along the way.

The usual flow is simple:

1. Record an order from a supplier.
2. Add each bundle or batch you bought in that order.
3. When the shipment arrives, record how many pieces actually came. If anything is missing, the loss is recorded automatically.
4. Set selling prices for the pieces that arrived.
5. Record each sale from **POS**.
6. If a supplier later refunds or replaces missing goods, record it under **Loss & Recovery**.

The four main sections at the bottom are **POS**, **Inventory**, **Orders**, and **Reports**. **Loss & Recovery** and **Settings** are opened from the **Reports** page.

## Recording a purchase (Orders)

### Create the order

1. Open **Orders**.
2. Tap **New order**.
3. Fill in the purchase details:
   - **Supplier or country:** Who you bought from, or the country you use to identify this source.
   - **Order date:** The date you placed or recorded the purchase.
   - **Transportation fee:** The total shipping or transport charge for the whole order. Do not divide it among the clothes.
   - **Expected bundle count:** Roughly how many bundles or batches you expect this order to contain.
4. Tap **Create order**.

The order opens immediately so you can add its bundles.

### Add each bundle or batch

1. In the order, tap **Add bundle**.
2. Enter:
   - **Type:** The kind of clothing, such as kurti, shirt, jeans, or dress.
   - **Design name:** The name you use to recognize that design or batch.
   - **Items ordered:** How many individual pieces should be in this bundle.
   - **Cost per item:** What you paid the supplier for one piece, not including the order's transportation fee.
3. Tap **Save Bundle**.
4. Repeat for the other bundles in the order.

**Expected bundle count** is only your rough plan. You may add more or fewer bundles than expected. It does not block you or force the final number to match.

If you entered an order detail incorrectly, tap **Edit order**, make the correction, and tap **Save changes**.

When you know you will not add any more bundles, tap **Close order**, then **Confirm Close**. Closing an order removes the **Add bundle** option, but any bundle still marked **pending** can still be recorded as arrived or lost later.

## When a shipment arrives (or does not)

### Record an arrival

1. Open **Orders** and choose the order.
2. Find the bundle marked **pending**.
3. Tap **Mark arrived**.
4. Enter:
   - **Items received:** The number of physical pieces that actually reached you.
   - **Arrival date:** The date they reached the shop.
   - **Variant (optional):** A shared detail such as color or size if it applies to every received piece. You can fix individual pieces later in **Inventory**.
5. Check the message showing how many inventory items and missing pieces will be recorded.
6. Tap **Confirm arrival**.

One sellable inventory item is created for every piece received. If you ordered 12 and received 10, all 10 pieces become inventory and the missing 2 are recorded as a partial transit loss automatically.

The cost of each received piece stays equal to the bundle's **Cost per item**. Missing pieces and transportation charges do not increase that cost.

### Record a total loss

Use this when none of the bundle arrived, not when only some pieces are missing.

1. Find the **pending** bundle.
2. Tap **Mark lost**.
3. Confirm the message.

No inventory pieces are created. The whole bundle value is recorded as a transit loss and can be followed up under **Loss & Recovery**.

### Record a later refund or replacement

1. Open **Reports**.
2. Tap **Loss & Recovery**.
3. Find the loss and tap **Record recovery**.
4. Choose the **Recovery type**:
   - **Refunded:** The supplier or carrier paid money back.
   - **Replaced:** Missing pieces were sent again.
5. Enter the **Recovery value** and **Recovery date**.
6. Tap **Save recovery**.

The original loss stays visible with its original date. The refund or replacement is shown separately on the date it happened, so this month's result improves without rewriting an older month's history.

If you choose **Replaced**, a new **pending** replacement bundle is added to the original order. Tap **Open replacement bundle** on the recovered loss, then record that bundle with **Mark arrived** or **Mark lost** when you know its outcome.

## Setting prices (Inventory)

Newly arrived pieces begin with their purchase cost in all price fields. Set the real selling prices before offering them to customers.

Open **Inventory**, find an item, and tap **View details / pricing**.

- **Fixed inherited cost:** What you paid the supplier for that piece. It comes from the bundle and cannot be changed here.
- **Marked price:** The reference or tag price before any offer or bargaining.
- **Listed price:** The normal price shown or quoted to the customer.
- **Target price:** The price you would like to complete the sale at. **POS** starts with this amount to save typing.
- **Floor price:** The lowest price you are willing to accept. A sale below this is blocked.
- **Max discount %:** How far below the listed price you are normally willing to go before seeing a warning.
- **Variant (optional):** The individual piece's size, color, or other useful detail.

Tap **Save item** when finished.

### Price a whole batch together

If the in-stock pieces from one bundle should have the same prices:

1. In **Inventory**, choose that bundle from the **Bundle** filter.
2. Tap **Bulk price (number eligible)**.
3. Enter the five selling-price fields.
4. Tap **Apply to (number) in-stock items**.

Only pieces currently **in stock** are changed. Sold and damaged pieces are protected, and the fixed cost never changes. A returned sale is back **in stock**, so it can be priced again if needed.

After bulk pricing, open any unusual piece with **View details / pricing** and adjust it separately.

If a piece is physically damaged and should not be sold, tap **Mark damaged** and confirm. Do not use this for stock that is simply taking a long time to sell.

## Making a sale

1. Open **POS**.
2. Use **Find by item ID or listed price**, or choose a batch under **Browse by bundle**.
3. Tap the item being sold.
4. Check its fixed cost, listed price, target price, and floor price.
5. Enter the final **Selling price**.
6. Tap **Confirm Sale**.

The target price is filled in first, but you can change it to the amount agreed with the customer.

If the discount is larger than the item's **Max discount %**, a warning shows how far beyond your usual limit you are going. You may still make the sale if the price makes sense for that customer or situation.

If the amount is below your **Floor price**, the button changes to **Sale Blocked — Below Floor**. Raise the selling price or review the item's floor price in **Inventory**. The sale cannot continue below the floor.

### Process a customer return

1. On **POS**, go to **Recent sales**.
2. Find the sale and tap **Process return**.
3. Confirm the return.

The sale remains in the list as **returned**, so you can still see what happened. Its profit is removed from reports, and the item becomes **in stock** and sellable again.

## Understanding the reports

Open **Reports**, choose a **Month** and your preferred **Dead stock days**, then tap **Refresh reports**. The month applies to **Profit & Loss** and **Discount Leakage**. The dead-stock setting applies to **Dead Stock**.

### Profit & Loss

**Question it answers:** "After item profit, transportation charges, shipment losses, and later recoveries, did the shop make or lose money this month?"

Check it at the end of every month, and take a quick look weekly if cash feels tight. **Item profit** shows what active sales earned above the pieces' purchase cost. **Transit losses** and **Transport fees** pull the result down; **Recoveries** bring back value from earlier losses. **Net P&L** is the final result from the shop activity recorded in the app.

A positive, steadily improving **Net P&L** is healthy. A negative result, or a falling result over several months, deserves attention. Check whether weak sales, large transport charges, unrecovered losses, or heavy discounts are the main reason. Remember that expenses not recorded here, such as rent or electricity, are not included.

### Dead Stock

**Question it answers:** "Which pieces have been sitting unsold longer than I am comfortable with?"

Check it weekly and before buying more of a similar design. Set **Dead stock days** to the point when you want a piece brought to your attention, such as 60 or 90 days. You can also set your usual number through **Settings**.

A short list is normal, especially for seasonal stock. A growing list or many pieces from the same bundle should worry you. Consider a display change, a controlled discount, or avoiding that design in the next order.

### Fastest / Slowest Movers

**Question it answers:** "Which clothing types and designs sell quickly, and which take the longest?"

Check it before restocking and at the end of a season. It shows how many pieces of each design sold and their average days from arrival to sale. Use **Show slowest first** or **Show fastest first** depending on what you are reviewing.

High units sold with fewer average days is a strong restocking signal. High average days, especially with few sales, suggests cautious reordering. Always consider season and current demand before making the final decision.

### Transit Loss

**Question it answers:** "How much value was lost in shipments, how much came back, and how much is still unrecovered?"

Check it whenever following up with a supplier or carrier, and review it at least monthly. Each row shows the original **Loss**, the amount **Recovered**, and the remaining **Unrecovered** value.

An unrecovered amount of zero is the best outcome. A rising unrecovered total or repeated losses from the same supplier or route should worry you and may justify a claim, a different carrier, or different buying terms.

### Discount Leakage

**Question it answers:** "How much money did I give up this month by selling below my listed prices?"

Check it weekly if bargaining is frequent, and review it with monthly profit. A low, controlled amount may be a sensible cost of closing sales. A rising number without stronger sales or better stock movement means discounts may be eating too much of your margin.

Use this with **Profit & Loss**: if item profit is weak while discount leakage is high, tighten discount habits or review listed and target prices.

### Bundle Profitability

**Question it answers:** "Which batches are producing profit, and which are being dragged down by shipment loss?"

Check it before reordering a design and after enough pieces from the batch have sold. **Item profit** is the profit from its active sales, **Margin** shows that profit as a share of sales, **Loss** shows its transit loss, and **Result** shows sales profit after that loss.

A positive result and a comfortable margin are good signs. A negative result after several sales, a weak margin, or a large loss deserves attention. A new bundle may show little or no result simply because most pieces are still unsold, so do not judge it too early.

Refunds and replacements are visible in **Transit Loss** and **Profit & Loss** rather than being added to this bundle result. The order's transportation fee also stays in **Profit & Loss**, not in an individual bundle.

## Quick reference

### What do the status tags mean?

- **ongoing:** The order is open and you can still add bundles.
- **closed:** You have finished adding bundles to the order. Existing pending bundles can still arrive or be lost.
- **pending:** The bundle has been ordered, but its arrival or loss has not yet been recorded.
- **arrived:** At least one piece from the bundle reached the shop.
- **lost:** None of the bundle reached the shop.
- **refunded:** A recorded shipment loss was settled with money back.
- **replaced:** A recorded shipment loss was settled with replacement goods; follow the linked replacement bundle separately.
- **in stock:** The individual piece is available to sell.
- **sold:** The individual piece has an active sale.
- **damaged:** The piece is not sellable because of physical damage.
- **active:** The sale currently counts toward profit.
- **returned:** The customer return is recorded. On a sale, it no longer counts toward profit and the piece goes back into stock.
- **none / pending claim:** A shipment loss has not yet received a final refund or replacement.

### Common questions

**What is the difference between marking a bundle lost and stock just not selling?**

**Mark lost** means goods never arrived from the shipment. It records a transit loss. Goods that arrived but remain unsold stay **in stock** and may appear in **Dead Stock** after enough days. Do not mark slow-selling clothes as lost.

**What if only part of a bundle arrives?**

Use **Mark arrived** and enter the actual **Items received**. The received pieces go into inventory, and the shortfall becomes a partial transit loss automatically.

**Can I add more bundles than I expected?**

Yes. **Expected bundle count** is guidance only, not a limit.

**Why can I not change an item's cost?**

Its cost is the supplier price recorded on the bundle. Keeping that amount fixed lets you see honest profit even when transport costs, losses, discounts, or recoveries happen later.

**Should I use Mark damaged for old stock?**

No. Use **Mark damaged** only when the physical piece cannot be sold. Old but sellable stock should remain **in stock** and be managed through **Dead Stock**, pricing, display, or a planned discount.