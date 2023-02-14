const catchAsync = require('../../util/catchAsync')
const UA = require('../../models/UA')
const ObjectId = require('mongoose').Types.ObjectId;
const State = require('../../models/State')
const Ulb = require('../../models/Ulb')
const DUR = require("../../models/UtilizationReport")
const SLBData = require('../../models/XVFcGrantForm')
const GFC = require('../../models/GfcFormCollection')
const ODF = require('../../models/OdfFormCollection')
const Year = require("../../models/Year")
const SLB28 = require('../../models/TwentyEightSlbsForm')
const UaFileList = require("../../models/UAFileList")
const axios = require('axios')
const {calculateSlbMarks} = require('../Scoring/service');
const { ulb } = require('../../util/userTypes');
const {columns} = require("./constants.js")
const {AggregationServices} = require("../../routes/CommonActionAPI/service")
const lineItemIndicatorIDs = [
    "6284d6f65da0fa64b423b52a",
    "6284d6f65da0fa64b423b53a",
    "6284d6f65da0fa64b423b53c",
    "6284d6f65da0fa64b423b540"

]
const recommendationSlab = (score) => {
    switch (score) {
        case  score >=0 && score <= 29 :
            return 0;
            break;
            case  score >=30 && score <= 45 :
            return 60;
            break;
            case  score >=46 && score <= 60 :
            return 75;
            break;
            case  score >= 61 && score <= 80 :
            return 90;
            break;
            case  score >=81 && score <= 100 :
            return 100;
            break;
    
        default:
            break;
    }
}

module.exports.getAll = catchAsync(async (req, res) => {
    let user = req.decoded;
    if (!user) {
        return res.status(400).json({
            success: false,
            message: 'User Not Found'
        })
    }
    if (user.role === "STATE") {
        let state = user.state;
        let arr = await UA.find({ "state": ObjectId(state) })
        if (arr.length > 0) {
            return res.status(200).json({
                success: true,
                message: "UA List Found Successfully",
                data: arr,
                total: arr.length
            })
        } else {
            return res.status(404).json({
                success: false,
                message: "No UA List Found"
            })
        }
    } else if (user.role === "ADMIN" || "MoHUA" || "PARTNER") {
        let arr = await UA.find({})
        if (arr.length > 0) {
            return res.status(200).json({
                success: true,
                message: "UA List Found Successfully",
                data: arr,
                total: arr.length
            })
        } else {
            return res.status(404).json({
                success: false,
                message: "No UA List Found"
            })
        }
    } else {
        return res.status(403).json({
            success: false,
            message: user.role + " is Not Authorized to perform this Action"
        })
    }


})
module.exports.create = catchAsync(async (req, res) => {
    let user = req.decoded;
    let data = req.body;
    if (!user) {
        return res.status(400).json({
            success: false,
            message: 'User Not Found'
        })
    }
    if (user.role === 'ADMIN') {
        let state = data.state;
        let stateData = await State.findOne({ "name": state })
        if (!stateData) {
            return res.status(400).json({
                success: false,
                message: 'UA Data NOT Stored'
            })
        }
        data['state'] = ObjectId(stateData._id);
        let UA = new UAData(data)
        let uaData = await UA.save()
        if (uaData) {
            return res.status(200).json({
                success: true,
                message: 'UA Data Stored Successfully',
                data: uaData
            })
        } else {
            return res.status(400).json({
                success: false,
                message: 'UA Data NOT Stored'
            })
        }
    } else {
        return res.status(403).json({
            success: false,
            message: 'Not Authenticated to Perform this Action'
        })
    }
})

