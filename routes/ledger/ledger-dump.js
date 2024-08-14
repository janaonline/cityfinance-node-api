const ULBLedger = require('../../models/UlbLedger');
const LedgerLog = require('../../models/LedgerLog');
const ExcelJS = require('exceljs');
const moment = require('moment');

const totOwnRevenueArr = [
    '5dd10c2485c951b54ec1d74b',
    '5dd10c2685c951b54ec1d762',
    '5dd10c2485c951b54ec1d74a',
    '5dd10c2885c951b54ec1d77e',
    '5dd10c2385c951b54ec1d748',
];

const totRevenueArr = [
    '5dd10c2485c951b54ec1d74b',
    '5dd10c2485c951b54ec1d74f',
    '5dd10c2685c951b54ec1d762',
    '5dd10c2485c951b54ec1d74a',
    '5dd10c2885c951b54ec1d77e',
    '5dd10c2685c951b54ec1d761',
    '5dd10c2585c951b54ec1d75b',
    '5dd10c2785c951b54ec1d778',
    '5dd10c2385c951b54ec1d748',
    '5dd10c2785c951b54ec1d776',
];

const revExpenditureArr = [
    '5dd10c2385c951b54ec1d743',
    '5dd10c2585c951b54ec1d753',
    '5dd10c2585c951b54ec1d75a',
    '5dd10c2585c951b54ec1d756',
    '5dd10c2685c951b54ec1d760',
];

const totExpenditureArr = [
    '5dd10c2585c951b54ec1d753',
    '5dd10c2585c951b54ec1d75a',
    '5dd10c2585c951b54ec1d756',
    '5dd10c2685c951b54ec1d760',
    '5dd10c2785c951b54ec1d77c',
    '5dd10c2585c951b54ec1d75f',
    '5dd10c2485c951b54ec1d74e',
    '5dd10c2385c951b54ec1d746',
    '5dd10c2585c951b54ec1d755',
    '5dd10c2385c951b54ec1d743',
];

const capexArr = [
    '5dd10c2785c951b54ec1d779',
    '5dd10c2785c951b54ec1d774',
];

const bsSizeArr = [
    '5dd10c2385c951b54ec1d742',
    '5dd10c2785c951b54ec1d779',
    '5dd10c2785c951b54ec1d77b',
    '5dd10c2785c951b54ec1d774',
    '5dd10c2785c951b54ec1d77d',
    '5dd10c2585c951b54ec1d751',
    '5dd10c2885c951b54ec1d77f',
    '5dd10c2885c951b54ec1d781',
    '5dd10c2685c951b54ec1d76d',
    '5dd10c2785c951b54ec1d777',
    '5dd10c2585c951b54ec1d757',
    '5dd10c2685c951b54ec1d76a',
    '5dd10c2585c951b54ec1d75c',

];


