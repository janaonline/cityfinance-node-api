require("./dbConnect");
const mongoose = require('mongoose');
const { Schema } = mongoose;
const Year = require("./Year")
const {radioSchema,pdfSchema,limitValidationSchema} = require("../util/masterFunctions")
const TransferGrantSchema = new Schema({
    state :{
        type: Schema.Types.ObjectId,
        ref: 'State',
        required: [true, "State is required"]
    },
    installmentForm:{type:Schema.Types.ObjectId,ref:"GtcInstallmentForm"},
    design_year : {type:Schema.Types.ObjectId,ref:"Year"},
    transAmount:limitValidationSchema("transAmount",1,9999),
    transDelay:radioSchema(),
    daysDelay:limitValidationSchema("daysDelay",0,999),
    interest:limitValidationSchema("interest",0,100),
    intTransfer:limitValidationSchema("intTransfer",0,9999),
    totalIntTransfer:limitValidationSchema("totalIntTransfer",0,9999),
},
{ timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } })
module.exports = mongoose.model("TransferGrantForm", TransferGrantSchema);