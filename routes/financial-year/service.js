const FinancialYear = require('../../models/FinancialYear');
const ulbledgers = require('../../models/UlbLedger');
const Response = require('../../service').response;
const ObjectId = require('mongoose').Types.ObjectId;
const User = require('../../models/User')
const Ulb = require('../../models/Ulb')
const Tabs = require('../../models/TabList')
const { getCurrentFinancialYear } = require("../CommonActionAPI/service");
const catchAsync = require('../../util/catchAsync');
const { YEAR_CONSTANTS } = require('../../util/FormNames');
let decade = "20"
module.exports.get = async function (req, res) {
    let query = {};
    query['isActive'] = true;
    try {
        let years = await FinancialYear.find(query, '_id name');

        return Response.OK(res, years, `Financial year list.`);
    } catch (e) {
        return Response.InternalError(res, {}, `Exception: ${e.message}.`);
    }
};

/**
 * Dynamic Financial Years are  those years which are contain any Financial Data.
 * The list changes based upon the datas present in collection UlbFinancialData.
 *  */
module.exports.yearsContainingFinancialYear = async function (req, res) {
    let query = {};
    query['isActive'] = true;
    try {
        let years = await ulbledgers.distinct('financialYear');
        let getSortedYear = years.sort((a, b) => (b.split("-")[0] - a.split("-")[0]));
        return Response.OK(res, getSortedYear, `Financial year list.`);
    } catch (e) {
        return Response.InternalError(res, {}, `Exception: ${e.message}.`);
    }
};

module.exports.put = async function (req, res) {
    if (req.decoded.role != 'ADMIN') {
        return Response.BadRequest(res, {}, `Action not allowed.`);
    }
    req.body['modifiedAt'] = new Date();
    let condition = {
        _id: ObjectId(req.params._id),
    };
    try {
        let du = await FinancialYear.update(condition, { $set: req.body });
        return Response.OK(res, du, ``);
    } catch (e) {
        return Response.DbError(res, e, e.message);
    }
};
module.exports.post = async function (req, res) {
    if (req.decoded.role != 'ADMIN') {
        return Response.BadRequest(res, {}, `Action not allowed.`);
    }
    try {
        let financialYear = new FinancialYear(req.body);
        let du = await financialYear.save();
        return Response.OK(res, du, ``);
    } catch (e) {
        return Response.DbError(res, e, e.message);
    }
};
module.exports.delete = async function (req, res) {
    if (req.decoded.role != 'ADMIN') {
        return Response.BadRequest(res, {}, `Action not allowed.`);
    }
    let condition = {
        _id: ObjectId(req.params._id),
    },
        update = {
            isActive: false,
            modifiedAt: new Date(),
        };
    try {
        let du = await FinancialYear.update(condition, update);
        return Response.OK(res, du, ``);
    } catch (e) {
        return Response.DbError(res, e, e.message);
    }
};

function returnYearUrl(item) {
    let role = this.role
    let financialYear = getCurrentFinancialYear()
    try {
        let obj = {
            year: item.design_year.year,
            url: item[this.type],
            id: item.design_year._id.toString()
            
        }
        if (
            // (financialYear == item.design_year.year) &&
         (role == "ulb" || role == "state")) {
            obj.url = this.verified ? obj.url : item.profileUrl
        }
        return obj

    }
    catch (err) {
        console.log("error in returnYear :: ", err.message)
    }

}

function getAccesibleKeys(ulbData) {
    try {
        let years = []
        for (let fields in ulbData) {
            // console.log(fields)
            if (fields.startsWith("access_")) {
                if (ulbData[fields] == true) {
                    let number = fields.split("_")[1]
                    let fromYear = decade + number.substring(0, 2)
                    let toYear = number.substring(2, number.length)
                    let yearStr = fromYear + "-" + toYear
                    years.push(yearStr)

                }
            }
        }
        return years
    }
    catch (err) {
        console.log("error in getAccesibleKeys ::: ", err.message)
    }
}

function yearSorter(a,b){
    let year1 = parseInt(a.year)
    let year2 = parseInt(b.year)
    return year1-year2
}

module.exports.access = catchAsync(async function (req, res) {
    try {
        let years = await Tabs.find({}).populate({
            "path": "design_year"
        }).lean()
        const role = req.decoded.role;
        if(role == "STATE" && process.env.ENV === ENV['prod']) {
            years =  years.filter(year=> year?.design_year?._id.toString() !== YEAR_CONSTANTS['24_25'])
        }
        let MoHUA_arr = years.map(returnYearUrl, { "type": "mohuaUrl", "role": "mohua" })
        const yearList = ['2020-21', '2021-22', '2022-23', '2023-24', '2024-25']
        const entity_id = req.decoded._id;
        let arr = []
        let userData;
        switch (role) {
            case "ULB":
                userData = await User.findOne({ _id: ObjectId(entity_id) }).lean();
                let ulbData = await Ulb.findOne({ _id: userData.ulb }).lean();
                let accessibleYears = await getAccesibleKeys(ulbData)
                let ulbProfileVerified = userData.isVerified2223;
                let ULB_arr = await years.map(returnYearUrl, { "type": "ulbUrl", "role": "ulb", "verified": ulbProfileVerified })
                let outputArr = await ULB_arr.filter(item => accessibleYears.includes(item.year))
                arr = outputArr
                break;
            case "STATE":
                userData = await User.findOne({ _id: ObjectId(entity_id) }).lean();
                let profileVerified = userData.isVerified2223;
                let STATE_arr = await years.map(returnYearUrl, { "type": "stateUrl", "role": "state", "verified": profileVerified })
                // if(process.env.ENV != "demo"){
                //     STATE_arr = STATE_arr.filter(item => item?.year != '2023-24')
                // }
                arr = STATE_arr
                break;
            case "MoHUA":
                case "ADMIN":
                // if(process.env.ENV != "demo"){ 
                    
                //     MoHUA_arr = MoHUA_arr.filter(item => item?.year != '2023-24')
                // }
                arr = MoHUA_arr
                break;

            default:
                break;
        }
        return res.status(200).json({
            success: true,
            data: arr.sort(yearSorter)
        })
    }
    catch (err) {
        console.log("error in access :: ", err.message)
        return res.status(500).json({
            "message": "something went wrong",
            "success": false,
            "data": []
        })
    }
})
