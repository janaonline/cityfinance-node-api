
//<----- ulb-service.js ----->//
module.exports.abYears = ['2020-21', '2021-22', '2022-23', '2023-24'];
module.exports.afsYears = ['2018-19', '2019-20', '2020-21', '2021-22'];

const decimalPlace = 2;

// Assessment parameter table labels/ questions - ULB details.
module.exports.assesmentParamLabels = [
    {
        units: 'Rs.',
        sno: '1',
        key: 'totalBudgetDataPC_1',
        type: 'resourceMobilization',
        title: 'Total Budget size per capita (Actual Total Reciepts)',
    },
    { units: 'Rs.', sno: '2', key: 'ownRevenuePC_2', type: 'resourceMobilization', title: 'Own Revenue per capita' },
    { units: 'Rs.', sno: '3', key: 'pTaxPC_3', type: 'resourceMobilization', title: 'Property Tax per capita' },
    {
        units: '%',
        sno: '4',
        key: 'cagrInTotalBud_4',
        type: 'resourceMobilization',
        title: 'Growth (3 Year CAGR) in Total Budget Size (Total actual reciept)',
    },
    { units: '%', sno: '5', key: 'cagrInOwnRevPC_5', type: 'resourceMobilization', title: 'Growth (3 Year CAGR) in Own Revenue per capita' },
    { units: '%', sno: '6', key: 'cagrInPropTax_6', type: 'resourceMobilization', title: 'Growth (3 Year CAGR) in Property Tax per capita' },
    { units: 'Rs.', sno: '7', key: 'capExPCAvg_7', type: 'expenditurePerformance', title: 'Capital Expenditure per capita (3-year average)' },
    { units: '%', sno: '8', key: 'cagrInCapExpen_8', type: 'expenditurePerformance', title: 'Growth (3-Year CAGR) in Capex per capita' },
    {
        units: 'Rs.',
        sno: '9',
        key: 'omExpTotalRevExpen_9',
        type: 'expenditurePerformance',
        title: 'O&M expenses to Total Revenue Expenditure (TRE) (3- year average)',
    },
    {
        units: 'No. of months',
        sno: '10a',
        key: 'avgMonthsForULBAuditMarks_10a',
        type: 'fiscalGovernance',
        title:
            'For Timely Audit - Average number of months taken by ULB in closing audit (i.e. Date of audit report minus date of FY close), average of 3 year period',
    },
    {
        units: 'Yes/ No',
        sno: '10b',
        key: 'aaPushishedMarks_10b',
        type: 'fiscalGovernance',
        title: 'For Publication of Annual Accounts - Availability for last 3 years on Cityfinance/ Own website',
    },
    {
        units: 'Yes/ No',
        sno: '11a',
        key: 'gisBasedPTaxMarks_11a',
        type: 'fiscalGovernance',
        title: 'For Property-tax - whether property tax records are linked to GIS-based system?',
    },
    {
        units: 'Yes/ No',
        sno: '11b',
        key: 'accSoftwareMarks_11b',
        type: 'fiscalGovernance',
        title:
            'For Accounting - whether accounting is done on either standalone software like Tally, e-biz etc, or a state-level centralized system like ERP, Digit etc.',
    },
    {
        units: '%',
        sno: '12',
        key: 'receiptsVariance_12',
        type: 'fiscalGovernance',
        title: 'Budget vs. Actual (Variance %) for Total Receipts (3-year average)',
    },
    { units: 'No. of days', sno: '13', key: 'ownRevRecOutStanding_13', type: 'fiscalGovernance', title: 'Own Revenue Receivables Outstanding' },
    {
        units: '%',
        sno: '14',
        key: 'digitalToTotalOwnRev_14',
        type: 'fiscalGovernance',
        title: 'Digital Own Revenue Collection (DORC) to Total Own Revenue Collection (TORC)',
    },
    { units: '%', sno: '15', key: 'propUnderTaxCollNet_15', type: 'fiscalGovernance', title: 'Properties under Tax Collection net' },
];

