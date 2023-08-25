require('./dbConnect');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const GeneralAlerts = new Schema({
    moduleName:{
        type: String,
        required: true
    },
    title:{
        type: String,
        required: true
    },
    icon:{
        type: String,
        required: true
    },
    text:{
        type: String,
        required: true
    },
    position:{
        type: String,
        required: true
    },
    isActive:{
        type: Boolean,
        default:true
    },
    startDateTime:{
        type: Date,
        default:null
    },
    endDateTime:{
        type: Date,
        default:null
    },
    createdAt: { type: Date, default: Date.now },
 },
 { timestamps:{createdAt: "createdAt", updatedAt:"modifiedAt"}}
);
module.exports = mongoose.model('GeneralAlert', GeneralAlerts)

