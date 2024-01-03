const ObjectId = require('mongoose').Types.ObjectId;
const moongose = require('mongoose');
const Response = require('../../service').response;
const { years } = require('../../service/years');
const Ulb = require('../../models/Ulb');
const FiscalRanking = require('../../models/FiscalRanking');
const FiscalRankingMapper = require('../../models/FiscalRankingMapper');
const ScoringFiscalRanking = require('../../models/ScoringFiscalRanking');
const { registerCustomQueryHandler } = require('puppeteer');
const { cubeRootOfNegative } = require('../../service/common');
// const { pow } = require('mathjs');
/* 
Pending actions

1. Reduce mark based on provisional account
2. What if population is blank or 0 in master data >> no such case found. 
3. Make all Number()
4. 0/0 = NaN >> handle this condition
5. 10B. to be confirmed.
6. 11A. to be confirmed.
7. In CAGR >> time is 3 or 4?
*/

/*
 * AFS >> 2018-19, 2019-20, 2020-21, 2021-22
 * Budget >> 2020-21, 2021-22, 2022-23, 2023-24
 */
const design_year2018_19 = '63735a5bd44534713673c1ca';
const design_year2019_20 = '607697074dff55e6c0be33ba';
const design_year2020_21 = '606aadac4dff55e6c075c507';
const design_year2021_22 = '606aaf854dff55e6c075d219';
const design_year2022_23 = '606aafb14dff55e6c075d3ae';
const design_year2023_24 = '606aafc14dff55e6c075d3ec';


function getValue(fsMapper, type) {
	const indicator = fsMapper.find((e) => e.type === type);
	if (!indicator) {
		return 0;
	}
	let value = 0;
	switch (indicator.approvalType) {
		case 7:
			value = indicator.pmuSuggestedValue2;
			break;
		case 3: case 6: case 8:
			value = indicator.suggestedValue;
			break;
		case 1: case 5:
			value = indicator.value;
			break;
		default:
			value = indicator.value;
			break;
	}
	return value;
}

function getDate(fsMapper, type) {
	const indicator = fsMapper.find((e) => e.type === type);
	if (!indicator && !indicator.date) {
		return false;
	}
	return indicator.date;
}
function getNumberValue(fsMapper, type) {
	const indicator = fsMapper.find((e) => e.type === type);
	if (!indicator) {
		return 0;
	}
	let value = 0;
	switch (indicator.approvalType) {
		case 7:
			value = Number(indicator.pmuSuggestedValue2);
			break;
		case 3: case 6: case 8:
			value = Number(indicator.suggestedValue);
			break;
		case 1: case 5:
			value = Number(indicator.value);
			break;
		default:
			value = Number(indicator.value);
			break;
	}
	return value;

	// if (indicator.pmuSuggestedValue2) {
	// 	return Number(indicator.pmuSuggestedValue2);
	// } else if (indicator.suggestedValue) {
	// 	return Number(indicator.suggestedValue);
	// } else if (indicator.value) {
	// 	return Number(indicator.value);
	// }
	// return 0;
}
// Get file.
function getFile(fsMapper, type) {
	const indicator = fsMapper.find((e) => e.type === type);
	if (!indicator) {
		return false;
	}

	return indicator;
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
	try {
		//Total receipts actual
		const totalRecActual_2021_22 = getNumberValue(fsMapper2021_22, 'totalRecActual');
		// Total receipts actual of water supply
		//TODO: verify the condition
		const totalRcptWaterSupply = fsData && fsData.propertyWaterTax.value === 'Yes' && fsData.waterSupply.value === 'Yes' ? getNumberValue(fsMapper2021_22, 'totalRcptWaterSupply') : 0;
		// Total reciepts actual for sanitaion.
		const totalRcptSanitation = fsData && fsData.propertySanitationTax.value === 'Yes' && fsData.sanitationService.value === 'Yes' ? getNumberValue(fsMapper2021_22, 'totalRcptSanitation') : 0;
		const totalBudget =
			ulbRes.population === 0
				? console.log('Population is 0')
				: (totalRecActual_2021_22 - (totalRcptWaterSupply + totalRcptSanitation)) / ulbRes.population;

		return parseFloat(totalBudget.toFixed(2));
	} catch (e) {
		return 0;
	}
}

