module.exports = {
	APP: {
		PORT: process.env.PORT
	},
	DATABASE : {
		CONNECTION_STRING: process.env.CONNECTION_STRING
	},
	JWT: {
		SECRET: process.env.SECRET,
		TOKEN_EXPIRY: 604800
	}
}
