import { eq } from "drizzle-orm";
import { bundles, lossEntries, orders, recoveryStatuses } from "../db/schema.js";
import { parseDate } from "./dates.js";
import { ApiError, parseId, requireNonNegativeInteger } from "./http.js";
import type { RouteRegistrar } from "./types.js";

type RecoveryStatus = (typeof recoveryStatuses)[number];
type RecoveryBody = {
  recovery_status?: RecoveryStatus;
  recovery_value?: number;
  recovery_date?: string;
};

// Registers order closure and append-only loss recovery workflows.
export const registerStatusAndLossRoutes: RouteRegistrar = async (app, database) => {
  // Closes an order so its intake lifecycle has an explicit final state.
  app.patch<{ Params: { id: string } }>("/api/orders/:id/close", async (request) => {
    const orderId = parseId(request.params.id, "order id");
    const [closedOrder] = await database.update(orders).set({ status: "closed" })
      .where(eq(orders.orderId, orderId)).returning();
    if (!closedOrder) throw new ApiError(404, "Order not found", "The requested order does not exist.");
    return { order: closedOrder };
  });

  // Records recovery in its own event month and creates one linked replacement bundle when required.
  app.patch<{ Params: { id: string }; Body: RecoveryBody }>("/api/losses/:id/recover", async (request) => {
    const lossId = parseId(request.params.id, "loss id");
    const body = request.body ?? {};
    if (body.recovery_status !== "refunded" && body.recovery_status !== "replaced") {
      throw new ApiError(400, "Invalid recovery", "recovery_status must be either 'refunded' or 'replaced'.");
    }
    const finalRecoveryStatus = body.recovery_status;
    const recoveryValue = requireNonNegativeInteger(body.recovery_value ?? 0, "recovery_value");
    const recoveryDate = parseDate(body.recovery_date, "recovery_date", true);

    return database.transaction((transaction) => {
      const lossToRecover = transaction.select({
        lossId: lossEntries.lossId,
        bundleId: lossEntries.bundleId,
        itemsLost: lossEntries.itemsLost,
        recoveryStatus: lossEntries.recoveryStatus,
        replacementBundleId: lossEntries.replacementBundleId,
        orderId: bundles.orderId,
        type: bundles.type,
        designName: bundles.designName,
        costPerItem: bundles.costPerItem,
      }).from(lossEntries).innerJoin(bundles, eq(lossEntries.bundleId, bundles.bundleId))
        .where(eq(lossEntries.lossId, lossId)).limit(1).get();
      if (!lossToRecover) throw new ApiError(404, "Loss not found", "The requested loss entry does not exist.");
      if (lossToRecover.recoveryStatus !== "none" && lossToRecover.recoveryStatus !== "pending_claim") {
        throw new ApiError(409, "Recovery already finalized", "A finalized recovery cannot be overwritten.");
      }

      let replacementBundle = null;
      if (finalRecoveryStatus === "replaced") {
        if (lossToRecover.replacementBundleId) {
          throw new ApiError(409, "Replacement already created", "This loss already has a linked replacement bundle.");
        }
        replacementBundle = transaction.insert(bundles).values({
          orderId: lossToRecover.orderId,
          type: lossToRecover.type,
          designName: `${lossToRecover.designName} (replacement)`,
          itemsOrdered: lossToRecover.itemsLost,
          costPerItem: lossToRecover.costPerItem,
          bundleTotalCost: lossToRecover.itemsLost * lossToRecover.costPerItem,
          status: "pending",
        }).returning().get();
      }

      const recoveredLoss = transaction.update(lossEntries).set({
        recoveryStatus: finalRecoveryStatus,
        recoveryValue,
        recoveryDate,
        replacementBundleId: replacementBundle?.bundleId,
      }).where(eq(lossEntries.lossId, lossId)).returning().get();
      transaction.update(bundles).set({ status: finalRecoveryStatus })
        .where(eq(bundles.bundleId, lossToRecover.bundleId)).run();
      return { loss: recoveredLoss, replacement_bundle: replacementBundle };
    });
  });
};
