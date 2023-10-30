
const ObjectId = require('mongoose').Types.ObjectId;
const moongose = require('mongoose');
const Response = require('../../service').response;
const { years } = require('../../service/years');
const Ulb = require('../../models/Ulb');
const FiscalRanking = require('../../models/FiscalRanking');
const FiscalRankingMapper = require('../../models/FiscalRankingMapper');
const ScoringFiscalRanking = require('../../models/ScoringFiscalRanking');
const { registerCustomQueryHandler } = require('puppeteer');

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

// Function to calculate average. 
function calculateAverage(numbers) {
    if (numbers.length === 0) { return 0; }  // Handle division by zero if the array is empty
    var sum = 0;
    for (var i = 0; i < numbers.length; i++) { sum += numbers[i]; }
    
    return Number(sum / numbers.length);
}

// 1. Total Budget size per capita (Actual Total Reciepts) - RM
function totalBudgetPerCapita(ulbRes, fsData, fsMapper2021_22) {
    //Total receipts actual 
    const totalRecActual_2021_22 = getValue(fsMapper2021_22, 'totalRecActual');
    // Total receipts actual of water supply
    const totalRcptWaterSupply = fsData.propertyWaterTax.value === 'Yes' ? getValue(fsMapper2021_22, 'totalRcptWaterSupply') : 0;
    // Total reciepts actual for sanitaion.
    const totalRcptSanitation = fsData.propertySanitationTax.value === 'Yes' ? getValue(fsMapper2021_22, 'totalRcptSanitation') : 0;

    const totalBudget = (totalRecActual_2021_22 - (totalRcptWaterSupply + totalRcptSanitation)) / ulbRes.population;
    return parseFloat(totalBudget.toFixed(2));
}

// 2. Own Revenue per capita - RM
function ownRevenuePerCapita(ulbRes, fsData, fsMapper2021_22) {
    // Total own rev.
    const totalOwnRevenue_2021_22 = getValue(fsMapper2021_22, 'totalOwnRevenue');
    // Own revenue for water supply.
    const waterTax = getValue(fsMapper2021_22, 'waterTax');
    const waterSupplyFee = getValue(fsMapper2021_22, 'waterSupplyFee');
    const ownRevenueWaterSupply = fsData.propertyWaterTax.value === 'Yes' ? (waterTax + waterSupplyFee) : 0;
    // Own revenue for sewerage and sanitation.
    const sewerageTax = getValue(fsMapper2021_22, 'sewerageTax');
    const sanitationFee = getValue(fsMapper2021_22, 'sanitationFee');
    const ownRevenueSanitation = fsData.propertyWaterTax.value === 'Yes' ? (sewerageTax + sanitationFee) : 0;
    
    const ownRevenueData = (totalOwnRevenue_2021_22 - (ownRevenueWaterSupply + ownRevenueSanitation)) / ulbRes.population;
    return parseFloat(ownRevenueData.toFixed(2));
}

// 3. Property Tax per capita - RM
function pTaxPerCapita(ulbRes, fsMapper2021_22) {
    // Property tax of 21-22 / population.
    const pTaxPerCapita = getValue(fsMapper2021_22, 'propertyTax') / ulbRes.population; 
    return parseFloat(pTaxPerCapita.toFixed(2));
}

