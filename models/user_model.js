const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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

const User = module.exports = mongoose.model('User', UserSchema);


module.exports.getAll = function(payload, callback){
	User.find(payload, callback);
}

module.exports.getUserById = function(userId, callback){
	User.findOne({_id: userId}, callback);
}

module.exports.updateUser = function(conditions, updateFields, callback){
	User.updateOne(conditions, updateFields, callback);
}

module.exports.getUserByUsername = function(username, callback){
	User.findOne({username: username}, callback);
}

module.exports.addUser = function(newUser, callback){
	bcrypt.genSalt(10, (err, salt)=>{
		bcrypt.hash(newUser.password, salt, (err, hash) =>{
			if(err) throw err;
			newUser.password = hash;
			newUser.save(callback);
		});
	});
}

module.exports.comparePassword = function(candidatePassword, hash, callback){
	bcrypt.compare(candidatePassword, hash, (err, isMatch) =>{
		if(err) throw err;
		callback(null, isMatch);
	});
}
