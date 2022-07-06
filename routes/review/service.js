const catchAsync = require('../../util/catchAsync')
const Sidemenu = require('../../models/Sidemenu')
const CollectionNames = require('../../util/collectionName')
const {calculateStatus} = require('../sidemenu/service')
const ObjectId = require("mongoose").Types.ObjectId;


module.exports.get = catchAsync( async(req,res) => {
let loggedInUserRole = req.decoded.role
   
    let design_year = req.query.design_year;
    let form = req.query.formId
    let skip = req.query.skip
    let limit = req.query.limit
    let csv = req.query.csv
    let state = req.query.state ?? req.decoded.state
    let getQuery = req.query.getQuery == 'true'

    
    if( !design_year || !form ){
        return res.status(400).json({
            success: false,
            message:"Data Missing"
        })
    }
    let formTab = await Sidemenu.findOne({_id: ObjectId(form)}).lean();
let path = formTab.path
let collectionName = formTab.collectionName
let isFormOptional = formTab.optional
 const model = require(`../../models/${path}`)
let query = computeQuery(collectionName, loggedInUserRole, isFormOptional,state,design_year);
if(getQuery) return res.json({
    query: query
})
let data = await model.aggregate(query)

 if(collectionName == CollectionNames.dur || path == CollectionNames.gfc || path == CollectionNames.odf || path == CollectionNames.slb )
 data.forEach(el => {
  el['formStatus'] =  calculateStatus(el.status, el.actionTakenByRole, el.isDraft);   
})
 

 console.log(data)
 return res.status(200).json({
     success: true,
     data: data
 })



})

const computeQuery = (formName, userRole, isFormOptional,state, design_year) => {
 let query_1 = [], query_2 = [], year;
 year = "design_year"
 if(formName == CollectionNames.dur)
 year = "designYear"
    switch (formName) {
     case CollectionNames.dur:
        case CollectionNames.slb:
            case CollectionNames.gfc:
                case CollectionNames.odf:
query_1 = [
    {
        $match: {
            [year]: ObjectId(design_year)
        }
    },
    {
        $lookup: {

            from:"ulbs",
            localField:"ulb",
            foreignField:"_id",
            as:"ulb"
        }
    },{
        $unwind:"$ulb"
    }
]
if(state) query_1.push({
    $match: {
        "ulb.state":ObjectId(state)
    }
})
    let query_2= [
    {
        $lookup: {

            from:"ulbtypes",
            localField:"ulb.ulbType",
            foreignField:"_id",
            as:"ulbType"
        }
    },{
        $unwind:"$ulbType"
    },{
        $lookup: {

            from:"states",
            localField:"ulb.state",
            foreignField:"_id",
            as:"state"
        }
    },{
        $unwind:"$state"
    },
    {
$match:{
    "state.accessToXVFC": true
}
    },
    {
        $lookup: {

            from:"uas",
            localField:"ulb.UA",
            foreignField:"_id",
            as:"UA"
        }
    },
{
    $project:{
        ulbName:"$ulb.name",
        ulbId:"$ulb._id",
        ulbCode:"$ulb.code",
        censusCode: {$ifNull: ["$ulb.censusCode","$ulb.sbCode"]},
        UA: {
            $cond: {
              if: { $eq: ["$ulb.isUA", "Yes"] },
              then: { $arrayElemAt: ["$ulb.UA.name", 0] },
              else: "NA",
            },
          },
        UA_id:{
            $cond: {
              if: { $eq: ["$ulb.isUA", "Yes"] },
              then: { $arrayElemAt: ["$ulb.UA._id", 0] },
              else: "NA",
            },
          },
        ulbType:"$ulbType.name",
        ulbType_id:"$ulbType._id",
        population:"$ulb.population",
        state_id:"$state._id",
        stateName:"$state.name",
        formId:"$_id",
        isDraft: formName == CollectionNames.slb ? {$not: ["$isCompleted"]} : "$isDraft",
        status:"$status",
        actionTakenByRole:"$actionTakenByRole",
        actionTakenBy:"$actionTakenBy",
        lasUpdatedAt:"$modifiedAt"
    }
}
]
query_1.push(...query_2)


         
         break;
 
     default:
         break;
 }
 return query_1;
}

