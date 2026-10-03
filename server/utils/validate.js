/**
 * Reusable Fastify preHandler schema validation hook generator
 * Supports validating req.body, req.query, req.params, and req.headers using Zod schemas
 */
const validate = ({ body, query, params, headers } = {}) => {
  return async (req, reply) => {
    // 1. Validate Body
    if (body) {
      const result = body.safeParse(req.body || {});
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        return reply.status(400).send({
          success: false,
          message: errors[0]?.message || 'Validation failed for request body',
          errors
        });
      }
      req.body = result.data;
    }

    // 2. Validate Query Parameters
    if (query) {
      const result = query.safeParse(req.query || {});
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        return reply.status(400).send({
          success: false,
          message: errors[0]?.message || 'Validation failed for query parameters',
          errors
        });
      }
      req.query = result.data;
    }

    // 3. Validate Route Parameters
    if (params) {
      const result = params.safeParse(req.params || {});
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        return reply.status(400).send({
          success: false,
          message: errors[0]?.message || 'Validation failed for route parameters',
          errors
        });
      }
      req.params = result.data;
    }

    // 4. Validate Headers
    if (headers) {
      const result = headers.safeParse(req.headers || {});
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        return reply.status(400).send({
          success: false,
          message: errors[0]?.message || 'Validation failed for request headers',
          errors
        });
      }
    }
  };
};

module.exports = { validate };
