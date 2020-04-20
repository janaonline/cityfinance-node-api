const User = require('../../models/User');
const LoginHistory = require('../../models/LoginHistory');
const VisitSession = require('../../models/VisitSession');
const Response = require('../../service/response');
const moment = require('moment');
module.exports = async (req,res)=>{
    try {
        let year = req.query.financialYear.split("-")[0];
        let from = moment(`04-${year}`,'MM-YYYY'), to = moment(`04-${parseInt(year) + 1}`,'MM-YYYY');
        let months = getMonths();
        for(let month of months){
            let obj = {
                numOfVisit:0,
                numOfRegUser:0,
                intTheMonth:0,
                moreThan10Times:0,
                moreThan5Times:0,
                moreThan1Times:0,
                oneTime:0,
                numReportDownloads:0
            };
            Object.assign(month,obj);
        }
        return  Response.OK(res,months)
    }catch (e) {
        console.log("Exception",e);
        return Response.DbError(res,e);
    }
    function getMonths() {
        let arr = [], currentMonth = moment(`04`,`MM`);
        for(let i=0; i<12; i++){
            let month = moment(currentMonth).add(i,'month');
            arr.push({
                num:month.format("M"),
                month:month.format("MMMM")
            })
        }
        return arr;
    }
}