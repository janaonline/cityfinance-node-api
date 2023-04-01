require("./dbConnect");
const propertyTaxOpMapper = new Schema(
    {
        ptoId: { type: Schema.Types.ObjectId, ref: "PropertyTaxOp", required: true },
        ulb: { type: Schema.Types.ObjectId, ref: "Ulb", required: true },
        year: { type: Schema.Types.ObjectId, ref: "Year", required: true },
        value: { type: Schema.Types.Mixed, default: null },
        status: {
            type: String,
            default: "PENDING",
            enum: {
                values: ["PENDING", "APPROVED", "REJECTED", "NA"],
                message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
            },
        },
        isActive: { type: Boolean, default: 1 },
        type: {
            type: String,
            enum: {
                values: [
                    'dmdIncludingCess',
                    'dmdexcludingCess',
                    'taxTypeDemand',
                    'cessDemand',
                    'userChargesDmnd',
                    'collectIncludingCess',
                    'collectExcludingCess',
                    'taxTypeCollection',
                    'cessCollect',
                    'userChargesCollect',
                    'totalMappedPropertiesUlb',
                    'totalPropertiesTax',
                    'totalPropertiesTaxDm',
                    'totalPropertiesTaxDmCollected',
                    'resPropTaxCollect',
                    'comPropTaxCollect',
                    'numberPropTaxCollect',
                    'instiPropTaxCollect',
                    'otherPropTaxCollect',
                    'waterChargesDmd',
                    'waterChargesColl',
                    'noOfwaterChargesDmd',
                    'noOfwaterChargesColl',
                    'waterChrgDm',
                    'noOfPropertiesDm',
                    'waterChrgCol'
                ],
                message: "ERROR: STATUS BE EITHER",
            },
        },
        file: {
            name: { type: String },
            url: { type: String }
        },
        displayPriority: { type: Number, default: null },
        createdAt: { type: Date, default: Date.now() },
        modifiedAt: { type: Date, default: Date.now() },
    },
    { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
module.exports = mongoose.model("PropertyTaxOpMapper", propertyTaxOpMapper);


// let arr=[]
// let tabs = data.tabs[0].data;
// for(let k in tabs){
//       arr.push(tabs[k].key)  
// }
// console.log("arr",arr)

