module.exports = {
	APP: {
		PORT: process.env.PORT
	},
	DATABASE : {
		CONNECTION_STRING: process.env.CONNECTION_STRING
	},
	JWT: {
		SECRET: process.env.SECRET,
		TOKEN_EXPIRY: '10h',
		EMAIL_VERFICATION_EXPIRY:'10m'
	},
	REDIS:{
		"production":process.env.REDIS_PROD,
		"demo":process.env.REDIS_DEMO,
		"staging":process.env.REDIS_DEMO
    }
}
