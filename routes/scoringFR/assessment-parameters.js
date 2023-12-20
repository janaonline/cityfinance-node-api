// const imgLocation = require('../../models/FiscalRanking');

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
