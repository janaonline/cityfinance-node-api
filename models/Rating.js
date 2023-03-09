require('./dbConnect');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const ratingSchema = new Schema({
    formName:{
        type: String,
        required: [true, "form name is required."]
    },
    name:{
        type: String,
        enum:{
            values: ['No Star', '1 Star', '3 Star', '5 Star', '7 Star', 'No Rating',
            'ODF', 'ODF+', 'ODF++', 'Non ODF'],
            message:"Pass only specified value in name."
        },
        required: true,
    },
    marks:{
        type: Number
    },
    isActive: {type: Boolean, default: true},
    value: {type: Number, required: true},
    createdAt: { type: Date },
    modifiedAt: { type: Date },
    option_id :{type: Number},
    financialYear:{ type: Schema.Types.ObjectId, ref: "Year",default:null}

}, 
    {timestamps: {createdAt: "createdAt", updatedAt: "modifiedAt"}
});

module.exports = mongoose.model('Rating', ratingSchema);