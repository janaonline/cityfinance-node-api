require('./dbConnect');
const mongoose = require('mongoose');
const { Schema } = mongoose;
const PropertyTaxOpenSchema = new Schema(
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
        isDraft: {
            type: Boolean,
            required: [true, "isDraft key is required."],
            default: true
        },
        createdAt:{
            type: Date,
            default: Date.now
        },
        modifiedAt:{
            type:Date,
            default: Date.now
        },
        method:{
            type: String,
            enum:['Unit Area Value(UAV) System','Annual Rental Value(ARV) System',
            'Capital Value (CV) System','Other',""],
        },
        other:{
            type: String,
        },
        noOfProp: [{
            year: {
                    type: String,
                    default:""
            },
            value:{
                type: Number,
                default:""
            }
        }],
        noOfPropTaxReg: [{
            year: {
                    type: String,
                    default:""
            },
            value:{
                type: Number,
                default:""
            }
        }],
        noOfPropBilled: [{
            year: {
                    type: String,
                    default:""
            },
            value:{
                type: Number,
                default:""
            }
        }],
        noOfPropTaxPaid: [{
            year: {
                    type: String,
                    default:""
            },
            value:{
                type: Number,
                default:""
            }
        }],
        taxDemand: [{
            year: {
                    type: String,
                    default:""
            },
            value:{
                type: Number,
                default:""
            }
        }],
        taxCollected: [{
            year: {
                    type: String,
                    default:""
            },
            value:{
                type: Number,
                default:""
            }
        }],
        noOfPropExempt : [{
            year: {
                    type: String,
                    default:""
            },
            value:{
                type: Number,
                default:""
            }
        }]
    },{
        timestamps: {createdAt: "createdAt", updatedAt: "modifiedAt"}
    }
);
PropertyTaxOpenSchema.index({ulb: 1, design_year: 1}, {unique: true});

module.exports = mongoose.model('PropertyTaxOpen', PropertyTaxOpenSchema);