require('./dbConnect');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const OdfFormCollectionSchema = new Schema({
    rating:{
        type: Schema.Types.ObjectId,
        ref: 'Rating',
    },
    cert:{
        type: String,
    },
    certDate:{
        type: Date,
    },
    ulb:{
        type: Schema.Types.ObjectId,
        ref: 'Ulb',
        required: true,
    },
    design_year:{
        type: Schema.Types.ObjectId,
        ref: 'Year',
        required: true,
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
    isDraft:{
        type: Boolean,
        default: false,
    },
    rejectReason: { type: String, default: "" },
    responseFile: {type: String,  default: ""},
    history:{
        type: Array,
        default: [],
    },
 }
,{
    timestamps:{createdAt: "createdAt", updatedAt:"modifiedAt"}
}
);
OdfFormCollectionSchema.index({ ulb: 1, design_year: 1 }, { unique: true });
module.exports = mongoose.model('OdfFormCollection', OdfFormCollectionSchema)