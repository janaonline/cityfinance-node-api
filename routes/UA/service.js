const catchAsync = require('../../util/catchAsync')
const UA = require('../../models/UA')
const ObjectId = require('mongoose').Types.ObjectId;
const State = require('../../models/State')
const Ulb = require('../../models/Ulb')
const SLBData = require('../../models/XVFcGrantForm')
const GFC = require('../../models/GfcFormCollection')
const ODF = require('../../models/OdfFormCollection')
const SLB28 = require('../../models/TwentyEightSlbsForm')
const axios = require('axios')
const {calculateSlbMarks} = require('../Scoring')
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

if(responseObj.fourSLB.approved.count != ulbs.length ||
    responseObj.gfc.approved.count != ulbs.length ||
    responseObj.odf.approved.count != ulbs.length 
    ){
return res.status(200).json({
    data: responseObj,
    message:"Insufficient Data",
    ans:0
})
    }

let slbWeigthed 
 await axios.get(`${process.env.BASEURL}/xv-fc-form/state/606aaf854dff55e6c075d219?ua_id=${uaId}`).then(function (response) {
            console.log('Data Fetched');
             slbWeigthed = response.data[0]
            
            })
              .catch(function (error) {
                console.log('Not Fetched', error.message);
              })


  Object.assign(responseObj.fourSLB.data, slbWeigthed )
  let usableData = []
  let arr = []
  let filteredData = []
  TEslbdata.forEach(el => {
 filteredData = el.twentyeightslbforms.data.filter(el=>  lineItemIndicatorIDs.includes(el.indicatorLineItem))
arr.push({
data: filteredData,
population: el.population

})
let numerator = [0,0,0,0], popData = [0,0,0,0]
arr.forEach(el => {
    el.data.forEach(el2, index=> {
        numerator[index] += el2.actual.value * el.population
        popData[index] += el.population
    })
})

let wtAvgSLB = []
numerator.forEach(el, index=> {
    wtAvgSLB.push(numerator[index]/popData[index])
})

  })  
  Object.assign(slbWeigthed, {
    "houseHoldCoveredWithSewerage_actual2122": wtAvgSLB[0],
    "houseHoldCoveredPipedSupply_actual2122": wtAvgSLB[1],
    "waterSuppliedPerDay_actual2122": wtAvgSLB[2],
    "reduction_actual2122": wtAvgSLB[3]
  })
  let scores = calculateSlbMarks(slbWeigthed)
Object.assign(slbWeigthed, {
    "houseHoldCoveredWithSewerage_score": scores[0],
    "houseHoldCoveredPipedSupply_score": scores[1],
    "waterSuppliedPerDay_score": scores[2],
    "reduction_score": scores[3],
  })
  responseObj.fourSLB.data = slbWeigthed
    return res.status(200).json({
        success: true,
        data: responseObj
    })
})

