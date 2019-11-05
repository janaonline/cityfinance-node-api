const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const DownloadLogSchema = mongoose.Schema({
	particular: {
		type: String,
		require: true
	},
	mobile: {
		type: String
	},
	email: {
		type: String,
	},
	isUserExist: {
		type: String,
		default: false,
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

const DownloadLog = module.exports = mongoose.model('DownloadLog', DownloadLogSchema);


module.exports.getAll = function(payload, callback){
	DownloadLog.find(payload, callback);
}

module.exports.addLog = function(newDownloadLog, callback){
	newDownloadLog.save(callback);
}