// AFS & Budget document details.
module.exports.getTableHeaderDocs = {
  columns: [
    {
      label: 'S.No',
      key: 'sNo',
      class: 'text-center',
      width: '2',
    },
    {
      label: 'ULB Name',
      key: 'ulbName',
      sort: 1,
      query: '',
      sortable: true,
      class: '',
      link: 'ulbNameLink'
    },
    {
      label: 'Population Category',
      key: 'populationCategory',
      sortable: true,
      class: '',
    },
    {
      label: 'ULB Participated',
      key: 'isUlbParticipated',
      sortable: true,
      class: '',
    },
    {
      label: 'CFR Ranked',
      key: 'isUlbRanked',
      sortable: true,
      class: '',
    },
    {
      label: 'Annual Financial Statement Available',
      key: 'auditedAccounts2018-19',
      colspan: 4,
      class: '',
      pdfLink: true,
    },
    {
      label: '',
      key: 'auditedAccounts2019-20',
      hidden: true,
      pdfLink: true,
    },
    {
      label: '',
      key: 'auditedAccounts2020-21',
      hidden: true,
      pdfLink: true,
    },
    {
      label: '',
      key: 'auditedAccounts2021-22',
      hidden: true,
      pdfLink: true,
    },
    {
      label: 'Annual Budget Available',
      key: 'annualBudgets2020-21',
      colspan: 4,
      class: 'th-common-cls',
      pdfLink: true,
    },
    {
      label: '',
      key: 'annualBudgets2021-22',
      hidden: true,
      pdfLink: true,
    },
    {
      label: '',
      key: 'annualBudgets2022-23',
      hidden: true,
      pdfLink: true,
    },
    {
      label: '',
      key: 'annualBudgets2023-24',
      hidden: true,
      pdfLink: true,
    },
  ],
  subHeaders: [
    '',
    '',
    '',
    '',
    '',
    ...module.exports.abYears,
    ...module.exports.abYears,
  ].map((e, i) => {
    return { label: e, key: i };
  }),
  name: '',
};

//<----- ranking-service.js ----->//
// Top ranked ulbs overall header - ulb deatils.
module.exports.overallHeader = [
    {
        'label': 'Rank',
        'key': 'overallRank',
        'sort': 1,
        'sortable': true,
        'class': 'text-center',
    },
    {
        'label': 'ULB Name',
        'key': 'ulbName',
        'link': 'ulbNameLink',
        'class': 'text-start',
    },
    {
        'label': 'Total ULB Score',
        'info': 'Max Score: 1200',
        'key': 'overallScore',
        'class': 'text-end',
    },
    {
        'label': 'RM Score',
        'info': 'Max Score: 600',
        'key': 'resourceMobilizationScore',
        'class': 'text-end',
    },
    {
        'label': 'EP Score',
        'info': 'Max Score: 300',
        'key': 'expenditurePerformanceScore',
        'class': 'text-end',
    },
    {
        'label': 'FG Score',
        'info': 'Max Score: 300',
        'key': 'fiscalGovernanceScore',
        'class': 'text-end',
    },
];

// Top ranked ulbs RM & EP header - ulb deatils.
module.exports.rmEpFGHeader = (type, ulb) => {
    let score = '300';
    if (type === 'resourceMobilization') {
        score = 600;
    }
    const columns = [
        {
            'label': 'S. No',
            'key': 'sNo',
            'class': 'text-center',
        },
        {
            'label': 'Indicator',
            'key': 'indicator',
        },
        // {
        //     'label': 'Units',
        //     'key': 'unit',
        // },
        // {
        //     'label': 'ULB performance',
        //     'key': 'ulbPerformance',
        // },
        // {
        //     'label': 'Highest performance',
        //     'info': 'In population category',
        //     'key': 'highPerformance',
        // },
        // {
        //     'label': 'Lowest performance',
        //     'info': 'In population category',
        //     'key': 'lowPerformance',
        // },
        {
            'label': 'ULB Score',
            'info': `Out of ${score}`,
            'key': 'ulbScore',
            'class': 'text-end',
        },
    ];
    const lastRow = [
        {
            'key': 0,
            'value': '',
            'class': '',
          },
          {
            'key': 1,
            'value': 'Total',
            'class': 'fw-bold'
          },
          {
            'key': 2,
            'value':  0,
            'class': 'fw-bold text-end',
            sum: 'ulbScore',
            decimalPlace
          },
    ];
    return { columns, lastRow };
}

