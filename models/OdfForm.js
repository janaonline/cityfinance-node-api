require('./dbConnect');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const OdfSchema = new Schema({
    name:{
        type: String,
        enum:{
            values:['ODF', 'ODF+', 'ODF++', 'Water+', 'Non ODF', 'Non ODF+', 'Non ODF++'],
            message: "Error pass only specified values."
        },
        required: true
    }
    ,
    isActive:{type: Boolean, default: true},
    value:{type: Number, required: true},

}, 
    {timestamps:{createdAt: "createdAt", updatedAt: "modifiedAt"}
})


module.exports = mongoose.model('Odf', OdfSchema)