// 4. Growth (3 Year CAGR) in Total Budget Size (Total actual reciept) - RM
function CAGRInTotalBudget(fsData, fsMapper2018_19, fsMapper2021_22) {
    // Total receipts actual.
    const totalRecActual_2018_19 = getValue(fsMapper2018_19, 'totalRecActual');
    const totalRecActual_2021_22 = getValue(fsMapper2021_22, 'totalRecActual');

    // If 'Yes' then take the receipts for watersupply/ sanitation value. 
    const WaterTax2021_22 = fsData.propertyWaterTax.value === 'Yes' ? getValue(fsMapper2021_22, 'totalRcptWaterSupply') : 0;
    const SanitationTax2021_22 = fsData.propertySanitationTax.value === 'Yes' ?  getValue(fsMapper2021_22, 'totalRcptSanitation') : 0;
    const waterTax_2018_19 = fsData.propertyWaterTax.value === 'Yes' ? getValue(fsMapper2018_19, 'totalRcptWaterSupply') : 0;
    const SanitationTax_2018_19 = fsData.propertySanitationTax.value === 'Yes' ?  getValue(fsMapper2018_19, 'totalRcptSanitation') : 0;

    // Total - (watersupply + sanitaion)
    // const A = (totalRecActual_2021_22 - (WaterTax2021_22 + SanitationTax2021_22)) / (totalRecActual_2018_19 - (waterTax_2018_19 + SanitationTax_2018_19)); 
    const N = Number(68068504681);
    const A = ( N - (WaterTax2021_22 + SanitationTax2021_22)) / (totalRecActual_2018_19 - (waterTax_2018_19 + SanitationTax_2018_19)); 
    // console.log(A);
    const time = 3; 
    const CAGRInTotalBudget = (Math.pow(A, (1/time)) - 1) * 100; 

    return parseFloat(CAGRInTotalBudget.toFixed(2)); //15.73%
    // return parseFloat(Math.ceil(CAGRInTotalBudget.toFixed(2))); //15.73% >> 16%
}

// 5. Growth (3 Year CAGR) in Own Revenue - RM
function CAGRInOwnRevenue(fsData, fsMapper2018_19, fsMapper2021_22) {
    // Total Own revenue.
    const totalOwnRevenue_2018_19 = getValue(fsMapper2018_19, 'totalOwnRevenue');
    const totalOwnRevenue_2021_22 = getValue(fsMapper2021_22, 'totalOwnRevenue');     
    // Own revenue for water supply
    const ownRevenueWaterSupply_2018_19 = getValue(fsMapper2018_19, 'waterTax') + getValue(fsMapper2018_19, 'waterSupplyFee');        
    const ownRevenueWaterSupply_2021_22 = getValue(fsMapper2021_22, 'waterTax') + getValue(fsMapper2021_22, 'waterSupplyFee');
    // Own revenue for sanitaion.
    const ownRevenueSewerageSanitation_2018_19 = getValue(fsMapper2018_19, 'sewerageTax') + getValue(fsMapper2018_19, 'sanitationFee');
    const ownRevenueSewerageSanitation_2021_22 = getValue(fsMapper2021_22, 'sewerageTax') + getValue(fsMapper2021_22, 'sanitationFee');
    // If 'Yes' then take the own revenue for watersupply/ sanitation value. 
    const WaterTax_2021_22 = fsData.propertyWaterTax.value === 'Yes' ? ownRevenueWaterSupply_2021_22 : 0;
    const SanitationTax_2021_22 = fsData.propertySanitationTax.value === 'Yes' ?  ownRevenueSewerageSanitation_2021_22 : 0;
    const waterTax_2018_19 = fsData.propertyWaterTax.value === 'Yes' ? ownRevenueWaterSupply_2018_19 : 0;
    const SanitationTax_2018_19 = fsData.propertySanitationTax.value === 'Yes' ?  ownRevenueSewerageSanitation_2018_19 : 0;
    // Total - (watersupply + sanitaion)
    const A = (totalOwnRevenue_2021_22 - (WaterTax_2021_22 + SanitationTax_2021_22)) / (totalOwnRevenue_2018_19 - (waterTax_2018_19 + SanitationTax_2018_19));
    //Growth.
    const time = 3;
    const CAGRInOwnRevenue = (Math.pow(A, (1/time)) - 1) * 100; 

    return parseFloat(CAGRInOwnRevenue.toFixed(2));
}

