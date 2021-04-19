require('./dbConnect');
const OtpSchema = new Schema({
    censusCode: { type: String },
    contactNumber: { type: String },
    emailId: { type: String },
    otp: { type: String },
    createdAt: { type: Date },
    expireAt: { type: Date },
    isVerified: { type: Boolean, default: 0 },
});


module.exports = mongoose.model('Otp', OtpSchema);
