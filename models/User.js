require('./dbConnect');
const CONSTANTS = require('../_helper/constants');
const UserSchema = mongoose.Schema({
	name: {
		type: String,
		required : true
	},
	mobile: {
		type: String
	},
	username: {
		type: String,
		required: true
	},
	password: {
		type: String,
		required: true
	},
	role: {
		type: String,
		enum: CONSTANTS.USER.ROLES,
		required: true
	},
	isActive: {
		type: String,
		default: true,
	},
	createdAt: {
		type: String,
		default: Date.now
	},
	updatedAt: {
		type: String,
		default: Date.now
	},
	isDeleted: {
		type: String,
		default: false,
	}
});
module.exports = mongoose.model('User', UserSchema);