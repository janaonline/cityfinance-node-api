const { stringify } = require('urlencode');

require('./dbConnect');

const GSDP_ELIGIILITY = new Schema({ 
    "2023-24": {
        "eligible" : {
            type: Boolean,
            default: false
        },
        "upload" : {
            type: Boolean,
            default: false
        },
    },
    "2024-25" : {
        "eligible" : {
            type: Boolean,
            default: false
        },
        "upload" : {
            type: Boolean,
            default: false
        }
    }
});

const DULY_ELECTED = new Schema({
    "2023-24": {
        "eligible": {
            type: Boolean,
            default: false
        },
        "electedDate": {
            type: Date
        }
    },
    "2024-25": {
        "eligible": {
            type: Boolean,
            default: false
        },
        "electedDate": {
            type: Date
        }
    }
});

const UlbSchema = new Schema({
    name: { type: String, required: true },
    regionalName: { type: String, default: "" },
    keywords: { type: String },
    code: { type: String, required: true, index: { unique: true } },
    state: { type: Schema.Types.ObjectId, ref: 'State', required: true },
    ulbType: { type: Schema.Types.ObjectId, ref: 'UlbType', required: true },
    natureOfUlb: { type: String, default: null },
    wards: { type: Number, default: 0 },
    area: { type: Number, default: 0 },
    population: { type: Number, default: 0 },
    location: {
        type: {
            lat: { type: String },
            lng: { type: String },
        },
        default: {
            lat: "0.0",
            lng: "0.0"
        }
    },
    sbCode: { type: String, default: null }, /*Swatch Bharat Code*/
    censusCode: { type: String, default: null },
    isMillionPlus: { type: String, enum: ["YES", "No"], default: "No" },
    isUA: { type: String, enum: ["YES", "No"], default: "No" },
    UA: { type: Schema.Types.ObjectId, ref: 'UA' },
    amrut: { type: String, default: "" },
    modifiedAt: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
    gsdp: GSDP_ELIGIILITY,
    dulyElected: DULY_ELECTED,
    isActive: { type: Boolean, default: 1 },
    access_2021: { type: Boolean, default: 1 },
    access_2122: { type: Boolean, default: 1 },
    access_2223: { type: Boolean, default: 1 },
    access_2324: { type: Boolean, default: 1 },
    access_2425: { type: Boolean, default: 1 },
}, { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } });
module.exports = mongoose.model('Ulb', UlbSchema);