const catchAsync = require('../../util/catchAsync')
const Sidemenu = require('../../models/Sidemenu')
const CollectionNames = require('../../util/collectionName')
const {calculateStatus} = require('../CommonActionAPI/service')
const ObjectId = require("mongoose").Types.ObjectId;
const STATUS_LIST = require('../../util/newStatusList')

module.exports.get = catchAsync( async(req,res) => {
let loggedInUserRole = req.decoded.role
   
    let design_year = req.query.design_year;
    let form = req.query.formId
    let skip = req.query.skip
    let limit = req.query.limit
    let csv = req.query.csv == "true"
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
 

if(csv){
    let filename = `Review_ULB-${collectionName}.csv`;

    // Set approrpiate download headers
    res.setHeader("Content-disposition", "attachment; filename=" + filename);
    res.writeHead(200, { "Content-Type": "text/csv;charset=utf-8,%EF%BB%BF" });
    if(collectionName != CollectionNames.annual){
        res.write(
            "ULB Name, City Finance Code, Census Code, ULB Type, State Name, Population, UA, Form Status, Form Filled Status \r\n"
          );
          
          res.flushHeaders();
        for(let el of data){
            res.write(
                el.ulbName +
                "," +
                el.ulbCode + 
                "," +
                el.censusCode + 
                "," +
                el.ulbType +
                "," +
                el.stateName +
                "," +
                el.population +
                "," +
                el.UA +
                "," +
                el.formStatus +
                "," +
                el.filled +
                "\r\n"
    
            )
        
        }
        res.end();
      return
    } else{
        res.write(
            "ULB Name, City Finance Code, Census Code, ULB Type, State Name, Population, UA, Form Status, Provisional Filled Status, Audited Filled Status \r\n"
          );
          
          res.flushHeaders();
        for(let el of data){
            res.write(
                el.ulbName +
                "," +
                el.ulbCode + 
                "," +
                el.censusCode + 
                "," +
                el.ulbType +
                "," +
                el.stateName +
                "," +
                el.population +
                "," +
                el.UA +
                "," +
                el.formStatus +
                "," +
                el.filled_provisional +
                "," +
                el.filled_audited +
                "\r\n"
            )
           
        }
        res.end();
        return
    }
  
   
}

 console.log(data)
 return res.status(200).json({
     success: true,
     data: data
 })



})

const computeQuery = (formName, userRole, isFormOptional,state, design_year) => {
 let query_1 = [], query_2 = [], year;
 //handling the cases where filled/not filled status is to be calculated
 let filledQueryExpression = {}, filledProvisionalExpression = {}, filledAuditedExpression = {}

 if(isFormOptional){
     switch (formName) {
         case CollectionNames.slb:
filledQueryExpression = {
    $cond: {
      if: { $eq: ["$blank", true] },
      then: STATUS_LIST.Not_Submitted,
      else: STATUS_LIST.Submitted,
    },
  }
             break;
             case CollectionNames.pfms:
filledQueryExpression = {
    $cond: {
      if:  {$eq: ["$linkPFMS", "Yes" ] },
      then: STATUS_LIST.Submitted,
      else: STATUS_LIST.Not_Submitted,
    },
  }
             break;
             case CollectionNames.propTaxUlb:
                filledQueryExpression = {
                    $cond: {
                      if:  {$eq: ["$submit", "Yes" ]},
                      then: STATUS_LIST.Submitted,
                      else: STATUS_LIST.Not_Submitted,
                    },
                  }
                             break;
     case CollectionNames.annual:
        filledProvisionalExpression = {
            $cond: {
              if: { $eq: ["$unAudited.submit_annual_accounts", true] },
              then: STATUS_LIST.Submitted,
              else: STATUS_LIST.Not_Submitted,
            },
          };
          filledAuditedExpression = {
            $cond: {
              if: { $eq: ["$audited.submit_annual_accounts", true] },
              then: STATUS_LIST.Submitted,
              else: STATUS_LIST.Not_Submitted,
            },
          }

         default:
             break;
     }
 }
 //query1 and query2 are 2 parts of a single query. They are broken so that state Match can be added at appropriate place
 year = "design_year"
 if(formName == CollectionNames.dur)
 year = "designYear"
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
     query_2= [
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
        lasUpdatedAt:"$modifiedAt",
        filled: Object.keys(filledQueryExpression).length>0 ? filledQueryExpression : "NA"
    }
}
]
query_1.push(...query_2)
    switch (formName) {
        //  currently, the above query can  uniformly work for all the commented forms. 
        // If later, these forms have to be modified, then handle the cases here

    //  case CollectionNames.dur:
    //     case CollectionNames.slb:
    //         case CollectionNames.gfc:
    //             case CollectionNames.odf:
    //                 case CollectionName.propTaxUlb:
    //                     case CollectionNames.pfms:



         
    //      break;
         case CollectionNames.annual:
             delete query_1.at(-1)['$project']['filled']
           Object.assign(  query_1.at(-1)['$project'], {filled_provisional: filledProvisionalExpression, filled_audited:filledAuditedExpression})
 
     default:
         break;
 }
 return query_1;
}

