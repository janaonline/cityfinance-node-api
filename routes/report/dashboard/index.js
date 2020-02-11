const dashboard = {
    revenueExpenditure: require('./avenues-revenue-expenditure'),
    cashAndBank: require('./cash-and-bank-balance'),
    outstandingBank: require('./outstanding-debt'),
    outstandingDebt: require('./outstanding-debt'),
    ownRevenueDependency: require('./own-revenue-dependency'),
    sourceFinancialRevenueExpenditure: require('./source-financial-revenue-expenditure'),
    sourceRevenue: require('./source-revenue'),
    ulbCoverage: require('./ulb-coverage'),
    filterUlbs: require('./filter-ulbs'),
}
module.exports = dashboard;
