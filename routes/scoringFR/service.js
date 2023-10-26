
const ObjectId = require('mongoose').Types.ObjectId;
const moongose = require('mongoose');
const Response = require('../../service').response;
const { years } = require('../../service/years');
const Ulb = require('../../models/Ulb');
const FiscalRanking = require('../../models/FiscalRanking');
const FiscalRankingMapper = require('../../models/FiscalRankingMapper');
const ScoringFiscalRanking = require('../../models/ScoringFiscalRanking');

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



//What if i need value from specific year and type for all 4 year is same??
function getValue(fsMapper, type) {
    const indicator = fsMapper.find(e => e.type === type);
    if (indicator.pmuSuggestedValue2) {
        return indicator.pmuSuggestedValue2;
    } else if (indicator.suggestedValue) {
        return indicator.suggestedValue;
    }
    return indicator.value;
}

// 1. Total Budget size per capita (Actual Total Reciepts) - RM
function totalBudget(ulbRes, fsData, fsMapper2021_22) {
    const totalRecActual_2021_22 = getValue(fsMapper2021_22, 'totalRecActual');
    const totalRcptWaterSupply = fsData.propertyWaterTax.value === 'Yes' ? getValue(fsMapper2021_22, 'totalRcptWaterSupply') : 0; //Function call??
    const totalRcptSanitation = fsData.propertySanitationTax.value === 'Yes' ? getValue(fsMapper2021_22, 'totalRcptSanitation') : 0; //Function call??
    const totalBudget = (totalRecActual_2021_22 - (totalRcptWaterSupply + totalRcptSanitation)) / ulbRes.population;
    return totalBudget;
}

// 2. Own Revenue per capita - RM
function ownRevenuePerCapita (ulbRes, fsData, fsMapper2021_22) {
    const totalOwnRevenue_2021_22 = getValue(fsMapper2021_22, 'totalOwnRevenue');
    const waterTax = getValue(fsMapper2021_22, 'waterTax');
    const waterSupplyFee = getValue(fsMapper2021_22, 'waterSupplyFee');
    const ownRevenueWaterSupply = fsData.propertyWaterTax.value === 'Yes' ? (waterTax + waterSupplyFee) : 0; //Function call??
    const sewerageTax = getValue(fsMapper2021_22, 'sewerageTax');
    const sanitationFee = getValue(fsMapper2021_22, 'sanitationFee');
    const ownRevenueSanitation = fsData.propertyWaterTax.value === 'Yes' ? (sewerageTax + sanitationFee) : 0; //Function call??
    const ownRevenueData = (totalOwnRevenue_2021_22 - (ownRevenueWaterSupply + ownRevenueSanitation)) / ulbRes.population;
    return ownRevenueData;
}

// 3. Property Tax per capita - RM
function pTaxPerCapita(ulbRes, fsMapper2021_22) {
    const totalPTax_2021_22 = getValue(fsMapper2021_22, 'propertyTax');
    const pTaxPerCapita = totalPTax_2021_22 / ulbRes.population; 
    return pTaxPerCapita;
}

