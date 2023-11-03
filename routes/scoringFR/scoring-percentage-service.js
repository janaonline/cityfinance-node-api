
const ObjectId = require('mongoose').Types.ObjectId;
const moongose = require('mongoose');
const Response = require('../../service').response;
const { years } = require('../../service/years');
const Ulb = require('../../models/Ulb');
const FiscalRanking = require('../../models/FiscalRanking');
const FiscalRankingMapper = require('../../models/FiscalRankingMapper');
const ScoringFiscalRanking = require('../../models/ScoringFiscalRanking');
const { registerCustomQueryHandler } = require('puppeteer');
/** 
 * Pending actions
 * 1. Reduce mark based on provisional account
 * 2. 
 * 
*/
function calculateRecommendationPercentage(score) {
    let percent = 0;
    score = Math.round(score);
    // console.log( '-->Rounded score',score);
    if (score >= 0 && score <= 29) {
        percent = 0
    } else if (score >= 30 && score <= 45) {
        percent = 60;
    } else if (score >= 46 && score <= 60) {
        percent = 75;
    } else if (score >= 60 && score <= 80) {
        percent = 90;
    } else if (score >= 80 && score <= 100) {
        percent = 100;
    }
    return percent;
}

// Function to calculate average. 
function calculateAverage(numbers) {
    if (numbers.length === 0) { return 0; }  // Handle division by zero if the array is empty
    var sum = 0;
    for (var i = 0; i < numbers.length; i++) { sum += numbers[i]; }

    return Number(sum / numbers.length);
}

async function updatePercentage(ulbArr, indicator) {
    const sortByTotalBudgetArr = ulbArr.sort((a, b) => b[indicator].score - a[indicator].score);

    ulbArr.forEach(async (ulb) => {
        const percentage = (ulb[indicator].score / sortByTotalBudgetArr[0][indicator].score) * 100;
        console.log('ulb[indicator].score', ulb[indicator].score);
        console.log('sortByTotalBudgetArr[0][indicator].score', sortByTotalBudgetArr[0][indicator].score);
        console.log('percentage', percentage);
        await ScoringFiscalRanking.findByIdAndUpdate(ulb._id,
            {
                $set: {
                    [`${indicator}.percentage`]: percentage
                },
            });
    });
}
async function updateMinusLowestPercentage(ulbArr, indicator) {

    const sortByTotalBudgetArr = ulbArr.sort((a, b) => b[indicator].score - a[indicator].score);
    const len = sortByTotalBudgetArr.length;
    ulbArr.forEach(async (ulb) => {
        const percentage = ((ulb[indicator].score - sortByTotalBudgetArr[len - 1][indicator].score) /
            (sortByTotalBudgetArr[0][indicator].score - sortByTotalBudgetArr[len - 1][indicator].score)) / 100;
        await ScoringFiscalRanking.findOneAndUpdate({
            _id: ObjectId(ulb._id)
        },
            {
                $set: {
                    [`${indicator}.percentage`]: percentage
                },
            });
    });
}
async function calculateFRPercentage(populationBucket) {
    // const condition = { populationBucket };
    const condition = {};
    const ulbArr = await ScoringFiscalRanking.find(condition).lean();
    await updatePercentage(ulbArr, 'totalBudgetDataPC_1');
    // await updatePercentage(ulbArr, 'ownRevenuePC_2');
    // await updateMinusLowestPercentage(ulbArr, 'cagrInTotalBud_4');
    // return ulbArr;
    // const sortByTotalBudgetArr = ulbArr.sort((a, b) => b.totalBudgetDataPC_1.score - a.totalBudgetDataPC_1.score);

    // return sortByTotalBudgetArr;
    // ulbRes.forEach(async (ulb) => {
    //     console.log('ulb', ulb._id);
    //     await calculateFRPercentage(ulb);
    // });
}
module.exports.calculateFRPercentage = async (req, res) => {

    try {
        const censusCode = 802814;
        const condition = { isActive: true }
        // for (let i = 1; i <= 4; i++) {
        //     await calculateFRPercentage(i);
        // }
        const data = await calculateFRPercentage(1);
        return res.status(200).json({ message: 'Done' });
    } catch (error) {
        console.log('error', error);
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }
}
// func15 indicator-'paid_property_tax' & func9 indicator-'omExp' have error.