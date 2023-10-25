
const ObjectId = require('mongoose').Types.ObjectId;
const moongose = require('mongoose');
const Response = require('../../service').response;
const { years } = require('../../service/years');
const Ulb = require('../../models/Ulb');
const FiscalRanking = require('../../models/FiscalRanking');
const FiscalRankingMapper = require('../../models/FiscalRankingMapper');

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

function getValue(fsMapper, type) {
    const indicator = fsMapper.find(e => e.type === type);
    if (indicator.pmuSuggestedValue2) {
        return indicator.pmuSuggestedValue2;
    } else if (indicator.suggestedValue) {
        return indicator.suggestedValue;
    }
    return indicator.value;
}

// Total Budget size per capita (Actual Total Reciepts)
function totalBudget(ulbRes, fsData, fsMapper2021_22) {
    const totalRecActual = getValue(fsMapper2021_22, 'totalRecActual');
    const totalRcptWaterSupply = fsData.propertyWaterTax.value === 'Yes' ? getValue(fsMapper2021_22, 'totalRcptWaterSupply') : 0;
    const totalRcptSanitation = fsData.propertySanitationTax.value === 'Yes' ? getValue(fsMapper2021_22, 'totalRcptSanitation') : 0;
    const totalBudget = (totalRecActual - (totalRcptWaterSupply + totalRcptSanitation)) / ulbRes.population;
}

async function getData(res) {
    moongose.set('debug', true);
    const censusCode = 802814;
    const ulbRes = await Ulb.findOne({ censusCode }).exec();
    // ulbRes.forEach(element => {
    //     console.log('population', element.population);
    // });
    // return res.status(200).json({
    //     status: 'true',
    //     data: ulbRes
    // });
    // const ulb = '5eb5844f76a3b61f40ba0694';
    const design_year2018_19 = '63735a5bd44534713673c1ca';
    const design_year2019_20 = '607697074dff55e6c0be33ba';
    const design_year2020_21 = '606aadac4dff55e6c075c507';
    const design_year2021_22 = '606aaf854dff55e6c075d219';
    const design_year2022_23 = '606aafb14dff55e6c075d3ae';
    const condition = {
        ulb: ObjectId(ulbRes._id),
        // ulb: ObjectId(ulb),
        design_year: ObjectId(design_year2022_23)
    };
    let fsData = await FiscalRanking.findOne(condition).lean();

    const fsMapper2018_19 = await FiscalRankingMapper.find({
        ulb: ObjectId(ulbRes._id),
        year: ObjectId(design_year2018_19),
        type: { $in: ['totalRecActual'] }
    }).exec();

    const fsMapper2021_22 = await FiscalRankingMapper.find({
        ulb: ObjectId(ulbRes._id),
        year: ObjectId(design_year2021_22),
        type: { $in: ['totalRcptSanitation', 'totalRcptWaterSupply', 'totalRecActual', 'waterSupplyFee', 'waterTax'] }
    }).exec();

    // Total Budget size per capita (Actual Total Reciepts)
    const totalBudgetData = totalBudget(ulbRes, fsData, fsMapper2021_22);

    // Own Revenue per capita
    const totalOwnRevenue = getValue(fsMapper2021_22, 'totalOwnRevenue');
    const waterTax = getValue(fsMapper2021_22, 'waterTax');
    const waterSupplyFee = getValue(fsMapper2021_22, 'waterSupplyFee');
    const ownRevenueWaterSupply = fsData.propertyWaterTax.value === 'Yes' ? (waterTax + waterSupplyFee) : 0;
    const sewerageTax = getValue(fsMapper2021_22, 'sewerageTax');
    const sanitationFee = getValue(fsMapper2021_22, 'sanitationFee');
    const ownRevenueSanitation = fsData.propertyWaterTax.value === 'Yes' ? (sewerageTax + sanitationFee) : 0;
    const ownRevenueData = (totalOwnRevenue - (ownRevenueWaterSupply + ownRevenueSanitation)) / ulbRes.population;

    return res.status(200).json({
        status: 'true',
        totalBudgetData,
        ownRevenueData,
        ulbRes,
        fsData,
        fsMapper2021_22
    });


    // return { ulbRes, fsData, fsMapper }
}
module.exports.calculateFRScore = async (req, res) => {

    try {
        const data = req.body;

        await getData(res);


    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }
}