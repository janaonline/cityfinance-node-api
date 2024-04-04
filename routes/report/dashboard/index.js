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
    homePageData: require('./home-page')
}
const compression = require('compression')
const Redis = require('../../../service/redis');
const Response = require('../../../service/response');
const redisCheck = (req, res, next)=>{
    let key = "dashboard|"+Buffer.from(JSON.stringify(req.originalUrl)).toString('base64')
    Redis.get(key,(err, data)=>{
        if(err || !data){
            req["redisKey"] = key;
            next()
        }else {
            let d;
            try {
                d = JSON.parse(data)
            }catch (e) {
                d = data;
            }
            return Response.OK(res, d);
        }
    });
}

// Redis.resetDashboard();
const express = require('express');
const app = express();
app.use(compression())
const router = express.Router();
router.get("/cash-and-bank", redisCheck,dashboard.filterUlbs, dashboard.cashAndBank);
router.get("/outstanding-debt", redisCheck,dashboard.filterUlbs, dashboard.outstandingDebt);
router.get("/own-revenue-dependency",redisCheck, dashboard.filterUlbs, dashboard.ownRevenueDependency.old);
router.get("/revenue-expenditure", redisCheck,dashboard.filterUlbs, dashboard.revenueExpenditure);
router.get("/source-financial-revenue-expenditure", redisCheck,dashboard.filterUlbs, dashboard.sourceFinancialRevenueExpenditure);
router.get("/source-revenue", redisCheck,dashboard.filterUlbs, dashboard.sourceRevenue);
router.get("/ulb-coverage", redisCheck,dashboard.ulbCoverage);
router.get( "/home-page-data", dashboard.homePageData );
router.get("/ulb-ledgerCount", redisCheck, dashboard.ownRevenueDependency.ulbRevenueCount)
module.exports = router;
