require('./dbConnect');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const GfcFormCollectionSchema = new Schema({
    rating:{
        type: Schema.Types.ObjectId,
        ref: 'Gfc',
        required: [true,'Rating is required.'],
    },
    cert:{
        type: String,
        required: [true, 'cert is required.'],
    },
    certDate:{
        type: Date,
        required: true,
        required: [true, 'certDate is required.'],
    },
    ulb:{
        type: Schema.Types.ObjectId,
        ref: 'Ulb',
        required: true,
    },
    year:{
        type: Schema.Types.ObjectId,
        ref: 'Year',
        required: true,
    },
    actionTakenByRole:{
        type: String,
        enum:["ULB","MoHUA","STATE","ADMIN"],
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
    history:{
        type: Array,
        default: [],
    }
},{
    timestamps:{createdAt: "createdAt", updatedAt:"modifiedAt"}
});
GfcFormCollectionSchema.index({ ulb: 1, year: 1 }, { unique: true });
module.exports = mongoose.model('GfcFormCollection', GfcFormCollectionSchema)