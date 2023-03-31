require('./dbConnect');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const pdfSchema = () => {
    return {
        url: { type: String},
        name: { type: String}
    }
}

const GfcFormCollectionSchema = new Schema({
    rating:{
        type: Schema.Types.ObjectId,
        ref: 'Rating',
    },
    cert: pdfSchema(),
    certDate:{
        type: Date,
    },
    ulb:{
        type: Schema.Types.ObjectId,
        ref: 'Ulb',
        required: true,
    },
    design_year: {
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
            values: ['APPROVED', 'REJECTED', 'PENDING',""],
            message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
        }
    },
    currentFormStatus: {
      type: Number,
    },
    isDraft:{
        type: Boolean,
        default: true,
    },
    ulbSubmit: {
        type: Date,
    },
    gfcRating:{type:String,default:""},
    marks : {type:Number,default:""},
    rejectReason: { type: String, default: "" },
    responseFile: pdfSchema(),
    responseFile_state:pdfSchema(),
    responseFile_mohua:pdfSchema(),
    cert_declaration:pdfSchema(),
    rejectReason_state:{ type: String, default: "" },
    rejectReason_mohua: { type: String, default: "" },
    history:{
        type: Array,
        default: [],
    }
},{
    timestamps:{createdAt: "createdAt", updatedAt:"modifiedAt"}
});
GfcFormCollectionSchema.index({ ulb: 1, design_year: 1 }, { unique: true });
module.exports = mongoose.model('GfcFormCollection', GfcFormCollectionSchema)