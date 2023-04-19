require("./dbConnect");
const mongoose = require('mongoose');
const { Schema } = mongoose;
const Year = require("./Year")
const {radioSchema,pdfSchema,limitValidationSchema} = require("../util/masterFunctions")

const installmentFormSchema = new Schema(
    {
        state: {
            type: Schema.Types.ObjectId,
            ref: 'State',
            required: [true, "state is required"]
        },
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
            enum:["2022-2023","2023-2024"],
            required:[true,"year must be  2022-2023 / 2023-2024"]
        },
        design_year : {type:Schema.Types.ObjectId,ref:"Year"},
        financialYear: { type: Schema.Types.ObjectId, ref: "Year" },
        state: { type: Schema.Types.ObjectId, ref: "State",required:[true,"State id is required"] },
        transGrantdetail:{type:Schema.Types.ObjectId,ref:"TransferGrantDetailForm",default:null},
        ulbType:{
            type:String,
            enum:["MPC","NMPC",null],
            default:null,
            required:[true,"ulbType is required "]
        },
        grantType:{
            type:String,
            enum:["Tied","Untied",null],
            default:null,
            required:[true,"ulbType is required "]
        },
        installmentType:{
            type:String,
            enum:["1st Installment","2nd Installment",null],
            default:null,
            required:[true,"installmentType is required "]
        },
        totalMpc:limitValidationSchema("totalMpc",0,1000),
        totalNmpc:limitValidationSchema("totalNmpc",0,1000),
        totalElectedMpc:limitValidationSchema("totalElectedMpc",0,1000),
        totalElectedNmpc:limitValidationSchema("totalElectedNmpc",0,1000),
        recAmount:limitValidationSchema("recAmount",1,9999),
        receiptDate:{
            type:Date,
            default:null,
            max:new Date().toISOString().split("T")[0]
        },
        recomAvail:radioSchema(),
        grantDistribute:radioSchema(),
        sfcNotificationCopy:pdfSchema(),
        projectUndtkn:radioSchema(),
        propertyTaxNotif:radioSchema(),
        propertyTaxNotifCopy:pdfSchema(),
        accountLinked:radioSchema(),
        uploadFile:radioSchema(),

    },
    { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
module.exports = mongoose.model("GtcInstallmentForm", installmentFormSchema);