module.exports.update = catchAsync(async (req, res) => {
    let data = req.body;
    let UA_name = data.UA_name;
    let ULBs = data.ULBs_to_be_removed;
    let UA_Data = await UA.findOne({ name: UA_name });
    let All_Ulbs = UA_Data['ulb']

    let delete_ulbs = []
    for (let el of ULBs) {
        let ulbData = await Ulb.findOne({ censusCode: el })
        delete_ulbs.push((ulbData._id))
    }
    console.log('All ULBs', All_Ulbs)

    console.log('Delete ULBs', delete_ulbs)

    let filtered_Ulbs = []

    for (let el of All_Ulbs) {
        let flag
        for (let el2 of delete_ulbs) {
            flag = 0;
            if (String(el2) == String(el)) {
                console.log('match', el2, el)
                flag = 1;
                break;
            }

        }
        if (!flag)
            filtered_Ulbs.push(el)
    }
    console.log(filtered_Ulbs)
    UA_Data.ulb = filtered_Ulbs;
    await UA_Data.save();
    return res.json({
        success: true
    })

})
const design_year_2122 = ObjectId("606aaf854dff55e6c075d219")
module.exports.get2223 = catchAsync(async(req,res)=>{
    let uaId = req.query.ua;
    let design_year = req.query.design_year;
    let slbApproved = {
        count: 0,
        ulbs: [
        ]
    }, slbPending = {
        count: 0,
        ulbs: [
        ]
    }, gfcApproved = {
        count: 0,
        ulbs: [
         
        ]
    }, gfcPending = {
        count: 0,
        ulbs: [
       
        ]
    },odfPending = {
        count: 0,
        ulbs: [
           
        ]
    } , odfApproved = {
        count: 0,
        ulbs: [
        
        ]
    }
    if(!uaId || !design_year ){
        return res.status(404).json({
            success: false,
            message:"UA ID and Design Year is Required"
        })
    }
    let responseObj = {
        totalUlbs:0,
        fourSLB:{
            data: {},
            approved: {
                count: 2,
                ulbs: [
                    {
                        ulbName:"",
                        censusCode:""
                    },
                    {
                        ulbName:"",
                        censusCode:""
                    }
                ]
            },
            pending: {
                count: 2,
                ulbs: [
                    {
                        ulbName:"",
                        censusCode:""
                    },
                    {
                        ulbName:"",
                        censusCode:""
                    }
                ]
            }
        },
        gfc:{
            score: 0,
            approved: {
                count: 2,
                ulbs: [
                    {
                        ulbName:"",
                        censusCode:""
                    },
                    {
                        ulbName:"",
                        censusCode:""
                    }
                ]
            },
            pending: {
                count: 2,
                ulbs: [
                    {
                        ulbName:"",
                        censusCode:""
                    },
                    {
                        ulbName:"",
                        censusCode:""
                    }
                ]
            }
        },
        odf:{
            score:0,
            approved: {
                count: 2,
                ulbs: [
                    {
                        ulbName:"",
                        censusCode:""
                    },
                    {
                        ulbName:"",
                        censusCode:""
                    }
                ]
            },
            pending: {
                count: 2,
                ulbs: [
                    {
                        ulbName:"",
                        censusCode:""
                    },
                    {
                        ulbName:"",
                        censusCode:""
                    }
                ]
            }
        }
    }

    let uaData = await UA.findOne({_id: ObjectId(uaId)}).lean()
    let ulbs = []
    let slbTotalScore = 0, gfcScore=0, odfScore=0;

    ulbs = uaData.ulb;
    responseObj.totalUlbs = ulbs.length
let slbdata = await Ulb.aggregate([
    {
        $match :{

            _id: {$in:ulbs}
        }
    },
    {
        $lookup: {
          from: "xvfcgrantulbforms",
          let: {
            firstUser: design_year_2122,
            secondUser: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$design_year", "$$firstUser"],
                    },
                    {
                      $eq: ["$ulb", "$$secondUser"],
                    },
                  ],
                },
              },
            },
          ],
          as: "xvfcgrantulbforms",
        },
      },
      {
        $unwind: {
          path: "$xvfcgrantulbforms",
          preserveNullAndEmptyArrays: true,
        },
      },
])
let TEslbdata = await Ulb.aggregate([
    {
        $match :{

            _id: {$in:ulbs}
        }
    },
    {
        $lookup: {
          from: "twentyeightslbforms",
          let: {
            firstUser: ObjectId(design_year),
            secondUser: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$design_year", "$$firstUser"],
                    },
                    {
                      $eq: ["$ulb", "$$secondUser"],
                    },
                  ],
                },
              },
            },
          ],
          as: "twentyeightslbforms",
        },
      },
      {
        $unwind: {
          path: "$twentyeightslbforms",
          preserveNullAndEmptyArrays: true,
        },
      },
])
console.log('1')
if(slbdata.length){
slbdata.forEach(el => {
    console.log('2')
    
    if(el.hasOwnProperty("xvfcgrantulbforms") && Object.keys(el.xvfcgrantulbforms).length >0){
        if(TEslbdata.length){
            TEslbdata.forEach(el2 => {
                if(el2.hasOwnProperty("twentyeightslbforms") && Object.keys(el2.twentyeightslbforms).length >0){
                    if(el._id.toString() == el2._id.toString()){
                        if(el.xvfcgrantulbforms.waterManagement.status == "APPROVED" && el2.twentyeightslbforms.status == "APPROVED"){
                            slbApproved.count += 1;
                            slbApproved.ulbs.push({
                                ulbName:el.name,
                                censusCode:el.censusCode ?? el.sbCode
                            }) 
                        }else{
                            slbPending.count += 1
slbPending.ulbs.push({
    ulbName:el.name,
    censusCode:el.censusCode ?? el.sbCode
})
                        }
                    }
                }
               
            })
        }
    }else{
slbPending.count += 1
slbPending.ulbs.push({
    ulbName:el.name,
    censusCode:el.censusCode ?? el.sbCode
})
    }
    
});
}

