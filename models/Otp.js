require('./dbConnect');
const OtpSchema = new Schema({
    censusCode: { type: String },
    sbCode: { type: String },
    contactNumber: { type: String },
    emailId: { type: String },
    otp: { type: String },
    createdAt: { type: Date },
    expireAt: { type: Date },
    isVerified: { type: Boolean, default: 0 },
    role: { type: String },
    verificationAttempts: { type: Number },
});


module.exports = mongoose.model('Otp', OtpSchema);
