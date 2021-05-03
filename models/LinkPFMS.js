require('./dbConnect');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const YesNoSchema = new Schema({
    answer: {
        type: String,
        lowercase: true,
        enum: {
            values: ['yes', 'no', null],
            message: 'ERROR: ANSWER CAN BE EITHER YES / NO.'
        },

    }

});
const PFMSAccountSchema = new Schema(
    {
        ulb: { type: Schema.Types.ObjectId, ref: 'Ulb', required: true, },
        design_year: { type: Schema.Types.ObjectId, ref: 'Year', required: true },
        account: {
            type: String, enum: {
                values: ['yes', 'no', null],
                message: 'ERROR: ANSWER CAN BE EITHER YES / NO.'
            }
        },
        linked: {
            type: String, enum: {
                values: ['yes', 'no', null],
                message: 'ERROR: ANSWER CAN BE EITHER YES / NO.'
            }
        },
        history: { type: Array, default: [] },
        modifiedAt: { type: Date, default: Date.now() },
        createdAt: { type: Date, default: Date.now() },
    },
    { timestamp: { createdAt: 'createdAt', updatedAt: 'modifiedAt' } }
);

module.exports = mongoose.model('PFMSAccount', PFMSAccountSchema);