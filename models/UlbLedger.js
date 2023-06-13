require("./dbConnect")
const LineItem = require("./LineItem");
const ObjectId = require("mongoose").Types.ObjectId;
const {ledgerFields,ledgerCodes, getKeyByValue}  = require('../util/masterFunctions')
const FiscalRanking = require("./FiscalRanking");
const {years} = require("../service/years")
const Fiscalrankingmappers = require("./FiscalRankingMapper");

const { MASTER_STATUS, YEAR_CONSTANTS, } = require("../util/FormNames");
const LedgerSchema = mongoose.Schema({
    ulb: { type: Schema.Types.ObjectId, ref: 'Ulb', index: true },
    design_year: { type: Schema.Types.ObjectId, ref: 'Year', default: null },
    lineItem: { type: Schema.Types.ObjectId, ref: 'LineItem' },
    financialYear: { type: String, required: true, index: true, enum: ["2015-16", "2016-17", "2017-18"] },
    amount: { type: Number, required: true },
    modifiedAt: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
    isActive: { type: Boolean, default: 1 }
});


async function rejectMapperFields(calculatedFields,year,frId,displayPriority){
    try{
        for(let field of calculatedFields){
            await Fiscalrankingmappers.findOneAndUpdate({
                "fiscal_ranking":ObjectId(frId),
                "year":ObjectId(year),
                "type":field,
                "status":"APPROVED"
            },{
                "$set":{
                    "status":"REJECTED",
                    "rejectReason":`Data for field ${displayPriority} has been updated. please revisit the calculations`
                }
            })
        }
    }
    catch(err){
        console.log("error in rejectMapperFields ::: ",err.message)
    }
}


LedgerSchema.post("findOneAndUpdate",async function (doc){
    if(["2018-19","2019-20"].includes(doc.financialYear) && Object.values(ledgerCodes).includes(doc.lineItem.toString())){
        let ledgerItem = await LineItem.findOne({"_id":doc.lineItem}).lean()
        let frObject = await FiscalRanking.findOne({
            "ulb":doc.ulb,
            "currentFormStatus":{
                "$nin":[MASTER_STATUS['Submission Acknowledged by PMU']]
            }
        })
        let mappersData = await Fiscalrankingmappers.find({
            "fiscal_ranking":frObject._id,
            "type":{
                "$in":Object.keys(ledgerFields)
            },
            "year":years[doc.financialYear]
        }).lean()
        for(let mapper of mappersData){
            let payload = {}
            let lineItemCode = getKeyByValue(ledgerCodes,doc.lineItem.toString())
            let yearName = getKeyByValue(years,mapper.year)
            let grossBlock = doc.lineItem === ledgerCodes['410'] ? true : false
            let captlWorkInProg = doc.lineItem === ledgerCodes['412'] ? true : false
            let calculatedFields = ledgerFields[mapper.type].calculatedFrom
            let codeValue = ledgerFields[mapper.type].codes.find(item => item === lineItemCode)
            let rejectFields = await ShouldReject(frObject.currentFormStatus,mapper.status)
            let maximumValue = ledgerFields[mapper.type].codes.reduce((a,b) => Math.max(parseInt(a),parseInt(b)) ,0)
            if(!ledgerFields[mapper.type].logic && codeValue){
                payload.value = doc.amount
                payload.ledgerUpdated = true
            }
            else if(ledgerFields[mapper.type].logic && maximumValue === lineItemCode ){
                let calculatedAmount = getPreviousYearValues(mapper.year,ledgerFields[mapper.type].codes,ulb,this)
                payload.value = calculatedAmount
                payload.ledgerUpdated = true
            }   
            let updateMapper = await Fiscalrankingmappers.findOneAndUpdate({
                "_id":ObjectId(mapper._id)
            },{
                "$set":payload
            })
            if(rejectFields){
                rejectMapperFields(calculatedFields,mapper.year,frObject._id,mapper.displayPriority)
            }
        }
    }
})


const ShouldReject =(formStatus,fieldStatus)=>{
    try{
        let rejectCases = [MASTER_STATUS['Returned by PMU']]
        if(rejectCases.includes(formStatus) && rejectCases.includes(fieldStatus)){
            return true
        }
        else{
            return false
        }
    }
    catch(err){
        console.log("error in ShouldReject:::",err.message)
    }
    return false
}

const getPreviousYearValues = async(mapperYear,codes,ulbId,obj)=>{
    try{
        let yearName = getKeyByValue(years, mapperYear);
        let year = parseInt(yearName);
        let previousYear = year - 1;
        let yearlyData = {}
        let previousYearString = `${previousYear}-${year.toString().slice(-2)}`;
        let previousYearId = years[previousYearString].toString();
        let calculatableYears = [previousYearString, yearName];
        let yearWiseData = {}
        for(let financialYear in calculatableYears){
            yearWiseData[financialYear] = []
            for(let code in codes){
                let ledgerData = await obj.model.findOne({
                    "ulb":ObjectId(ulbId),
                    "lineItem":code
                },{
                    amount:1,
                    _id:0
                }).lean()
                if(ledgerData.amount){
                    yearWiseData[financialYear].push(ledgerData.amount)
                }
            }
        }
        let containsZero = Object.values(yearWiseData).some(item => item.includes(0))
        if(containsZero) {return 0};
        let sum = Object.values(years).reduce((acc,[a,b])=>acc+(a+b),0)
        return sum

    }
    catch(err){
        console.log("error in getPreviousYearValue ::: ",err.message)
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
