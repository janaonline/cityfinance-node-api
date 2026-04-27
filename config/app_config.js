module.exports = {
	APP: {
		PORT: process.env.PORT,
		BASEURL: process.env.BASEURL,
	},
	DATABASE: {
		CONNECTION_STRING: process.env.CONNECTION_STRING,
	},
	JWT: {
		SECRET: process.env.SECRET,
		REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
		TOKEN_EXPIRY: '15m',
		REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY || '10h',
		EMAIL_VERFICATION_EXPIRY: '48h',
	},
	REDIS: {
		production: process.env.REDIS_PROD,
		demo: process.env.REDIS_DEMO,
		staging: process.env.REDIS_DEMO,
	},
	CAPTCHA: {
		SECRETKEY: process.env.CAPTCHA_SECRET_KEY,
		ENABLED: process.env.CAPTCHA_VALIDATION_ENABLED !== 'false',
	},
	FILE_DOWNLOAD: {
		TOKEN_SECRET: process.env.SECRET,
		LINK_TTL_MS: parseInt(process.env.FILE_DOWNLOAD_LINK_TTL_MS, 10) || 24 * 60 * 60 * 1000,
		APP_BASE_URL: (process.env.BASEURL || 'http://localhost:8080').replace(/\/$/, ''),
	},
};
