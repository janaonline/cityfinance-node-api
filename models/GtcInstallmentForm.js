require("./dbConnect");
const mongoose = require('mongoose');
const { Schema } = mongoose;
const Year = require("./Year")
const {radioSchema,pdfSchema,limitValidationSchema,grantDistributeOptions} = require("../util/masterFunctions")
const TransferGrantDetailForm = require("./TransferGrantDetailForm")
const {grantInstallmentLabels} = require("../util/labels")
let options = Object.values(grantDistributeOptions)
const mongooseLeanVirtuals = require('mongoose-lean-virtuals');
const installmentFormSchema = new Schema(
    {
        gtcForm : {
            type:Schema.Types.ObjectId,
            ref : "GrantTransferCertificate",
            required:[true,"Gtc form id is required"]
        },
        formType:{
            type:String,
            enum:[
                "nonmillion_untied",
                "million_tied",
                "nonmillion_tied"
            ],
            required:[true,'formType Should be nonmillion_untied / million_tied / nonmillion_tied ']
        },
        year : {
            type:String,
            enum:["2022-23","2023-24"],
            required:[true,"year must be  2022-2023 / 2023-2024"]
        },
        design_year : {type:Schema.Types.ObjectId,ref:"Year"},
        state: { type: Schema.Types.ObjectId, ref: "State",required:[true,"State id is required"] },
        transferGrantdetail:[{type:Schema.Types.ObjectId,ref:"TransferGrantDetailForm",default:null}],
        ulbType:{
            type:String,
            enum:["MPC","NMPC"],
            
            required:[true,"ulbType is required "]
        },
        grantType:{
            type:String,
            enum:["Tied","Untied"],
            
            required:[true,"grantType is required "]
        },
        installment:{
            type:Number,
            
            required:[true,"installment is required "]
        },
        totalMpc:limitValidationSchema("totalMpc",0,1000),
        totalNmpc:limitValidationSchema("totalNmpc",0,1000,true),
        totalElectedMpc:limitValidationSchema("totalElectedMpc",0,1000),
        totalElectedNmpc:limitValidationSchema("totalElectedNmpc",0,1000,true),
        recAmount:limitValidationSchema("recAmount",1,999999,true),
        sfcNotification:radioSchema("sfcNotification","GtcInstallmentForm"),
        receiptDate:{
            type:Date,
            max:[new Date().toISOString().split("T")[0],`${grantInstallmentLabels['receiptDate']} should not be greater than the present date`]
        },
        recomAvail:radioSchema("recomAvail","GtcInstallmentForm"),
        grantDistribute:radioSchema("grantDistribute","GtcInstallmentForm",options),
        sfcNotificationCopy:pdfSchema(false),
        projectUndtkn:radioSchema("projectUndtkn","GtcInstallmentForm"),
        propertyTaxNotif:radioSchema("propertyTaxNotif","GtcInstallmentForm"),
        propertyTaxNotifCopy:pdfSchema(false),
        accountLinked:radioSchema("accountLinked","GtcInstallmentForm"),
        uploadFile:pdfSchema(true),
        totalTransAmount:limitValidationSchema("totalTransAmount",1,9999),
        totalIntTransfer:limitValidationSchema("totalIntTransfer",0,9999),

    },
    { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);

installmentFormSchema.plugin(mongooseLeanVirtuals)
installmentFormSchema.virtual("modelName").get(function(){
    return "GtcInstallmentForm"
})
module.exports = mongoose.model("GtcInstallmentForm", installmentFormSchema);
