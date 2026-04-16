const REFRESH_COOKIE_NAME = "refreshToken";

function getRefreshCookieOptions() {
  const secure = process.env.AUTH_COOKIE_SECURE === "false" ? false : true;

  return {
    httpOnly: true,
    secure,
    // sameSite,
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };
}

function attachRefreshTokenCookie(res, refreshToken) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
}

function clearRefreshTokenCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());
}

module.exports = {
  REFRESH_COOKIE_NAME,
  attachRefreshTokenCookie,
  clearRefreshTokenCookie,
  getRefreshCookieOptions,
};