// 2. Own Revenue per capita - RM
function ownRevenuePerCapita(ulbRes, fsData, fsMapper2021_22) {
	try {
		// Total own rev.
		const totalOwnRevenue_2021_22 = getNumberValue(fsMapper2021_22, 'totalOwnRevenue');
		// Own revenue for water supply.
		const waterTax = getNumberValue(fsMapper2021_22, 'waterTax');
		const waterSupplyFee = getNumberValue(fsMapper2021_22, 'waterSupplyFee');
		//TODO: verify the condition
		const ownRevenueWaterSupply = fsData && fsData.propertyWaterTax.value === 'Yes' && fsData.waterSupply.value === 'Yes' ? waterTax + waterSupplyFee : 0;
		// Own revenue for sewerage and sanitation.
		const sewerageTax = getNumberValue(fsMapper2021_22, 'sewerageTax');
		const sanitationFee = getNumberValue(fsMapper2021_22, 'sanitationFee');
		const ownRevenueSanitation = fsData && fsData.propertySanitationTax.value === 'Yes' && fsData.sanitationService.value === 'Yes' ? sewerageTax + sanitationFee : 0;

		const ownRevenueData =
			ulbRes.population === 0
				? console.log('Population is 0')
				: (totalOwnRevenue_2021_22 - (ownRevenueWaterSupply + ownRevenueSanitation)) / ulbRes.population;
		return parseFloat(ownRevenueData.toFixed(2));
	} catch (e) {
		return 0;
	}
}

// 3. Property Tax per capita - RM
function pTaxPerCapita(ulbRes, fsMapper2021_22) {
	try {
		// Property tax of 21-22 / population.
		const pTaxPerCapita =
			ulbRes.population === 0 ? console.log('Population is 0') : getNumberValue(fsMapper2021_22, 'propertyTax') / ulbRes.population;
		return parseFloat(pTaxPerCapita.toFixed(2));
	} catch (e) {
		return 0;
	}
}

// 4. Growth (3 Year CAGR) in Total Budget Size (Total actual reciept) - RM
function cagrInTotalBudget(fsData, fsMapper2018_19, fsMapper2021_22) {
	try {
		// Total receipts actual.
		const totalRecActual_2018_19 = getNumberValue(fsMapper2018_19, 'totalRecActual');
		const totalRecActual_2021_22 = getNumberValue(fsMapper2021_22, 'totalRecActual');
		// If 'Yes' then take the receipts for watersupply/ sanitation value.
		//TODO: verify the condition
		const waterTax2021_22 = fsData && fsData.propertyWaterTax.value === 'Yes' && fsData.waterSupply.value === 'Yes' ? getNumberValue(fsMapper2021_22, 'totalRcptWaterSupply') : 0;
		const sanitationTax2021_22 = fsData && fsData.propertySanitationTax.value === 'Yes' && fsData.sanitationService.value === 'Yes' ? getNumberValue(fsMapper2021_22, 'totalRcptSanitation') : 0;
		const waterTax_2018_19 = fsData && fsData.propertyWaterTax.value === 'Yes' && fsData.waterSupply.value === 'Yes' ? getNumberValue(fsMapper2018_19, 'totalRcptWaterSupply') : 0;
		const sanitationTax_2018_19 = fsData && fsData.propertySanitationTax.value === 'Yes' && fsData.sanitationService.value === 'Yes' ? getNumberValue(fsMapper2018_19, 'totalRcptSanitation') : 0;
		// Total - (waterTax + sanitationTax)
		const budget2021_22 = totalRecActual_2021_22 - (waterTax2021_22 + sanitationTax2021_22);
		const budget2018_19 = totalRecActual_2018_19 - (waterTax_2018_19 + sanitationTax_2018_19);
		// Handaling 0/ 0
		const budget = budget2021_22 === 0 || budget2018_19 === 0 ? 0 : budget2021_22 / budget2018_19;
		// Growth
		const time = 3;
		let CAGRInTotalBudget = 0;
		if (budget !== 0) {
			// const pow1 = cubeRootOfNegative(budget);
			// const pow1 = pow(budget,0.333);
			const pow1 = Math.cbrt(budget);
			// console.log('pow-DD--',pow1);
			// console.log('pow-st--',JSON.stringify(pow1));
			// console.log('pow---',typeof pow1);
			CAGRInTotalBudget = (pow1 - 1) * 100;
			// CAGRInTotalBudget = (Math.pow(budget, 1 / time) - 1) * 100;
		} else {
			CAGRInTotalBudget = 0;
		}
		// const CAGRInTotalBudget = budget <= 0 ? 0 : (Math.pow(budget, 1 / time) - 1) * 100;

		return parseFloat(CAGRInTotalBudget.toFixed(2)); //15.73%
		// return parseFloat(Math.ceil(CAGRInTotalBudget.toFixed(2))); //15.73% >> 16%
	} catch (e) {
		return 0;
	}
}

