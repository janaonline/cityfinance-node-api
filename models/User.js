require('./dbConnect');
const CONSTANTS = require('../_helper/constants');
const ulbRole = function () {
	return this.role == "ULB";
}
const stateRole = function () {
	return this.role == "STATE";
}
const UserSchema = mongoose.Schema({
	name: { type: String,required : true },
	mobile: { type: String, default:null },
	email:	{ type: String, required: true, index:{unique:true}},
	password: { type: String, required: true },
	role: { type: String, enum: CONSTANTS.USER.ROLES, required: true },
	username: { type: String, required: false }, // depricated
	designation:{ type:String, default:null},
	organization:{ type:String, default:null},
	state : { type: Schema.Types.ObjectId, ref: 'State', required:stateRole},
	departmentName:{type:String, required:stateRole()},
	departmentContactNumber:{type:String, required:stateRole()},
	departmentEmail:{type:String, required:stateRole()},
	address:{type:String, required:stateRole()},
	ulb : { type: Schema.Types.ObjectId, ref: 'Ulb', required:ulbRole },
	commissionerName:{type:String, required:ulbRole},
	commissionerEmail:{type:String, required:ulbRole},
	commissionerConatactNumber:{type:String, required:ulbRole},
	accountantName:{type:String, required:ulbRole},
	accountantEmail:{type:String, required:ulbRole},
	accountantConatactNumber:{type:String, required:ulbRole},
	createdBy:{ type: Schema.Types.ObjectId, ref: 'User', default:null},
	createdAt: { type: Date, default: Date.now },
	modifiedAt: { type: Date, default: Date.now },
	status:{type:String, enum:["PENDING","APPROVED","REJECTED","NA"], default:"NA"},
	message:{type:String, default:""},
	isActive: { type: Boolean, default: true },
	isEmailVerified:{ type: Boolean, default: false },
	isDeleted: { type: Boolean, default: false }
});
module.exports = mongoose.model('User', UserSchema);;