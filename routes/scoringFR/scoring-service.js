const ObjectId = require('mongoose').Types.ObjectId;
const moongose = require('mongoose');
const Response = require('../../service').response;
const { years } = require('../../service/years');
const Ulb = require('../../models/Ulb');
const FiscalRanking = require('../../models/FiscalRanking');
const FiscalRankingMapper = require('../../models/FiscalRankingMapper');
const ScoringFiscalRanking = require('../../models/ScoringFiscalRanking');
const { registerCustomQueryHandler } = require('puppeteer');
/* 
Pending actions

1. Reduce mark based on provisional account
2. What if population is blank or 0 in master data >> no such case found. 
3. Make all Number()
4. 0/0 = NaN >> handle this condition
5. 10B. to be confirmed.
6. 11A. to be confirmed.
*/

function calculateRecommendationPercentage(score) {
	let percent = 0;
	score = Math.round(score);
	// console.log( '-->Rounded score',score);
	if (score >= 0 && score <= 29) {
		percent = 0;
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
	// console.log('fsMapper', fsMapper);
	// console.log('type', type);
	const indicator = fsMapper.find((e) => e.type === type);
	if (indicator && indicator.pmuSuggestedValue2) {
		return indicator.pmuSuggestedValue2;
	} else if (indicator && indicator.suggestedValue) {
		return indicator.suggestedValue;
	} else if (indicator && indicator.value) {
		return indicator.value;
	}
	return 0;
}

// Function to calculate average.
function calculateAverage(numbers) {
	if (numbers.length === 0) {
		return 0;
	} // Handle division by zero if the array is empty
	var sum = 0;
	for (var i = 0; i < numbers.length; i++) {
		sum += numbers[i];
	}

	return Number(sum / numbers.length);
}

// 1. Total Budget size per capita (Actual Total Reciepts) - RM
function totalBudgetPerCapita(ulbRes, fsData, fsMapper2021_22) {
	//Total receipts actual
	const totalRecActual_2021_22 = Number(getValue(fsMapper2021_22, 'totalRecActual'));
	// Total receipts actual of water supply
	const totalRcptWaterSupply = fsData && fsData.propertyWaterTax.value === 'Yes' ? Number(getValue(fsMapper2021_22, 'totalRcptWaterSupply')) : 0;
	// Total reciepts actual for sanitaion.
	const totalRcptSanitation = fsData && fsData.propertySanitationTax.value === 'Yes' ? Number(getValue(fsMapper2021_22, 'totalRcptSanitation')) : 0;

	const totalBudget = (ulbRes.population === 0) ? 'Population is 0' : (totalRecActual_2021_22 - (totalRcptWaterSupply + totalRcptSanitation)) / ulbRes.population;
	return parseFloat(totalBudget.toFixed(2));
}

// 2. Own Revenue per capita - RM
function ownRevenuePerCapita(ulbRes, fsData, fsMapper2021_22) {
	// Total own rev.
	const totalOwnRevenue_2021_22 = Number(getValue(fsMapper2021_22, 'totalOwnRevenue'));
	// Own revenue for water supply.
	const waterTax = Number(getValue(fsMapper2021_22, 'waterTax'));
	const waterSupplyFee = Number(getValue(fsMapper2021_22, 'waterSupplyFee'));
	const ownRevenueWaterSupply = fsData && fsData.propertyWaterTax.value === 'Yes' ? waterTax + waterSupplyFee : 0;
	// Own revenue for sewerage and sanitation.
	const sewerageTax = Number(getValue(fsMapper2021_22, 'sewerageTax'));
	const sanitationFee = Number(getValue(fsMapper2021_22, 'sanitationFee'));
	const ownRevenueSanitation = fsData && fsData.propertyWaterTax.value === 'Yes' ? sewerageTax + sanitationFee : 0;

	const ownRevenueData = (ulbRes.population === 0) ? 'Population is 0' : (totalOwnRevenue_2021_22 - (ownRevenueWaterSupply + ownRevenueSanitation)) / ulbRes.population;
	return parseFloat(ownRevenueData.toFixed(2));
}

// 3. Property Tax per capita - RM
function pTaxPerCapita(ulbRes, fsMapper2021_22) {
	// Property tax of 21-22 / population.
	const pTaxPerCapita = (ulbRes.population === 0) ? 'Population is 0' : Number(getValue(fsMapper2021_22, 'propertyTax')) / ulbRes.population;
	return parseFloat(pTaxPerCapita.toFixed(2));
}

// 4. Growth (3 Year CAGR) in Total Budget Size (Total actual reciept) - RM
function cagrInTotalBudget(fsData, fsMapper2018_19, fsMapper2021_22) {
	// Total receipts actual.
	const totalRecActual_2018_19 = Number(getValue(fsMapper2018_19, 'totalRecActual'));
	const totalRecActual_2021_22 = Number(getValue(fsMapper2021_22, 'totalRecActual'));
	// If 'Yes' then take the receipts for watersupply/ sanitation value.
	const waterTax2021_22 = fsData && fsData.propertyWaterTax.value === 'Yes' ? Number(getValue(fsMapper2021_22, 'totalRcptWaterSupply')) : 0;
	const sanitationTax2021_22 = fsData && fsData.propertySanitationTax.value === 'Yes' ? Number(getValue(fsMapper2021_22, 'totalRcptSanitation')) : 0;
	const waterTax_2018_19 = fsData && fsData.propertyWaterTax.value === 'Yes' ? Number(getValue(fsMapper2018_19, 'totalRcptWaterSupply')) : 0;
	const sanitationTax_2018_19 = fsData && fsData.propertySanitationTax.value === 'Yes' ? Number(getValue(fsMapper2018_19, 'totalRcptSanitation')) : 0;
	// Total - (waterTax + sanitationTax)
	const budget2021_22 = Number(totalRecActual_2021_22 - (waterTax2021_22 + sanitationTax2021_22));
	const budget2018_19 = Number(totalRecActual_2018_19 - (waterTax_2018_19 + sanitationTax_2018_19));
	// Handaling 0/ 0
	const budget = (budget2021_22 === 0 && budget2018_19 === 0) ? 0 : (budget2021_22 / budget2018_19);
	// Growth
	const time = 3;
	const CAGRInTotalBudget = (Math.pow(budget, 1 / time) - 1) * 100;
	
	return parseFloat(CAGRInTotalBudget.toFixed(2)); //15.73%
	// return parseFloat(Math.ceil(CAGRInTotalBudget.toFixed(2))); //15.73% >> 16%
}

// 5. Growth (3 Year CAGR) in Own Revenue - RM
function cagrInOwnRevenue(fsData, fsMapper2018_19, fsMapper2021_22) {
	// Total Own revenue.
	const totalOwnRevenue_2018_19 = Number(getValue(fsMapper2018_19, 'totalOwnRevenue'));
	const totalOwnRevenue_2021_22 = Number(getValue(fsMapper2021_22, 'totalOwnRevenue'));
	// Own revenue for water supply
	const ownRevenueWaterSupply_2018_19 = Number(getValue(fsMapper2018_19, 'waterTax')) + Number(getValue(fsMapper2018_19, 'waterSupplyFee'));
	const ownRevenueWaterSupply_2021_22 = Number(getValue(fsMapper2021_22, 'waterTax')) + Number(getValue(fsMapper2021_22, 'waterSupplyFee'));
	// Own revenue for sanitaion.
	const ownRevenueSewerageSanitation_2018_19 = Number(getValue(fsMapper2018_19, 'sewerageTax')) + Number(getValue(fsMapper2018_19, 'sanitationFee'));
	const ownRevenueSewerageSanitation_2021_22 = Number(getValue(fsMapper2021_22, 'sewerageTax')) + Number(getValue(fsMapper2021_22, 'sanitationFee'));
	// If 'Yes' then take the own revenue for watersupply/ sanitation value.
	const WaterTax_2021_22 = fsData && fsData.propertyWaterTax.value === 'Yes' ? ownRevenueWaterSupply_2021_22 : 0;
	const SanitationTax_2021_22 = fsData && fsData.propertySanitationTax.value === 'Yes' ? ownRevenueSewerageSanitation_2021_22 : 0;
	const waterTax_2018_19 = fsData && fsData.propertyWaterTax.value === 'Yes' ? ownRevenueWaterSupply_2018_19 : 0;
	const SanitationTax_2018_19 = fsData && fsData.propertySanitationTax.value === 'Yes' ? ownRevenueSewerageSanitation_2018_19 : 0;
	// Total - (watersupply + sanitaion)
	const ownRev2021_22 = Number(totalOwnRevenue_2021_22 - (WaterTax_2021_22 + SanitationTax_2021_22));
	const ownRev2018_19 = Number(totalOwnRevenue_2018_19 - (waterTax_2018_19 + SanitationTax_2018_19));
	// Handaling 0/ 0
	const ownRev = (ownRev2021_22 === 0 && ownRev2018_19 === 0) ? 0 : (ownRev2021_22 / ownRev2018_19); 
	// Growth.
	const time = 3;
	const CAGRInOwnRevenue = (Math.pow(ownRev, 1 / time) - 1) * 100;

	return parseFloat(CAGRInOwnRevenue.toFixed(2));
}

// 6. Growth (3 Year CAGR) in Property - RM
function cagrInPTax(fsMapper2018_19, fsMapper2021_22) {
	// Ptax 21-22 / Ptax 18-19
	const pTax2021_22 = Number(getValue(fsMapper2021_22, 'propertyTax'));
	const pTax2018_19 = Number(getValue(fsMapper2018_19, 'propertyTax'));
	// Handling 0/ 0
	const pTax = (pTax2021_22 === 0 && pTax2018_19 === 0) ? 0 : (pTax2021_22/ pTax2018_19);
	// Growth for 3 years
	const time = 3;
	const CAGRInPTax = (Math.pow(pTax, 1 / time) - 1) * 100;

	return parseFloat(CAGRInPTax.toFixed(2));
}

// 7. Capital Expenditure per capita (3-year average) - EP
function capExPerCapitaAvg(ulbRes, fsData, fsMapper2019_20, fsMapper2020_21, fsMapper2021_22) {
	// Total Capex of 3 years.
	const TotalCapEx_2019_20 = Number(getValue(fsMapper2019_20, 'CaptlExp'));
	const TotalCapEx_2020_21 = Number(getValue(fsMapper2020_21, 'CaptlExp'));
	const TotalCapEx_2021_22 = Number(getValue(fsMapper2021_22, 'CaptlExp'));
	// Assigning the values to variables if fsData options are 'YES' - 3years
	const totalRcptWaterSupply_2019_20 =
		fsData && fsData.propertyWaterTax.value === 'Yes' ? Number(getValue(fsMapper2019_20, 'CaptlExpWaterSupply')) : 0;
	const totalRcptSanitation_2019_20 =
		fsData && fsData.propertySanitationTax.value === 'Yes' ? Number(getValue(fsMapper2019_20, 'CaptlExpSanitation')) : 0;
	const totalRcptWaterSupply_2020_21 =
		fsData && fsData.propertyWaterTax.value === 'Yes' ? Number(getValue(fsMapper2020_21, 'CaptlExpWaterSupply')) : 0;
	const totalRcptSanitation_2020_21 =
		fsData && fsData.propertySanitationTax.value === 'Yes' ? Number(getValue(fsMapper2020_21, 'CaptlExpSanitation')) : 0;
	const totalRcptWaterSupply_2021_22 =
		fsData && fsData.propertyWaterTax.value === 'Yes' ? Number(getValue(fsMapper2021_22, 'CaptlExpWaterSupply')) : 0;
	const totalRcptSanitation_2021_22 =
		fsData && fsData.propertySanitationTax.value === 'Yes' ? Number(getValue(fsMapper2021_22, 'CaptlExpSanitation')) : 0;
	// Total capex - (watersupply + sanitation)
	const CapEx_2019_20 = TotalCapEx_2019_20 - (totalRcptWaterSupply_2019_20 + totalRcptSanitation_2019_20);
	const CapEx_2020_21 = TotalCapEx_2020_21 - (totalRcptWaterSupply_2020_21 + totalRcptSanitation_2020_21);
	const CapEx_2021_22 = TotalCapEx_2021_22 - (totalRcptWaterSupply_2021_22 + totalRcptSanitation_2021_22);
	// Array is created to find average.
	const arr = [CapEx_2019_20, CapEx_2020_21, CapEx_2021_22];
	const CapExPerCapitaAvg = (ulbRes.population === 0) ? 'Population is 0' : (calculateAverage(arr) / ulbRes.population);

	return parseFloat(CapExPerCapitaAvg.toFixed(2));
}

// 8. Growth (3-Year CAGR) in Capex - EP
function cagrInCapEx(fsData, fsMapper2018_19, fsMapper2021_22) {
	// Assigning the values to variables if fsData options are 'YES'.
	const totalRcptWaterSupply_2018_19 =
		fsData && fsData.propertyWaterTax.value === 'Yes' ? Number(getValue(fsMapper2018_19, 'CaptlExpWaterSupply')) : 0;
	const totalRcptSanitation_2018_19 =
		fsData && fsData.propertySanitationTax.value === 'Yes' ? Number(getValue(fsMapper2018_19, 'CaptlExpSanitation')) : 0;
	const totalRcptWaterSupply_2021_22 =
		fsData && fsData.propertyWaterTax.value === 'Yes' ? Number(getValue(fsMapper2021_22, 'CaptlExpWaterSupply')) : 0;
	const totalRcptSanitation_2021_22 =
		fsData && fsData.propertySanitationTax.value === 'Yes' ? Number(getValue(fsMapper2021_22, 'CaptlExpSanitation')) : 0;
	// Total capex - (watersupply + sanitation)
	const capEx2021_22 = Number(getValue(fsMapper2021_22, 'CaptlExp') - (totalRcptWaterSupply_2021_22 + totalRcptSanitation_2021_22));
	const capEx2018_19 = Number(getValue(fsMapper2018_19, 'CaptlExp') - (totalRcptWaterSupply_2018_19 + totalRcptSanitation_2018_19));
	// Handling 0/ 0
	const TotalCapEx = (capEx2021_22 === 0 && capEx2018_19 === 0) ? 0 : (capEx2021_22 / capEx2018_19);
	// Growth
	const time = 3;
	const CAGRInCapEx = Math.pow(TotalCapEx, 1 / time) * 100;

	return parseFloat(CAGRInCapEx.toFixed(2));
}

// 9. O&M expenses to Total Revenue Expenditure (TRE) (3- year average) - EP
function omExpTotalRevEx(fsData, fsMapper2019_20, fsMapper2020_21, fsMapper2021_22) {
	const OmExpWaterSupply_2019_20 =
		fsData && fsData.propertyWaterTax.value === 'Yes' ? Number(getValue(fsMapper2019_20, 'totalCaptlExpWaterSupply')) : 0;
	const OmExpSanitation_2019_20 =
		fsData && fsData.propertySanitationTax.value === 'Yes' ? Number(getValue(fsMapper2019_20, 'totalOMCaptlExpSanitation')) : 0;
	const OmExpWaterSupply_2020_21 =
		fsData && fsData.propertyWaterTax.value === 'Yes' ? Number(getValue(fsMapper2020_21, 'totalCaptlExpWaterSupply')) : 0;
	const OmExpSanitation_2020_21 =
		fsData && fsData.propertySanitationTax.value === 'Yes' ? Number(getValue(fsMapper2020_21, 'totalOMCaptlExpSanitation')) : 0;
	const OmExpWaterSupply_2021_22 =
		fsData && fsData.propertyWaterTax.value === 'Yes' ? Number(getValue(fsMapper2021_22, 'totalCaptlExpWaterSupply')) : 0;
	const OmExpSanitation_2021_22 =
		fsData && fsData.propertySanitationTax.value === 'Yes' ? Number(getValue(fsMapper2021_22, 'totalOMCaptlExpSanitation')) : 0;

	// Total O&M - O&M for water suppy + O&M for sewerage and sanitation.
	// Array is created to find average.
	const arr1 = [
		Number(getValue(fsMapper2019_20, 'totalOmExp')) - (Number(OmExpWaterSupply_2019_20) + Number(OmExpSanitation_2019_20)),
		Number(getValue(fsMapper2020_21, 'totalOmExp')) - (Number(OmExpWaterSupply_2020_21) + Number(OmExpSanitation_2020_21)),
		Number(getValue(fsMapper2021_22, 'totalOmExp')) - (Number(OmExpWaterSupply_2021_22) + Number(OmExpSanitation_2021_22)),
	];
	const AvgOfOmExp = calculateAverage(arr1);

	// Array is created to find average.
	const arr2 = [
		Number(getValue(fsMapper2019_20, 'totalExpend')),
		Number(getValue(fsMapper2020_21, 'totalExpend')),
		Number(getValue(fsMapper2021_22, 'totalExpend')),
	];
	const AvgOfRevExp = calculateAverage(arr2);
	// Handling 0/ 0
	const OMExpTotalRevEx = (AvgOfOmExp === 0 && AvgOfRevExp === 0) ? 0 : (AvgOfOmExp / AvgOfRevExp);

	return parseFloat(OMExpTotalRevEx.toFixed(2));
}

// 10A. For Timely Audit - Average number of months taken by ULB in closing audit - FG
function avgMonthsForULBAudit(fsMapper2019_20, fsMapper2020_21, fsMapper2021_22) {
	const April_2020 = new Date('2020/04/01');
	const April_2021 = new Date('2021/04/01');
	const April_2022 = new Date('2022/04/01');

	const NoOfMonths_2019_20 = getValue(fsMapper2019_20, 'auditAnnualReport') - April_2020;
	const NoOfMonths_2020_21 = getValue(fsMapper2020_21, 'auditAnnualReport') - April_2021;
	const NoOfMonths_2021_22 = getValue(fsMapper2021_22, 'auditAnnualReport') - April_2022;

	// Array is created to find average.
	const arr = [NoOfMonths_2019_20, NoOfMonths_2020_21, NoOfMonths_2021_22];
	const AvgMonth = calculateAverage(arr);

	// If average month is less than 12 then ULB gets 25 marks else 0 marks;
	const AvgMonthsForULBAudit = AvgMonth <= 12 ? 25 : 0;
	return AvgMonthsForULBAudit;
}

// 10B. For Publication of Annual Accounts - Availability for last 3 years on Cityfinance or Own website - FG
function aaPublished(fsMapperNoYear) {
	// If answer is 'Yes' then 25 marks else 0 marks.
	const AAPublished = getValue(fsMapperNoYear, 'webUrlAnnual') !== null ? 25 : 0;
	return AAPublished;
}

// 11A. Is the property tax register GIS-based - FG
function gisBasedPTax(fsMapperNoYear) {
	// If answer is 'Yes then 25 marks else 0 marks.
	const registerGis = getValue(fsMapperNoYear, 'registerGis') === 'Yes' ? 25 : 0;
	return registerGis;
}

// 11B. Do you use accounting software? ( Eg.Tally, State-prescribed ERP etc) - FG
function accSoftware(fsMapperNoYear) {
	// If answer is 'Yes then 25 marks else 0 marks.
	const AccSoftware = getValue(fsMapperNoYear, 'accountStwre') === 'Yes' ? 25 : 0;
	return AccSoftware;
}

// 12. Budget vs. Actual (Variance %) for Total Receipts (3-year average) - FG
function totalReceiptsVariance(fsMapper2019_20, fsMapper2020_21, fsMapper2021_22) {
	// Find average of total receipts actual for 3 years.
	// Array is created to find average.
	const arr1 = [
		Number(getValue(fsMapper2019_20, 'totalRecActual')),
		Number(getValue(fsMapper2020_21, 'totalRecActual')),
		Number(getValue(fsMapper2021_22, 'totalRecActual')),
	];
	const AvgOFActual = calculateAverage(arr1);

	// Find average of total receipts estimate for 3 years.
	// Array is created to find average.
	const arr2 = [
		Number(getValue(fsMapper2019_20, 'RcptBudget')),
		Number(getValue(fsMapper2020_21, 'RcptBudget')),
		Number(getValue(fsMapper2021_22, 'RcptBudget')),
	];
	const AvgOfEstimate = calculateAverage(arr2);

	// Acutal V/S Estimate
	// Handling 0/ 0
	const TotalReceiptsVariance = (AvgOFActual === 0 && AvgOfEstimate === 0) ? 0 : ((AvgOFActual - AvgOfEstimate) / AvgOfEstimate) * 100;
	return parseFloat(TotalReceiptsVariance.toFixed(2));
}

// 13. Own Revenue Receivables Outstanding - FG
function ownRevRecOut(fsMapperNoYear, fsMapper2021_22) {
	// ifNoError ? (indicator 25 / indicator 7.1) * 365 : 0;
	// TODO - Condition to be added >> if any error then 0 should be returned condition to be written.
	const ownRevArea = Number(getValue(fsMapperNoYear, 'totalOwnRevenueArea'));
	const ownRev2021_22 = Number(getValue(fsMapper2021_22, 'totalOwnRevenue'));

	const OwnRevRecOut = (ownRevArea === 0 && ownRev2021_22 === 0) ? 0 : (ownRevArea / ownRev2021_22) * 365;
	return parseFloat(OwnRevRecOut.toFixed(2));
}

// 14. Digital Own Revenue Collection (DORC) to Total Own Revenue Collection (TORC) - FG
function digtalOwnRevToTotalOwnRev(fsMapperNoYear) {
	// indicator 30 / indicator 29 + 30
	// TO-DO if any error then 0 is to be entered condition to be written.
	const DigitalOwnRev = Number(getValue(fsMapperNoYear, 'fy_21_22_online'));
	const TotalOwnRev = Number(getValue(fsMapperNoYear, 'fy_21_22_cash')) + Number(getValue(fsMapperNoYear, 'fy_21_22_online'));
	const DigtalOwnRevToTotalOwnRev = (DigitalOwnRev === 0 && TotalOwnRev === 0) ? 0 : (DigitalOwnRev / TotalOwnRev) * 100;

	return parseFloat(DigtalOwnRevToTotalOwnRev.toFixed(2));
}

// 15. Properties under Tax Collection net - FG
function propUnderTaxColl(fsMapperNoYear) {
	// indicator 33 / (indicator 31 - indicator 32)
	// TO-DO if any error then 0 is to be entered condition to be written.
	const paidPTax = Number(getValue(fsMapperNoYear, 'paid_property_tax'));
	const denominator = Number(getValue(fsMapperNoYear, 'property_tax_register')) - Number(getValue(fsMapperNoYear, 'paying_property_tax'));
	const PropUnderTaxColl = (paidPTax === 0 && denominator === 0) ? 0 : (paidPTax/ denominator) * 100;

	return parseFloat(PropUnderTaxColl.toFixed(2));
}

function getPopulationBucket(population) {
	let populationBucket = 0;
	if (population >= 4000000) {
		populationBucket = 1; //4M+
	} else if (population < 4000000 && population >= 1000000) {
		populationBucket = 2; //1M - 4M
	}
	if (population < 1000000 && population >= 100000) {
		populationBucket = 3; //100K - 1M
	}
	if (population < 100000) {
		populationBucket = 4; //<100K
	}
	return populationBucket;
}

// Function to check if the data for ranking was submitted from Provisional A/c; if yes then deduct x% of marks in final_score
function getProvisionalStatus(censusCode) {
	return 0;
}

async function getData(ulbRes) {
	// moongose.set('debug', true);

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
		design_year: ObjectId(design_year2022_23),
	};
	let fsData = await FiscalRanking.findOne(condition).lean();

	const fsMapperNoYear = await FiscalRankingMapper.find({
		ulb: ObjectId(ulbRes._id),
		// year: ObjectId(design_year2018_19),
		type: {
			$in: [
				'webUrlAnnual',
				'registerGis',
				'accountStwre',
				'totalOwnRevenueArea',
				'fy_21_22_online',
				'fy_21_22_cash',
				'property_tax_register',
				'paying_property_tax',
				'paid_property_tax',
			],
		},
	}).exec();
	// console.log(fsMapperNoYear);

	const fsMapper2018_19 = await FiscalRankingMapper.find({
		ulb: ObjectId(ulbRes._id),
		year: ObjectId(design_year2018_19),
		type: {
			$in: [
				'totalRecActual',
				'totalRcptWaterSupply',
				'totalRcptSanitation',
				'totalOwnRevenue',
				'waterTax',
				'waterSupplyFee',
				'sewerageTax',
				'sanitationFee',
				'propertyTax',
				'CaptlExpWaterSupply',
				'CaptlExpSanitation',
				'CaptlExp',
			],
		},
	}).exec();

	const fsMapper2019_20 = await FiscalRankingMapper.find({
		ulb: ObjectId(ulbRes._id),
		year: ObjectId(design_year2019_20),
		type: {
			$in: [
				'CaptlExp',
				'CaptlExpWaterSupply',
				'CaptlExpSanitation',
				'totalCaptlExpWaterSupply',
				'totalOMCaptlExpSanitation',
				'totalOmExp',
				'totalExpend',
				'totalRecActual',
				'RcptBudget',
				'auditAnnualReport',
			],
		},
	}).exec();

	const fsMapper2020_21 = await FiscalRankingMapper.find({
		ulb: ObjectId(ulbRes._id),
		year: ObjectId(design_year2020_21),
		type: {
			$in: [
				'totalRecActual',
				'totalRcptWaterSupply',
				'totalRcptSanitation',
				'CaptlExp',
				'CaptlExpWaterSupply',
				'CaptlExpSanitation',
				'totalCaptlExpWaterSupply',
				'totalOMCaptlExpSanitation',
				'totalOmExp',
				'totalExpend',
				'totalRecActual',
				'RcptBudget',
				'auditAnnualReport',
			],
		},
	}).exec();

	const fsMapper2021_22 = await FiscalRankingMapper.find({
		ulb: ObjectId(ulbRes._id),
		year: ObjectId(design_year2021_22),
		type: {
			$in: [
				'totalRecActual',
				'totalRcptWaterSupply',
				'totalRcptSanitation',
				'totalOwnRevenue',
				'waterTax',
				'waterSupplyFee',
				'sewerageTax',
				'sanitationFee',
				'propertyTax',
				'CaptlExp',
				'CaptlExpWaterSupply',
				'CaptlExpSanitation',
				'totalCaptlExpWaterSupply',
				'totalOMCaptlExpSanitation',
				'totalOmExp',
				'totalExpend',
				'auditAnnualReport',
				'totalRecActual',
				'RcptBudget',
			],
		},
	}).exec();

	// 1. Total Budget size per capita (Actual Total Reciepts) - RM
	const totalBudgetDataPC_1 = totalBudgetPerCapita(ulbRes, fsData, fsMapper2021_22);

	// 2. Own Revenue per capita - RM
	const ownRevenuePC_2 = ownRevenuePerCapita(ulbRes, fsData, fsMapper2021_22);

	// 3. Property Tax per capita - RM
	const pTaxPC_3 = pTaxPerCapita(ulbRes, fsMapper2021_22);

	// 4. Growth (3 Year CAGR) in Total Budget Size (Total actual reciept) - RM
	const cagrInTotalBud_4 = cagrInTotalBudget(fsData, fsMapper2018_19, fsMapper2021_22);

	// 5. Growth (3 Year CAGR) in Own Revenue - RM
	const cagrInOwnRevPC_5 = cagrInOwnRevenue(fsData, fsMapper2018_19, fsMapper2021_22);

	// 6. Growth (3 Year CAGR) in Property - RM
	const cagrInPropTax_6 = cagrInPTax(fsMapper2018_19, fsMapper2021_22);

	// 7. Capital Expenditure per capita (3-year average) - EP
	const capExPCAvg_7 = capExPerCapitaAvg(ulbRes, fsData, fsMapper2019_20, fsMapper2020_21, fsMapper2021_22);

	// 8. Growth (3-Year CAGR) in Capex - EP
	const cagrInCapExpen_8 = cagrInCapEx(fsData, fsMapper2018_19, fsMapper2021_22);

	// 9. O&M expenses to Total Revenue Expenditure (TRE) (3- year average) - EP
	const omExpTotalRevExpen_9 = omExpTotalRevEx(fsData, fsMapper2019_20, fsMapper2020_21, fsMapper2021_22);

	// 10A. For Timely Audit - Average number of months taken by ULB in closing audit - FG
	const avgMonthsForULBAuditMarks_10a = avgMonthsForULBAudit(fsMapper2019_20, fsMapper2020_21, fsMapper2021_22);

	// 10B. For Publication of Annual Accounts - Availability for last 3 years on Cityfinance or Own website.
	const aaPushishedMarks_10b = aaPublished(fsMapperNoYear);

	// 11A. Is the property tax register GIS-based
	const gisBasedPTaxMarks_11a = gisBasedPTax(fsMapperNoYear);

	// 11B. Do you use accounting software? ( Eg.Tally, State-prescribed ERP etc) - FG
	const accSoftwareMarks_11b = accSoftware(fsMapperNoYear);

	// 12. Budget vs. Actual (Variance %) for Total Receipts (3-year average) - FG
	const receiptsVariance_12 = totalReceiptsVariance(fsMapper2019_20, fsMapper2020_21, fsMapper2021_22);

	// 13. Own Revenue Receivables Outstanding - FG
	const ownRevRecOutStanding_13 = ownRevRecOut(fsMapperNoYear, fsMapper2021_22);

	// 14. Digital Own Revenue Collection (DORC) to Total Own Revenue Collection (TORC) - FG
	const digitalToTotalOwnRev_14 = digtalOwnRevToTotalOwnRev(fsMapperNoYear);

	// 15. Properties under Tax Collection net - FG
	const propUnderTaxCollNet_15 = propUnderTaxColl(fsMapperNoYear);

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

		totalBudgetDataPC_1: { score: !isNaN(totalBudgetDataPC_1) ? totalBudgetDataPC_1 : 0 },
		ownRevenuePC_2: { score: !isNaN(ownRevenuePC_2) ? ownRevenuePC_2 : 0 },
		pTaxPC_3: { score: !isNaN(pTaxPC_3) ? pTaxPC_3 : 0 },
		cagrInTotalBud_4: { score: !isNaN(cagrInTotalBud_4) ? cagrInTotalBud_4 : 0 },
		cagrInOwnRevPC_5: { score: !isNaN(cagrInOwnRevPC_5) ? cagrInOwnRevPC_5 : 0 },
		cagrInPropTax_6: { score: !isNaN(cagrInPropTax_6) ? cagrInPropTax_6 : 0 },
		capExPCAvg_7: { score: !isNaN(capExPCAvg_7) ? capExPCAvg_7 : 0 },
		cagrInCapExpen_8: { score: cagrInCapExpen_8 },
		// cagrInCapExpen_8: { score: !isNaN(cagrInCapExpen_8) ? cagrInCapExpen_8 : 0 },
		omExpTotalRevExpen_9: { score: !isNaN(omExpTotalRevExpen_9) ? omExpTotalRevExpen_9 : 0 },
		avgMonthsForULBAuditMarks_10a: { score: !isNaN(avgMonthsForULBAuditMarks_10a) ? avgMonthsForULBAuditMarks_10a : 0 },
		aaPushishedMarks_10b: { score: !isNaN(aaPushishedMarks_10b) ? aaPushishedMarks_10b : 0 },
		gisBasedPTaxMarks_11a: { score: !isNaN(gisBasedPTaxMarks_11a) ? gisBasedPTaxMarks_11a : 0 },
		accSoftwareMarks_11b: { score: !isNaN(accSoftwareMarks_11b) ? accSoftwareMarks_11b : 0 },
		receiptsVariance_12: { score: !isNaN(receiptsVariance_12) ? receiptsVariance_12 : 0 },
		ownRevRecOutStanding_13: { score: !isNaN(ownRevRecOutStanding_13) ? ownRevRecOutStanding_13 : 0 },
		digitalToTotalOwnRev_14: { score: !isNaN(digitalToTotalOwnRev_14) ? digitalToTotalOwnRev_14 : 0 },
		propUnderTaxCollNet_15: { score: !isNaN(propUnderTaxCollNet_15) ? propUnderTaxCollNet_15 : 0 },

		// isProvisional: getProvisionalStatus(ulbRes.censusCode),
	};

	console.log(scoringData);

	await ScoringFiscalRanking.create(scoringData);
	return {
		status: 'true',
		totalBudgetDataPC_1,
		ownRevenuePC_2,
		pTaxPC_3,
		cagrInTotalBud_4,
		cagrInOwnRevPC_5,
		cagrInPropTax_6,
		capExPCAvg_7,
		cagrInCapExpen_8,
		omExpTotalRevExpen_9,
		avgMonthsForULBAuditMarks_10a,
		aaPushishedMarks_10b,
		gisBasedPTaxMarks_11a,
		accSoftwareMarks_11b,
		receiptsVariance_12,
		ownRevRecOutStanding_13,
		digitalToTotalOwnRev_14,
		propUnderTaxCollNet_15,

		// ulbRes,
		// fsData,
		// fsMapper2021_22
	};

	// return { ulbRes, fsData, fsMapper }
}
module.exports.calculateFRScore = async (req, res) => {
	try {
		const data = req.body;
		const censusCode = 802814;
		const condition = { isActive: true };
		const ulbRes = await Ulb.find(condition).limit(2).lean();
		ulbRes.forEach(async (ulb) => {
			await getData(ulb);
		});
		return res.status(200).json({ message: 'Done' });
	} catch (error) {
		console.log('error', error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};