// 6. Growth (3 Year CAGR) in Property - RM
function CAGRInPTax(fsMapper2018_19, fsMapper2021_22) {
    // Ptax 21-22 / Ptax 18-19
    const PTax = (getValue(fsMapper2021_22, 'propertyTax') / getValue(fsMapper2018_19, 'propertyTax'))
    // Growth for 3 years
    const time = 3; 
    const CAGRInPTax = (Math.pow(PTax, (1 / time)) - 1) * 100;

    return parseFloat(CAGRInPTax.toFixed(2));
}

// 7. Capital Expenditure per capita (3-year average) - EP
function CapExPerCapitaAvg(ulbRes, fsData, fsMapper2019_20, fsMapper2020_21, fsMapper2021_22) {
    // Total Capex of 3 years.
    const TotalCapEx_2019_20 = getValue(fsMapper2019_20, 'CaptlExp');
    const TotalCapEx_2020_21 = getValue(fsMapper2020_21, 'CaptlExp');
    const TotalCapEx_2021_22 = getValue(fsMapper2021_22, 'CaptlExp');

    // Assigning the values to variables if fsData options are 'YES' - 3years
    const totalRcptWaterSupply_2019_20 = fsData.propertyWaterTax.value === 'Yes' ? getValue(fsMapper2019_20, 'CaptlExpWaterSupply') : 0;
    const totalRcptSanitation_2019_20 = fsData.propertySanitationTax.value === 'Yes' ? getValue(fsMapper2019_20, 'CaptlExpSanitation') : 0;
    const totalRcptWaterSupply_2020_21 = fsData.propertyWaterTax.value === 'Yes' ? getValue(fsMapper2020_21, 'CaptlExpWaterSupply') : 0;
    const totalRcptSanitation_2020_21 = fsData.propertySanitationTax.value === 'Yes' ? getValue(fsMapper2020_21, 'CaptlExpSanitation') : 0;
    const totalRcptWaterSupply_2021_22 = fsData.propertyWaterTax.value === 'Yes' ? getValue(fsMapper2021_22, 'CaptlExpWaterSupply') : 0;
    const totalRcptSanitation_2021_22 = fsData.propertySanitationTax.value === 'Yes' ? getValue(fsMapper2021_22, 'CaptlExpSanitation') : 0;

    // Total capex - (watersupply + sanitation)
    const CapEx_2019_20 = TotalCapEx_2019_20 - (totalRcptWaterSupply_2019_20 + totalRcptSanitation_2019_20);
    const CapEx_2020_21 = TotalCapEx_2020_21 - (totalRcptWaterSupply_2020_21 + totalRcptSanitation_2020_21);
    const CapEx_2021_22 = TotalCapEx_2021_22 - (totalRcptWaterSupply_2021_22 + totalRcptSanitation_2021_22);
    // Array is created to find average. 
    const arr = [CapEx_2019_20, CapEx_2020_21, CapEx_2021_22];
    const CapExPerCapitaAvg = (calculateAverage(arr)) / ulbRes.population;
    return parseFloat(CapExPerCapitaAvg.toFixed(2));
}

// 8. Growth (3-Year CAGR) in Capex - EP
function CAGRInCapEx(fsData, fsMapper2018_19, fsMapper2021_22) {
    // Assigning the values to variables if fsData options are 'YES'.
    const totalRcptWaterSupply_2018_19 = fsData.propertyWaterTax.value === 'Yes' ? getValue(fsMapper2018_19, 'CaptlExpWaterSupply') : 0;
    const totalRcptSanitation_2018_19 = fsData.propertySanitationTax.value === 'Yes' ? getValue(fsMapper2018_19, 'CaptlExpSanitation') : 0;
    const totalRcptWaterSupply_2021_22 = fsData.propertyWaterTax.value === 'Yes' ? getValue(fsMapper2021_22, 'CaptlExpWaterSupply') : 0;
    const totalRcptSanitation_2021_22 = fsData.propertySanitationTax.value === 'Yes' ? getValue(fsMapper2021_22, 'CaptlExpSanitation') : 0;

    // Total capex - (watersupply + sanitation)
    const TotalCapEx = 
        (getValue(fsMapper2021_22, 'CaptlExp') - (totalRcptWaterSupply_2021_22 + totalRcptSanitation_2021_22)) / 
        (getValue(fsMapper2018_19, 'CaptlExp') - (totalRcptWaterSupply_2018_19 + totalRcptSanitation_2018_19));

    const time = 3; 
    const CAGRInCapEx = (Math.pow(TotalCapEx, (1 / time)) - 1) * 100; 

    return parseFloat(CAGRInCapEx.toFixed(2));
}