// 5. Growth (3 Year CAGR) in Own Revenue - RM
function cagrInOwnRevenue(fsData, fsMapper2018_19, fsMapper2021_22) {
	try {
		// Total Own revenue.
		const totalOwnRevenue_2018_19 = getNumberValue(fsMapper2018_19, 'totalOwnRevenue');
		const totalOwnRevenue_2021_22 = getNumberValue(fsMapper2021_22, 'totalOwnRevenue');
		// Own revenue for water supply
		const ownRevenueWaterSupply_2018_19 = getNumberValue(fsMapper2018_19, 'waterTax') + getNumberValue(fsMapper2018_19, 'waterSupplyFee');
		const ownRevenueWaterSupply_2021_22 = getNumberValue(fsMapper2021_22, 'waterTax') + getNumberValue(fsMapper2021_22, 'waterSupplyFee');
		// Own revenue for sanitaion.
		const ownRevenueSewerageSanitation_2018_19 = getNumberValue(fsMapper2018_19, 'sewerageTax') + getNumberValue(fsMapper2018_19, 'sanitationFee');
		const ownRevenueSewerageSanitation_2021_22 = getNumberValue(fsMapper2021_22, 'sewerageTax') + getNumberValue(fsMapper2021_22, 'sanitationFee');
		// If 'Yes' then take the own revenue for watersupply/ sanitation value.
		//TODO: verify the condition
		const waterTax_2021_22 = fsData && fsData.propertyWaterTax.value === 'Yes' && fsData.waterSupply.value === 'Yes' ? ownRevenueWaterSupply_2021_22 : 0;
		const sanitationTax_2021_22 = fsData && fsData.propertySanitationTax.value === 'Yes' && fsData.sanitationService.value === 'Yes' ? ownRevenueSewerageSanitation_2021_22 : 0;
		const waterTax_2018_19 = fsData && fsData.propertyWaterTax.value === 'Yes' && fsData.waterSupply.value === 'Yes' ? ownRevenueWaterSupply_2018_19 : 0;
		const sanitationTax_2018_19 = fsData && fsData.propertySanitationTax.value === 'Yes' && fsData.sanitationService.value === 'Yes' ? ownRevenueSewerageSanitation_2018_19 : 0;
		// Total - (watersupply + sanitaion)
		const ownRev2021_22 = totalOwnRevenue_2021_22 - (waterTax_2021_22 + sanitationTax_2021_22);
		const ownRev2018_19 = totalOwnRevenue_2018_19 - (waterTax_2018_19 + sanitationTax_2018_19);
		// Handaling 0/ 0
		const ownRev = ownRev2021_22 === 0 || ownRev2018_19 === 0 ? 0 : ownRev2021_22 / ownRev2018_19;
		// Growth.
		const time = 3;
		const cagrInOwnRevenue = ownRev <= 0 ? 0 : (Math.pow(ownRev, 1 / time) - 1) * 100;

		return parseFloat(cagrInOwnRevenue.toFixed(2));
	} catch (e) {
		return 0;
	}
}

// 6. Growth (3 Year CAGR) in Property - RM
function cagrInPTax(fsMapper2018_19, fsMapper2021_22) {
	try {
		// Ptax 21-22 / Ptax 18-19
		const pTax2021_22 = getNumberValue(fsMapper2021_22, 'propertyTax');
		const pTax2018_19 = getNumberValue(fsMapper2018_19, 'propertyTax');
		// Handling 0/ 0onst
		const pTax = pTax2021_22 === 0 || pTax2018_19 === 0 ? 0 : pTax2021_22 / pTax2018_19;
		// Growth for 3 years
		const time = 3;
		// TODO:check 0 condtion with navinder
		// const cagrInPTax = pTax <= 0 ? 0 : (Math.pow(pTax, 1 / time) - 1) * 100;
		const cagrInPTax = (Math.pow(pTax, 1 / time) - 1) * 100;

		return parseFloat(cagrInPTax.toFixed(2));
	} catch (e) {
		return 0;
	}
}

