import * as additionalServiceService from "../services/additional-service.service.js";

/** GET /api/additional-service-proposals — SA review queue. */
export async function listAdditionalServiceProposals(req, res) {
  const result = await additionalServiceService.listAdditionalServiceProposals(req.query ?? {});
  res.json(result);
}

/**
 * POST /api/additional-service-proposals — technician flags extra work
 * found mid-repair for SA review.
 */
export async function createAdditionalServiceProposal(req, res) {
  const proposal = await additionalServiceService.createAdditionalServiceProposal(
    req.body ?? {},
    req.user.sub,
  );
  res.status(201).json(proposal);
}

/** PATCH /api/additional-service-proposals/:id — SA sends/approves/rejects. */
export async function updateAdditionalServiceProposal(req, res) {
  const proposal = await additionalServiceService.updateAdditionalServiceProposal(
    req.params.id,
    (req.body ?? {}).status,
    req.user.sub,
  );
  res.json(proposal);
}