let gfcData = await Ulb.aggregate([
    {
        $match :{

            _id: {$in:ulbs}
        }
    },
    {
        $lookup: {
          from: "gfcformcollections",
          let: {
            firstUser: ObjectId(design_year),
            secondUser: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$design_year", "$$firstUser"],
                    },
                    {
                      $eq: ["$ulb", "$$secondUser"],
                    },
                  ],
                },
              },
            },
          ],
          as: "gfcformcollections",
        },
      },
      {
        $unwind: {
          path: "$gfcformcollections",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {

            from:"ratings",
            localField:"gfcformcollections.rating",
            foreignField:"_id",
            as:"rating"
        }
      },{
        $unwind:"$rating"
      }
])
if(gfcData){
    gfcData.forEach(el => {
    if(el.hasOwnProperty("gfcformcollections") && Object.keys(el.gfcformcollections).length >0){
if(el.gfcformcollections.status == "APPROVED"){
    gfcApproved.count += 1;
    gfcApproved.ulbs.push({
        ulbName:el.name,
        censusCode:el.censusCode ?? el.sbCode
    })
}else {
    gfcPending.count += 1
gfcPending.ulbs.push({
    ulbName:el.name,
    censusCode:el.censusCode ?? el.sbCode
})
}
    }else{
gfcPending.count += 1
gfcPending.ulbs.push({
    ulbName:el.name,
    censusCode:el.censusCode ?? el.sbCode
})
    }
    
});
}

let odfData = await Ulb.aggregate([
    {
        $match :{

            _id: {$in:ulbs}
        }
    },
    {
        $lookup: {
          from: "odfformcollections",
          let: {
            firstUser: ObjectId(design_year),
            secondUser: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$design_year", "$$firstUser"],
                    },
                    {
                      $eq: ["$ulb", "$$secondUser"],
                    },
                  ],
                },
              },
            },
          ],
          as: "odfformcollections",
        },
      },
      {
        $unwind: {
          path: "$odfformcollections",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {

            from:"ratings",
            localField:"odfformcollections.rating",
            foreignField:"_id",
            as:"rating"
        }
      },{
        $unwind:"$rating"
      }
])
if(odfData){
    odfData.forEach(el => {
    if(el.hasOwnProperty("odfformcollections") && Object.keys(el.odfformcollections).length >0){
if(el.odfformcollections.status == "APPROVED"){
    odfApproved.count += 1;
    odfApproved.ulbs.push({
        ulbName:el.name,
        censusCode:el.censusCode ?? el.sbCode
    })
}else {
    odfPending.count += 1
odfPending.ulbs.push({
    ulbName:el.name,
    censusCode:el.censusCode ?? el.sbCode
})
}
    }else{
odfPending.count += 1
odfPending.ulbs.push({
    ulbName:el.name,
    censusCode:el.censusCode ?? el.sbCode
})
    }
    
});
}

