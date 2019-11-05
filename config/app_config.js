module.exports = {
	APP: {
		PORT: 8080
	},
	DATABASE : {
		CONNECTION_STRING1: 'mongodb://10.10.10.65:27017/perfect',
		CONNECTION_STRING: 'mongodb://127.0.0.1:27017/perfect',
		USERNAME: '<ENTER USERNAME HERE>',
		PASSWORD: '<ENTER PASSWORD HERE>'
	},
	JWT: {
		SECRET: 'perfectsecret',
		TOKEN_EXPIRY: 604800
	}
	
}