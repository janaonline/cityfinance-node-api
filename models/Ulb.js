const { stringify } = require('urlencode');
require('./dbConnect');

const GSDP_ELIGIILITY = new Schema({
    "2023-24": {
        "eligible": {
            type: Boolean,
            default: false
        },
        "upload": {
            type: Boolean,
            default: false
        },
    },
    "2024-25": {
        "eligible": {
            type: Boolean,
            default: false
        },
        "upload": {
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
    code: { type: String, required: true, index: { unique: true } },
    name: { type: String, required: true },
    censusCode: { type: String, default: null },
    sbCode: { type: String, default: null }, /*Swatch Bharat Code*/
    population: { type: Number, default: 0 },
    area: { type: Number, default: 0 },
    wards: { type: Number, default: 0 },
    ulbType: { type: Schema.Types.ObjectId, ref: 'UlbType', required: true },
    natureOfUlb: { type: String, default: null },
    isActive: { type: Boolean, default: 1 },
    access_2021: { type: Boolean, default: 1 },
    access_2122: { type: Boolean, default: 1 },
    access_2223: { type: Boolean, default: 1 },
    access_2324: { type: Boolean, default: 1 },
    access_2425: { type: Boolean, default: 1 },
    state: { type: Schema.Types.ObjectId, ref: 'State', required: true },
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
    district: { type: String, default: "" },
    censusType: { type: String, default: "" },
    isUA: { type: String, enum: ["YES", "No"], default: "No" },
    UA: { type: Schema.Types.ObjectId, ref: 'UA' },
    isMillionPlus: { type: String, enum: ["YES", "No"], default: "No" },
    amrut: { type: String, default: "" },
    lgdCode: { type: String, default: "" },
    population_source: { type: String, default: "" },
    areaSource: { type: String, default: "" },
    wardSource: { type: String, default: "" },
    districtSoure: { type: String, default: "" },
    creditRating: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now() },
    modifiedAt: { type: Date, default: Date.now() },
    keywords: { type: String },
    regionalName: { type: String, default: "" },
    gsdp: GSDP_ELIGIILITY,
    dulyElected: DULY_ELECTED,

}, { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } });
module.exports = mongoose.model('Ulb', UlbSchema);