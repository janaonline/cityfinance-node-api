require("./dbConnect");
const mongoose = require('mongoose');
const {Schema} = mongoose

const formsMasterSchema = new Schema({
    name:{
        type: String,
        enum: {
            values: ["Grant Transfer Certificate", "Detailed Utilisation Report",
            "Annual Accounts", "Linking of PFMS Account", "Property Tax Operationalisation",
            "SLBs for Water Supply and Sanitation", "Open Defecation Free (ODF)", 
            "Garbage Free City (GFC)", "Scoring"],
            message: "Pass only specified values"
        }
    },
    userLevel: {
        type: String,
        enum:["ULB","MoHUA","STATE"],
        required: true
    },
    category:{
        type: mongoose.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    createdAt:{
        type: Date,
    },
    modifiedAt: {
        type: Date
    },
},{ timestamps: {createdAt: "createdAt", updatedAt: "modifiedAt"}}
);

module.exports = mongoose.model('FormsMaster', formsMasterSchema);