// 4. Growth (3 Year CAGR) in Total Budget Size (Total actual reciept) - RM
function CAGRInTotalBudget(fsData, fsMapper2018_19, fsMapper2020_21) {
    // Formula =[(((B - SUM( IF(H=YES,D,0), IF(I=YES, F,0)))/(A - SUM( IF(H=YES,C,0), IF(I=YES, E,0))))^(1/3)) - 1] X 100%
    const totalRecActual_2018_19 = getValue(fsMapper2018_19, 'totalRecActual');
    const totalRecActual_2020_21 = getValue(fsMapper2020_21, 'totalRecActual');
    const totalRcptWaterSupply_2018_19 = getValue(fsMapper2018_19, 'totalRcptWaterSupply');
    const totalRcptWaterSupply_2020_21 = getValue(fsMapper2020_21, 'totalRcptWaterSupply');
    const totalRcptSanitation_2018_19 = getValue(fsMapper2018_19, 'totalRcptSanitation');
    const totalRcptSanitation_2020_21 = getValue(fsMapper2020_21, 'totalRcptSanitation');;
    const propertyWaterTax = getValue(fsData, 'propertyWaterTax');
    const propertySanitationTax = getValue(fsData, 'propertySanitationTax');

    const NumeratorWaterTax = propertyWaterTax === 'Yes' ? totalRcptWaterSupply_2020_21 : 0;
    const NumeratorSanitationTax = propertySanitationTax === 'Yes' ?  totalRcptSanitation_2020_21 : 0;
    const DenominatorWaterTax = propertyWaterTax === 'Yes' ? totalRcptWaterSupply_2018_19 : 0;
    const DenominatorSanitationTax = propertySanitationTax === 'Yes' ?  totalRcptSanitation_2018_19 : 0;

    const time = 3; 
    const A = (totalRecActual_2020_21 - (NumeratorWaterTax + NumeratorSanitationTax)) / (totalRecActual_2018_19 - (DenominatorWaterTax + DenominatorSanitationTax)); 
    const CAGRInTotalBudget = (Math.pow(A, (1/time)) - 1) * 100; 

    return CAGRInTotalBudget;
}
 
// 5. Growth (3 Year CAGR) in Own Revenue per capita - RM
function CAGRInOwnRevenue (fsData, fsMapper2018_19, fsMapper2021_22) {
    const totalOwnRevenue_2018_19 = getValue(fsMapper2018_19, 'totalOwnRevenue');
    const totalOwnRevenue_2021_22 = getValue(fsMapper2021_22, 'totalOwnRevenue');
    
    // Own revenue water supply 18-19.  
    const waterTax_2018_19 = getValue(fsMapper2018_19, 'waterTax');
    const waterSupplyFee_2018_19 = getValue(fsMapper2018_19, 'waterSupplyFee');
    const ownRevenueWaterSupply_2018_19 = waterTax_2018_19 + waterSupplyFee_2018_19;
    // Own revenue water supply 21-22.
    const waterTax_2021_22 = getValue(fsMapper2021_22, 'waterTax');
    const waterSupplyFee_2021_22 = getValue(fsMapper2021_22, 'waterSupplyFee');
    const ownRevenueWaterSupply_2021_22 = waterTax_2021_22 + waterSupplyFee_2021_22;
    
    // Own revenue sanitation - 18-19
    const sewerageTax_2018_19 = getValue(fsMapper2018_19, 'sewerageTax');
    const sanitationFee_2018_19 = getValue(fsMapper2018_19, 'sanitationFee');
    const ownRevenueSewerageSanitation_2018_19 = sewerageTax_2018_19 + sanitationFee_2018_19;
    // Own revenue sanitation - 20-21
    const sewerageTax_2021_22 = getValue(fsMapper2021_22, 'sewerageTax');
    const sanitationFee_2021_22 = getValue(fsMapper2021_22, 'sanitationFee');
    const ownRevenueSewerageSanitation_2021_22 = sewerageTax_2021_22 + sanitationFee_2021_22;

    const propertyWaterTax = getValue(fsData, 'propertyWaterTax');
    const propertySanitationTax = getValue(fsData, 'propertySanitationTax');
    const NumeratorWaterTax = propertyWaterTax === 'Yes' ? ownRevenueWaterSupply_2021_22 : 0;
    const NumeratorSanitationTax = propertySanitationTax === 'Yes' ?  ownRevenueSewerageSanitation_2021_22 : 0;
    const DenominatorWaterTax = propertyWaterTax === 'Yes' ? ownRevenueWaterSupply_2018_19 : 0;
    const DenominatorSanitationTax = propertySanitationTax === 'Yes' ?  ownRevenueSewerageSanitation_2018_19 : 0;

    const time = 3;

    const A = (totalOwnRevenue_2021_22 - (NumeratorWaterTax + NumeratorSanitationTax)) / (totalOwnRevenue_2018_19 - (DenominatorWaterTax + DenominatorSanitationTax));
    const CAGRInOwnRevenue = (Math.pow(A, (1/time)) - 1) * 100; 

    return CAGRInOwnRevenue;
}

