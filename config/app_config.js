module.exports = {
	APP: {
		PORT: process.env.PORT,
		BASEURL: process.env.BASEURL,
		BASEURL2: process.env.BASEURL2,
	},
	DATABASE: {
		CONNECTION_STRING: process.env.CONNECTION_STRING,
	},
	JWT: {
		SECRET: process.env.SECRET,
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
		LINK_TTL_MS: parseInt(process.env.FILE_DOWNLOAD_LINK_TTL_MS, 10) || 72 * 60 * 60 * 1000,
		APP_BASE_URL: (process.env.BASEURL || 'http://localhost:8080').replace(/\/$/, ''),
		APP_BASE_URL2: (process.env.BASEURL2 || 'http://localhost:3000').replace(/\/$/, ''),
	},
};
