import * as configService from "../services/config.service.js";

/** GET /api/admin/config */
export async function getSystemConfig(req, res) {
  const config = await configService.getSystemConfig();
  res.json({ config });
}

/** PUT /api/admin/config */
export async function updateSystemConfig(req, res) {
  const config = await configService.updateSystemConfig(req.body ?? {});
  res.json({ config });
}