function getPopulationBucket(population) {
    let populationBucket = 0;
    if (population >= 4000000) {
        populationBucket = 1;
    } else if (population < 4000000 && population >= 1000000) {
        populationBucket = 2;
    } if (population < 1000000 && population >= 100000) {
        populationBucket = 3;
    } if (population < 100000) {
        populationBucket = 4;
    }
    return populationBucket;
}

async function getData(res) {
    moongose.set('debug', true);
    const censusCode = 802814;
    const ulbRes = await Ulb.findOne({ censusCode }).lean();
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
        type: { $in: ['totalRecActual', 'totalRcptWaterSupply', 'totalRcptSanitation',
        'waterTax', 'waterSupplyFee', 'sewerageTax', 'sanitationFee'] }
    }).exec();

    const fsMapper2020_21 = await FiscalRankingMapper.find({
        ulb: ObjectId(ulbRes._id),
        year: ObjectId(design_year2020_21),
        type: { $in: ['totalRecActual', 'totalRcptWaterSupply', 'totalRcptSanitation'] }
    }).exec();

    const fsMapper2021_22 = await FiscalRankingMapper.find({
        ulb: ObjectId(ulbRes._id),
        year: ObjectId(design_year2021_22),
        type: {
            $in: ['totalRecActual', 'totalRcptWaterSupply', 'totalRcptSanitation', 
            'totalOwnRevenue', 'waterTax', 'waterSupplyFee', 'sewerageTax', 'sanitationFee', 
            'propertyTax']
        }
    }).exec();

    // 1. Total Budget size per capita (Actual Total Reciepts) - RM
    const totalBudgetData = totalBudget(ulbRes, fsData, fsMapper2021_22);

    // 2. Own Revenue per capita - RM
    const ownRevenuePC = ownRevenuePerCapita(ulbRes, fsData, fsMapper2021_22);

    // 3. Property Tax per capita - RM
    const pTaxPC = pTaxPerCapita(ulbRes, fsMapper2021_22);

    // 4. Growth (3 Year CAGR) in Total Budget Size (Total actual reciept) - RM
    const CAGRInTotalBud = CAGRInTotalBudget(fsData, fsMapper2018_19, fsMapper2020_21);

    // 5. Growth (3 Year CAGR) in Own Revenue per capita - RM
    const CAGRInOwnRev = CAGRInOwnRevenue(fsData, fsMapper2018_19, fsMapper2021_22);

    // await ScoringFiscalRanking.findOneAndUpdate({
    //     ulb: ObjectId(req.body.ulbId),
    //     design_year: ObjectId(req.body.design_year),
    //   },
    //   {
    //     $set: {
    //       isDraft: true,
    //       currentFormStatus: 2
    //     },
    //   });
    

    const scoringData = {
        name: ulbRes.name,
        ulb: ulbRes._id,
        censusCode: ulbRes.censusCode,
        isActive: ulbRes.isActive,
        population: ulbRes.population,
        populationBucket: getPopulationBucket(ulbRes.population),
        state: ulbRes.state,
        totalBudget: { score: totalBudgetData },
        ownRevenue: { score: ownRevenueData },
    };

    await ScoringFiscalRanking.create(scoringData);
    
    return res.status(200).json({
        status: 'true',
        totalBudgetData,
        ownRevenuePC,
        pTaxPC,
        CAGRInTotalBud,
        CAGRInOwnRev
        // ulbRes,
        // fsData,
        // fsMapper2021_22
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
            message: error
        })
    }
}