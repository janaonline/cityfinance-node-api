require('./dbConnect');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const MasterStatus = new Schema({
    status:{
        type: String
    },
    isActive:{
        type: Boolean
    },
    statusId:{
        type: Number,

    }
 }
,{
    timestamps:{createdAt: "createdAt", updatedAt:"modifiedAt"}
}
);
MasterStatus.index({ statusId: 1 }, { unique: true });
module.exports = mongoose.model('MasterStatus', MasterStatus)