// 7. Capital Expenditure per capita (3-year average) - EP
function capExPerCapitaAvg(ulbRes, fsData, fsMapper2019_20, fsMapper2020_21, fsMapper2021_22) {
	try {
		// Total Capex of 3 years.
		const totalCapEx_2019_20 = getNumberValue(fsMapper2019_20, 'CaptlExp');
		const totalCapEx_2020_21 = getNumberValue(fsMapper2020_21, 'CaptlExp');
		const totalCapEx_2021_22 = getNumberValue(fsMapper2021_22, 'CaptlExp');
		// Assigning the values to variables if fsData options are 'YES' - 3years
		//TODO: verify the condition
		const totalRcptWaterSupply_2019_20 =
			fsData && fsData.propertyWaterTax.value === 'Yes' && fsData.waterSupply.value === 'Yes' ? getNumberValue(fsMapper2019_20, 'CaptlExpWaterSupply') : 0;
		const totalRcptSanitation_2019_20 =
			fsData && fsData.propertySanitationTax.value === 'Yes' && fsData.sanitationService.value === 'Yes' ? getNumberValue(fsMapper2019_20, 'CaptlExpSanitation') : 0;
		const totalRcptWaterSupply_2020_21 =
			fsData && fsData.propertyWaterTax.value === 'Yes' && fsData.waterSupply.value === 'Yes' ? getNumberValue(fsMapper2020_21, 'CaptlExpWaterSupply') : 0;
		const totalRcptSanitation_2020_21 =
			fsData && fsData.propertySanitationTax.value === 'Yes' && fsData.sanitationService.value === 'Yes' ? getNumberValue(fsMapper2020_21, 'CaptlExpSanitation') : 0;
		const totalRcptWaterSupply_2021_22 =
			fsData && fsData.propertyWaterTax.value === 'Yes' && fsData.waterSupply.value === 'Yes' ? getNumberValue(fsMapper2021_22, 'CaptlExpWaterSupply') : 0;
		const totalRcptSanitation_2021_22 =
			fsData && fsData.propertySanitationTax.value === 'Yes' && fsData.sanitationService.value === 'Yes' ? getNumberValue(fsMapper2021_22, 'CaptlExpSanitation') : 0;
		// Total capex - (watersupply + sanitation)
		const capEx_2019_20 = totalCapEx_2019_20 - (totalRcptWaterSupply_2019_20 + totalRcptSanitation_2019_20);
		const capEx_2020_21 = totalCapEx_2020_21 - (totalRcptWaterSupply_2020_21 + totalRcptSanitation_2020_21);
		const capEx_2021_22 = totalCapEx_2021_22 - (totalRcptWaterSupply_2021_22 + totalRcptSanitation_2021_22);
		// Array is created to find average.
		const arr = [capEx_2019_20, capEx_2020_21, capEx_2021_22];
		const CapExPerCapitaAvg = ulbRes.population === 0 ? console.log('Population is 0') : calculateAverage(arr) / ulbRes.population;

		return parseFloat(CapExPerCapitaAvg.toFixed(2));
	} catch (e) {
		return 0;
	}
}

// 8. Growth (3-Year CAGR) in Capex - EP
function cagrInCapEx(fsData, fsMapper2018_19, fsMapper2021_22) {
	try {
		// Assigning the values to variables if fsData options are 'YES'.
		//TODO: verify the condition
		const totalRcptWaterSupply_2018_19 =
			fsData && fsData.propertyWaterTax.value === 'Yes' && fsData.waterSupply.value === 'Yes' ? getNumberValue(fsMapper2018_19, 'CaptlExpWaterSupply') : 0;
		const totalRcptSanitation_2018_19 =
			fsData && fsData.propertySanitationTax.value === 'Yes' && fsData.sanitationService.value === 'Yes' ? getNumberValue(fsMapper2018_19, 'CaptlExpSanitation') : 0;
		const totalRcptWaterSupply_2021_22 =
			fsData && fsData.propertyWaterTax.value === 'Yes' && fsData.waterSupply.value === 'Yes' ? getNumberValue(fsMapper2021_22, 'CaptlExpWaterSupply') : 0;
		const totalRcptSanitation_2021_22 =
			fsData && fsData.propertySanitationTax.value === 'Yes' && fsData.sanitationService.value === 'Yes' ? getNumberValue(fsMapper2021_22, 'CaptlExpSanitation') : 0;
		// Total capex - (watersupply + sanitation)
		const capEx2021_22 = getNumberValue(fsMapper2021_22, 'CaptlExp') - (totalRcptWaterSupply_2021_22 + totalRcptSanitation_2021_22);
		const capEx2018_19 = getNumberValue(fsMapper2018_19, 'CaptlExp') - (totalRcptWaterSupply_2018_19 + totalRcptSanitation_2018_19);
		// Handling 0/ 0
		const totalCapEx = capEx2021_22 === 0 || capEx2018_19 === 0 ? 0 : capEx2021_22 / capEx2018_19;
		// Growth
		const time = 3;
		// TODO: check 0 cond with navinder
		// const cagrInCapEx = totalCapEx <= 0 ? 0 : (Math.pow(totalCapEx, (1 / time)) - 1) * 100;
		// const cagrInCapEx = (Math.pow(totalCapEx, (1 / time)) - 1) * 100;
		let cagrInCapEx = 0;
		if (totalCapEx !== 0) {
			const pow1 = Math.cbrt(totalCapEx);
			cagrInCapEx = (pow1 - 1) * 100;
		} else {
			cagrInCapEx = 0;
		}

		return parseFloat(cagrInCapEx.toFixed(2));
	} catch (e) {
		return 0;
	}
}

