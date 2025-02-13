const { Schema } = require('mongoose');

require('./dbConnect');
const audited = function () {
    return this.audited;
};
const statusType = () => {
    return {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'NA'],
        default: '',
    };
};

const overallStatusType = () => {
    return {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING',
    };
};

const ContentPDFSchema = new Schema({
    pdfUrl: { type: String },
    message: { type: String, default: '' },
});

const pdfSchema = ()=>{
    return {
    name: { type: String},
    url: { type: String}
    }
}
const waterManagementSchema = new Schema({
    serviceLevel: {
        baseline: { 2021: { type: String, required: true } },
        actual: { 2021: { type: String } },
        target: {
            2122: { type: String, required: true },
            2223: { type: String, required: true },
            2324: { type: String, required: true },
            2425: { type: String, required: true },

        },
        status: statusType(),
        rejectReason: { type: String, default: "" },
        responseFile:pdfSchema(),

    },
    houseHoldCoveredPipedSupply: {
        baseline: { 2021: { type: String, required: true } },
        actual: {
            2021: { type: String },
            2122: { type: String }
        },
        target: {
            2122: { type: String, required: true },
            2223: { type: String, required: true },
            2324: { type: String, required: true },
            2425: { type: String, required: true },

        },
        status: statusType(),
        rejectReason: { type: String, default: '' },
    },
    waterSuppliedPerDay: {
        baseline: { 2021: { type: String, required: true } },
        actual: {
            2021: { type: String },
            2122: { type: String }
        },
        target: {
            2122: { type: String, required: true },
            2223: { type: String, required: true },
            2324: { type: String, required: true },
            2425: { type: String, required: true },

        },
        status: statusType(),
        rejectReason: { type: String, default: '' },
    },
    reduction: {
        baseline: { 2021: { type: String, required: true } },
        actual: {
            2021: { type: String },
            2122: { type: String }
        },
        target: {
            2122: { type: String, required: true },
            2223: { type: String, required: true },
            2324: { type: String, required: true },
            2425: { type: String, required: true },

        },
        status: statusType(),
        rejectReason: { type: String, default: '' },
    },
    houseHoldCoveredWithSewerage: {
        baseline: { 2021: { type: String, required: true } },
        actual: {
            2021: { type: String },
            2122: { type: String }
        },
        target: {
            2122: { type: String, required: true },
            2223: { type: String, required: true },
            2324: { type: String, required: true },
            2425: { type: String, required: true },
            // 2526: { type: String, required: true },
        },
        status: statusType(),
        rejectReason: { type: String, default: '' },
    },
    
    status: statusType(),
    rejectReason: { type: String, default: '' },
});


const waterPotabilityPlanSchema = new Schema({
    documents: {
        waterPotabilityPlan: {
            type: [{
                url: { type: String, required: true },
                name: { type: String, required: true },
            }],
            default: null,
        },
    }

});

const solidWasteManagementSchema = new Schema({
    documents: {
        garbageFreeCities: {
            type: [
                {
                    url: { type: String, required: true },
                    name: { type: String, required: true },
                    status: statusType(),
                    rejectReason: { type: String, default: '' },
                },
            ],
            default: null,
        },
        waterSupplyCoverage: {
            type: [
                {
                    url: { type: String, required: true },
                    name: { type: String, required: true },
                    status: statusType(),
                    rejectReason: { type: String, default: '' },
                },
            ],
            default: null,
        },
    },
});

const millionPlusCitiesSchema = new Schema({
    documents: {
        cityPlan: {
            type: [
                {
                    url: { type: String, required: true },
                    name: { type: String, required: true },
                    status: statusType(),
                    rejectReason: { type: String, default: '' },
                },
            ],
            default: null,
        },
        waterBalancePlan: {
            type: [
                {
                    url: { type: String, required: true },
                    name: { type: String, required: true },
                    status: statusType(),
                    rejectReason: { type: String, default: '' },
                },
            ],
            default: null,
        },
        serviceLevelPlan: {
            type: [
                {
                    url: { type: String, required: true },
                    name: { type: String, required: true },
                    status: statusType(),
                    rejectReason: { type: String, default: '' },
                },
            ],
            default: null,
        },
        solidWastePlan: {
            type: [
                {
                    url: { type: String, required: true },
                    name: { type: String, required: true },
                    status: statusType(),
                    rejectReason: { type: String, default: '' },
                },
            ],
            default: null,
        },
    },
});

const XVFcGrantULBFormSchema = new Schema(
    {
        ulb: { type: Schema.Types.ObjectId, ref: 'Ulb', required: true },
        design_year: {
            type: Schema.Types.ObjectId,
            ref: 'Year',
            required: true,
            default: null
        },
        status: overallStatusType(),
        actionTakenBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        actionTakenByRole: {
            type: String,
            default: null
        },
        history: { type: Array, default: [] },
        population_slb: {type: Number},
        modifiedAt: { type: Date, default: Date.now },
        createdAt: { type: Date, default: Date.now },
        isActive: { type: Boolean, default: 1 },
        waterManagement: { type: waterManagementSchema, default: null },
        water_index: { type: Boolean, default: false },
        waterPotability: {
            type: waterPotabilityPlanSchema,
            default: null
        },
        solidWasteManagement: {
            type: solidWasteManagementSchema,
            default: null,
        },
        accessibleForYears:[
            {
                type: Schema.Types.ObjectId,
                ref: 'Year',
                required: false,
                default: null
            },
        ],
        millionPlusCities: { type: millionPlusCitiesSchema, default: null },
        isCompleted: { type: Boolean, default: 0 },
        isOldForm: { type: Boolean },
        document: { type: ContentPDFSchema, required: true, default: null },
        blank: { type: Boolean, default: false }
    },
    { timestamp: { createdAt: 'createdAt', updatedAt: 'modifiedAt' } }
);
XVFcGrantULBFormSchema.index(
    { ulb: 1, design_year: 1 },
    { unique: true }
);
module.exports = mongoose.model('XVFcGrantULBForm', XVFcGrantULBFormSchema);

XVFcGrantULBFormSchema.pre('save', function (next) {
    this.modifiedAt = new Date();
    next();
});