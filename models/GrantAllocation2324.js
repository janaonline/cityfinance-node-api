require("./dbConnect");

const GrantAllocation2324Schema = new Schema(
    {
        ulbId: { type: Schema.Types.ObjectId, ref: "Ulb", required: true },
        untiedGrantAmount: { type: Number },
        untiedGrantPercent: { 
            type: Number, 
            min: 0, 
            max: 100 
        },
        tiedGrantAmount: { type: Number },
        tiedGrantPercent: { type: 
            Number, 
            min: 0, 
            max: 100 
        },
        design_year: { type: Schema.Types.ObjectId, ref: "Year", required: true },
    },
    { timestamps: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
module.exports = mongoose.model("grantallocation2324", GrantAllocation2324Schema);