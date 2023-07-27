require("./dbConnect");
const mongoose = require('mongoose');
const { Schema } = mongoose;
const Year = require("./Year")
const {radioSchema,pdfSchema,limitValidationSchema} = require("../util/masterFunctions")
const mongooseLeanVirtuals = require('mongoose-lean-virtuals');
const TransferGrantSchema = new Schema({
    installmentForm:{type:Schema.Types.ObjectId,ref:"GtcInstallmentForm"},
    transAmount:limitValidationSchema("transAmount",0,999999),
    transDelay:radioSchema("transDelay","GtcInstallmentForm"),
    transDate:{
        type:Date,
        default:null,
        max:[new Date().toISOString().split("T")[0],"transDate should not be greater than the present date"]
    },
    daysDelay:limitValidationSchema("daysDelay",0,999),
    interest:limitValidationSchema("interest",0,100),
    // intTransfer:{type:Number}
     intTransfer: limitValidationSchema("intTransfer",0,9999999),
},
{ timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } })
TransferGrantSchema.virtual("modelName").get(function(){
    return "TransferGrantDetailForm"
})
TransferGrantSchema.plugin(mongooseLeanVirtuals)
module.exports = mongoose.model("TransferGrantDetailForm", TransferGrantSchema);