let arr = [
    {
      key: 'taxRevenue',
      label: 'Tax Revenue',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '1',
      input: 'number'
    },
    {
      key: 'propertyTax',
      label: 'Property Tax',
      codes: [ '11001' ],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '1.1',
      input: 'number'
    },
    {
      key: 'waterTax',
      label: 'Water tax',
      codes: [ 11002 ],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '1.2',
      max:9999999,
      min:0,
      input: 'number'
    },
    {
      key: 'drainageTax',
      label: 'Drainage tax',
      codes: [ 11002 ],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '1.3',
      input: 'number'
    },
    {
      key: 'sewerageTax',
      label: 'Sewerage tax',
      codes: [ 11003 ],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '1.4',
      input: 'number'
    },
    {
      key: 'profTax',
      label: 'Professional tax',
      codes: [ 11010 ],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '1.5',
      input: 'number'
    },
    {
      key: 'entertainTax',
      label: 'Entertainment tax',
      codes: [ 11011 ],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '1.6',
      input: 'number'
    },
    {
      key: 'advTax',
      label: 'Advertisement tax',
      codes: [ 11012 ],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '1.7',
      input: 'number'
    },
    {
      key: 'otherTaxRev',
      label: 'All other tax revenues (combined)',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '1.8',
      input: 'number'
    },
    {
      key: 'feeUserChrg',
      label: 'Fees & User charges',
      codes: [ 140 ],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '2',
      input: 'number'
    },
    {
      key: 'waterSupplyFee',
      label: 'Fees & user charges from Water supply',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '2.1',
      input: 'number'
    },
    {
      key: 'sanitationFee',
      label: 'Fees & user charges from Sanitation/seweragee',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '2.2',
      input: 'number'
    },
    {
      key: 'garbageFee',
      label: 'Fees & user charges from Garbage collection / Solid waste managemente',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '2.3',
      input: 'number'
    },
    {
      key: 'otherFee',
      label: 'All other fees & user charges (combined)',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '2.4',
      input: 'number'
    },
    {
      key: 'rentInc',
      label: 'Rental Income from Municipal Properties',
      codes: [ 130 ],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '3',
      input: 'number'
    },
    {
      key: 'assignedCompensation',
      label: 'Assigned Revenues & Compensation',
      codes: [ 120 ],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '4',
      input: 'number'
    },
    {
      key: 'octroiCompensation',
      label: 'Compensation in lieu of Octroi',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '4.1',
      input: 'number'
    },
    {
      key: 'otherCompensation',
      label: 'All other assigned revenues & compensation (combined)',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '4.2',
      input: 'number'
    },
    {
      key: 'revGrants',
      label: 'Revenue Grants, Contributions & Subsidies',
      codes: [ 160 ],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '5',
      input: 'number'
    },
    {
      key: 'centralGrant',
      label: 'Revenue Grants from Union/Central Government',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
  displayPriority: '5.1',
      input: 'number'
    },
    {
      key: 'cfcGrant',
      label: 'Central Finance Commission (CFC) grants',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '5.11',
      input: 'number'
    },
    {
      key: 'cssGrant',
      label: 'Centrally sponsored schemes (CSS) grants',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '5.12',
      input: 'number'
    },
    {
      key: 'centralscheme',
      label: 'Central sector scheme grants',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '5.13',
      input: 'number'
    },
    {
      key: 'centralTransfer',
      label: 'Other central transfers (combined)',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '5.14',
      input: 'number'
    },
    {
      key: 'stateGrant',
      label: 'Revenue Grants from State Government',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '5.2',
      input: 'number'
    },
    {
      key: 'sfcGrant',
      label: 'State Finance Commission (SFC) grants',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '5.21',
      input: 'number'
    },
    {
      key: 'stateScheme',
      label: 'Transfers under State schemes',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '5.22',
      input: 'number'
    },
    {
      key: 'otherStateTrans',
      label: 'Other state transfers (combined)',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '5.23',
      input: 'number'
    },
    {
      key: 'otherGrant',
      label: 'All other revenue grants, contributions & subsidies (combined)',
      codes: [ 100, 150, 170, 171, 180 ],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '5.3',
      input: 'number'
    },
    {
      key: 'otherIncome',
      label: 'Other income (incl. Sale & Hire charges, Income from Investments, Interest earned, etc.)',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '6',
      input: 'number'
    },
    {
      key: 'totalIncome',
      label: 'TOTAL INCOME (sum of 1 to 6)',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '7',
      input: 'number'
    },
    {
      key: 'establishExpense',
      label: 'Establishment Expenses',
      codes: [ 210 ],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '8',
      input: 'number'
    },
    {
      key: 'categoryA',
      label: 'Towards category A',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '8.1',
      input: 'number'
    },
    {
      key: 'categoryB',
      label: 'Towards category B',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '8.2',
      input: 'number'
    },
    {
      key: 'categoryC',
      label: 'Towards category C',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '8.3',
      input: 'number'
    },
    {
      key: 'otherEstExpense',
      label: 'Other establishment expenses (combined)',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '8.4',
      input: 'number'
    },
    {
      key: 'adminExpense',
      label: 'Administrative Expenses',
      codes: [ 220 ],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '9',
      input: 'number'
    },
    {
      key: 'totalOmExp',
      label: 'Operations & Maintenance',
      codes: [ 230 ],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '10',
      input: 'number'
    },
    {
      key: 'totalOMCaptlExpWaterSupply',
      label: 'O & M Expenditure for Water Supply',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '10.1',
      input: 'number'
    },
    {
      key: 'totalOMCaptlExpSanitation',
      label: 'O & M Expenditure for Sanitation/Sewerage',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '10.2',
      input: 'number'
    },
    {
      key: 'omExpOther',
      label: 'All other O&M expenses (combined)',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '10.3',
      input: 'number'
    },
    {
      key: 'finExpense',
      label: 'Interest & Finance Expenses',
      codes: [ 240 ],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '11',
  input: 'number'
    },
    {
      key: 'misExpense',
      label: 'Depreciation, Provisions & Write off, Miscellaneous Expenses',
      codes: [ 270, 271, 272 ],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '12',
      input: 'number'
    },
    {
      key: 'otherExpense',
      label: 'Other expenses (incl. Programme Expenses, Revenue Grants, Contributions & Subsidies)',
      codes: [ 200, 250, 260 ],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '13',
      input: 'number'
    },
    {
      key: 'totalExpend',
      label: 'TOTAL EXPENDITURE (sum of 8 to 13)',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '14',
      input: 'number'
    },
    {
      key: 'grossBeforePrior',
      label: 'Gross surplus/ (deficit) of income over expenditure before Prior Period Items',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '15',
      input: 'number'
    },
    {
      key: 'priorItems',
      label: 'Add: Prior Period Items (Net)',
      codes: [ 280 ],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '16',
      input: 'number'
    },
    {
      key: 'grossAfterPrior',
      label: 'Gross surplus/ (deficit) of income over expenditure before Prior Period Items',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '17',
      input: 'number'
    },
    {
      key: 'reservFunds',
      label: 'Less: Transfer to Reserve Funds',
      codes: [ 290 ],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '18',
      input: 'number'
    },
    {
      key: 'netBal',
      label: 'Net Balance Being Surplus/ Deficit Carried Over to Municipal Accounts',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '19',
      input: 'number'
    },
    {
      key: 'OwnRvnue',
      label: 'Total Own Revenues (sum of 1 to 3 above)',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '20',
      input: 'number'
    },
    {
      key: 'totalOwnRevenues',
      label: 'Total Own Revenues ',
      codes: [ '110', '130', '140', '150', '180' ],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '20',
      input: 'number'
    },
    {
      key: 'RvnueExp',
      label:'Total Revenue Expenditure (14 above)',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '21',
      input: 'number'
    },
    {
      key: 'CaptlExp',
      label: 'Total Revenue Expenditure (14 above)',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '22',
      input: 'number'
    },
    {
      key: 'totalCaptlExp',
      label: 'Total Capital Expenditure',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '22',
      input: 'number'
    },
    {
      key: 'CaptlExpWaterSupply',
      label: 'Capital Expenditure for Water Supply',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '22.1',
      input: 'number'
    },
    {
      key: 'CaptlExpSanitation',
      label: 'Capital Expenditure for Water Supply',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '22.2',
      input: 'number'
    },
    {
      key: 'CaptExpOther',
      label: 'Other Capital Expenditure (combined)',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '22.3',
      input: 'number'
    },
    {
      key: 'fixedAsset',
      label: 'Total Fixed Assets (Gross Block)',
      codes: [ 410 ],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '23',
      input: 'number'
    },
    {
      key: 'faLandBuild',
      label: 'Land & Buildings',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '23.1',
      input: 'number'
    },
    {
      key: 'faOther',
      label: 'Other Fixed Assets',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '23.2',
      input: 'number'
    },
    {
      key: 'debtOs',
      label: 'Total Debt outstanding',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '24',
      input: 'number'
    },
    {
      key: 'assetsSale',
      label: 'Income from Sale of Assets',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '25',
      input: 'number'
    },
    {
      key: 'incmLandSale',
      label: 'Income from Sale of Land',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '25.1',
      input: 'number'
    },
    {
      key: 'incmOtherAssets',
      label: 'Income from Sale of Other Assets',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '25.2',
      input: 'number'
    },
    {
      key: 'totalRecActual',
      label: 'Total Receipts (Actual)',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '26',
      input: 'number'
    },
    {
      key: 'totalRcptWaterSupply',
      label: 'Total Receipts (Actual) for Water Supply',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '27',
      input: 'number'
    },
    {
      key: 'totalRcptSanitation',
      label: 'Total Receipts (Actual) for Sanitation/Sewerage',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '28',
      input: 'number'
    },
    {
      key: 'totalRecBudgetEst',
      label: 'Total Receipts (Budget Estimate)',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '29',
      input: 'number'
    },
    {
      key: 'auditAnnualReport',
      label: 'Own Revenue Details',
      codes: [],
      years: [ '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '30',
      input: 'number'
    },
    {
      key: 'totalOwnRevenueArea',
      label: 'Total Own Revenue Arrears as on 31st March 2022',
      codes: [],
      years: [ '2018-19', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '31',
      input: 'number'
    },
    {
      key: 'webUrlAnnual',
      label: 'ULB website URL link where Audited Accounts are available',
      codes: [],
      years: [ '2021-22', '2019-20', '2020-21', '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '32',
      input: 'number'
    },
    {
      key: 'registerGis',
      label: 'Is the property tax register GIS-based?',
      codes: [],
      years: [ '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '33',
      input: 'number'
    },
    {
      key: 'registerGisProof',
      label: 'Please upload proof?',
      codes: [],
      years: [ '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '34',
      input: 'number'
    },
    {
      key: 'accountStwre',
      label: 'Do you use accounting software? ( Eg.Tally, State-prescribed ERP etc)',
      codes: [],
      years: [ '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '35',
      input: 'number'
    },
    {
      key: 'accountStwreProof',
      label: 'Please upload proof?',
      codes: [],
      years: [ '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '36',
      input: 'number'
    },
    {
      key: 'fy_21_22_cash',
      label: 'Own Revenue collection amount for FY 2021-22 - by Cash/Cheque/DD',
      codes: [],
      years: [ '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '37',
      input: 'number'
    },
    {
      key: 'fy_21_22_online',
      label: 'Own Revenue collection amount for FY 2021-22 - by Online modes/channels',
      codes: [],
      years: [ '2018-19' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '38',
      input: 'number'
    },
    {
      key: 'property_tax_register',
      label: 'Number of Properties assessed/listed as per Property Tax Register',
      codes: [],
      years: [ '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '39',
      input: 'number'
    },
    {
      key: 'paying_property_tax',
      label: 'Number of Properties assessed/listed as per Property Tax Register (as on 1st April 2022)',
      codes: [],
      years: [ '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '40',
      input: 'number'
    },
    {
      key: 'paid_property_tax',
      label: 'Number of Properties exempt from paying Property Tax',
      codes: [],
      years: [ '2021-22' ],
      formFieldType: 'number',
      required: true,
      displayPriority: '41',
      input: 'number'
    }
  ]