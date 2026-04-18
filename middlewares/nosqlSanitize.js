function sanitizeValue(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === "object") {
    return Object.keys(value).reduce((acc, key) => {
      // Strip MongoDB query/operator keys to reduce NoSQL injection risk.
      if (key.startsWith("$") || key.includes(".")) {
        return acc;
      }

      acc[key] = sanitizeValue(value[key]);
      return acc;
    }, {});
  }

  return value;
}

module.exports = function noSqlSanitize(req, res, next) {
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }

  if (req.query) {
    req.query = sanitizeValue(req.query);
  }

  if (req.params) {
    req.params = sanitizeValue(req.params);
  }

  next();
};
