require('./dbConnect');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const MasterSkipValue = new Schema({
    value:{
        type: String
    },
    isActive:{
        type: Boolean
    },
    skipId:{
        type: Number,
    },
    category:{
        type: String
    }
 }
,{
    timestamps:{createdAt: "createdAt", updatedAt:"modifiedAt"}
}
);
MasterSkipValue.index({ skipId: 1 }, { unique: true });
module.exports = mongoose.model('MasterSkipValue', MasterSkipValue)

