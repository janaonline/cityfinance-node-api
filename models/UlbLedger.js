require("./dbConnect")
const LineItem = require("./LineItem");
const ObjectId = require("mongoose").Types.ObjectId;
const { ledgerFields, ledgerCodes, getKeyByValue } = require('../util/masterFunctions')
const FiscalRanking = require("./FiscalRanking");
const { years } = require("../service/years")
const Fiscalrankingmappers = require("./FiscalRankingMapper");

const { MASTER_STATUS, YEAR_CONSTANTS, } = require("../util/FormNames");
const LedgerSchema = mongoose.Schema({
    ulb: { type: Schema.Types.ObjectId, ref: 'Ulb', index: true },
    design_year: { type: Schema.Types.ObjectId, ref: 'Year', default: null },
    lineItem: { type: Schema.Types.ObjectId, ref: 'LineItem' },
    audit_status: {
        type: String,
        default: ""
    },
    financialYear: { type: String, required: true, index: true, enum: ["2015-16", "2016-17", "2017-18"] },
    amount: { type: Number, required: true },
    modifiedAt: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
    isActive: { type: Boolean, default: 1 }
});


async function rejectMapperFields(calculatedFields, year, frId, displayPriority) {
    try {
        for (let field of calculatedFields) {
            await Fiscalrankingmappers.findOneAndUpdate({
                "fiscal_ranking": ObjectId(frId),
                "year": ObjectId(year),
                "type": field,
                "status": "APPROVED"
            }, {
                "$set": {
                    "status": "REJECTED",
                    "rejectReason": `Data for field ${displayPriority} has been updated. please revisit the calculations`
                }
            })
        }
    }
    catch (err) {
        console.log("error in rejectMapperFields ::: ", err.message)
    }
}

async function updateNextTargetYear(mapperYear, codes, ulbId, mapper, frObject, obj) {
    try {
        let calculatedFields = ledgerFields[mapper.type].calculatedFrom
        let rejectFields = false
        let payload = {}
        let displayPriority = mapper.displayPriority
        let targetYear = ledgerFields[mapper.type].yearsApplicable.find(item => mapperYear.toString() != item)
        let { reject, sum: calculatedAmount } = await getPreviousYearValues(targetYear, codes, ulbId, mapper, frObject, obj)
        let mapperData = await Fiscalrankingmappers.findOne({
            type: mapper.type,
            fiscal_ranking: frObject._id,
            year: ObjectId(targetYear)
        }).lean()
        if (calculatedAmount != mapperData.value) {
            payload.value = calculatedAmount
            payload.ledgerUpdated = true
            rejectFields = reject
        }
        if (Object.keys(payload).length > 0) {
            await updateMainElementMapper(payload, mapperData)
        }
        if (rejectFields) {
            await rejectMapperFields(calculatedFields, targetYear, frObject._id, displayPriority)
        }
    }

    catch (err) {
        console.log("error in updateNextTargetYear ::: ", err.message)
    }
}

async function sumOfCurrentObj(calculatedFields, year, frId, displayPriority) {
    try {
        let mapperObjects = await Fiscalrankingmappers.find({
            "fiscal_ranking": ObjectId(frId),
            "year": ObjectId(year),
            "type": {
                "$in": calculatedFields
            },
        }).lean()
        let sum = mapperObjects.reduce((acc, iterator) => (acc + (+iterator.value)), 0)
        return sum
    }
    catch (err) {
        console.log("error in sumOfCurrentObj :::: ", err.message)
    }
}

async function updateMainElementMapper(payload, mapper) {
    try {
        let updateMapper = await Fiscalrankingmappers.findOneAndUpdate({
            "_id": ObjectId(mapper._id)
        }, {
            "$set": payload
        })
    }
    catch (err) {
        console.log("error in updateMainMapperTable ::: ", err.message)
    }
}


