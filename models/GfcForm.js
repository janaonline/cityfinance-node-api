require('./dbConnect');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const GfcSchema = new Schema({
    name:{
        type: String,
        enum:{
            values: ['No Star', '1 Star', '3 Star', '5 Star', '7 Star'],
            message:"Error pass only specified value."
        },
        required: true,
    },
    isActive:{type: Boolean, default: true},
    value:{type: Number, required: true},

}, 
    {timestamps: {createdAt: "createdAt", updatedAt: "modifiedAt"}
})


module.exports = mongoose.model('Gfc', GfcSchema)