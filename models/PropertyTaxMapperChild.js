require("./dbConnect");
const PropertyMapperChildData = new Schema(
    {
        ptoId: { type: Schema.Types.ObjectId, ref: "PropertyTaxOp", required: true },
        ulb: { type: Schema.Types.ObjectId, ref: "Ulb", required: true },
        year: { type: Schema.Types.ObjectId, ref: "Year", required: true },
        value: { type: Schema.Types.Mixed, default: null },
        date: { type: Date, default: null }, // audit date,
        label:{type:String},
        status: {
            type: String,
            default: "PENDING",
            enum: {
                values: ["PENDING", "APPROVED", "REJECTED", "NA"],
                message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
            },
        },
        isActive: { type: Boolean, default: 1 },
        replicaNumber:{type:Number},
        textValue:{type:String},
        type: {
            type: String,
        },
        file: {
            name: { type: String },
            url: { type: String }
        },
        displayPriority: { type: String, default: null },
    },
    { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
PropertyMapperChildData.index(
    { ptoId: 1 }
)
module.exports = mongoose.model("PropertyMapperChildData", PropertyMapperChildData);


