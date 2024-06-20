require('./dbConnect');

const dataSchema = new Schema({
    year: {
        type: String,
        required: true
    },
    constantPrice: {
        type: Number,
        required: true
    },
    currentPrice: {
        type: Number,
        required: true
    },
    updatedOn: {
        type: Date,
        default: Date.now()
    },

});

const stateDataSchema = new mongoose.Schema({
    stateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'State',
        required: true
    },
    stateName: {
        type: String,
        required: true
    },
    data: [dataSchema],
    createdAt: { type: Date, default: Date.now() }
}, { collection: 'state_gsdp', timestamps: true });

const StateGsdpData = mongoose.model('StateGsdpData', stateDataSchema);

module.exports = StateGsdpData;