// 9. O&M expenses to Total Revenue Expenditure (TRE) (3- year average) - EP
//TODO: verify the condition
function omExpTotalRevEx(fsData, fsMapper2019_20, fsMapper2020_21, fsMapper2021_22) {
	try {
		const omExpWaterSupply_2019_20 =
			fsData && fsData.propertyWaterTax.value === 'Yes' && fsData.waterSupply.value === 'Yes' ? getNumberValue(fsMapper2019_20, 'totalCaptlExpWaterSupply') : 0;
		const omExpSanitation_2019_20 =
			fsData && fsData.propertySanitationTax.value === 'Yes' && fsData.sanitationService.value === 'Yes' ? getNumberValue(fsMapper2019_20, 'totalOMCaptlExpSanitation') : 0;
		const omExpWaterSupply_2020_21 =
			fsData && fsData.propertyWaterTax.value === 'Yes' && fsData.waterSupply.value === 'Yes' ? getNumberValue(fsMapper2020_21, 'totalCaptlExpWaterSupply') : 0;
		const omExpSanitation_2020_21 =
			fsData && fsData.propertySanitationTax.value === 'Yes' && fsData.sanitationService.value === 'Yes' ? getNumberValue(fsMapper2020_21, 'totalOMCaptlExpSanitation') : 0;
		const omExpWaterSupply_2021_22 =
			fsData && fsData.propertyWaterTax.value === 'Yes' && fsData.waterSupply.value === 'Yes' ? getNumberValue(fsMapper2021_22, 'totalCaptlExpWaterSupply') : 0;
		const omExpSanitation_2021_22 =
			fsData && fsData.propertySanitationTax.value === 'Yes' && fsData.sanitationService.value === 'Yes' ? getNumberValue(fsMapper2021_22, 'totalOMCaptlExpSanitation') : 0;

		// Total O&M - O&M for water suppy + O&M for sewerage and sanitation.
		// Array is created to find average.
		const arr1 = [
			getNumberValue(fsMapper2019_20, 'totalOmExp') - (omExpWaterSupply_2019_20 + omExpSanitation_2019_20),
			getNumberValue(fsMapper2020_21, 'totalOmExp') - (omExpWaterSupply_2020_21 + omExpSanitation_2020_21),
			getNumberValue(fsMapper2021_22, 'totalOmExp') - (omExpWaterSupply_2021_22 + omExpSanitation_2021_22),
		];
		const avgOfOmExp = calculateAverage(arr1);

		// Array is created to find average.
		const arr2 = [
			getNumberValue(fsMapper2019_20, 'totalExpend'),
			getNumberValue(fsMapper2020_21, 'totalExpend'),
			getNumberValue(fsMapper2021_22, 'totalExpend'),
		];
		const avgOfRevExp = calculateAverage(arr2);
		// Handling 0/ 0
		const omExpTotalRevEx = avgOfOmExp === 0 || avgOfRevExp === 0 ? 0 : avgOfOmExp / avgOfRevExp;

		return parseFloat(omExpTotalRevEx.toFixed(2));
	} catch (e) {
		return 0;
	}
}

// Function to get the months taken to audit.
function getMonthDifference(startDate, endDate) {
	const start = new Date(startDate);
	const end = new Date(endDate);

	const yearDiff = end.getFullYear() - start.getFullYear();
	const monthDiff = end.getMonth() - start.getMonth();

	return yearDiff * 12 + monthDiff;
}

