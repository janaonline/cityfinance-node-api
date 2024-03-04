require('./dbConnect');
const mongoose = require('mongoose');
const { Schema } = mongoose;

// const YesNoSchema = new Schema({
//     answer: {
//         type: String,
//         lowercase: true,
//         enum: {
//             values: ['yes', 'no', null],
//             message: 'ERROR: ANSWER CAN BE EITHER YES / NO.'
//         },

//     }

// });
// const PFMSAccountSchema = new Schema(
//     {
//         ulb: { type: Schema.Types.ObjectId, ref: 'Ulb', required: true, },
//         design_year: { type: Schema.Types.ObjectId, ref: 'Year', required: true },
//         account: {
//             type: String, enum: {
//                 values: ['yes', 'no', null, ""],
//                 message: 'ERROR: ANSWER CAN BE EITHER YES / NO.'
//             }
//         },
//         linked: {
//             type: String, enum: {
//                 values: ['yes', 'no', null, ""],
//                 message: 'ERROR: ANSWER CAN BE EITHER YES / NO.'
//             }
//         },
//         history: { type: Array, default: [] },
//         modifiedAt: { type: Date, default: Date.now() },
//         createdAt: { type: Date, default: Date.now() },
//         isDraft: { type: Boolean, default: true }
//     },
//     { timestamp: { createdAt: 'createdAt', updatedAt: 'modifiedAt' } }
// );

const pdfSchema = () => {
    return {
        url: { type: String},
        name: { type: String}
    }
}
const PFMSAccountSchema = new Schema(
    {
        ulb: {
            type: mongoose.Types.ObjectId,
            ref: 'Ulb',
            required: [true, "ulb is required"]
        },
        design_year: {
           type: mongoose.Types.ObjectId,
           ref: "Year",
           required: [true, "year is required"]

        },
        linkPFMS:{
            type: String, 
            enum: {
                values: ['Yes', 'No'],
                message: 'ERROR: ANSWER CAN BE EITHER Yes/No.'
            },
            default: 'No',
        },
        isUlbLinkedWithPFMS:{
            type: String, 
            enum: {
                values: ['Yes', 'No', ""],
                message: 'ERROR: ANSWER CAN BE EITHER Yes/No.'
            },
        },
        PFMSAccountNumber: {
            type: String,
            default: "",
        },
        cert: pdfSchema(),
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
                values: ['APPROVED', 'REJECTED', 'PENDING',''],
                message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
            }
        },
        currentFormStatus:{
            type:Number,
        },
        otherDocs: pdfSchema(),
        rejectReason: { type: String, default: "" },
        responseFile: pdfSchema(),
        ulbSubmit: {type: Date},
        responseFile_state:pdfSchema(),
        responseFile_mohua:pdfSchema(),
        rejectReason_state:{ type: String, default: "" },
        rejectReason_mohua: { type: String, default: "" },
        isDraft: {
            type: Boolean,
            required: [true, "draft key is required."],
            default: true
        },
        history:{
            type: Array,
            default: []
        },
        createdAt:{
            type: Date
        },
        modifiedAt:{
            type:Date
        }
    },{
        timestamps: {createdAt: "createdAt", updatedAt: "modifiedAt"}
    }
);
PFMSAccountSchema.index({ulb: 1, design_year: 1}, {unique: true});

module.exports = mongoose.model('PFMSAccount', PFMSAccountSchema);