let lineitems =
    [
        { 'code': null, 'key': 'ulb_code', 'isActive': true, 'name': 'ULB Code', 'width': 15 },
        { 'code': null, 'key': 'ulb', 'isActive': true, 'name': 'ULB Name', 'width': 15 },
        // { 'code': null, 'key': 'population', 'isActive': true, 'name': 'Census 2011 Population', 'width': 15 },
        { 'code': null, 'key': 'state', 'isActive': true, 'name': 'State', 'width': 15 },
        // { 'code': null, 'key': 'amrut', 'isActive': true, 'name': 'AMRUT', 'width': 15 },
        { 'code': null, 'key': 'year', 'isActive': true, 'name': 'Financial Year', 'width': 15 },
        { 'code': null, 'key': 'audit_status', 'isActive': true, 'name': 'Audited/ Provisional', 'width': 15 },
        { 'code': null, 'key': 'audit_firm', 'isActive': true, 'name': 'Audit firm name', 'width': 15 },
        { 'code': null, 'key': 'partner_name', 'isActive': true, 'name': 'Partner name', 'width': 15 },
        // { 'code': null, 'key': 'icai_membership_number', 'isActive': true, 'name': 'ICAI No.', 'width': 15 },
        { 'code': null, 'key': 'isStandardizable', 'isActive': true, 'name': 'Is Standardizable?', 'width': 15 },
        { 'code': null, 'key': 'isStandardizableComment', 'isActive': true, 'name': 'File Comments ', 'width': 15 },
        { 'code': null, 'key': 'dataFlagComment', 'isActive': true, 'name': 'Data Comments', 'width': 15 },
        { 'code': null, 'key': 'dataFlag', 'isActive': true, 'name': 'No. of Data Flags failed', 'width': 15 },
        { 'code': null, 'key': 'totOwnRevenue', 'isActive': true, 'name': 'Total Own Revenue', 'width': 15 },
        { 'code': null, 'key': 'totRevenue', 'isActive': true, 'name': 'Total Revenue', 'width': 15 },
        { 'code': null, 'key': 'revExpenditure', 'isActive': true, 'name': 'Revenue Expenditure', 'width': 15 },
        { 'code': null, 'key': 'totExpenditure', 'isActive': true, 'name': 'Total Expenditure', 'width': 15 },
        { 'code': null, 'key': 'capex', 'isActive': true, 'name': 'GB + CWIP', 'width': 15 },
        { 'code': null, 'key': 'bsSize', 'isActive': true, 'name': 'Total Balance Sheet Size', 'width': 15 },

        { 'code': '110', 'key': '5dd10c2485c951b54ec1d74b', 'isActive': true, 'name': 'Tax Revenue', 'width': 15 },
        { 'code': '120', 'key': '5dd10c2485c951b54ec1d74f', 'isActive': true, 'name': 'Assigned Revenues & Compensation', 'width': 15 },
        { 'code': '130', 'key': '5dd10c2685c951b54ec1d762', 'isActive': true, 'name': 'Rental Income from Municipal Properties', 'width': 15 },
        { 'code': '140', 'key': '5dd10c2485c951b54ec1d74a', 'isActive': true, 'name': 'Fee & User Charges', 'width': 15 },
        { 'code': '150', 'key': '5dd10c2885c951b54ec1d77e', 'isActive': true, 'name': 'Sale & Hire charges', 'width': 15 },
        { 'code': '160', 'key': '5dd10c2685c951b54ec1d761', 'isActive': true, 'name': 'Revenue Grants, Contributions & Subsidies', 'width': 15 },
        { 'code': '170', 'key': '5dd10c2585c951b54ec1d75b', 'isActive': true, 'name': 'Income from Investment', 'width': 15 },
        { 'code': '171', 'key': '5dd10c2785c951b54ec1d778', 'isActive': true, 'name': 'Interest earned', 'width': 15 },
        { 'code': '180', 'key': '5dd10c2385c951b54ec1d748', 'isActive': true, 'name': 'Other Income', 'width': 15 },
        { 'code': '100', 'key': '5dd10c2785c951b54ec1d776', 'isActive': true, 'name': 'Others', 'width': 15 },
        { 'code': '210', 'key': '5dd10c2585c951b54ec1d753', 'isActive': true, 'name': 'Establishment Expenses', 'width': 15 },
        { 'code': '220', 'key': '5dd10c2585c951b54ec1d75a', 'isActive': true, 'name': 'Administrative Expenses', 'width': 15 },
        { 'code': '230', 'key': '5dd10c2585c951b54ec1d756', 'isActive': true, 'name': 'Operation & Maintenance', 'width': 15 },
        { 'code': '240', 'key': '5dd10c2685c951b54ec1d760', 'isActive': true, 'name': 'Interest & Finance Charges', 'width': 15 },
        { 'code': '250', 'key': '5dd10c2785c951b54ec1d77c', 'isActive': true, 'name': 'Programme Expenses', 'width': 15 },
        { 'code': '260', 'key': '5dd10c2585c951b54ec1d75f', 'isActive': true, 'name': 'Revenue Grants, Contributions & Subsidies (Exp)', 'width': 15 },
        { 'code': '270', 'key': '5dd10c2485c951b54ec1d74e', 'isActive': true, 'name': 'Provisions and Write Off', 'width': 15 },
        { 'code': '271', 'key': '5dd10c2385c951b54ec1d746', 'isActive': true, 'name': 'Miscellaneous Expenses', 'width': 15 },
        { 'code': '272', 'key': '5dd10c2585c951b54ec1d755', 'isActive': true, 'name': 'Depreciation on Fixed Assets', 'width': 15 },
        { 'code': '280', 'key': '5dd10c2385c951b54ec1d744', 'isActive': true, 'name': 'Prior Period items', 'width': 15 },
        { 'code': '290', 'key': '5dd10c2585c951b54ec1d75e', 'isActive': true, 'name': 'Transfer to Reserve Funds', 'width': 15 },
        { 'code': '200', 'key': '5dd10c2385c951b54ec1d743', 'isActive': true, 'name': 'Others', 'width': 15 },
        { 'code': '310', 'key': '5dd10c2685c951b54ec1d763', 'isActive': true, 'name': 'Municipal (General) Fund', 'width': 15 },
        { 'code': '311', 'key': '5dd10c2685c951b54ec1d767', 'isActive': true, 'name': 'Earmarked Funds', 'width': 15 },
        { 'code': '312', 'key': '5dd10c2585c951b54ec1d754', 'isActive': true, 'name': 'Reserves', 'width': 15 },
        { 'code': '320', 'key': '5dd10c2385c951b54ec1d747', 'isActive': true, 'name': 'Grants, Contribution for Specific purposes', 'width': 15 },
        { 'code': '330', 'key': '5dd10c2585c951b54ec1d752', 'isActive': true, 'name': 'Secured Loans', 'width': 15 },
        { 'code': '331', 'key': '5dd10c2385c951b54ec1d745', 'isActive': true, 'name': 'Unsecured Loans', 'width': 15 },
        { 'code': '340', 'key': '5dd10c2685c951b54ec1d768', 'isActive': true, 'name': 'Deposits received', 'width': 15 },
        { 'code': '341', 'key': '5dd10c2685c951b54ec1d769', 'isActive': true, 'name': 'Deposit Works', 'width': 15 },
        { 'code': '350', 'key': '5dd10c2685c951b54ec1d76b', 'isActive': true, 'name': 'Other Liabilities (Sundry Creditors)', 'width': 15 },
        { 'code': '360', 'key': '5dd10c2785c951b54ec1d76f', 'isActive': true, 'name': 'Provisions', 'width': 15 },
        { 'code': '300', 'key': '5dd10c2785c951b54ec1d773', 'isActive': true, 'name': 'Others', 'width': 15 },
        { 'code': '410', 'key': '5dd10c2785c951b54ec1d779', 'isActive': true, 'name': 'Gross Block', 'width': 15 },
        { 'code': '411', 'key': '5dd10c2785c951b54ec1d77b', 'isActive': true, 'name': 'Accumulated Depreciation', 'width': 15 },
        { 'code': '412', 'key': '5dd10c2785c951b54ec1d774', 'isActive': true, 'name': 'Capital Work-in-progress', 'width': 15 },
        { 'code': '420', 'key': '5dd10c2785c951b54ec1d77d', 'isActive': true, 'name': 'Investment - General Fund', 'width': 15 },
        { 'code': '421', 'key': '5dd10c2585c951b54ec1d751', 'isActive': true, 'name': 'Investment - Other Funds', 'width': 15 },
        { 'code': '430', 'key': '5dd10c2885c951b54ec1d77f', 'isActive': true, 'name': 'Stock in Hand (Inventories)', 'width': 15 },
        { 'code': '431', 'key': '5dd10c2685c951b54ec1d766', 'isActive': true, 'name': 'Sundry Debtors (Receivables)', 'width': 15 },
        { 'code': '432', 'key': '5dd10c2885c951b54ec1d781', 'isActive': true, 'name': 'Accumulated Provisions against Bad and Doubtful Receivables', 'width': 15 },
        { 'code': '440', 'key': '5dd10c2685c951b54ec1d76d', 'isActive': true, 'name': 'Prepaid Expenses', 'width': 15 },
        { 'code': '450', 'key': '5dd10c2785c951b54ec1d777', 'isActive': true, 'name': 'Cash and Bank Balance', 'width': 15 },
        { 'code': '460', 'key': '5dd10c2585c951b54ec1d757', 'isActive': true, 'name': 'Loans, Advances and Deposits', 'width': 15 },
        { 'code': '470', 'key': '5dd10c2685c951b54ec1d76a', 'isActive': true, 'name': 'Other Assets', 'width': 15 },
        { 'code': '480', 'key': '5dd10c2585c951b54ec1d75c', 'isActive': true, 'name': 'Miscellaneous Expenditure (to the extent not written off)', 'width': 15 },
        { 'code': '400', 'key': '5dd10c2385c951b54ec1d742', 'isActive': true, 'name': 'Others', 'width': 15 },
        { 'code': '33001', 'key': '5dd10c2485c951b54ec1d74d', 'isActive': true, 'name': 'Loans from Central Government', 'width': 15 },
        { 'code': '33002', 'key': '5dd10c2385c951b54ec1d741', 'isActive': true, 'name': 'Loans from State Government', 'width': 15 },
        { 'code': '33003', 'key': '5dd10c2385c951b54ec1d740', 'isActive': true, 'name': 'Loans from Financial Institutions including Banks', 'width': 15 },
        { 'code': '33004', 'key': '5dd10c2385c951b54ec1d73d', 'isActive': true, 'name': 'Bonds and Other Debt Instruments', 'width': 15 },
        { 'code': '33000', 'key': '5dd10c2385c951b54ec1d73f', 'isActive': true, 'name': 'Others', 'width': 15 },
        { 'code': '33101', 'key': '5dd10c2785c951b54ec1d77a', 'isActive': true, 'name': 'Loans from Central Government', 'width': 15 },
        { 'code': '33102', 'key': '5dd10c2485c951b54ec1d74c', 'isActive': true, 'name': 'Loans from State Government', 'width': 15 },
        { 'code': '33103', 'key': '5dd10c2685c951b54ec1d76c', 'isActive': true, 'name': 'Loans from Financial Institutions including Banks', 'width': 15 },
        { 'code': '33104', 'key': '5dd10c2385c951b54ec1d73c', 'isActive': true, 'name': 'Bonds and Other Debt Instruments', 'width': 15 },
        { 'code': '33100', 'key': '5dd10c2285c951b54ec1d73a', 'isActive': true, 'name': 'Others', 'width': 15 },
        { 'code': '11001', 'key': '5dd10c2285c951b54ec1d737', 'isActive': true, 'name': 'Property Tax', 'width': 15 },
        { 'code': '11002', 'key': '5dd10c2285c951b54ec1d736', 'isActive': true, 'name': 'Water Supply and Drainage Tax', 'width': 15 },
        { 'code': '11003', 'key': '5dd10c2485c951b54ec1d750', 'isActive': true, 'name': 'Sewerage Tax', 'width': 15 },
        { 'code': '11004', 'key': '5dd10c2285c951b54ec1d739', 'isActive': true, 'name': 'Conservancy Tax', 'width': 15 },
        { 'code': '11005', 'key': '5dd10c2385c951b54ec1d73b', 'isActive': true, 'name': 'Lighting Tax', 'width': 15 },
        { 'code': '11006', 'key': '5dd10c2285c951b54ec1d735', 'isActive': true, 'name': 'Education Tax', 'width': 15 },
        { 'code': '11007', 'key': '5dd10c2285c951b54ec1d72f', 'isActive': true, 'name': 'Vehicle Tax', 'width': 15 },
        { 'code': '11008', 'key': '5dd10c2285c951b54ec1d72e', 'isActive': true, 'name': 'Tax on Animals', 'width': 15 },
        { 'code': '11009', 'key': '5dd10c2685c951b54ec1d764', 'isActive': true, 'name': 'Electricity Tax', 'width': 15 },
        { 'code': '11010', 'key': '5dd10c2285c951b54ec1d72d', 'isActive': true, 'name': 'Professional Tax', 'width': 15 },
        { 'code': '11011', 'key': '5dd10c2385c951b54ec1d73e', 'isActive': true, 'name': 'Entertainment Tax', 'width': 15 },
        { 'code': '11012', 'key': '5dd10c2285c951b54ec1d72c', 'isActive': true, 'name': 'Advertisement Tax', 'width': 15 },
        { 'code': '11013', 'key': '5dd10c2185c951b54ec1d72b', 'isActive': true, 'name': 'Pilgrimage Tax', 'width': 15 },
        { 'code': '11014', 'key': '5dd10c2185c951b54ec1d729', 'isActive': true, 'name': 'Octroi & Toll', 'width': 15 },
        { 'code': '11015', 'key': '5dd10c2185c951b54ec1d72a', 'isActive': true, 'name': 'Cess', 'width': 15 },
        { 'code': '11016', 'key': '5dd10c2585c951b54ec1d759', 'isActive': true, 'name': 'Tax on Carts', 'width': 15 },
        { 'code': '11017', 'key': '5dd10c2185c951b54ec1d728', 'isActive': true, 'name': 'Tax Remission & Refund', 'width': 15 },
        { 'code': '11018', 'key': '5dd10c2785c951b54ec1d771', 'isActive': true, 'name': 'Others', 'width': 15 },
        { 'code': '31001', 'key': '5dd10c2885c951b54ec1d780', 'isActive': true, 'name': 'Municipal (General) Fund', 'width': 15 },
        { 'code': '31002', 'key': '5dd10c2585c951b54ec1d758', 'isActive': true, 'name': 'Rounding off differences', 'width': 15 },
        { 'code': '1001', 'key': '5df8c7b9f280e1079283cf37', 'isActive': true, 'name': 'Audit report', 'width': 15 },
        { 'code': '1002', 'key': '5df8c7d2f280e1079283cf38', 'isActive': true, 'name': 'Balance sheet', 'width': 15 },
        { 'code': '1003', 'key': '5df8c7e4f280e1079283cf39', 'isActive': true, 'name': 'Income & Expenditure', 'width': 15 },
        { 'code': '1004', 'key': '5df8c7f1f280e1079283cf3a', 'isActive': true, 'name': 'Schedules', 'width': 15 },
        { 'code': '1005', 'key': '5df8c7fdf280e1079283cf3b', 'isActive': true, 'name': 'Trial balance', 'width': 15 },
        { 'code': '1006', 'key': '5df8c80df280e1079283cf3c', 'isActive': true, 'name': 'Notes to accounts', 'width': 15 },
        { 'code': '1007', 'key': '5df8c826f280e1079283cf3d', 'isActive': true, 'name': 'Schedule and Trial Balance', 'width': 15 },

        // TODO: to be removed.
        // { 'code': 110, 'key': '5dd10c2485c951b54ec1d74b', 'isActive': true, 'name': 'Tax Revenue', 'width': 15 },
        // { 'code': 120, 'key': '5dd10c2485c951b54ec1d74f', 'isActive': true, 'name': 'Assigned Revenue', 'width': 15 },
        // { 'code': 130, 'key': '5dd10c2685c951b54ec1d762', 'isActive': true, 'name': 'Rental Income from Municipal properties', 'width': 15 },
        // { 'code': 140, 'key': '5dd10c2485c951b54ec1d74a', 'isActive': true, 'name': 'Fees, User charges & Other charges', 'width': 15 },
        // { 'code': 150, 'key': '5dd10c2885c951b54ec1d77e', 'isActive': true, 'name': 'Sale and Hire charges', 'width': 15 },
        // { 'code': 160, 'key': '5dd10c2685c951b54ec1d761', 'isActive': true, 'name': 'Revenue Grants, Contributions and Subsidies', 'width': 15 },
        // { 'code': 170, 'key': '5dd10c2585c951b54ec1d75b', 'isActive': true, 'name': 'Income from Investment', 'width': 15 },
        // { 'code': 171, 'key': '5dd10c2785c951b54ec1d778', 'isActive': true, 'name': 'Interest Earned', 'width': 15 },
        // { 'code': 180, 'key': '5dd10c2385c951b54ec1d748', 'isActive': true, 'name': 'Other Income', 'width': 15 },
        // { 'code': 100, 'key': '5dd10c2785c951b54ec1d776', 'isActive': true, 'name': 'Others', 'width': 15 },
        // { 'code': 210, 'key': '5dd10c2585c951b54ec1d753', 'isActive': true, 'name': 'Establishment Expenses', 'width': 15 },
        // { 'code': 220, 'key': '5dd10c2585c951b54ec1d75a', 'isActive': true, 'name': 'Administrative Expenses', 'width': 15 },
        // { 'code': 230, 'key': '5dd10c2585c951b54ec1d756', 'isActive': true, 'name': 'Operation and Maintenance', 'width': 15 },
        // { 'code': 240, 'key': '5dd10c2685c951b54ec1d760', 'isActive': true, 'name': 'Interest and Finance Charges', 'width': 15 },
        // { 'code': 250, 'key': '5dd10c2785c951b54ec1d77c', 'isActive': true, 'name': 'Programme Expenses', 'width': 15 },
        // { 'code': 260, 'key': '5dd10c2585c951b54ec1d75f', 'isActive': true, 'name': 'Revenue Grants, Contributions & Subsidies (Exp)', 'width': 15 },
        // { 'code': 270, 'key': '5dd10c2485c951b54ec1d74e', 'isActive': true, 'name': 'Provisions & Write off', 'width': 15 },
        // { 'code': 271, 'key': '5dd10c2385c951b54ec1d746', 'isActive': true, 'name': 'Miscellaneous Expenses', 'width': 15 },
        // { 'code': 272, 'key': '5dd10c2585c951b54ec1d755', 'isActive': true, 'name': 'Depreciation ', 'width': 15 },
        // { 'code': 280, 'key': '5dd10c2385c951b54ec1d744', 'isActive': true, 'name': 'Prior Period Income ', 'width': 15 },
        // { 'code': 290, 'key': '5dd10c2585c951b54ec1d75e', 'isActive': true, 'name': 'Transfer to Reserve Funds', 'width': 15 },
        // { 'code': 200, 'key': '5dd10c2385c951b54ec1d743', 'isActive': true, 'name': 'Others', 'width': 15 },
        // { 'code': 310, 'key': '5dd10c2685c951b54ec1d763', 'isActive': true, 'name': 'Municipal (General) Fund', 'width': 15 },
        // { 'code': 311, 'key': '5dd10c2685c951b54ec1d767', 'isActive': true, 'name': 'Earmarked Funds', 'width': 15 },
        // { 'code': 312, 'key': '5dd10c2585c951b54ec1d754', 'isActive': true, 'name': 'Reserves', 'width': 15 },
        // { 'code': 320, 'key': '5dd10c2385c951b54ec1d747', 'isActive': true, 'name': 'Grants and Contributions for specific purposes', 'width': 15 },
        // { 'code': 330, 'key': '5dd10c2585c951b54ec1d752', 'isActive': true, 'name': 'Secured Loans', 'width': 15 },
        // { 'code': 331, 'key': '5dd10c2385c951b54ec1d745', 'isActive': true, 'name': 'Unsecured Loans', 'width': 15 },
        // { 'code': 340, 'key': '5dd10c2685c951b54ec1d768', 'isActive': true, 'name': 'Deposits Received', 'width': 15 },
        // { 'code': 341, 'key': '5dd10c2685c951b54ec1d769', 'isActive': true, 'name': 'Deposit Works', 'width': 15 },
        // { 'code': 350, 'key': '5dd10c2685c951b54ec1d76b', 'isActive': true, 'name': 'Other Liabilities (Sundry Creditors)', 'width': 15 },
        // { 'code': 360, 'key': '5dd10c2785c951b54ec1d76f', 'isActive': true, 'name': 'Provisions', 'width': 15 },
        // { 'code': 300, 'key': '5dd10c2785c951b54ec1d773', 'isActive': true, 'name': 'Others', 'width': 15 },
        // { 'code': 410, 'key': '5dd10c2785c951b54ec1d779', 'isActive': true, 'name': 'Gross Block', 'width': 15 },
        // { 'code': 411, 'key': '5dd10c2785c951b54ec1d77b', 'isActive': true, 'name': 'Accumulated Depreciation', 'width': 15 },
        // { 'code': 412, 'key': '5dd10c2785c951b54ec1d774', 'isActive': true, 'name': 'Capital Work-in-Progress', 'width': 15 },
        // { 'code': 420, 'key': '5dd10c2785c951b54ec1d77d', 'isActive': true, 'name': 'Investment - General Funds', 'width': 15 },
        // { 'code': 421, 'key': '5dd10c2585c951b54ec1d751', 'isActive': true, 'name': 'Investment - Other Funds', 'width': 15 },
        // { 'code': 430, 'key': '5dd10c2885c951b54ec1d77f', 'isActive': true, 'name': 'Stock in Hand (Inventories)', 'width': 15 },
        // { 'code': 431, 'key': '5dd10c2685c951b54ec1d766', 'isActive': true, 'name': 'Sundry Debtors (Receivables)', 'width': 15 },
        // { 'code': 432, 'key': '5dd10c2885c951b54ec1d781', 'isActive': true, 'name': 'Accumulated Provisions against Bad and Doubtful Receivables', 'width': 15 },
        // { 'code': 440, 'key': '5dd10c2685c951b54ec1d76d', 'isActive': true, 'name': 'Prepaid Expenses', 'width': 15 },
        // { 'code': 450, 'key': '5dd10c2785c951b54ec1d777', 'isActive': true, 'name': 'Cash and Bank Balances', 'width': 15 },
        // { 'code': 460, 'key': '5dd10c2585c951b54ec1d757', 'isActive': true, 'name': 'Loans, Advances and Deposits', 'width': 15 },
        // { 'code': 470, 'key': '5dd10c2685c951b54ec1d76a', 'isActive': true, 'name': 'Other Assets', 'width': 15 },
        // { 'code': 480, 'key': '5dd10c2585c951b54ec1d75c', 'isActive': true, 'name': 'Miscellaneous Expenditure to be written off', 'width': 15 },
        // { 'code': 400, 'key': '5dd10c2385c951b54ec1d742', 'isActive': true, 'name': 'Others', 'width': 15 },
        // { 'code': 33001, 'key': '5dd10c2485c951b54ec1d74d', 'isActive': true, 'name': 'Loans from Central Government', 'width': 15 },
        // { 'code': 33002, 'key': '5dd10c2385c951b54ec1d741', 'isActive': true, 'name': 'Loans from State Government', 'width': 15 },
        // { 'code': 33003, 'key': '5dd10c2385c951b54ec1d740', 'isActive': true, 'name': 'Loans from Financial Institutions including Banks', 'width': 15 },
        // { 'code': 33004, 'key': '5dd10c2385c951b54ec1d73d', 'isActive': true, 'name': 'Bonds and Other Debt Instruments', 'width': 15 },
        // { 'code': 33000, 'key': '5dd10c2385c951b54ec1d73f', 'isActive': true, 'name': 'Others', 'width': 15 },
        // { 'code': 33101, 'key': '5dd10c2785c951b54ec1d77a', 'isActive': true, 'name': 'Loans from Central Government', 'width': 15 },
        // { 'code': 33102, 'key': '5dd10c2485c951b54ec1d74c', 'isActive': true, 'name': 'Loans from State Government', 'width': 15 },
        // { 'code': 33103, 'key': '5dd10c2685c951b54ec1d76c', 'isActive': true, 'name': 'Loans from Financial Institutions including Banks', 'width': 15 },
        // { 'code': 33104, 'key': '5dd10c2385c951b54ec1d73c', 'isActive': true, 'name': 'Bonds and Other Debt Instruments', 'width': 15 },
        // { 'code': 33100, 'key': '5dd10c2285c951b54ec1d73a', 'isActive': true, 'name': 'Others', 'width': 15 },
        // { 'code': 11001, 'key': '5dd10c2285c951b54ec1d737', 'isActive': true, 'name': 'Property Tax', 'width': 15 },
        // { 'code': 11002, 'key': '5dd10c2285c951b54ec1d736', 'isActive': true, 'name': 'Water Supply and Drainage Tax', 'width': 15 },
        // { 'code': 11003, 'key': '5dd10c2485c951b54ec1d750', 'isActive': true, 'name': 'Sewerage Tax', 'width': 15 },
        // { 'code': 11004, 'key': '5dd10c2285c951b54ec1d739', 'isActive': true, 'name': 'Conservancy Tax', 'width': 15 },
        // { 'code': 11005, 'key': '5dd10c2385c951b54ec1d73b', 'isActive': true, 'name': 'Lighting Tax', 'width': 15 },
        // { 'code': 11006, 'key': '5dd10c2285c951b54ec1d735', 'isActive': true, 'name': 'Education Tax', 'width': 15 },
        // { 'code': 11007, 'key': '5dd10c2285c951b54ec1d72f', 'isActive': true, 'name': 'Vehicle Tax', 'width': 15 },
        // { 'code': 11008, 'key': '5dd10c2285c951b54ec1d72e', 'isActive': true, 'name': 'Tax on Animals', 'width': 15 },
        // { 'code': 11009, 'key': '5dd10c2685c951b54ec1d764', 'isActive': true, 'name': 'Electricity Tax', 'width': 15 },
        // { 'code': 11010, 'key': '5dd10c2285c951b54ec1d72d', 'isActive': true, 'name': 'Professional Tax', 'width': 15 },
        // { 'code': 11011, 'key': '5dd10c2385c951b54ec1d73e', 'isActive': true, 'name': 'Entertainment Tax', 'width': 15 },
        // { 'code': 11012, 'key': '5dd10c2285c951b54ec1d72c', 'isActive': true, 'name': 'Advertisement Tax', 'width': 15 },
        // { 'code': 11013, 'key': '5dd10c2185c951b54ec1d72b', 'isActive': true, 'name': 'Pilgrimage Tax', 'width': 15 },
        // { 'code': 11014, 'key': '5dd10c2185c951b54ec1d729', 'isActive': true, 'name': 'Octroi & Toll', 'width': 15 },
        // { 'code': 11015, 'key': '5dd10c2185c951b54ec1d72a', 'isActive': true, 'name': 'Cess', 'width': 15 },
        // { 'code': 11016, 'key': '5dd10c2585c951b54ec1d759', 'isActive': true, 'name': 'Tax on Carts', 'width': 15 },
        // { 'code': 11017, 'key': '5dd10c2185c951b54ec1d728', 'isActive': true, 'name': 'Tax Remission & Refund', 'width': 15 },
        // { 'code': 11018, 'key': '5dd10c2785c951b54ec1d771', 'isActive': true, 'name': 'Others', 'width': 15 },
        // { 'code': 31001, 'key': '5dd10c2885c951b54ec1d780', 'isActive': true, 'name': 'Municipal (General) Fund', 'width': 15 },
        // { 'code': 31002, 'key': '5dd10c2585c951b54ec1d758', 'isActive': true, 'name': 'Rounding off differences', 'width': 15 },
    ];

