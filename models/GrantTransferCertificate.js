require('./dbConnect');
const mongoose = require('mongoose');
const {Schema} = mongoose;

const pdfSchema = ()=>{
    return {
        name: {type: String},
        url: {type: String}
    }
}

const grantTransferCertificateSchema = new Schema({
    state:{
        type: Schema.Types.ObjectId,
        ref: "State"
    },
    design_year:{
        type: Schema.Types.ObjectId,
        ref: "Year"
    },
    type:{
        type: String,
        enum:{
            values:["million_tied", "nonmillion_tied", "nonmillion_untied" ],
            message:"ERROR: type can be only `million tied/non million tied/non million untied`"
        }
    },
    installment:{
        type: Number
    },
    year:{
        type: Schema.Types.ObjectId,
        ref: "Year" 
    },
    file: pdfSchema(),
    isDraft:{ type: Boolean, default: false },
    status:{
        type: String,
        enum:{
            values:["PENDING", "APPROVED", "REJECTED"],
            message: "ERROR: status can be either PENDING/APPROVED/REJECTED"
        }
    },
    rejectReason: {type: String, default:""},
    responseFile: pdfSchema(),
    actionTakenBy:{
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    actionTakenByRole: {
        type: String,
        enum:["STATE", "MoHUA"],
        required: true
    },
    createdAt:{
        type: Date
    },
    modifiedAt:{
        type: Date
    },
    history:{
        type: Array,
        default: []
    }
},{
    timestamps:{createdAt:"createdAt", updatedAt:"modifiedAt"}
})

grantTransferCertificateSchema.index({state: 1, design_year:1, year:1, installment: 1, type: 1},{unique: true});

module.exports = mongoose.model('GrantTransferCertificate', grantTransferCertificateSchema);