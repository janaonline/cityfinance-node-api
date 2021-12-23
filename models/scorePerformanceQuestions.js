require("./dbConnect");
// const { Schema } = require( "mongoose" );

const scorePerformanceQuestionSchema = new Schema( {
    enumeration: [
        {
        "question": {
                text: { type: String },
                number: {type: String}
        }
        }
    ],
    valuation: [
        {
            "question": {
                text: { type: String },
                number: {type: String}
            }
            }
    ],
    assesment: [
        {
            "question": {
                text: { type: String },
                number: {type: String}
            }
            }
    ],
    billing_collection: [
        {
            "question": {
                text: { type: String },
                number: {type: String}
            }
            }
    ],
    reporting: [
        {
            "question": {
                text: { type: String },
                number: {type: String}
            }
            }
    ],
} );

module.exports = mongoose.model( 'scorePerformanceQuestion', scorePerformanceQuestionSchema );