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
            firstUser: ObjectId(design_year_2122),
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

    responseObj.totalUlbs = ulbs.length
    
    // ulbs.forEach(async el => {

    //     // await axios.get(`${process.env.BASEURL}xv-fc-form?design_year=606aaf854dff55e6c075d219&from=2223&ulb=${el}`).then(function (response) {
    //     //     console.log('Data Fetched');
    //     //     let slbData = response.data[0].waterManagement
    //     //     for(let key in slbData ){
    //     //         slbTotalScore += slbData[key]['score']['2122']
    //     //     }

    //     //       })
    //     //       .catch(function (error) {
    //     //         console.log('Not Fetched');
    //     //       })
              
    //       let gfcData =     await GFC.findOne({
    //             design_year: ObjectId(design_year),
    //             ulb: ObjectId(el),
    //             status:"APPROVED"
    //           }).populate("rating")
    //           gfcScore = gfcData.rating.marks
    //         let odfData =   await ODF.findOne({
    //             design_year: ObjectId(design_year),
    //             ulb: ObjectId(el),
    //             status:"APPROVED"
    //           }).populate("rating")
    //           odfScore = odfData.rating.marks
    // })
let totalMarks = slbTotalScore + odfScore + gfcScore;
let recommendation = recommendationSlab(totalMarks);

    return res.status(200).json({
        success: true,
        data: ""
    })
})