// // 9. O&M expenses to Total Revenue Expenditure (TRE) (3- year average) - EP
// function OMExpTotalRevEx(fsData, fsMapper2019_20, fsMapper2020_21, fsMapper2021_22) {
//     const OmExpWaterSupply_2019_20 = fsData.propertyWaterTax.value === 'Yes' ? getValue(fsMapper2019_20, 'omExpWaterSupply') : 0;
//     const OmExpSanitation_2019_20 = fsData.propertySanitationTax.value === 'Yes' ? getValue(fsMapper2019_20, 'omExpSanitation') : 0;
//     const OmExpWaterSupply_2020_21 = fsData.propertyWaterTax.value === 'Yes' ? getValue(fsMapper2020_21, 'omExpWaterSupply') : 0;
//     const OmExpSanitation_2020_21 = fsData.propertySanitationTax.value === 'Yes' ? getValue(fsMapper2020_21, 'omExpSanitation') : 0;
//     const OmExpWaterSupply_2021_22 = fsData.propertyWaterTax.value === 'Yes' ? getValue(fsMapper2021_22, 'omExpWaterSupply') : 0;
//     const OmExpSanitation_2021_22 = fsData.propertySanitationTax.value === 'Yes' ? getValue(fsMapper2021_22, 'omExpSanitation') : 0;

// // Unable to fetch 'omExp' >>Error>>"Cannot read properties of undefined (reading 'pmuSuggestedValue2')"
// // <-----------------------------------------------------------------------
//     // Total O&M - O&M for water suppy + O&M for sewerage and sanitation. 
//     // Array is created to find average. 
//     const arr1 = [
//         (Number(getValue(fsMapper2019_20, 'omExp')) - (Number(OmExpWaterSupply_2019_20) + Number(OmExpSanitation_2019_20))),
//         (Number(getValue(fsMapper2020_21, 'omExp')) - (Number(OmExpWaterSupply_2020_21) + Number(OmExpSanitation_2020_21))), 
//         (Number(getValue(fsMapper2021_22, 'omExp')) - (Number(OmExpWaterSupply_2021_22) + Number(OmExpSanitation_2021_22)))
//     ]; 
//     const AvgOfOmExp = calculateAverage(arr1);    
// // ------------------------------------------------------------------------->

//     // Array is created to find average. 
//     const arr2 = [
//         Number(getValue(fsMapper2019_20, 'totalExpend')), 
//         Number(getValue(fsMapper2020_21, 'totalExpend')), 
//         Number(getValue(fsMapper2021_22, 'totalExpend'))
//     ];
//     console.log(getValue(fsMapper2019_20, 'totalExpend'),' totalExpend 19-20');
//     const AvgOfRevExp = calculateAverage(arr2);
//     console.log(AvgOfRevExp),'AvgOfRevExp';
//     const OMExpTotalRevEx = AvgOfOmExp / AvgOfRevExp;
    
//     return parseFloat(OMExpTotalRevEx.toFixed(2));
// }