LedgerSchema.post("findOneAndUpdate", async function (doc) {
    if (["2018-19", "2019-20"].includes(doc.financialYear) && Object.values(ledgerCodes).includes(doc.lineItem.toString())) {
        let ledgerItem = await LineItem.findOne({ "_id": doc.lineItem }).lean()
        let frObject = await FiscalRanking.findOne({
            "ulb": doc.ulb,
            "currentFormStatus": {
                "$nin": [MASTER_STATUS['Submission Acknowledged by PMU']]
            }
        })
        if (frObject) {
            let mappersData = await Fiscalrankingmappers.find({
                "fiscal_ranking": frObject._id,
                "type": {
                    "$in": Object.keys(ledgerFields)
                },
                "year": years[doc.financialYear]
            }).lean()
            for (let mapper of mappersData) {
                let payload = {}
                let lineItemCode = getKeyByValue(ledgerCodes, doc.lineItem.toString())
                let calculatedFields = ledgerFields[mapper.type].calculatedFrom
                let codeValue = ledgerFields[mapper.type].codes.find(item => item === lineItemCode)
                let rejectFields = await ShouldReject(frObject.currentFormStatus, mapper.status)
                let maximumValue = ledgerFields[mapper.type].codes.reduce((a, b) => Math.max(parseInt(a), parseInt(b)), 0)
                if (!ledgerFields[mapper.type].logic && codeValue) {
                    if (doc?.amount != mapper.value) {
                        payload.value = doc.amount
                        payload.ledgerUpdated = true
                        payload.modelName = "ULBLedger"
                    }
                }
                else if (ledgerFields[mapper.type].logic && maximumValue.toString() === lineItemCode.toString()) {
                    let { reject, sum: calculatedAmount } = await getPreviousYearValues(mapper.year, ledgerFields[mapper.type].codes, mapper.ulb, mapper, frObject, this)
                    if (calculatedAmount != mapper.value) {
                        payload.value = calculatedAmount
                        payload.ledgerUpdated = true
                        payload.modelName = !reject ? "ULBLedger" : ""
                        rejectFields = reject
                        if (!reject) {
                            payload.modelName = "ULBLedger"
                        }
                    }
                    await updateNextTargetYear(mapper.year, ledgerFields[mapper.type].codes, mapper.ulb, mapper, frObject, this)
                }
                if (Object.keys(payload).length > 1) {
                    await updateMainElementMapper(payload, mapper)
                }
                if (rejectFields) {
                    await rejectMapperFields(calculatedFields, mapper.year, frObject._id, mapper.displayPriority)
                }
            }
        }
    }
})


const ShouldReject = (formStatus, fieldStatus) => {
    try {
        let rejectCases = [MASTER_STATUS['Returned by PMU']]
        if (rejectCases.includes(formStatus) && rejectCases.includes(fieldStatus)) {
            return true
        }
        else {
            return false
        }
    }
    catch (err) {
        console.log("error in ShouldReject:::", err.message)
    }
    return false
}

const getPreviousYearValues = async (mapperYear, codes, ulbId, mapper, frObject, obj) => {
    try {
        let calculatedFields = ledgerFields[mapper.type].calculatedFrom
        let yearName = getKeyByValue(years, mapperYear.toString());
        let year = parseInt(yearName);
        let previousYear = year - 1;
        let yearlyData = {}
        let previousYearString = `${previousYear}-${year.toString().slice(-2)}`;
        let previousYearId = years[previousYearString].toString();
        let calculatableYears = [previousYearString, yearName];
        let yearWiseData = {}
        for (let financialYear of calculatableYears) {
            yearWiseData[financialYear] = []
            for (let code of codes) {
                let ledgerData = await obj.model.findOne({
                    "ulb": ObjectId(ulbId),
                    "lineItem": ledgerCodes[code],
                    "financialYear": financialYear
                }, {
                    amount: 1,
                    _id: 0
                }).lean()
                if (ledgerData?.amount) {
                    yearWiseData[financialYear].push(parseFloat(ledgerData.amount))
                }
                else {
                    yearWiseData[financialYear].push(0)
                }
            }
        }
        let containsZero = Object.values(yearWiseData).some(item => item.includes(0))
        let sumOfChildFields = await sumOfCurrentObj(calculatedFields, mapper.year, frObject._id, mapper.displayPriority)
        if (containsZero) {
            return {
                reject: false,
                sum: sumOfChildFields
            }
        }
        let sum = Object.values(yearWiseData).reduce((acc, valueArr) => (valueArr.reduce((a, b) => (a + b), 0) - acc), 0)
        return {
            reject: true,
            sum: sum
        }
    }
    catch (err) {
        console.log(">>>>>>>>", err)
        console.log("error in getPreviousYearValue ::: ", err.message)
    }
}

LedgerSchema.index(
    {
        ulb: 1,
        financialYear: 1,
        lineItem: 1,
        design_year: 1
    },
    {
        unique: true
    }
);
module.exports = mongoose.model('ULBLedger', LedgerSchema);
