require('./dbConnect');
const mongoose = require('mongoose');
const {Schema} = mongoose;

const pdfSchema = ()=>{
    return {
        url: {type: String},
        name: {type: String},
    }
}
const propertyTaxFloorRateSchema = new Schema({
    state:{
        type: Schema.Types.ObjectId,
        ref: 'State',
        required: true,
    },
    design_year: {
        type: Schema.Types.ObjectId,
        ref: 'Year',
        required: true,
    },
    stateNotification: pdfSchema(),
    actPage:{
        type: Number,
        default:""
    },
    floorRate: pdfSchema(),
    comManual: pdfSchema(),

    actionTakenByRole:{
        type: String,
        enum:["MoHUA","STATE"],
        required: true,
    },
    actionTakenBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    status:{
        type: String,
        default:"PENDING",
        enum: {
            values: ['APPROVED','PENDING', 'REJECTED'],
            message: "ERROR: STATUS BE EITHER 'PENDING'/'APPROVED' / 'REJECTED'",
        }
    },
    isDraft:{
        type: Boolean,
        default: false,
    },
    rejectReason: { type: String, default: "" },
    responseFile: pdfSchema(),
    history:{
        type: Array,
        default: [],
    }
},{
    timestamps:{createdAt: "createdAt", updatedAt:"modifiedAt"}
});

propertyTaxFloorRateSchema.index({state: 1, design_year: 1}, {unique: true});

module.exports = mongoose.model('PropertyTaxFloorRate', propertyTaxFloorRateSchema)