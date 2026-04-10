function safeParseJSON(value, fallback = {}) {
  try {
    if (typeof value !== "string") {
      return value ?? fallback;
    }

    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function sanitizeMongoInput(input) {
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeMongoInput(item));
  }

  if (input && typeof input === "object") {
    const clean = {};

    for (const key of Object.keys(input)) {
      if (key.startsWith("$") || key.includes(".")) continue;
      clean[key] = sanitizeMongoInput(input[key]);
    }

    return clean;
  }

  return input;
}

function shouldParseJSONString(value) {
  if (typeof value !== "string") {
    return false;
  }

  const trimmedValue = value.trim();

  return (
    (trimmedValue.startsWith("{") && trimmedValue.endsWith("}")) ||
    (trimmedValue.startsWith("[") && trimmedValue.endsWith("]"))
  );
}

function sanitizeRequestValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeRequestValue(item));
  }

  if (value && typeof value === "object") {
    const clean = {};

    for (const key of Object.keys(value)) {
      if (key.startsWith("$") || key.includes(".")) continue;
      clean[key] = sanitizeRequestValue(value[key]);
    }

    return clean;
  }

  if (!shouldParseJSONString(value)) {
    return value;
  }

  try {
    return JSON.stringify(sanitizeMongoInput(JSON.parse(value)));
  } catch (error) {
    return value;
  }
}

function sanitizeMongoPayload(value, fallback = {}) {
  const parsedValue =
    typeof value === "string" ? safeParseJSON(value, fallback) : value;

  if (parsedValue === undefined || parsedValue === null || parsedValue === "") {
    return fallback;
  }

  return sanitizeMongoInput(parsedValue);
}

module.exports = function mongoInputSanitizer(req, res, next) {
  req.body = sanitizeRequestValue(req.body || {});
  req.query = sanitizeRequestValue(req.query || {});
  req.params = sanitizeRequestValue(req.params || {});

  next();
};

module.exports.safeParseJSON = safeParseJSON;
module.exports.sanitizeMongoInput = sanitizeMongoInput;
module.exports.sanitizeMongoPayload = sanitizeMongoPayload;
module.exports.sanitizeRequestValue = sanitizeRequestValue;
