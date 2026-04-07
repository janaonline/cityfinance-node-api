const { promisify } = require("util");
const Redis = require("../../../service/redis");

const DEFAULT_SEND_WINDOW_SECONDS = Number(process.env.OTP_SEND_WINDOW_SECONDS || 15 * 60);
const DEFAULT_SEND_MAX_ATTEMPTS = Number(process.env.OTP_SEND_MAX_ATTEMPTS || 3);
const DEFAULT_VERIFY_WINDOW_SECONDS = Number(process.env.OTP_VERIFY_WINDOW_SECONDS || 15 * 60);
const DEFAULT_VERIFY_MAX_ATTEMPTS = Number(process.env.OTP_VERIFY_MAX_ATTEMPTS || 10);
const DEFAULT_FAILED_VERIFY_MAX_ATTEMPTS = Number(process.env.OTP_FAILED_VERIFY_MAX_ATTEMPTS || 5);
const DEFAULT_LOCK_SECONDS = Number(process.env.OTP_LOCK_SECONDS || 24 * 60 * 60);

const getAsync = promisify(Redis.Client.get).bind(Redis.Client);
const ttlAsync = promisify(Redis.Client.ttl).bind(Redis.Client);
const delAsync = promisify(Redis.Client.del).bind(Redis.Client);
const multiExecAsync = (commands) =>
  new Promise((resolve, reject) => {
    const multi = Redis.Client.multi(commands);
    multi.exec((err, replies) => {
      if (err) {
        return reject(err);
      }
      return resolve(replies);
    });
  });

const normalizeIdentifier = (value = "") =>
  String(value).trim().toLowerCase().replace(/[^a-z0-9:_-]/g, "_");

const getUserIdentifier = (user) =>
  normalizeIdentifier(user?._id || user?.email || user?.censusCode || user?.sbCode);

const getLockKey = (identifier) => `auth:otp:lock:${identifier}`;
const getSendRateKey = (identifier) => `auth:otp:send:rate:${identifier}`;
const getVerifyRateKey = (identifier) => `auth:otp:verify:rate:${identifier}`;
const getFailedVerifyKey = (identifier) => `auth:otp:verify:failed:${identifier}`;

const formatDuration = (seconds = 0) => {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""} ${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  }
  return `${secs} second${secs !== 1 ? "s" : ""}`;
};

const getLockStatus = async (identifier) => {
  const lockKey = getLockKey(identifier);
  const [lockedUntil, ttl] = await Promise.all([getAsync(lockKey), ttlAsync(lockKey)]);
  return {
    isLocked: Boolean(lockedUntil && Number(ttl) > 0),
    ttl: Number(ttl) > 0 ? Number(ttl) : 0,
  };
};

const incrementRateLimit = async (key, windowSeconds, maxAttempts) => {
  const replies = await multiExecAsync([
    ["INCR", key],
    ["TTL", key],
  ]);

  const count = Number(replies[0]) || 0;
  let ttl = Number(replies[1]) || 0;

  if (ttl < 0) {
    await multiExecAsync([["EXPIRE", key, windowSeconds]]);
    ttl = windowSeconds;
  }

  return {
    limited: count > maxAttempts,
    count,
    ttl,
    remaining: Math.max(0, maxAttempts - count),
  };
};

const setUserLock = async (identifier, lockSeconds = DEFAULT_LOCK_SECONDS) => {
  const lockKey = getLockKey(identifier);
  await multiExecAsync([
    ["SETEX", lockKey, lockSeconds, Date.now()],
    ["DEL", getFailedVerifyKey(identifier)],
  ]);
  return lockSeconds;
};

const clearVerifyState = async (identifier) => {
  await delAsync(getFailedVerifyKey(identifier));
  await delAsync(getVerifyRateKey(identifier));
};

const recordFailedVerifyAttempt = async (identifier) => {
  const failedAttempt = await incrementRateLimit(
    getFailedVerifyKey(identifier),
    DEFAULT_LOCK_SECONDS,
    DEFAULT_FAILED_VERIFY_MAX_ATTEMPTS
  );

  if (failedAttempt.count >= DEFAULT_FAILED_VERIFY_MAX_ATTEMPTS) {
    const ttl = await setUserLock(identifier, DEFAULT_LOCK_SECONDS);
    return {
      locked: true,
      count: failedAttempt.count,
      ttl,
    };
  }

  return {
    locked: false,
    count: failedAttempt.count,
    ttl: failedAttempt.ttl,
    remaining: Math.max(0, DEFAULT_FAILED_VERIFY_MAX_ATTEMPTS - failedAttempt.count),
  };
};

const checkSendRateLimit = async (identifier) =>
  incrementRateLimit(
    getSendRateKey(identifier),
    DEFAULT_SEND_WINDOW_SECONDS,
    DEFAULT_SEND_MAX_ATTEMPTS
  );

const checkVerifyRateLimit = async (identifier) =>
  incrementRateLimit(
    getVerifyRateKey(identifier),
    DEFAULT_VERIFY_WINDOW_SECONDS,
    DEFAULT_VERIFY_MAX_ATTEMPTS
  );

module.exports = {
  DEFAULT_FAILED_VERIFY_MAX_ATTEMPTS,
  checkSendRateLimit,
  checkVerifyRateLimit,
  clearVerifyState,
  formatDuration,
  getLockStatus,
  getUserIdentifier,
  recordFailedVerifyAttempt,
};