// 10A. For Timely Audit - Average number of months taken by ULB in closing audit - FG
function avgMonthsForULBAudit(fsMapper2019_20, fsMapper2020_21, fsMapper2021_22) {
	try {
		const ulbValue2019_20 = getDate(fsMapper2019_20, 'auditAnnualReport');
		const ulbValue2020_21 = getDate(fsMapper2020_21, 'auditAnnualReport');
		const ulbValue2021_22 = getDate(fsMapper2021_22, 'auditAnnualReport');
		const april_2020 = new Date('2020/04/01');
		const april_2021 = new Date('2021/04/01');
		const april_2022 = new Date('2022/04/01');
		// Function call to calcuate diff.
		const noOfMonths_2019_20 = ulbValue2019_20 ? getMonthDifference(april_2020, ulbValue2019_20) : 0;
		const noOfMonths_2020_21 = ulbValue2020_21 ? getMonthDifference(april_2021, ulbValue2020_21) : 0;
		const noOfMonths_2021_22 = ulbValue2021_22 ? getMonthDifference(april_2022, ulbValue2021_22) : 0;

		// Array is created to find average.
		const arr = [noOfMonths_2019_20, noOfMonths_2020_21, noOfMonths_2021_22];
		const avgMonth = calculateAverage(arr);
		// If average month is less than 12 then ULB gets 25 marks else 0 marks;
		const avgMonthsForULBAudit = avgMonth <= 12 && avgMonth > 0 ? 25 : 0;
		return avgMonthsForULBAudit;
	} catch (e) {
		return 0;
	}
}

// 10B. For Publication of Annual Accounts - Availability for last 3 years on Cityfinance or Own website - FG
function aaPublished(fsMapperNoYear) {
	try {
		// If answer is 'Yes' then 25 marks else 0 marks.
		const isWeblink = getValue(fsMapperNoYear, 'webUrlAnnual');
		const aaPublished = isWeblink === 'www.nowebsite.com' || isWeblink === null ? 0 : 25;
		return aaPublished;
	} catch (e) {
		return 0;
	}
}

// 11A. Is the property tax register GIS-based - FG
function gisBasedPTax(fsMapperNoYear) {
	try {
		// If answer is 'Yes then 25 marks else 0 marks.
		const registerGis = getValue(fsMapperNoYear, 'registerGis') === 'Yes' ? 25 : 0;
		return registerGis;
	} catch (e) {
		return 0;
	}
}

// 11B. Do you use accounting software? ( Eg.Tally, State-prescribed ERP etc) - FG
function accSoftware(fsMapperNoYear) {
	try {
		// If answer is 'Yes then 25 marks else 0 marks.
		const accSoftware = getValue(fsMapperNoYear, 'accountStwre') === 'Yes' ? 25 : 0;
		return accSoftware;
	} catch (e) {
		return 0;
	}
}

// 12. Budget vs. Actual (Variance %) for Total Receipts (3-year average) - FG
function totalReceiptsVariance(fsMapper2019_20, fsMapper2020_21, fsMapper2021_22) {
	try {
		// Find average of total receipts actual for 3 years.
		// Array is created to find average.
		const arr1 = [
			getNumberValue(fsMapper2019_20, 'totalRecActual'),
			getNumberValue(fsMapper2020_21, 'totalRecActual'),
			getNumberValue(fsMapper2021_22, 'totalRecActual'),
		];
		const avgOFActual = calculateAverage(arr1);

		// Find average of total receipts estimate for 3 years.
		// Array is created to find average.
		const arr2 = [
			getNumberValue(fsMapper2019_20, 'RcptBudget'),
			getNumberValue(fsMapper2020_21, 'RcptBudget'),
			getNumberValue(fsMapper2021_22, 'RcptBudget'),
		];
		const avgOfEstimate = calculateAverage(arr2);

		// Acutal V/S Estimate
		// Handling denominator = 0;
		const totalReceiptsVariance = avgOfEstimate === 0 ? 0 : ((avgOFActual - avgOfEstimate) / avgOfEstimate) * 100;
		return parseFloat(totalReceiptsVariance.toFixed(2));
	} catch (e) {
		return 0;
	}
}

// 13. Own Revenue Receivables Outstanding - FG
function ownRevRecOut(fsMapperNoYear, fsMapper2021_22) {
	try {
		// ifNoError ? (indicator 25 / indicator 7.1) * 365 : 0;
		// TODO - Condition to be added >> if any error then 0 should be returned condition to be written.
		const ownRevArea = getNumberValue(fsMapperNoYear, 'totalOwnRevenueArea');
		const ownRev2021_22 = getNumberValue(fsMapper2021_22, 'totalOwnRevenue');

		// Handling denominator = 0;
		const ownRevRecOut = ownRevArea === 0 || ownRev2021_22 === 0 ? 0 : (ownRevArea / ownRev2021_22) * 365;
		return parseFloat(ownRevRecOut.toFixed(2));
	} catch (e) {
		return 0;
	}
}