// Calculate Totals.
function updateTotals(rowObj, key, lineItemIdStr, amount, categoryArr, categoryKey) {
    if (categoryArr.includes(lineItemIdStr)) {
        if (!rowObj[key][categoryKey]) rowObj[key][categoryKey] = 0;
        if (amount !== null && amount !== "") {
            rowObj[key][categoryKey] += Number(amount);
        }
    }
}

// Fetch data from DB - Input sheet.
async function fetchAllData(findQuery) {
    return ULBLedger.find(findQuery.query, findQuery.projection).cursor();
}
// Fetch data from DB - Overview sheet.
async function fetchAllDataOverview() {
    return LedgerLog.find().cursor();
}

module.exports.getLedgerDump = async (req, res) => {
    try {
        const findQuery = {};
        findQuery.query = req.query.financialYear ? { financialYear: req.query.financialYear } : {};
        findQuery.projection = { amount: 1, audit_status: 1, financialYear: 1, lineItem: 1, ulb: 1 };

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('ledgerDump');

        // Define columns
        const columns = lineitems.map((lineitem) => ({
            header: lineitem.code ? `${lineitem.name} (${lineitem.code})` : lineitem.name,
            key: lineitem.key,
            width: lineitem.width
        }));
        worksheet.columns = columns;

        // Fetch data from DB - Overview sheet.
        const overviewData = [];
        const cursorOverview = await fetchAllDataOverview();
        for (let doc = await cursorOverview.next(); doc != null; doc = await cursorOverview.next()) {
            overviewData.push(doc);
        }

        // Iterate through each document in the cursor (array received from DB) - Input Sheet.
        const cursorInputData = await fetchAllData(findQuery);
        let eachRowObj = {};
        for (let doc = await cursorInputData.next(); doc != null; doc = await cursorInputData.next()) {
            const key = `${doc.ulb}_${doc.financialYear}`;

            if (!eachRowObj[key]) {
                eachRowObj[key] = {
                    // ulb_id: doc.ulb,
                    ulb_code: doc.ulb,
                    year: doc.financialYear,
                    audit_status: doc.audit_status
                };
            }
            const lineItemIdStr = doc.lineItem.toString();

            updateTotals(eachRowObj, key, lineItemIdStr, doc.amount, totOwnRevenueArr, "totOwnRevenue");
            updateTotals(eachRowObj, key, lineItemIdStr, doc.amount, totRevenueArr, "totRevenue");
            updateTotals(eachRowObj, key, lineItemIdStr, doc.amount, revExpenditureArr, "revExpenditure");
            updateTotals(eachRowObj, key, lineItemIdStr, doc.amount, totExpenditureArr, "totExpenditure");
            updateTotals(eachRowObj, key, lineItemIdStr, doc.amount, capexArr, "capex");
            updateTotals(eachRowObj, key, lineItemIdStr, doc.amount, bsSizeArr, "bsSize");

            if (doc.amount === null || doc.amount === "") {
                eachRowObj[key][doc.lineItem] = "N/A";
            } else {
                eachRowObj[key][doc.lineItem] = doc.amount;
            }
        }

        // Create a lookup map for overviewData for faster access
        const overviewLookup = overviewData.reduce((acc, ulbObj) => {
            const key = `${ulbObj.ulb_id}_${ulbObj.year}`;
            acc[key] = ulbObj;
            return acc;
        }, {});

        // Iterate through each row in eachRowObj
        Object.values(eachRowObj).forEach((row) => {
            const key = `${row.ulb_code}_${row.year}`;
            const ulbOverviewObj = overviewLookup[key];

            if (ulbOverviewObj) {
                row["ulb_code"] = ulbOverviewObj.ulb_code;
                row["ulb"] = ulbOverviewObj.ulb;
                row["state"] = ulbOverviewObj.state;
                row["audit_firm"] = ulbOverviewObj.audit_firm;
                row["partner_name"] = ulbOverviewObj.partner_name;
                row["icai_membership_number"] = ulbOverviewObj.icai_membership_number;
                row["isStandardizable"] = ulbOverviewObj.isStandardizable;
                row["isStandardizableComment"] = ulbOverviewObj.isStandardizableComment;
                row["dataFlag"] = ulbOverviewObj.dataFlag;
                row["dataFlagComment"] = ulbOverviewObj.dataFlagComment;
            }

            worksheet.addRow(row);
        });

        let filename = `All_Ledgers_${(moment().format("DD-MMM-YY_HH-mm-ss"))}`;
        // Stream the workbook to the response
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error generating ledger dump:', error);
        res.status(500).send(`Internal Server Error: ${error.message}`);
    }
}
