import * as transferRequestService from "../services/transfer-request.service.js";

/** GET /api/transfer-requests — SA review queue for technician transfer requests. */
export async function listTransferRequests(req, res) {
  const result = await transferRequestService.listTransferRequests(req.query ?? {});
  res.json(result);
}

export async function createTransferRequest(req, res) {
  const transferRequest = await transferRequestService.createTransferRequest(
    req.body ?? {},
    req.user?.sub,
  );
  res.status(201).json(transferRequest);
}

export async function approveTransferRequest(req, res) {
  const transferRequest = await transferRequestService.approveTransferRequest(
    req.params.id,
    req.body?.resolveNote,
    req.user?.sub,
    req.body?.toTechnicianId,
  );
  res.json(transferRequest);
}

export async function rejectTransferRequest(req, res) {
  const transferRequest = await transferRequestService.rejectTransferRequest(
    req.params.id,
    req.body?.resolveNote,
    req.user?.sub,
  );
  res.json(transferRequest);
}
