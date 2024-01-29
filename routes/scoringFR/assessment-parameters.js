// const imgLocation = require('../../models/FiscalRanking');
const columns = [
	{ "label": "S.No", "key": "sNo" },
	{ "label": "Ranking  Indicators ", "key": "rankingIndicators" },
	{ "label": "Unit", "key": "unit" },
	{ "label": "Maximum  Score ", "key": "maximumScore" },
	{ "label": "Financial year(s)", "key": "financialYears" },
	{ "label": "Data Source", "key": "dataSource" },
	{ "label": "Formula for computation of indicator ", "key": "formula" },
	{ "label": "Scoring Methodology (Computation of Scores)", "key": "scoringMethodology" },
	{ "label": "Scoring Logic ", "key": "scoringLogic" }
];

const data = {
	"resourceMobilisation": {
		"id": 1,
		"key": "resourceMobilisation",
		"name": "Resource Mobilisation",
		"subHeading": "Fueling Urban Growth",
		"description":
			"Resource Mobilization is a crucial parameter that evaluates the financial \n                    strength and growth potential of Urban Local Bodies (ULBs). Discover the significance of\n                    resource mobilization, how it's assessed, and its impact on ULB rankings and urban development.",
		"imgUrl": "../../../assets/fiscal-rankings/smart-industry-control-concept 1.png",
		"questions": [
			{
				"question": "Why is Resource Mobilization Important?",
				"answer":
					"Resource Mobilization is crucial for ULBs to ensure financial stability and growth.\n           It enables them to provide essential services,\n           infrastructure development, and quality of life improvements for urban residents.",
			},
			{
				"question": "How Resource Mobilization helps ULB Scoring?",
				"answer":
					"Resource Mobilization significantly influences ULB rankings. Higher mobilization indicates better financial health,\n           leading to higher scores and better ULB positions in the rankings.",
			},
		],
		"scoringInfo": {
			"header": "Scoring Information",
			"items": [
				{
					"key": "numberOfIndicators",
					"value": 6,
					"title": "Number of Indicators",
				},
				{
					"key": "maximumScoreforIndicator",
					"value": 100,
					"title": "Maximum Score for Each Indicator",
				},
				{
					"key": "maximumScore",
					"value": 300,
					"title": "Maximum Score",
				},
			],
		},
		"scoringMethodology": {
			"header": "Scoring Methodology",
			"description":
				"Unveiling the Metrics Shaping Urban Financial Strength and How They're Scored. \n        Explore the assessment indicators that drive the financial health of Urban Local Bodies (ULBs) and understand the methodology behind their scoring.\n         Gain insights into the significance of resource mobilization in urban development.",
			"imgUrl": "../../../assets/fiscal-rankings/resMobTable.png",
		},
		"table": {
			columns,
			"data": [
				{
					"sNo": "1",
					"rankingIndicators": "Total Budget size per capita (Actual Total Receipts) ",
					"unit": "INR",
					"maximumScore": "100",
					"financialYears": "2021-22",
					"dataSource": "Annual budget 2023-24 ",
					"formula": "[Total budget size (actual receipts) - total receipts for water supply and sanitation<sup><b>#</b></sup>] / ULB Population ",
					"scoringMethodology": "(ULB number / Highest ULB number)* Maximum score ",
					"scoringLogic": "Higher the better  "
				},
				{
					"sNo": "2",
					"rankingIndicators": "Own Revenue per capita",
					"unit": "INR",
					"maximumScore": "100",
					"financialYears": "2021-22",
					"dataSource": "Annual budget 2023-24 ",
					"formula": "[Total own revenues - own revenues from water supply and sanitation<sup><b>##</b></sup>] / ULB Population ",
					"scoringMethodology": "---same as above--- ",
					"scoringLogic": "Higher the better  "
				},
				{
					"sNo": "3",
					"rankingIndicators": "Property Tax per capita",
					"unit": "INR",
					"maximumScore": "100",
					"financialYears": "2021-22",
					"dataSource": "Annual budget 2023-24 ",
					"formula": "[Total property tax - tax revenues from water supply and sanitation<sup><b>###</b></sup>] / ULB Population ",
					"scoringMethodology": "---same as above--- ",
					"scoringLogic": "Higher the better  "
				},
				{
					"sNo": "4",
					"rankingIndicators": "Growth (3-Year CAGR) in Total Budget Size (Total actual receipts)",
					"unit": "%",
					"maximumScore": "100",
					"financialYears": "2018-19 to 2021-22",
					"dataSource": "Annual budgets 2020-21 to 2023-24",
					"formula": "3-year CAGR in indicator 1 ",
					"scoringMethodology": "[(ULB number - Lowest ULB number) / (Highest - Lowest)]* Maximum Score",
					"scoringLogic": "Higher the better  "
				},
				{
					"sNo": "5",
					"rankingIndicators": "Growth (3-Year CAGR) in Own Revenue per capita",
					"unit": "%",
					"maximumScore": "100",
					"financialYears": "2018-19 to 2021-22",
					"dataSource": "Annual budgets 2020-21 to 2023-24",
					"formula": "3-year CAGR in indicator 2 ",
					"scoringMethodology": "---same as above--- ",
					"scoringLogic": "Higher the better  "
				},
				{
					"sNo": "6",
					"rankingIndicators": "Growth (3-Year CAGR) in Property Tax per capita",
					"unit": "%",
					"maximumScore": "100",
					"financialYears": "2018-19 to 2021-22",
					"dataSource": "Annual budgets 2020-21 to 2023-24",
					"formula": "3-year CAGR in indicator 3",
					"scoringMethodology": "---same as above--- ",
					"scoringLogic": "Higher the better "
				}
			],
			"footnotes": [
				"#Total receipts shall include both revenue and capital receipts; and include own revenues, assigned revenues, grants, transfers etc. for water supply and sanitation purposes. The Own Revenues from Water Supply & Sanitation shall include: (a) Tax revenues such as water tax, drainage tax, sewerage tax; and (b) Non-Tax revenues / Fees & User charges for water supply, sanitation, and/or sewerage. Please note, Fees & User charges for solid waste management / garbage collection shall not be included.",
				"##The Own Revenues from Water Supply & Sanitation shall include: (a) Tax revenues such as water tax, drainage tax, sewerage tax; and (b) Non-Tax revenues / Fees & User charges for water supply, sanitation, and/or sewerage. Please note, Fees & User charges for solid waste management / garbage collection shall not be included.",
				"###Tax Revenues from Water Supply & Sanitation shall include: Water tax, Drainage tax, Sewerage tax."
			]
		}
	},
	"expenditurePerformance": {
		"id": 2,
		"key": "expenditurePerformance",
		"name": "Expenditure Performance",
		"subHeading": "Fueling Urban Growth",
		"description":
			"Explore the metrics that gauge Expenditure Performance and learn why it's a pivotal aspect for Urban Local Bodies (ULBs) across India.\n      Understand how Expenditure Performance influences ULB rankings and delve into the scoring methodology.",
		"imgUrl": "../../../assets/fiscal-rankings/business-people-analyzing-data-graphs-and-charts-displayed-on-the-digital-tablet-screen 1.png",
		"questions": [
			{
				"question": "Why is Expenditure Performance Important?",
				"answer":
					"Expenditure Performance is critical for ULBs to efficiently allocate resources, ensure quality infrastructure, and deliver services effectively.\n           It contributes to improving the overall living conditions in urban areas.",
			},
			{
				"question": "How Expenditure Performance Affects ULB Scoring?",
				"answer":
					"Expenditure Performance directly impacts ULB rankings.\n           Higher performance in terms of capital expenditure and cost-effective operations & maintenance expenses results in better scores and higher ULB rankings.",
			},
		],
		"scoringInfo": {
			"header": "Scoring Information",
			"items": [
				{
					"key": "numberOfIndicators",
					"value": 6,
					"title": "Number of Indicators",
				},
				{
					"key": "maximumScoreforIndicator",
					"value": 100,
					"title": "Maximum Score for Each Indicator",
				},
				{
					"key": "maximumScore",
					"value": 300,
					"title": "MaximumScore",
				},
			],
		},
		"scoringMethodology": {
			"header": "Scoring Methodology",
			"description":
				"Unveiling the Metrics Shaping Urban Financial Strength and How They're Scored. \n      Explore the assessment indicators that drive the financial health of Urban Local Bodies (ULBs) and understand the methodology behind their scoring.\n       Gain insights into the significance of resource mobilization in urban development.",
			"imgUrl": "../../../assets/fiscal-rankings/expenTable.png",
		},
		"table": {
			columns,
			"data": [
				{
					"sNo": 7,
					"rankingIndicators": "Capital Expenditure per capita (3-year average)",
					"unit": "INR",
					"maximumScore": 100,
					"financialYears": "2019-20 to 2021-22",
					"dataSource": "Audited accounts 2019-20 to 2021-22",
					"formula": "[Total capital expenditure - capex for water supply and sanitation] / ULB Population",
					"scoringMethodology": "(ULB number / Highest ULB number) * Maximum score",
					"scoringLogic": "Higher the better"
				},
				{
					"sNo": 8,
					"rankingIndicators": "Growth (3-Year CAGR) in Capex per capita",
					"unit": "INR",
					"maximumScore": 100,
					"financialYears": "2018-19 to 2021-22",
					"dataSource": "Audited accounts 2018-19 to 2021-22",
					"formula": "3-year CAGR in indicator 7",
					"scoringMethodology": "[(ULB number - Lowest ULB number) / (Highest - Lowest)] * Maximum score",
					"scoringLogic": "Higher the better"
				},
				{
					"sNo": 9,
					"rankingIndicators": "O&M expenses to Total Revenue Expenditure (TRE) (3-year average)",
					"unit": "%",
					"maximumScore": 100,
					"financialYears": "2019-20 to 2021-22",
					"dataSource": "Annual budgets 2021-22 to 2023-24",
					"formula": "[Total O&M expenditure - O&M for water supply and sanitation] / Total Revenue expenditure",
					"scoringMethodology": "(ULB number / Highest ULB number) * Maximum score",
					"scoringLogic": "Higher the better"
				}
			]
		}
	},
	"fiscalGovernance": {
		"id": 3,
		"key": "fiscalGovernance",
		"name": "Fiscal Governance",
		"subHeading": "Fueling Urban Growth",
		"description":
			"Explore the metrics that define Fiscal Governance and discover why it's a crucial aspect for Urban Local Bodies (ULBs) across India. \n      Gain insights into how Fiscal Governance influences ULB rankings and dive into the scoring methodology.",
		"imgUrl": "../../../assets/fiscal-rankings/stack-of-money-coin-with-trading-graph-for-finance-investor-cryptocurrency-digital-economy 1.png",
		"questions": [
			{
				"question": "Why is Fiscal Governance Important?",
				"answer":
					"Fiscal Governance is vital for ULBs to maintain transparency, ensure efficient revenue collection, \n          and effectively manage budgets. It enhances financial accountability and the ability to fund essential services.",
			},
			{
				"question": "How Fiscal Governance Affects ULB Scoring?",
				"answer":
					"Fiscal Governance directly impacts ULB rankings. Timely audits, robust accounting systems,\n           and digital revenue collection contribute to higher scores and improved ULB positions.",
			},
		],
		"scoringInfo": {
			"header": "Scoring Information",
			"items": [
				{
					"key": "numberOfIndicators",
					"value": 6,
					"title": "Number of Indicators",
				},
				{
					"key": "maximumScoreforIndicator",
					"value": 100,
					"title": "Maximum Score for Each Indicator",
				},
				{
					"key": "maximumScore",
					"value": 300,
					"title": "MaximumScore",
				},
			],
		},
		"scoringMethodology": {
			"header": "Scoring Methodology",
			"description":
				"Unveiling the Metrics Shaping Urban Financial Strength and How They're Scored. \n      Explore the assessment indicators that drive the financial health of Urban Local Bodies (ULBs) and understand the methodology behind their scoring.\n       Gain insights into the significance of resource mobilization in urban development.",
			"imgUrl": "../../../assets/fiscal-rankings/fiscalTable.png",
		},
		"table": {
			columns,
			"data": [
				{
					"sNo": 10,
					"rankingIndicators": "Timely Audit Closure & Publication of Audited Annual Accounts in public domain (on Cityfinance.in/ ULB's own website), for 3 years",
					"unit": "Yes / No",
					"maximumScore": 50,
					"financialYears": "2019-20 to 2021-22",
					"dataSource": "Audited accounts 2019-20 to 2021-22 and Self-reported by ULB",
					"formula": "Calculation in two parts (25 marks each): 1. For Timely Audit - Average number of months taken by ULB in closing audit (i.e. Date of audit report minus date of FY close), average of 3-year period; 2. For Publication of Annual Accounts - Availability for last 3 years on Cityfinance/Own website (Yes/No)",
					"scoringMethodology": "1. Audit closure within 12 months of FY end=25; for>12 months=0; 2. Yes= 25; No= 0",
					"scoringLogic": "Binary"
				},
				{
					"sNo": 11,
					"rankingIndicators": "Property Tax & Accounting System followed - Manual vs IT - based?",
					"unit": "Yes / No",
					"maximumScore": 50,
					"asOfDate": "As on 1st March, 2023",
					"dataSource": "Self-reported by ULB",
					"formula": "Calculation in two parts (25 marks each): 1. For Property-tax- whether property tax records are linked to GIS-based system? (Yes/No); 2. For accounting- whether accounting is done on either standalone software like Tally, e-biz etc, or a state-level centralized system like ERP, Digit etc. (Yes/No)",
					"scoringMethodology": "1. Yes= 25; No= 0; 2. Yes= 25; No=0",
					"scoringLogic": "Binary"
				},
				{
					"sNo": 12,
					"rankingIndicators": "Budget vs. Actual (Variance %) for Total Receipts (3-year average)",
					"unit": "%",
					"maximumScore": 50,
					"financialYears": "2019-20 to 2021-22",
					"dataSource": "Annual budgets 2019-20 to 2023-24",
					"formula": "(Actual Total Receipts – BE^ Total Receipts) / BE^ Total Receipts (^Budget Estimate)",
					"scoringMethodology": "If Variance % is: -10% to +20%= 100% of max score; Above +20%= 90% of max score; -25% to -10%= 80% of max score; Below -25%= proportionate based on scale of 75% of max score",
					"scoringLogic": "Percentage based on variance"
				},
				{
					"sNo": 13,
					"rankingIndicators": "Own Revenue Receivables Outstanding",
					"unit": "No of days",
					"maximumScore": 50,
					"financialYears": "2021-22",
					"dataSource": "Self-reported by ULB",
					"formula": "(Total own revenue arrears as on 31st March 2022 / Total own revenues for FY 2021-22) * 365",
					"scoringMethodology": "[(Maximum ULB number - ULB number) / (Highest - Lowest)] * Maximum score",
					"scoringLogic": "Lower the better"
				},
				{
					"sNo": 14,
					"rankingIndicators": "Digital Own Revenue Collection (DORC) to Total Own Revenue Collection (TORC)",
					"unit": "%",
					"maximumScore": 50,
					"financialYears": "2021-22",
					"dataSource": "Self-reported by ULB",
					"formula": "(Digital own revenue collection / Total own revenue collection)",
					"scoringMethodology": "(ULB number / Highest ULB number) * Maximum score",
					"scoringLogic": "Higher the better"
				},
				{
					"sNo": 15,
					"rankingIndicators": "Properties under Tax Collection net",
					"unit": "%",
					"maximumScore": 50,
					"financialYears": "2021-22",
					"dataSource": "Self-reported by ULB",
					"formula": "[Properties from which property tax was collected during FY 2021-22 / (Total no. of assessed properties as on 31st March 2022 – Total no. of exempt properties as on 31st March 2022)]",
					"scoringMethodology": "(ULB number / Highest ULB number) * Maximum score",
					"scoringLogic": "Higher the better"
				}
			]
		}
	},
};

module.exports.assessmentParametersDashboard = async (req, res) => {
	try {
		console.log("hi");
		return res.status(200).json({ data });
	} catch (error) {
		console.log("error", error);
		return res.status(400).json({
			status: false,
			message: error.message,
		});
	}
};
