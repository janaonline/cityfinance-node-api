require('./dbConnect');
const LoginHistorySchema = new Schema({
    user : { type: Schema.Types.ObjectId, ref: 'User' ,required : true},
    visitSession : { type: Schema.Types.ObjectId, ref: 'VisitSession' ,default:null},
    loggedInAt : { type: Date, default : Date.now() },
    loggedOutAt : { type: Date, default : null },
    isActive : { type  : Boolean, default : 1 }
});
module.exports = mongoose.model('LoginHistory', LoginHistorySchema);