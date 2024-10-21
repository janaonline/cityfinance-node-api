
//<----- ulb-service.js ----->//
module.exports.abYears = ['2020-21', '2021-22', '2022-23', '2023-24'];
module.exports.afsYears = ['2018-19', '2019-20', '2020-21', '2021-22'];

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
    'columns': [
        {
            'label': 'S.No',
            'key': 'sNo',
            'class': 'th-common-cls',
            'width': '2',
        },
        {
            'label': 'ULB Name',
            'key': 'ulbName',
            'sort': 1,
            'query': '',
            'sortable': true,
            'class': 'th-color-cls',
        },
        {
            'label': 'Population Category',
            'key': 'populationCategory',
            'sortable': true,
            'class': 'th-common-cls',
        },
        {
            'label': 'ULB Participated',
            'key': 'isUlbParticipated',
            'sortable': true,
            'class': 'th-common-cls',
        },
        {
            'label': 'CFR Ranked',
            'key': 'isUlbRanked',
            'sortable': true,
            'class': 'th-common-cls',
        },
        {
            'label': 'Annual Financial Statement Available',
            'key': 'auditedAccounts2018-19',
            'colspan': 4,
            'class': 'th-common-cls',
        },
        {
            'label': '',
            'key': 'auditedAccounts2019-20',
            'hidden': true,
        },
        {
            'label': '',
            'key': 'auditedAccounts2020-21',
            'hidden': true,
        },
        {
            'label': '',
            'key': 'auditedAccounts2021-22',
            'hidden': true,
        },
        {
            'label': 'Annual Budget Available',
            'key': 'annualBudgets2020-21',
            'colspan': 4,
            'class': 'th-common-cls',
        },
        {
            'label': '',
            'key': 'annualBudgets2021-22',
            'hidden': true,
        },
        {
            'label': '',
            'key': 'annualBudgets2022-23',
            'hidden': true,
        },
        {
            'label': '',
            'key': 'annualBudgets2023-24',
            'hidden': true,
        },
    ],
    'subHeaders': ['', '', '', '', '', ...module.exports.abYears, ...module.exports.abYears],
    'name': '',
};

//<----- ranking-service.js ----->//
// Top ranked ulbs overall header - ulb deatils.
module.exports.overallHeader = [
    {
        'label': 'Rank',
        'key': 'overallRank',
        'sort': 1,
        'sortable': true,
    },
    {
        'label': 'ULB Name',
        'key': 'ulbName',
    },
    {
        'label': 'Total ULB Score',
        'info': 'Max Score: 1200',
        'key': 'overallScore',
    },
    {
        'label': 'RM Score',
        'info': 'Max Score: 600',
        'key': 'resourceMobilizationScore',
    },
    {
        'label': 'EP Score',
        'info': 'Max Score: 300',
        'key': 'expenditurePerformanceScore',
    },
    {
        'label': 'FG Score',
        'info': 'Max Score: 300',
        'key': 'fiscalGovernanceScore',
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
        },
        {
            'label': 'Indicator',
            'key': 'indicator',
        },
        {
            'label': 'Units',
            'key': 'unit',
        },
        {
            'label': 'ULB performance',
            'key': 'ulbPerformance',
        },
        {
            'label': 'Highest performance',
            'info': 'In population category',
            'key': 'highPerformance',
        },
        {
            'label': 'Lowest performance',
            'info': 'In population category',
            'key': 'lowPerformance',
        },
        {
            'label': 'ULB Score',
            'info': `Out of ${score}`,
            'key': 'ulbScore',
        },
    ];
    return { columns, 'lastRow': ['', '', '', '', '', 'Total', Number(ulb[type].score.toFixed(2))] };
}

// Participated states & UT.
module.exports.getTableHeaderParticipatedStates = {
    'columns': [
        {
            'label': 'S.No',
            'key': 'sNo',
            'sortable': false,
            'class': 'th-common-cls',
            'width': '3',
        },
        {
            'label': 'State Name',
            'key': 'name',
            'sort': 1,
            'sortable': true,
            'class': 'th-common-cls',
            'width': '8',
        },
        {
            'label': 'State Type',
            'key': 'stateType',
            'sortable': false,
            'class': 'th-common-cls',
            'width': '6',
        },
        {
            'label': 'Total ULBs',
            'key': 'totalULBs',
            'sortable': false,
            'class': 'th-common-cls',
            'width': '6',
        },
        {
            'label': 'Participated ULBs',
            'key': 'participatedUlbs',
            'sortable': true,
            'class': 'th-common-cls',
            'width': '7',
        },
        {
            'label': 'Ranked ULBs',
            'key': 'rankedUlbs',
            'sortable': true,
            'class': 'th-common-cls',
            'width': '6',
        },
        {
            'label': 'Non Ranked ULBs',
            'key': 'nonRankedUlbs',
            'sortable': true,
            'class': 'th-common-cls',
            'width': '7',
        },
        {
            'label': 'Ranked to Total(%)',
            'key': 'rankedtoTotal',
            'sortable': true,
            'class': 'th-color-cls',
            'width': '7',
        },
    ],
    'subHeaders': [
        '',
        '',
        '',
        'A',
        'B',
        'C',
        'D',
        'E = C/ A * 100'
    ],
    'name': '',
    'data': [],
    // total,
    'lastRow': ['', '', 'Total', '$sum', '$sum', '$sum', '$sum', '$sum'],
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