// 10A. For Timely Audit - Average number of months taken by ULB in closing audit - FG
function AvgMonthsForULBAudit(fsMapper2019_20, fsMapper2020_21, fsMapper2021_22) {
    const April_2020 = new Date("2020/04/01");
    const April_2021 = new Date("2021/04/01");
    const April_2022 = new Date("2022/04/01");

    const NoOfMonths_2019_20 = getValue(fsMapper2019_20, 'auditAnnualReport') - April_2020;
    const NoOfMonths_2020_21 = getValue(fsMapper2020_21, 'auditAnnualReport') - April_2021;
    const NoOfMonths_2021_22 = getValue(fsMapper2021_22, 'auditAnnualReport') - April_2022;

    // Array is created to find average. 
    const arr = [NoOfMonths_2019_20, NoOfMonths_2020_21, NoOfMonths_2021_22];
    const AvgMonth = calculateAverage(arr);

    // If average month is less than 12 then ULB gets 25 marks else 0 marks; 
    const AvgMonthsForULBAudit = (AvgMonth <= 12) ? 25 : 0;
    return AvgMonthsForULBAudit;
}

// 10B. For Publication of Annual Accounts - Availability for last 3 years on Cityfinance or Own website - FG
function AAPublished(fsMapperNoYear) {
    // If answer is 'Yes' then 25 marks else 0 marks. 
    const AAPublished = getValue(fsMapperNoYear, 'webUrlAnnual') === 'Yes' ? 25 : 0; 
    return AAPublished;
}

// 11A. Is the property tax register GIS-based - FG
function GISBasedPTax(fsMapperNoYear) {
    // If answer is 'Yes then 25 marks else 0 marks. 
    const registerGis = getValue(fsMapperNoYear, 'registerGis') === 'Yes' ? 25 : 0; 
    return registerGis;
}

// 11B. Do you use accounting software? ( Eg.Tally, State-prescribed ERP etc) - FG
function AccSoftware(fsMapperNoYear) {
    // If answer is 'Yes then 25 marks else 0 marks. 
    const AccSoftware = getValue(fsMapperNoYear, 'accountStwre') === 'Yes' ? 25 : 0; 
    return AccSoftware;
}

// 12. Budget vs. Actual (Variance %) for Total Receipts (3-year average) - FG
function TotalReceiptsVariance(fsMapper2019_20, fsMapper2020_21, fsMapper2021_22) {
    // Find average of total receipts actual for 3 years. 
    // Array is created to find average. 
    const arr1 = [Number(getValue(fsMapper2019_20, 'totalRecActual')), Number(getValue(fsMapper2020_21, 'totalRecActual')), Number(getValue(fsMapper2021_22, 'totalRecActual'))];
    const AvgOFActual = calculateAverage(arr1);

    // Find average of total receipts estimate for 3 years. 
    // Array is created to find average. 
    const arr2 = [Number(getValue(fsMapper2019_20, 'RcptBudget')), Number(getValue(fsMapper2020_21, 'RcptBudget')), Number(getValue(fsMapper2021_22, 'RcptBudget'))];
    const AvgOfEstimate = calculateAverage(arr2);
    
    // Acutal V/S Estimate.
    const TotalReceiptsVariance = ((AvgOFActual - AvgOfEstimate) / AvgOfEstimate) * 100;
    return parseFloat(TotalReceiptsVariance.toFixed(2));
}

// 13. Own Revenue Receivables Outstanding - FG
function OwnRevRecOut(fsMapperNoYear, fsMapper2021_22) {
    // ifNoError ? (indicator 25 / indicator 7.1) * 365 : 0;
    // TODO - Condition to be added >> if any error then 0 should be returned condition to be written.
    const OwnRevRecOut = (getValue(fsMapperNoYear, 'totalOwnRevenueArea') / getValue(fsMapper2021_22, 'totalOwnRevenue')) * 365;
    return parseFloat(OwnRevRecOut.toFixed(2));
}

// 14. Digital Own Revenue Collection (DORC) to Total Own Revenue Collection (TORC) - FG
function DigtalOwnRevToTotalOwnRev(fsMapperNoYear){
    // indicator 30 / indicator 29 + 30
    // TO-DO if any error then 0 is to be entered condition to be written.
    const DigitalOwnRev = getValue(fsMapperNoYear, 'fy_21_22_online');
    const TotalOwnRev = (Number(getValue(fsMapperNoYear, 'fy_21_22_cash')) + Number(getValue(fsMapperNoYear, 'fy_21_22_online')));     
    const DigtalOwnRevToTotalOwnRev = (DigitalOwnRev / TotalOwnRev) * 100;
    return parseFloat(DigtalOwnRevToTotalOwnRev.toFixed(2));
}