console.log(slbApproved, slbPending, gfcApproved, gfcPending,odfPending, odfApproved )
responseObj.fourSLB.approved = slbApproved
responseObj.fourSLB.pending = slbPending
responseObj.gfc.approved = gfcApproved
responseObj.gfc.pending = gfcPending
responseObj.odf.approved = odfApproved
responseObj.odf.pending = odfPending

if(responseObj.fourSLB.pending.count === ulbs.length ||
    responseObj.gfc.pending.count === ulbs.length ||
    responseObj.odf.pending.count === ulbs.length 
    ){
return res.status(200).json({
    data: responseObj,
    message:"Insufficient Data",
    ans:0
})
    }

let slbWeigthed ={}
// console.log(uaId,`${process.env.BASEURL}/xv-fc-form/state/606aaf854dff55e6c075d219?ua_id=${uaId}` )
 await axios.get(`https://staging.cityfinance.in/api/v1/xv-fc-form/state/606aaf854dff55e6c075d219?ua_id=${uaId}`).then(function (response) {
            console.log('Data Fetched');
             slbWeigthed = response.data.data[0]
            
            })
              .catch(function (error) {
                console.log('Not Fetched', error.message);
              })


  Object.assign(responseObj.fourSLB.data, slbWeigthed )
  let usableData = []
  let arr = []
  let filteredData = []
  TEslbdata.forEach(el => {
 if (el.hasOwnProperty("twentyeightslbforms")) {
   filteredData = el.twentyeightslbforms.data.filter((el2) =>
     lineItemIndicatorIDs.includes(el2.indicatorLineItem.toString())
   );
 }
 arr.push({
   data: filteredData,
   population: el.population,
 });


  })  
  let numerator = [{id:"",value:0},{id:"",value:0},{id:"",value:0},{id:"",value:0}], popData = [{id:"",value:0},{id:"",value:0},{id:"",value:0},{id:"",value:0}]
arr.forEach(el => {
    el.data.forEach((el2, index)=> {
        numerator[index]['id']  = el2.indicatorLineItem.toString()
        numerator[index]['value'] += el2.actual.value * el.population
        popData[index]['value'] += el.population
        popData[index]['id'] = el2.indicatorLineItem.toString()
    })
})




let wtAvgSLB = []
numerator.forEach((el, index)=> {
    wtAvgSLB.push({value:numerator[index].value/popData[index].value, id:numerator[index].id })
    if(el.id == lineItemIndicatorIDs[0]){
        Object.assign(slbWeigthed, {
            "houseHoldCoveredWithSewerage_actual2122": wtAvgSLB[index].value,
        })

    }else if(el.id == lineItemIndicatorIDs[1]){
        Object.assign(slbWeigthed, {
            "houseHoldCoveredPipedSupply_actual2122": wtAvgSLB[index].value,
        })
    }else if(el.id == lineItemIndicatorIDs[2]){
        Object.assign(slbWeigthed, {
            "waterSuppliedPerDay_actual2122": wtAvgSLB[index].value,
        })
    }else if(el.id == lineItemIndicatorIDs[3]){
        Object.assign(slbWeigthed, {
            "reduction_actual2122": wtAvgSLB[index].value,
        })
    }
})
//   Object.assign(slbWeigthed, {
//     "houseHoldCoveredWithSewerage_actual2122": wtAvgSLB[0],
//     "houseHoldCoveredPipedSupply_actual2122": wtAvgSLB[1],
//     "waterSuppliedPerDay_actual2122": wtAvgSLB[2],
//     "reduction_actual2122": wtAvgSLB[3]
//   })
  let scores = calculateSlbMarks(slbWeigthed)
