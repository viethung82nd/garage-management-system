import * as resourceService from "../services/resource.service.js";

export async function listResources(req, res) {
  const resources = await resourceService.listResources(req.query ?? {});
  res.json({ resources });
}

export async function createResource(req, res) {
  const resource = await resourceService.createResource(req.body ?? {});
  res.status(201).json({ resource });
}

export async function updateResource(req, res) {
  const resource = await resourceService.updateResource(req.params.id, req.body ?? {});
  res.json({ resource });
}

export async function deleteResource(req, res) {
  const result = await resourceService.deleteResource(req.params.id);
  res.json(result);
}
