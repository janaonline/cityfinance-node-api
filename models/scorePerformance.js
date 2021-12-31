require("./dbConnect");

const scorePerformanceSchema = new Schema( {
    ulb: { type: Schema.Types.ObjectId, ref: 'Ulb' },
    total: {
        type: String
    },
    partcularAnswerValues: [ {name: String,value: Number } ],
    scorePerformance: {
        enumeration: [
            {
                "question": { type: String },
                "answer": { type: Boolean },
            }
        ],
        valuation: [
            {
                "question": { type: String },
                "answer": { type: Boolean },
            }
        ],
        assessment: [
            {
                "question": { type: String },
                "answer": { type: Boolean },
            }
        ],
        billing_collection: [
            {
                "question": { type: String },
                "answer": { type: Boolean },
            }
        ],
        reporting: [
            {
                "question": { type: String },
                "answer": { type: Boolean },
            }
        ],
    }
},
    { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } } );

module.exports = mongoose.model( 'scorePerformance', scorePerformanceSchema );