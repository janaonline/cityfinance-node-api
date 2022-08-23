const FinancialYear = require('../../models/FinancialYear');
const ulbledgers = require('../../models/UlbLedger');
const Response = require('../../service').response;
const ObjectId = require('mongoose').Types.ObjectId;
const User = require('../../models/User')
const Ulb = require('../../models/Ulb')
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

module.exports.access = async function(req,res)  {
  const yearList = ['2020-21','2021-22','2022-23','2023-24','2024-25']
    const role = req.decoded.role;
    const MoHUA_arr = [
        {
            year:yearList[0],
            url:"/fc_grant"
        },
        {
            year:yearList[1],
            url:"/mohua"
        },

    ]
    let STATE_arr = [
        {
            year:yearList[0],
            url:"/fc_grant"
        },
        {
            year:yearList[1],
            url:"/stateform/dashboard"
        }

    ]
 
    const entity_id = req.decoded._id;
    let arr = []
    let userData
    switch (role) {
        case "ULB":
          
             userData = await User.findOne({_id: ObjectId(entity_id)}).lean();
            let ulbData = await Ulb.findOne({_id: userData.ulb}).lean();
            let access_2021 =  ulbData?.access_2021,
              access_2122 =  ulbData?.access_2122,
               access_2223 =  ulbData?.access_2223,
                access_2324 =  ulbData?.access_2324,
                 access_2425 =  ulbData?.access_2425
            
            let ulbProfileVerified = userData.isVerified2223;
            const ULB_arr = [
                {
                    year:yearList[0],
                    url:"/fc_grant"
                },
                {
                    year:yearList[1],
                    url:"/ulbform/overview"
                },
                {
                    year:yearList[2],
                    url: ulbProfileVerified ? "/ulbform2223/overview" : "/profile-update"
                },
        
            ]
          let outputArr = []
          if(access_2021) outputArr.push(ULB_arr[0])
          if(access_2122) outputArr.push(ULB_arr[1])
          if(access_2223) outputArr.push(ULB_arr[2])
          
            arr = outputArr 
            break;
            case "STATE":
                 userData = await User.findOne({_id: ObjectId(entity_id)}).lean();
                 let profileVerified = userData.isVerified2223;
                 STATE_arr[2]['url'] = profileVerified ? '/stateform2223/dashboard' : '/profile-update' ;
                 arr = STATE_arr



                break;
                case "MoHUA":
                    case "ADMIN":
            arr = MoHUA_arr
                    break;
    
        default:
            break;
    }
   return res.status(200).json({
    success: true,
    data: arr
   })
}
