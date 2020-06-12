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
	loginAttempts: { type: Number, required: true, default: 0 },
	lockUntil: { type: Number },
	isLocked : {type: Boolean,default:false},
	role: { type: String, enum: CONSTANTS.USER.ROLES, required: true },
	username: { type: String, required: false }, // depricated
	designation:{ type:String, default:""},
	organization:{ type:String, default:""},
	state : { type: Schema.Types.ObjectId, ref: 'State', required:stateRole},
	departmentName:{type:String, required:stateRole(), default:""},
	departmentContactNumber:{type:String, required:stateRole(), default:""},
	departmentEmail:{type:String, required:stateRole(), default:""},
	address:{type:String, required:stateRole(), default:""},
	ulb : { type: Schema.Types.ObjectId, ref: 'Ulb', required:ulbRole },
	commissionerName:{type:String, required:ulbRole, default:""},
	commissionerEmail:{type:String, required:ulbRole, default:""},
	commissionerConatactNumber:{type:String, required:ulbRole, default:""},
	accountantName:{type:String, required:ulbRole, default:""},
	accountantEmail:{type:String, required:ulbRole, default:""},
	accountantConatactNumber:{type:String, required:ulbRole, default:""},
	createdBy:{ type: Schema.Types.ObjectId, ref: 'User', default:null},
	createdAt: { type: Date, default: Date.now },
	modifiedAt: { type: Date, default: Date.now },
	status:{type:String, enum:["PENDING","APPROVED","REJECTED","NA"], default:"NA"},
	rejectReason:{type:String, default:""},
	isActive: { type: Boolean, default: true },
	isEmailVerified:{ type: Boolean, default: false },
	isDeleted: { type: Boolean, default: false },
	passwordExpires: {type: Number},
	passwordHistory: {type: Array,default:[]}


});
module.exports = mongoose.model('User', UserSchema);;