// 14. Digital Own Revenue Collection (DORC) to Total Own Revenue Collection (TORC) - FG
function digtalOwnRevToTotalOwnRev(fsMapperNoYear) {
	try {
		// indicator 30 / indicator 29 + 30
		// TO-DO if any error then 0 is to be entered condition to be written.
		const digitalOwnRev = getNumberValue(fsMapperNoYear, 'fy_21_22_online');
		const totalOwnRev = getNumberValue(fsMapperNoYear, 'fy_21_22_cash') + getNumberValue(fsMapperNoYear, 'fy_21_22_online');
		const digtalOwnRevToTotalOwnRev = digitalOwnRev === 0 || totalOwnRev === 0 ? 0 : (digitalOwnRev / totalOwnRev) * 100;

		return parseFloat(digtalOwnRevToTotalOwnRev.toFixed(2));
	} catch (e) {
		return 0;
	}
}

// 15. Properties under Tax Collection net - FG
function propUnderTaxColl(fsMapperNoYear) {
	try {
		// indicator 33 / (indicator 31 - indicator 32)
		// TO-DO if any error then 0 is to be entered condition to be written.
		const paidPTax = getNumberValue(fsMapperNoYear, 'paid_property_tax');
		const denominator = getNumberValue(fsMapperNoYear, 'property_tax_register') - getNumberValue(fsMapperNoYear, 'paying_property_tax');
		const propUnderTaxColl = paidPTax === 0 || denominator === 0 ? 0 : (paidPTax / denominator) * 100;

		return parseFloat(propUnderTaxColl.toFixed(2));
	} catch (e) {
		return 0;
	}
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

// appAnnualBudget
// auditedAnnualFySt
function pushFileData(fsMapper, indicator, year, data) {
	const typeData = getFile(fsMapper, indicator);

	if (typeData) {
		const file = typeData.file;
		data.push({ year, fileName: file.name, url: file.url, modelName: typeData.modelName || undefined });
	}
	return data;
}
// Check for document availability.
function getannualBudget(fsMapper2020_21, fsMapper2021_22, fsMapper2022_23, fsMapper2023_24) {
	let data = [];
	data = pushFileData(fsMapper2020_21, 'appAnnualBudget', '2020-21', data);
	data = pushFileData(fsMapper2021_22, 'appAnnualBudget', '2021-22', data);
	data = pushFileData(fsMapper2022_23, 'appAnnualBudget', '2022-23', data);
	data = pushFileData(fsMapper2023_24, 'appAnnualBudget', '2023-24', data);
	return data;
}

function getauditedAccounts(fsMapper2018_19, fsMapper2019_20, fsMapper2020_21, fsMapper2021_22) {
	let data = [];
	data = pushFileData(fsMapper2018_19, 'auditedAnnualFySt', '2018-19', data);
	data = pushFileData(fsMapper2019_20, 'auditedAnnualFySt', '2019-20', data);
	data = pushFileData(fsMapper2020_21, 'auditedAnnualFySt', '2020-21', data);
	data = pushFileData(fsMapper2021_22, 'auditedAnnualFySt', '2021-22', data);
	return data;
}
async function getMapperData(ulbRes) {
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
				'auditedAnnualFySt', //AFS
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
				'auditedAnnualFySt', //AFS
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
				'auditedAnnualFySt', //AFS
				'appAnnualBudget', //budget
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
				'auditedAnnualFySt', //AFS
				'appAnnualBudget', //budget
			],
		},
	}).exec();

	const fsMapper2022_23 = await FiscalRankingMapper.find({
		ulb: ObjectId(ulbRes._id),
		year: ObjectId(design_year2022_23),
		type: {
			$in: ['appAnnualBudget'], //budget
		},
	}).lean();

	const fsMapper2023_24 = await FiscalRankingMapper.find({
		ulb: ObjectId(ulbRes._id),
		year: ObjectId(design_year2023_24),
		type: {
			$in: ['appAnnualBudget'], //budget
		},
	}).lean();

	return { fsMapperNoYear, fsMapper2018_19, fsMapper2019_20, fsMapper2020_21, fsMapper2021_22, fsMapper2022_23, fsMapper2023_24 };
}
async function getData(ulbRes) {
	// console.log('----in--------');
	// moongose.set('debug', true);

	// ulbRes.forEach(element => {
	//     console.log('population', element.population);
	// });
	// return res.status(200).json({
	//     status: 'true',
	//     data: ulbRes
	// });
	// const ulb = '5eb5844f76a3b61f40ba0694';
	const condition = {
		ulb: ObjectId(ulbRes._id),
		// ulb: ObjectId(ulb),
		design_year: ObjectId(design_year2022_23),
	};
	let fsData = await FiscalRanking.findOne(condition).lean();
	if (!fsData) {
		// if not started just create basic ulb details
		const scoringData = {
			name: ulbRes.name,
			ulb: ulbRes._id,
			location: ulbRes.location,
			censusCode: ulbRes.censusCode,
			sbCode: ulbRes.sbCode,
			isActive: ulbRes.isActive,
			population: ulbRes.population,
			populationBucket: getPopulationBucket(ulbRes.population),
			state: ulbRes.state,
			currentFormStatus: 1,
		};
		// console.log(scoringData);

		await ScoringFiscalRanking.create(scoringData);
		return 'no data';
	}

	const { fsMapperNoYear, fsMapper2018_19, fsMapper2019_20, fsMapper2020_21, fsMapper2021_22, fsMapper2022_23, fsMapper2023_24 } =
		await getMapperData(ulbRes);
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

	const annualBudgets = getannualBudget(fsMapper2020_21, fsMapper2021_22, fsMapper2022_23, fsMapper2023_24);
	const auditedAccounts = getauditedAccounts(fsMapper2018_19, fsMapper2019_20, fsMapper2020_21, fsMapper2021_22);

	const scoringData = {
		name: ulbRes.name,
		ulb: ulbRes._id,
		location: ulbRes.location,
		censusCode: ulbRes.censusCode,
		sbCode: ulbRes.sbCode,
		isActive: ulbRes.isActive,
		population: ulbRes.population,
		populationBucket: getPopulationBucket(ulbRes.population),
		state: ulbRes.state,
		currentFormStatus: fsData.currentFormStatus,

		annualBudgets,
		auditedAccounts,

		totalBudgetDataPC_1: { score: totalBudgetDataPC_1 },
		ownRevenuePC_2: { score: ownRevenuePC_2 },
		pTaxPC_3: { score: pTaxPC_3 },
		cagrInTotalBud_4: { score: cagrInTotalBud_4 },
		cagrInOwnRevPC_5: { score: cagrInOwnRevPC_5 },
		cagrInPropTax_6: { score: cagrInPropTax_6 },
		capExPCAvg_7: { score: capExPCAvg_7 },
		cagrInCapExpen_8: { score: cagrInCapExpen_8 },
		omExpTotalRevExpen_9: { score: omExpTotalRevExpen_9 },
		avgMonthsForULBAuditMarks_10a: { score: avgMonthsForULBAuditMarks_10a },
		aaPushishedMarks_10b: { score: aaPushishedMarks_10b },
		gisBasedPTaxMarks_11a: { score: gisBasedPTaxMarks_11a },
		accSoftwareMarks_11b: { score: accSoftwareMarks_11b },
		receiptsVariance_12: { score: receiptsVariance_12 },
		ownRevRecOutStanding_13: { score: ownRevRecOutStanding_13 },
		digitalToTotalOwnRev_14: { score: digitalToTotalOwnRev_14 },
		propUnderTaxCollNet_15: { score: propUnderTaxCollNet_15 },
		// isProvisional: getProvisionalStatus(ulbRes.censusCode),
	};
	// console.log(scoringData);

	await ScoringFiscalRanking.create(scoringData);
	return 'created';

	// return { ulbRes, fsData, fsMapper }
}
module.exports.calculateFRScore = async (req, res) => {
	try {
		req.setTimeout(240000);
		// moongose.set('debug', true);
		const limit = req.query.limit ? parseInt(req.query.limit) : 1000;
		const page = req.query.page ? parseInt(req.query.page) : 1;
		const censusCode = 802989;
		const _id = ObjectId('5eb5844f76a3b61f40ba069b');
		// Consider only ULBs with isActive TRUE & population is not empty & not 0.
		const condition = { isActive: true, population: { $nin: [null, 0] } };
		// const condition = { isActive: true, _id, population: { $nin: [null, 0] } };
		const skip = (page - 1) * limit;
		const ulbRes = await Ulb.find(condition)
			.select('_id population isActive state code name ulbType location censusCode sbCode')
			.sort({ _id: 1 })
			.skip(skip)
			.limit(limit)
			.lean();
		console.log('ulbRes.len----------', ulbRes.length);
		ulbRes.forEach(async (ulb) => {
			if (!(await ScoringFiscalRanking.findOne({ ulb: ulb._id }))) {
				await getData(ulb);
			}
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