// Participated states & UT.
module.exports.getTableHeaderParticipatedStates = {
    'columns': [
        {
            'label': 'S.No',
            'key': 'sNo',
            'sortable': false,
            'class': 'text-center',
            // 'width': '3',
        },
        {
            'label': 'State Name',
            'key': 'name',
            'sort': 1,
            'sortable': true,
            'class': '',
            // 'width': '8',
            // 'link': 'nameLink'
        },
        {
            'label': 'State/ UT',
            'key': 'isUt',
            'sortable': false,
            'class': 'th-common-cls',
            'width': '6',
        },
        // {
        //     'label': 'State Type',
        //     'key': 'stateType',
        //     'sortable': false,
        //     'class': 'th-common-cls',
        //     'width': '6',
        // },
        {
            'label': 'Total ULBs (A)',
            'key': 'totalULBs',
            'sortable': false,
            'class': 'text-end',
            'width': '5',
        },
        {
            'label': 'No. of ULBs Participated (B)',
            'key': 'participatedUlbs',
            'sortable': true,
            'class': 'text-end',
            'width': '7',
        },
        {
            'label': 'No. of ULBs Ranked (C)',
            'key': 'rankedUlbs',
            'sortable': true,
            'class': 'text-end',
            'width': '6',
        },
        // {
        //     'label': 'Non Ranked ULBs',
        //     'key': 'nonRankedUlbs',
        //     'sortable': true,
        //     'class': 'th-common-cls',
        //     'width': '7',
        // },
        // {
        //     'label': '% of Ranked to Total',
        //     'key': 'rankedtoTotal',
        //     'sortable': true,
        //     'class': 'text-end',
        //     decimalPlace
        //     // 'width': '7',
        // },
        {
            'label': '% of Participated to Total (D=B/A)',
            'key': 'participatedUlbsPercentage',
            'sortable': true,
            'class': 'text-end',
            decimalPlace,
            'width': '7',
        },
    ],
    'name': '',
    'data': [],
    // total,
    'lastRow': [
        {
            "key": 0,
            "value": "",
            "class": "",
        },
        {
            "key": 1,
            "value": "Total",
            "class": "fw-bold",
        },
        {
            "key": 2,
            "value": "",
            "class": "",
        },
        {
            "key": 3,
            "value": 0,
            "class": "fw-bold text-end",
            "sum": 'totalULBs'
        },
        {
            "key": 4,
            "value": 0,
            "class": "fw-bold text-end",
            "sum": "participatedUlbs",
        },
        {
            "key": 5,
            "value": 0,
            "class": "fw-bold text-end",
            "sum": "rankedUlbs",
        },
        {
            "key": 6,
            "value": 0,
            "class": "fw-bold text-end",
            "avg": 'participatedUlbsPercentage',
            decimalPlace
        }
    ],
};

// Filter API.
module.exports.getFilterOptions = {
    //State type.
    stateTypeFilter: [
        {
            label: 'All',
            id: '1',
            key: 'all',
            value: 'All',
        },
        {
            label: 'Large state',
            id: '2',
            key: 'largeState',
            value: 'Large',
        },
        {
            label: 'Small state',
            id: '3',
            key: 'smallState',
            value: 'Small',
        },
        {
            label: 'Union territory',
            id: '4',
            key: 'unionTerritory',
            value: 'UT',
        },
    ],
    // ULB Participation
    ulbParticipationFilter: [
        {
            label: 'All',
            id: '1',
            key: 'all',
            value: 'All',
        },
        {
            label: 'Participated',
            id: '2',
            key: 'participated',
            value: 'participated',
        },
        {
            label: 'Non Participated',
            id: '3',
            key: 'nonParticipated',
            value: 'nonParticipated',
        },
    ],
    // ULB ranking status
    ulbRankingStatusFilter: [
        {
            label: 'All',
            id: '1',
            key: 'all',
            value: 'All',
        },
        {
            label: 'Ranked',
            id: '2',
            key: 'ranked',
            value: 'ranked',
        },
        {
            label: 'Non Ranked',
            id: '3',
            key: 'nonRanked',
            value: 'nonRanked',
        },
    ],
    // Population category
    populationBucketFilter: [
        {
            label: 'All',
            id: '1',
            key: 'all',
            value: 'All',
        },
        {
            label: '4M+',
            id: '2',
            key: '1',
            value: 1,
        },
        {
            label: '1M-4M',
            id: '2',
            key: '2',
            value: 2,
        },
        {
            label: '100K-1M',
            id: '2',
            key: '3',
            value: 3,
        },
        {
            label: '<100K',
            id: '2',
            key: '4',
            value: 4,
        },
    ],
};
