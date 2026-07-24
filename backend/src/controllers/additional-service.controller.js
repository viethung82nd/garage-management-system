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

/**
 * PATCH /api/additional-service-proposals/:id — SA sends/approves/rejects,
 * optionally adjusting the price.
 *
 * Setting status "approved" requires an `approval` object
 * ({ channel, decidedByName, contactValue?, note? }) evidencing the customer's
 * authorisation — see the service for why an advisor's click alone isn't enough.
 */
export async function updateAdditionalServiceProposal(req, res) {
  const { status, laborCost, partsCost, approval } = req.body ?? {};
  const proposal = await additionalServiceService.updateAdditionalServiceProposal(
    req.params.id,
    status,
    req.user.sub,
    { laborCost, partsCost, approval },
  );
  res.json(proposal);
}

/**
 * PATCH /api/additional-service-proposals/:id/customer-decision — the customer
 * authorises (or declines) extra work themselves. Body: { approved, note? }
 */
export async function customerDecideProposal(req, res) {
  const { approved, note } = req.body ?? {};
  const proposal = await additionalServiceService.customerDecideProposal(
    req.params.id,
    { approved, note },
    req.user.sub,
  );
  res.json(proposal);
}