Object.assign(slbWeigthed, {
    "houseHoldCoveredWithSewerage_score": scores[2],
    "houseHoldCoveredPipedSupply_score": scores[3],
    "waterSuppliedPerDay_score": scores[0],
    "reduction_score": scores[1],
  })
  let numeratorGFC = 0, popDataGFC = 0
  gfcData.forEach((el2, index)=> {
    numeratorGFC += el2.rating.marks * el2.population
    popDataGFC += el2.population
})
responseObj.gfc.score = numeratorGFC / popDataGFC;

let numeratorOdf = 0, popDataOdf = 0
  odfData.forEach((el2, index)=> {
    numeratorOdf += el2.rating.marks * el2.population
    popDataOdf += el2.population
})
responseObj.odf.score = numeratorOdf / popDataOdf;
  responseObj.fourSLB.data = slbWeigthed
    return res.status(200).json({
        success: true,
        data: responseObj
    })
})

module.exports.getRelatedUAFile = catchAsync(async(req,res)=>{
    let response = {
        "success":false,
        "message":""
    }
    try{
        const {ulbId} = req.query
        if(!ulbId){
            response.message = "Please provide a ulb id"
            return res.status(400).json(response)
        } 
        let ulbObj = await Ulb.findOne({"_id":ObjectId(ulbId)}).lean()
        if(!ulbObj || ulbObj === undefined) {
            response.message = "Ulb not found"; 
            return res.status(400).json(response);
        }
        else if(ulbObj.isUA === "No"){
            response.message = "Ulb does not have any UA"
            return res.status(400).json(response);
        }
        else{
            let uaFileArr = await UaFileList.find({"UA":ObjectId(ulbObj.UA)})
            let modifiedUaFileArr = [...uaFileArr]
            modifiedUaFileArr =  modifiedUaFileArr.map((item)=>{
                let obj = {...item._doc}
                obj['modifiedAt'] = new Date(item.modifiedAt).toISOString().substring(0, 10)
                return obj
            })
           if(uaFileArr.length > 0){
                response.success = true
                response.fileUrls = modifiedUaFileArr
                response.message = "Fetched successfully"
                return res.status(200).json(response)
           }
           else{
                response.success = true
                response.fileUrls = []
                response.message = "File Not found"
                return res.status(404).json(response)
           }
        }
    }
    catch(err){
        console.log("error in getRelatedUAFile :: ",err.message)
        response.message = err.message
        res.status(500).json(response)
    }
})
module.exports.getUAByuaCode = catchAsync(async(req,res)=>{
    let response = {
        "success":false,
        "message":""
    }
    try{
        let {uaCode} = req.params
        let ua = await UA.findOne({"UACode":uaCode}).select(["name","_id"])
        if(!ua){
            response.message = "UA object not found"
            return res.status(400).json(response)
        }
        response.message = "found"
        response.ua = ua
        return res.status(200).json(response)
    }
    catch(err){
        console.log("error in getUAById",err.message)
    }
})
module.exports.addUAFile = catchAsync(async(req,res)=>{
    let response = {
        "success":false,
        "message":""
    }
    try{
        let data = {...req.body} 
        let design_year = data.Year
        console.log(data)
        let yearObj = await Year.findOne({"year":design_year})
        if(!yearObj){
            response.message = "Year object not found in database"
            return res.status(400).json(response)
        }
        if(!data || data === undefined  || Object.keys(data).length < 1 ){
            response.message = "data  is required"
            return res.status(400).json(response)
        } 
        try{
            data.Year = yearObj._id
            let UaFileObj = new UaFileList(data)
            await UaFileObj.save()
            response.success = true
            response.message = "Created Successfully"
            return res.status(201).json(response)
        }
        catch(err){
            console.log(Object.keys(err))
            response.message = err.message
            return res.status(500).json(response)
        }

    }
    catch(err){
        console.log("error in addUAFile ::: ",err.message)
        response.message = err.message
        return res.status(500).json(response)
    }
})