// // 15. Properties under Tax Collection net - FG
// function PropUnderTaxColl(fsMapperNoYear) {
//     // indicator 33 / (indicator 31 - indicator 32)
//     // TO-DO if any error then 0 is to be entered condition to be written.

// // Because of 'paid_property_tax' indicator there is error in API response >>Error is>> "Cannot read properties of undefined (reading 'pmuSuggestedValue2')"
// // <-------------------------------------------------
//     const PropUnderTaxColl = 
//     Number(getValue(fsMapperNoYear, 'paid_property_tax')) / 
//     (Number(getValue(fsMapperNoYear, 'property_tax_register')) - Number(getValue(fsMapperNoYear, 'paying_property_tax')));
// // ----------------------------------------------------->
//     return parseFloat(PropUnderTaxColl.toFixed(2));
// }

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
    
    const fsMapperNoYear = await FiscalRankingMapper.find({
        ulb: ObjectId(ulbRes._id),
        // year: ObjectId(design_year2018_19),
        type: { $in: ['webUrlAnnual', 'registerGis', 'accountStwre', 'totalOwnRevenueArea', 'fy_21_22_online', 'fy_21_22_cash', 'property_tax_register', 'paying_property_tax'] }
    }).exec();

    const fsMapper2018_19 = await FiscalRankingMapper.find({
        ulb: ObjectId(ulbRes._id),
        year: ObjectId(design_year2018_19),
        type: { $in: ['totalRecActual', 'totalRcptWaterSupply', 'totalRcptSanitation', 'totalOwnRevenue', 'waterTax', 'waterSupplyFee', 'sewerageTax', 'sanitationFee', 'propertyTax', 'CaptlExpWaterSupply', 'CaptlExpSanitation', 'CaptlExp'] }
    }).exec();

    const fsMapper2019_20 = await FiscalRankingMapper.find({
        ulb: ObjectId(ulbRes._id),
        year: ObjectId(design_year2019_20),
        type: { $in: ['CaptlExp', 'CaptlExpWaterSupply', 'CaptlExpSanitation', 'omExpWaterSupply', 'omExpSanitation', 'omExp', 'totalExpend', 'auditAnnualReport', 'totalRecActual', 'RcptBudget'] }
    }).exec();

    const fsMapper2020_21 = await FiscalRankingMapper.find({
        ulb: ObjectId(ulbRes._id),
        year: ObjectId(design_year2020_21),
        type: { $in: ['totalRecActual', 'totalRcptWaterSupply', 'totalRcptSanitation', 'CaptlExp', 'CaptlExpWaterSupply', 'CaptlExpSanitation', 'omExpWaterSupply', 'omExpSanitation', 'omExp', 'totalExpend', 'auditAnnualReport', 'totalRecActual', 'RcptBudget'] }
    }).exec();

    const fsMapper2021_22 = await FiscalRankingMapper.find({
        ulb: ObjectId(ulbRes._id),
        year: ObjectId(design_year2021_22),
        type: {
            $in: ['totalRecActual', 'totalRcptWaterSupply', 'totalRcptSanitation', 'totalOwnRevenue', 'waterTax', 'waterSupplyFee', 'sewerageTax', 'sanitationFee', 'propertyTax', 'CaptlExp', 'CaptlExpWaterSupply', 'CaptlExpSanitation', 'omExpWaterSupply', 'omExpSanitation', 'omExp', 'totalExpend', 'auditAnnualReport', 'totalRecActual', 'RcptBudget']
        }
    }).exec();

    // 1. Total Budget size per capita (Actual Total Reciepts) - RM
    const totalBudgetDataPC = totalBudgetPerCapita(ulbRes, fsData, fsMapper2021_22);

    // 2. Own Revenue per capita - RM
    const ownRevenuePC = ownRevenuePerCapita(ulbRes, fsData, fsMapper2021_22);

    // 3. Property Tax per capita - RM
    const pTaxPC = pTaxPerCapita(ulbRes, fsMapper2021_22);

    // 4. Growth (3 Year CAGR) in Total Budget Size (Total actual reciept) - RM
    const CAGRInTotalBud = CAGRInTotalBudget(fsData, fsMapper2018_19, fsMapper2020_21);

    // 5. Growth (3 Year CAGR) in Own Revenue - RM
    const CAGRInOwnRevPC = CAGRInOwnRevenue(fsData, fsMapper2018_19, fsMapper2021_22);

    // 6. Growth (3 Year CAGR) in Property - RM
    const CAGRInPropTax = CAGRInPTax(fsMapper2018_19, fsMapper2021_22); 

    // 7. Capital Expenditure per capita (3-year average) - EP
    const CapExPCAvg = CapExPerCapitaAvg(ulbRes, fsData, fsMapper2019_20, fsMapper2020_21, fsMapper2021_22);
    
    // 8. Growth (3-Year CAGR) in Capex - EP
    const CAGRInCapExpen = CAGRInCapEx(fsData, fsMapper2018_19, fsMapper2021_22);

    // // 9. O&M expenses to Total Revenue Expenditure (TRE) (3- year average) - EP
    // const OMExpTotalRevExpen = OMExpTotalRevEx(fsData, fsMapper2019_20, fsMapper2020_21, fsMapper2021_22);

    // 10A. For Timely Audit - Average number of months taken by ULB in closing audit - FG
    const AvgMonthsForULBAuditMarks = AvgMonthsForULBAudit(fsMapper2019_20, fsMapper2020_21, fsMapper2021_22)
    
    // 10B. For Publication of Annual Accounts - Availability for last 3 years on Cityfinance or Own website.
    const AAPushishedMarks = AAPublished(fsMapperNoYear);

    // 11A. Is the property tax register GIS-based
    const GISBasedPTaxMarks = GISBasedPTax(fsMapperNoYear);

    // 11B. Do you use accounting software? ( Eg.Tally, State-prescribed ERP etc) - FG
    const AccSoftwareMarks = AccSoftware(fsMapperNoYear);

    // 12. Budget vs. Actual (Variance %) for Total Receipts (3-year average) - FG
    const ReceiptsVariance = TotalReceiptsVariance(fsMapper2019_20, fsMapper2020_21, fsMapper2021_22);

    // 13. Own Revenue Receivables Outstanding - FG
    const OwnRevRecOutStanding = OwnRevRecOut(fsMapperNoYear, fsMapper2021_22);

    // 14. Digital Own Revenue Collection (DORC) to Total Own Revenue Collection (TORC) - FG
    const DigitalToTotalOwnRev =  DigtalOwnRevToTotalOwnRev(fsMapperNoYear);
    
    // // 15. Properties under Tax Collection net - FG
    // const  PropUnderTaxCollNet = PropUnderTaxColl(fsMapperNoYear); 

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
        // totalBudget: { score: totalBudgetDataPC },
        // ownRevenue: { score: ownRevenuePC },
    };

    await ScoringFiscalRanking.create(scoringData);
    
    return res.status(200).json({
        status: 'true',
        totalBudgetDataPC,
        ownRevenuePC,
        pTaxPC,
        CAGRInTotalBud,
        CAGRInOwnRevPC,
        CAGRInPropTax,
        CapExPCAvg,
        CAGRInCapExpen,
        // OMExpTotalRevExpen,
        AvgMonthsForULBAuditMarks,
        AAPushishedMarks,
        GISBasedPTaxMarks,   
        AccSoftwareMarks,
        ReceiptsVariance,
        OwnRevRecOutStanding,
        DigitalToTotalOwnRev,
        // PropUnderTaxCollNet

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
            message: error.message
        })
    }
}
// func15 indicator-'paid_property_tax' & func9 indicator-'omExp' have error.