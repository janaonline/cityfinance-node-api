require('./dbConnect');
const CONSTANTS = require('../_helper/constants');
const ulbRole = function () {
	return this.role == "ULB";
}
const stateRole = function () {
	return this.role == "STATE";
}

const UserSchema = mongoose.Schema({
	name: { type: String, required: true },
	mobile: { type: String, default: null },
	email: { type: String, required: true },
	password: { type: String, required: true },
	loginAttempts: { type: Number, required: true, default: 0 },
	lockUntil: { type: Number },
	isLocked: { type: Boolean, default: false },
	role: { type: String, enum: CONSTANTS.USER.ROLES, required: true },
	username: { type: String, required: false }, // depricated
	sbCode: { type: String, default: null }, //Swatch Bharat Code
	censusCode: { type: String, default: null },
	designation: { type: String, default: "" },
	organization: { type: String, default: "" },
	state: { type: Schema.Types.ObjectId, ref: 'State', required: stateRole },
	departmentName: { type: String, required: stateRole(), default: "" },
	departmentContactNumber: { type: String, required: stateRole(), default: "" },
	departmentEmail: { type: String, required: stateRole(), default: "" },
	address: { type: String, required: stateRole(), default: "" },
	ulb: { type: Schema.Types.ObjectId, ref: 'Ulb', required: ulbRole, index: true },
	commissionerName: { type: String, default: "" },
	commissionerEmail: { type: String, default: "" },
	commissionerConatactNumber: { type: String, default: "" },
	accountantName: { type: String, required: ulbRole, default: "" },
	accountantEmail: { type: String, required: ulbRole, default: "" },
	accountantConatactNumber: { type: String, required: ulbRole, default: "" },
	createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
	createdAt: { type: Date, default: Date.now },
	modifiedAt: { type: Date, default: Date.now },
	status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED", "NA"], default: "NA" },
	rejectReason: { type: String, default: "" },
	isActive: { type: Boolean, default: true },
	isEmailVerified: { type: Boolean, default: true },
	isPasswordResetInProgress: { type: Boolean, default: false }, // It is used to redirection to login page after reset
	isDeleted: { type: Boolean, default: false },
	passwordExpires: { type: Number },
	passwordHistory: { type: Array, default: [] },
	isRegistered: { type: Boolean, default: false },
	isVerified2223: {type: Boolean, default: false},
	isNodalOfficer: { type: Boolean, default: false },
	otpAttempts: {type: Number },
	otpBlockedUntil: {type: Date }
});
module.exports = mongoose.model('User', UserSchema);;