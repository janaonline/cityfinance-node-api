require("./dbConnect");
// const { Schema } = require( "mongoose" );

const scorePerformanceSchema = new Schema( {
    enumeration: [
        {
        "question": {
            _id: mongoose.Schema.Types.ObjectId,
            type: Boolean,
            required: true
        }
        }
    ],
    valuation: [
        {
            "question": {
                _id: mongoose.Schema.Types.ObjectId,
                type: Boolean,
                required: true
            }
            }
    ],
    assesment: [
        {
            "question": {
                _id: mongoose.Schema.Types.ObjectId,
                type: Boolean,
                required: true
            }
            }
    ],
    billing_collection: [
        {
            "question": {
                _id: mongoose.Schema.Types.ObjectId,
                type: Boolean,
                required: true
            }
            }
    ],
    reporting: [
        {
            "question": {
                _id: mongoose.Schema.Types.ObjectId,
                type: Boolean,
                required: true
            }
            }
    ],
},
    { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } } );

module.exports = mongoose.model( 'scorePerformance', scorePerformanceSchema );