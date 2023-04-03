require("./dbConnect");

const FormsJson = new Schema(
    {
        design_year: { type: Schema.Types.ObjectId, ref: "Year", required: true },
        formId:{type:Number},
        type:{type:String},
        data : {type:Array},
        isActive:{type:Boolean,default:true}
    },
    { timestamps: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
FormsJson.index(
    {design_year: 1 ,
    formId:1
    },
    { unique: true }
);
module.exports = mongoose.model("formjson", FormsJson);
