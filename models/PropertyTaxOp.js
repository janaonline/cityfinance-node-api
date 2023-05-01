require('./dbConnect');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const pdfSchema = () => {
    return {
        url: { type: String},
        name: { type: String}
    }
}
const PropertyTaxOpSchema = new Schema(
    {
        ulb: {
            type: mongoose.Types.ObjectId,
            ref: 'Ulb',
            required: [true, "ulb is required"]
        },
        design_year: {
           type: mongoose.Types.ObjectId,
           ref: "Year",
           required: [true, "design year is required"]

        },
        toCollect: {
            type: String,
            enum:['Yes','No',""],
        },
        operationalize: {
            type: String,
            enum:['Yes','No',""],
        },
        proof: pdfSchema(),
        method:{
            type: String,
            enum:['Unit Area Value(UAV) System','Annual Rental Value(ARV) System',
            'Capital Value (CV) System','Other',""],
        },
        other:{
            type: String,
        },
        rateCard: {
            type:pdfSchema(),
        },
        collection2019_20:{
            type: Number,
        },
        collection2020_21:{
            type: Number,
        },
        collection2021_22:{
            type: Number,
        },
        target2022_23:{
            type: Number,
        },
        ptCollection:{
            type:pdfSchema(),
        },
        actionTakenByRole:{
            type: String,
            enum:["ULB","MoHUA","STATE"],
            required: true,
        },
        actionTakenBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        status:{
            type: String,
            enum: {
                values: ['APPROVED', 'REJECTED', 'PENDING'],
                message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
            }
        }, 
        currentFormStatus:{
            type:Number
        },
        ulbSubmit:{type: Date},
        responseFile_state:pdfSchema(),
        responseFile_mohua:pdfSchema(),
        rejectReason_state:{ type: String, default: "" },
        rejectReason_mohua: { type: String, default: "" },
        isDraft: {
            type: Boolean,
            required: [true, "isDraft key is required."],
            default: true
        },
        history:{
            type: Array,
            default: []
        },
        createdAt:{
            type: Date,
            default: Date.now
        },
        modifiedAt:{
            type:Date,
            default: Date.now
        }
    },{
        timestamps: {createdAt: "createdAt", updatedAt: "modifiedAt"}
    }
);
PropertyTaxOpSchema.index({ulb: 1, design_year: 1}, {unique: true});

module.exports = mongoose.model('PropertyTaxOp', PropertyTaxOpSchema);
