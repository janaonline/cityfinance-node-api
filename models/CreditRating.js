require("./dbConnect");

const creditRatingSchema = new Schema({
    "ulb" :{ type: Schema.Types.ObjectId, ref: 'Ulb' },
    "agency" :  { type: String, required: true },
    "creditRating" : { type: String, required: true },
    "outlook" :  { type: String, required: true },
    "type" :  { type: String, required: true },
    "amount" :  { type: String, required: true },
    "date" : { type: Date, default: Date.now() },
    "link" : { type: String,default:"link not available"},
    "ulbCode" : { type: String},
},
{ timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
)
module.exports = mongoose.model("creditrating", creditRatingSchema);