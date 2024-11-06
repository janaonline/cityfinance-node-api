// const imgLocation = require('../../models/FiscalRanking');
const columns = [
  { label:'S.No', key:'sNo' },
  { label:'Ranking  Indicators', key:'rankingIndicators' },
  { label:'Unit', key:'unit' },
  { label:'Maximum  Score', key:'maximumScore' },
  { label:'Formula for computation of indicator', key:'formula' },
  {
    label:'Scoring Methodology (Computation of Scores)',
    key:'scoringMethodology',
  },
  { label:'Scoring Logic', key:'scoringLogic' },
];

const data = {
  resourceMobilization:{
    id:1,
    key:'resourceMobilization',
    name:'Resource Mobilization',
    description:'Resource Mobilization is crucial for ULBs to ensure financial stability and growth. It enables them to provide essential services, infrastructure development, and quality of life improvements for urban residents.',
    imgUrl:'assets/fiscal-rankings/RM-Home.png',
    scoringInfo:{
      header:'Scoring Information',
      items:[
        {
          key:'numberOfIndicators',
          value:6,
          title:'Number of Indicators',
        },
        {
          key:'maximumScoreforIndicator',
          value:100,
          title:'Maximum Score for Each Indicator',
        },
        {
          key:'maximumScore',
          value:600,
          title:'Maximum Score',
        },
      ],
    },
    scoringMethodology:{
      header:'Indicators and Scoring Methodology',
    },
    table:{
      columns,
      data:[
        {
          sNo:'1',
          rankingIndicators:'Total Budget size per capita (Actual Total Receipts)',
          unit:'INR',
          maximumScore:'100',
          financialYears:'2021-22',
          dataSource:'Annual budget 2023-24',
          formula:'[Total budget size (actual receipts) - total receipts for water supply and sanitation]/ ULB Population',
          scoringMethodology:'(ULB number/ Highest ULB number) * Maximum score',
          scoringLogic:'Higher the better',
        },
        {
          sNo:'2',
          rankingIndicators:'Own Revenue per capita',
          unit:'INR',
          maximumScore:'100',
          financialYears:'2021-22',
          dataSource:'Annual budget 2023-24',
          formula:'[Total own revenues - own revenues from water supply and sanitation]/ ULB Population',
          scoringMethodology:'---same as above---',
          scoringLogic:'Higher the better',
        },
        {
          sNo:'3',
          rankingIndicators:'Property Tax per capita',
          unit:'INR',
          maximumScore:'100',
          financialYears:'2021-22',
          dataSource:'Annual budget 2023-24',
          formula:'[Total property tax - tax revenues from water supply and sanitation]/ ULB Population',
          scoringMethodology:'---same as above---',
          scoringLogic:'Higher the better',
        },
        {
          sNo:'4',
          rankingIndicators:'Growth (3-Year CAGR) in Total Budget Size (Total actual receipts)',
          unit:'%',
          maximumScore:'100',
          financialYears:'2018-19 to 2021-22',
          dataSource:'Annual budgets 2020-21 to 2023-24',
          formula:'3-year CAGR in indicator 1',
          scoringMethodology:'[(ULB number - Lowest ULB number)/ (Highest - Lowest)] * Maximum Score',
          scoringLogic:'Higher the better',
        },
        {
          sNo:'5',
          rankingIndicators:'Growth (3-Year CAGR) in Own Revenue per capita',
          unit:'%',
          maximumScore:'100',
          financialYears:'2018-19 to 2021-22',
          dataSource:'Annual budgets 2020-21 to 2023-24',
          formula:'3-year CAGR in indicator 2',
          scoringMethodology:'---same as above---',
          scoringLogic:'Higher the better',
        },
        {
          sNo:'6',
          rankingIndicators:'Growth (3-Year CAGR) in Property Tax per capita',
          unit:'%',
          maximumScore:'100',
          financialYears:'2018-19 to 2021-22',
          dataSource:'Annual budgets 2020-21 to 2023-24',
          formula:'3-year CAGR in indicator 3',
          scoringMethodology:'---same as above---',
          scoringLogic:'Higher the better',
        },
      ],
    },
  },
  expenditurePerformance:{
    id:2,
    key:'expenditurePerformance',
    name:'Expenditure Performance',
    description:'Expenditure Performance is critical for ULBs to efficiently allocate resources, ensure quality infrastructure, and deliver services effectively. It contributes to improving the overall living conditions in urban areas.',
    imgUrl:'assets/fiscal-rankings/EP-Home.png',
    scoringInfo:{
      header:'Scoring Information',
      items:[
        {
          key:'numberOfIndicators',
          value:3,
          title:'Number of Indicators',
        },
        {
          key:'maximumScoreforIndicator',
          value:100,
          title:'Maximum Score for Each Indicator',
        },
        {
          key:'maximumScore',
          value:300,
          title:'MaximumScore',
        },
      ],
    },
    scoringMethodology:{
      header:'Indicators and Scoring Methodology',
    },
    table:{
      columns,
      data:[
        {
          sNo:7,
          rankingIndicators:'Capital Expenditure per capita (3-year average)',
          unit:'INR',
          maximumScore:100,
          financialYears:'2019-20 to 2021-22',
          dataSource:'Audited accounts 2019-20 to 2021-22',
          formula:'[Total capital expenditure - capex for water supply and sanitation]/ ULB Population',
          scoringMethodology:'(ULB number/ Highest ULB number) * Maximum score',
          scoringLogic:'Higher the better',
        },
        {
          sNo:8,
          rankingIndicators:'Growth (3-Year CAGR) in Capex per capita',
          unit:'INR',
          maximumScore:100,
          financialYears:'2018-19 to 2021-22',
          dataSource:'Audited accounts 2018-19 to 2021-22',
          formula:'3-year CAGR in indicator 7',
          scoringMethodology:'[(ULB number - Lowest ULB number)/ (Highest - Lowest)] * Maximum score',
          scoringLogic:'Higher the better',
        },
        {
          sNo:9,
          rankingIndicators:'O&M expenses to Total Revenue Expenditure (TRE) (3-year average)',
          unit:'%',
          maximumScore:100,
          financialYears:'2019-20 to 2021-22',
          dataSource:'Annual budgets 2021-22 to 2023-24',
          formula:'[Total O&M expenditure - O&M for water supply and sanitation]/ Total Revenue expenditure',
          scoringMethodology:'(ULB number/ Highest ULB number) * Maximum score',
          scoringLogic:'Higher the better',
        },
      ],
    },
  },
  fiscalGovernance:{
    id:3,
    key:'fiscalGovernance',
    name:'Fiscal Governance',
    description:'Fiscal Governance is vital for ULBs to maintain transparency, ensure efficient revenue collection, and effectively manage budgets. It enhances financial accountability and the ability to fund essential services.',
    imgUrl:'assets/fiscal-rankings/FG-Home.png',
    scoringInfo:{
      header:'Scoring Information',
      items:[
        {
          key:'numberOfIndicators',
          value:6,
          title:'Number of Indicators',
        },
        {
          key:'maximumScoreforIndicator',
          value:50,
          title:'Maximum Score for Each Indicator',
        },
        {
          key:'maximumScore',
          value:300,
          title:'MaximumScore',
        },
      ],
    },
    scoringMethodology:{
      header:'Indicators and Scoring Methodology',
    },
    table:{
      columns,
      data:[
        {
          sNo:10,
          rankingIndicators:"Timely Audit Closure & Publication of Audited Annual Accounts in public domain (on Cityfinance.in/ ULB's own website), for 3 years",
          unit:'Yes/ No',
          maximumScore:50,
          financialYears:'2019-20 to 2021-22',
          dataSource:'Audited accounts 2019-20 to 2021-22 and Self-reported by ULB',
          formula:'Calculation in two parts (25 marks each):\n(1). For Timely Audit - Average number of months taken by ULB in closing audit (i.e. Date of audit report minus date of FY close), average of 3-year period;\n(2). For Publication of Annual Accounts - Availability for last 3 years on Cityfinance/Own website (Yes/ No)',
          scoringMethodology:'(1). Audit closure within 12 months of FY end= 25; for>12 months= 0;\n(2). Yes= 25; No= 0',
          scoringLogic:'Binary',
        },
        {
          sNo:11,
          rankingIndicators:'Property Tax & Accounting System followed - Manual vs IT - based?',
          unit:'Yes/ No',
          maximumScore:50,
          asOfDate:'As on 1st March, 2023',
          dataSource:'Self-reported by ULB',
          formula:'Calculation in two parts (25 marks each):\n(1). For Property-tax- whether property tax records are linked to GIS-based system? (Yes/No);\n(2). For accounting- whether accounting is done on either standalone software like Tally, e-biz etc, or a state-level centralized system like ERP, Digit etc. (Yes/No)',
          scoringMethodology:'(1). Yes= 25; No= 0;\n(2). Yes= 25; No=0',
          scoringLogic:'Binary',
        },
        {
          sNo:12,
          rankingIndicators:'Budget vs. Actual (Variance %) for Total Receipts (3-year average)',
          unit:'%',
          maximumScore:50,
          financialYears:'2019-20 to 2021-22',
          dataSource:'Annual budgets 2019-20 to 2023-24',
          formula:'(Actual Total Receipts – BE^ Total Receipts)/ BE^ Total Receipts (^Budget Estimate)',
          scoringMethodology:'If Variance % is: -10% to +20%= 100% of max score | Above +20%= 90% of max score | -25% to -10%= 80% of max score | Below -25%= proportionate based on scale of 75% of max score',
          scoringLogic:'Percentage based on variance',
        },
        {
          sNo:13,
          rankingIndicators:'Own Revenue Receivables Outstanding',
          unit:'No of days',
          maximumScore:50,
          financialYears:'2021-22',
          dataSource:'Self-reported by ULB',
          formula:'(Total own revenue arrears as on 31st March 2022/ Total own revenues for FY 2021-22) * 365',
          scoringMethodology:'[(Maximum ULB number - ULB number)/ (Highest - Lowest)] * Maximum score',
          scoringLogic:'Lower the better',
        },
        {
          sNo:14,
          rankingIndicators:'Digital Own Revenue Collection (DORC) to Total Own Revenue Collection (TORC)',
          unit:'%',
          maximumScore:50,
          financialYears:'2021-22',
          dataSource:'Self-reported by ULB',
          formula:'(Digital own revenue collection/ Total own revenue collection)',
          scoringMethodology:'(ULB number/ Highest ULB number) * Maximum score',
          scoringLogic:'Higher the better',
        },
        {
          sNo:15,
          rankingIndicators:'Properties under Tax Collection net',
          unit:'%',
          maximumScore:50,
          financialYears:'2021-22',
          dataSource:'Self-reported by ULB',
          formula:'[Properties from which property tax was collected during FY 2021-22/ (Total no. of assessed properties as on 31st March 2022 – Total no. of exempt properties as on 31st March 2022)]',
          scoringMethodology:'(ULB number/ Highest ULB number) * Maximum score',
          scoringLogic:'Higher the better',
        },
      ],
    },
  },
};

module.exports.assessmentParametersDashboard = async (req, res) => {
  try {
    console.log('hi');
    return res.status(200).json({ data });
  } catch (error) {
    console.log('error', error);
    return res.status(400).json({
      status:false,
      message:error.message,
    });
  }
};
