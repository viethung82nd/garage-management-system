import * as purchaseOrderService from "../services/purchase-order.service.js";

/** GET /api/purchase-orders?supplierId=&status= */
export async function listPurchaseOrders(req, res) {
  const purchaseOrders = await purchaseOrderService.listPurchaseOrders(req.query ?? {});
  res.json({ purchaseOrders });
}

/** GET /api/purchase-orders/reorder-suggestions — active parts at/below their
 *  reorder point, with a suggested order quantity and preferred supplier. */
export async function getReorderSuggestions(_req, res) {
  const result = await purchaseOrderService.getReorderSuggestions();
  res.json(result);
}

/** GET /api/purchase-orders/payables — outstanding balance per supplier,
 *  bucketed by days past due. */
export async function getPayablesReport(_req, res) {
  const report = await purchaseOrderService.getPayablesReport();
  res.json(report);
}

/** GET /api/purchase-orders/:id */
export async function getPurchaseOrderById(req, res) {
  const purchaseOrder = await purchaseOrderService.getPurchaseOrderById(req.params.id);
  res.json({ purchaseOrder });
}

/** POST /api/purchase-orders */
export async function createPurchaseOrder(req, res) {
  const purchaseOrder = await purchaseOrderService.createPurchaseOrder(
    req.body ?? {},
    req.user.sub,
  );
  res.status(201).json({ purchaseOrder });
}

/** PUT /api/purchase-orders/:id — draft only. */
export async function updatePurchaseOrder(req, res) {
  const purchaseOrder = await purchaseOrderService.updatePurchaseOrder(
    req.params.id,
    req.body ?? {},
  );
  res.json({ purchaseOrder });
}

/** POST /api/purchase-orders/:id/send — draft -> sent. */
export async function sendPurchaseOrder(req, res) {
  const purchaseOrder = await purchaseOrderService.sendPurchaseOrder(req.params.id);
  res.json({ purchaseOrder });
}

/** POST /api/purchase-orders/:id/receive — record goods arriving against one
 *  or more lines; repeatable across several partial deliveries. */
export async function receiveGoods(req, res) {
  const purchaseOrder = await purchaseOrderService.receiveGoods(
    req.params.id,
    req.body ?? {},
    req.user.sub,
  );
  res.json({ purchaseOrder });
}

/** POST /api/purchase-orders/:id/cancel — rejected once anything has arrived. */
export async function cancelPurchaseOrder(req, res) {
  const purchaseOrder = await purchaseOrderService.cancelPurchaseOrder(req.params.id);
  res.json({ purchaseOrder });
}

/** POST /api/purchase-orders/:id/payments — record a payment to the supplier. */
export async function recordSupplierPayment(req, res) {
  const purchaseOrder = await purchaseOrderService.recordSupplierPayment(
    req.params.id,
    req.body ?? {},
    req.user.sub,
  );
  res.json({ purchaseOrder });
}
