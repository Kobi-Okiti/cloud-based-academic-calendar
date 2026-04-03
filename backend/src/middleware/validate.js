const formatIssues = (issues) =>
  issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message
  }));

const validate = (schema, source, targetKey) => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: formatIssues(result.error.issues)
    });
  }
  req[targetKey] = result.data;
  return next();
};

const validateBody = (schema) => validate(schema, "body", "validatedBody");
const validateQuery = (schema) => validate(schema, "query", "validatedQuery");
const validateParams = (schema) => validate(schema, "params", "validatedParams");

module.exports = {
  validateBody,
  validateQuery,
  validateParams
};
