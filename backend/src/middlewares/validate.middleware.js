/**
 * Generic body validator. No schema library (Joi/Zod) is installed, so this
 * takes a plain `(body) => string | null` validator function — return an
 * error message to reject the request with 400, or `null`/`undefined` to
 * pass through. Keeps validators/ testable in isolation from Express.
 */
export function validateBody(validator) {
  return (req, res, next) => {
    const error = validator(req.body ?? {});
    if (error) {
      res.status(400).json({ error });
      return;
    }
    next();
  };
}
