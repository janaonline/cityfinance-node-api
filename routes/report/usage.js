const User = require('../../models/User');
const LoginHistory = require('../../models/LoginHistory');
const VisitSession = require('../../models/VisitSession');
const Response = require('../../service/response');
const moment = require('moment');
module.exports = async (req,res)=>{
    try {
        let year = req.query.financialYear.split("-")[0];
        let from = moment(`04-${year}`,'MM-YYYY'), to = moment(`04-${parseInt(year) + 1}`,'MM-YYYY');

        let lhQuery = [
            {$match:{loggedInAt:{$gte:new Date(from),$lte:new Date(to)}}},
            {
                $group:{
                    _id:{user:"$user",loggedInAt:{$month:"$loggedInAt"}},
                    count:{$sum:1},
                    numReportDownloads:{$sum:{$size:"$reports"}}
                }
            },
            {
                $group:{
                    _id:"$_id.loggedInAt",
                    numReportDownloads:{$sum:"$numReportDownloads"},
                    intTheMonth:{$sum:{$cond:{if:{$gt:["$count",0]},then:1,else:0}}},
                    moreThan10Times:{$sum:{$cond:{if:{$gt:["$count",10]},then:1,else:0}}},
                    moreThan5Times:{$sum:{$cond:{if:{$gt:["$count",5]},then:1,else:0}}},
                    moreThan1Times:{$sum:{$cond:{if:{$gt:["$count",1]},then:1,else:0}}},
                    oneTime:{$sum:{$cond:{if:{$eq:["$count",1]},then:1, else:0}}}
                }
            }
        ];
        let vsQuery = [
            {$match:{createdAt:{$gte:new Date(from),$lte:new Date(to)}}},
            {
                $group:{
                    _id:{$month:"$createdAt"},
                    visitCount:{$sum:1}
                }
            }
        ];
        let uQuery = [
            {$match:{createdAt:{$gte:new Date(from),$lte:new Date(to)}}},
            {
                $group:{
                    _id:{$month:"$createdAt"},
                    numOfRegUser:{$sum:1}
                }
            }
        ];
        let lhData = await LoginHistory.aggregate(lhQuery).exec();
        let vsData = await VisitSession.aggregate(vsQuery).exec();
        let uData = await User.aggregate(uQuery).exec();
        let months = getMonths();
        for(let month of months){
            let lhForMonth = lhData.find(f=> f._id == month.num);
            !lhForMonth ? lhForMonth = {"intTheMonth": 0,"moreThan10Times": 0,"moreThan5Times": 0,"moreThan1Times": 0,"oneTime": 0,"numReportDownloads":0} :'';
            let vsForMonth = vsData.find(f=> f._id == month.num);
            !vsForMonth ? vsForMonth = {"visitCount": 0} :'';
            let uForMonth = uData.find(f=> f._id == month.num);
            !uForMonth ? uForMonth = {"numOfRegUser": 0} :'';
            Object.assign(month,lhForMonth);
            Object.assign(month,vsForMonth);
            Object.assign(month,uForMonth);
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