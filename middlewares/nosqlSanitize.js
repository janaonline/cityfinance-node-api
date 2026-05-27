const Response = require('../service/response');
const MAX_ERRORS = 20;

function findUnsafeKeys(value, basePath, errors) {
  if (errors.length >= MAX_ERRORS) return;

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length && errors.length < MAX_ERRORS; i++) {
      findUnsafeKeys(value[i], `${basePath}[${i}]`, errors);
    }
    return;
  }

  if (value !== null && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (errors.length >= MAX_ERRORS) break;
      const fieldPath = `${basePath}.${key}`;
      if (key.startsWith('$') || key.includes('.')) {
        errors.push({
          field: fieldPath,
          message: "Keys starting with '$' or containing '.' are not allowed",
        });
      } else {
        findUnsafeKeys(value[key], fieldPath, errors);
      }
    }
  }
}

module.exports = function noSqlSanitize(req, res, next) {
  const errors = [];

  findUnsafeKeys(req.body || {}, 'body', errors);
  if (errors.length < MAX_ERRORS) {
    findUnsafeKeys(req.query || {}, 'query', errors);
  }
  if (errors.length < MAX_ERRORS) {
    findUnsafeKeys(req.params || {}, 'params', errors);
  }

  if (errors.length > 0) {
    console.warn('[noSqlSanitize] Unsafe keys detected', {
      method: req.method,
      path: req.path,
      count: errors.length,
      firstField: errors[0].field,
    });
    return Response.BadRequest(res, errors, 'Invalid request payload');
  }

  next();
};