/**
 * create datastructure for rows 
 */
function getDataStructAccordingly(durObj,cols){
    let rows = []
    console.log(durObj)
    try{
        for(var column of cols){
            let temp = {}
            if(durObj[column.databaseKey]){
                temp[column.key] = durObj[column.databaseKey]
            }
            if(durObj.projects.length){
                for(var obj of durObj.projects){
                    console.log("column.databaseKey :: ",column.databaseKey)
                if(obj[column.databaseKey]){
                    temp[column.key] = durObj[column.databaseKey]
                }
            }
            }
            rows.push(temp)
            //console.log("temp :: ",temp)
            
        }
        console.log("rows ::: ",rows)
    }
    catch(err){
        console.log("error in getDataStructAccordingly ::: ",err.message)
    }
}

function getQueryForUtilizationReports(obj){
    let {ulbId,design_year,financial_year} = obj
    let query = []
    try{
        let service = AggregationServices
        //stage 1 get matching query
        let matchObj = {
            "$match":{
                "ulb":ObjectId(ulbId),
                "designYear":ObjectId(design_year),
                "financialYear":ObjectId(financial_year)
            }
        }
        query.push(matchObj)
        // stage 2 get related ulbs and unwind
        query.push(service.getCommonLookupObj("ulbs","ulb","_id","ulb"))
        query.push(service.getUnwindObj("$ulb",true))
        // stage3 unwind Projects array 
        query.push(service.getUnwindObj("$projects",true))
        // stage 4 group by rows columns according to requirement 
        let groupBy = {
            "$group":{
                "_id":"$_id",
                "rows":{
                    "$push":{
                        "projectName":"$projects.name",
                        "implementationAgency":"$ulb.name",
                        "totalProjectCost":"$projects.cost",
                        "stateShare": 0,
                        "ulbShare": 0,
                        "capitalExpenditureState": 0,
                        "capitalExpenditureUlb": 0,
                        "omExpensesState": 0,
                        "omExpensesUlb": 0,
                        "sector":"Utilization Reports",
                        "startDate": service.getCommonDateTransformer("$projects.createdAt"),
                        "estimatedCompletionDate": service.getCommonDateTransformer("$projects.modifiedAt"),
                        "moreInformation":{
                            "name":"csv file",
                            "url":"https://democityfinance.in/csvFile.pdf"
                        },
                        "projectReport":{
                            "name":"Project Report file",
                            "url":"https://democityfinance.in/report.pdf"
                        },
                        "creditRating":{
                            "name":"Credit rating",
                            "url":"https://democityfinance.in/creditRating.pdf"
                        }
                    }
                }
            }
        }
        query.push(groupBy)
    }
    catch(err){
        console.log("error in getQueryForUtilizationReports ::::",err.message)
    }
    return query
}


module.exports.getInfrastructureProjects = catchAsync(async(req,res)=>{
    let response = {
        success:false,
        message :"Something went wrong"
    }
    let status = 500
    try{
        let {ulbId,design_year,financial_year} = req.params
        let filters = {...req.query}
        if(ulbId === undefined || design_year === undefined ||  financial_year === undefined){
            if(ulbId === undefined){
                response.message = "ulb id is missing"
            }
            else if(design_year === undefined){
                response.message = "design year is missing"
            }
            else if(financial_year === undefined){
                response.message = "financial year is missing"
            }
           return res.status(status).json(response)
        }
        let query = await getQueryForUtilizationReports({ulbId,design_year,financial_year,columns})
        let dbResponse = await DUR.aggregate(query).allowDiskUse(true)
        response.rows = dbResponse[0]['rows']
        response.columns = columns
        response.message = "Fetched Successfully"
        return res.status(200).json(response)
    }
    catch(err){
        response.message = err.message
        console.log("error in getInfrastructureProjects ::: ",err.message)
    }
    return res.status(status).json(response)
})