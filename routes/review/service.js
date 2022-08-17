const catchAsync = require('../../util/catchAsync')
const Sidemenu = require('../../models/Sidemenu')
const CollectionNames = require('../../util/collectionName')
const {calculateStatus} = require('../CommonActionAPI/service')
const ObjectId = require("mongoose").Types.ObjectId;
const STATUS_LIST = require('../../util/newStatusList')
const Service = require('../../service');
const List = require('../../util/15thFCstatus')
function createDynamicColumns(collectionName){
    let columns = ``;
    switch(collectionName){
        
        case CollectionNames.odf: 
        case CollectionNames.gfc:
            columns = `Rating,Cert URL,Cert Name, Cert Date, Design year,  Approve/Reject Comment, Response File Name, Response File URL, Created On, Modified On `;
            break;
        case CollectionNames.propTaxState:
            columns =  `Act Page,Floor Rate Url, Floor Rate Name, Status`
            break;
        default:
            columns = '';
            break;
    }
    return columns;
}

function createDynamicElements(collectionName, entity) {
    switch(collectionName){

        case CollectionNames.odf: 
        case CollectionNames.gfc:
            entity = ` ${entity.rating} , ${entity.certUrl}  , ${entity.certName}  , ${entity.certDate}  , ${entity.design_year}  ,  ${entity.rejectReason}  , ${entity.responseFileName}  , ${entity.responseFileUrl}  , ${entity.createdAt}  , ${entity.modifiedAt} `   
            break;
        
        case CollectionNames.propTaxState:
            entity = `${entity.actPage}, ${entity.floorRate.url}, ${entity.floorRate.name},${entity.status}`
            break;
    }
    return entity;
}

function createDynamicQuery(collectionName, oldQuery) {
    let query = {};
    switch(collectionName){
        case CollectionNames.odf: 
        case CollectionNames.gfc:
            query.rating = "$rating",
            query.certUrl = "$cert.url",
            query.certName = "$cert.name",
            query.certDate = "$certDate",
            query.design_year = "$design_year",
            query.rejectReason = "$rejectReason",
            query.responseFileUrl = "$responseFile.url",
            query.responseFileName = "$responseFile.name",
            query.createdAt = "$createdAt",
            query.modifiedAt = "$modifiedAt";
            break;

        case CollectionNames.propTaxState:
            query.actPage = "$actPage",
            query.floorRateUrl = "$floorRate.url",
            query.floorRateName = "$floorRate.name",
            query.status = "$status";
            break;
        default:
            query={};
            break;
    }
    //append the above query object to oldQuery object
    Object.assign(oldQuery[oldQuery.length -1].$project, query)
    return oldQuery;
}

function canTakeActionOrViewOnly(data, userRole) {
    let status = data['formStatus'];
switch (true) {
    case status == STATUS_LIST.Not_Started:
        return false;
        break;
        case status == STATUS_LIST.In_Progress:
        return false;
        break;
        case status == STATUS_LIST.Under_Review_By_State && userRole == 'STATE':
            return true;
            break;
            case status == STATUS_LIST.Under_Review_By_State && (userRole == 'MoHUA' || userRole == 'ADMIN'):
                return false;
                break;
                case status == STATUS_LIST.Rejected_By_State:
                return false;
                break;
                case status == STATUS_LIST.Rejected_By_MoHUA:
                return false;
                break;
                case status == STATUS_LIST.Under_Review_By_MoHUA && userRole == 'STATE' :
                return false;
                break;
                case status == STATUS_LIST.Under_Review_By_MoHUA && userRole == 'MoHUA' :
                return true;
                break;
                case status == STATUS_LIST.Approved_By_MoHUA  :
                    return false;
                    break;

    default:
        break;
}
}

module.exports.get = catchAsync( async(req,res) => {
    let loggedInUserRole = req.decoded.role
    let filter = {};
    const ulbColumnNames = {
        sNo: "S No.",
        ulbName:"ULB Name",
        stateName:"State Name",
        censusCode:"Census/SB Code",
        ulbType:"ULB Type",
        populationType: "Population Type",
        UA:"UA",
        formStatus:"Form Status",
        filled:"Filled Status",
        filled_audited:"Audited Filled Status",
        filled_provisional:"Provisional Filled Status",
        action: "Action"
    }
    const stateColumnNames = {
        sNo: "S No.",
        stateName:"State Name",
        formStatus:"Form Status"

    }
    //    formId --> sidemenu collection --> e.g Annual Accounts --> _id = formId
    let total;
    let design_year = req.query.design_year;
    let form = req.query.formId
    if(!design_year || !form){
        return res.status(400).json({
            success: false,
            message:"Missing FormId or Design Year"
        })
    }
    let skip = req.query.skip ? parseInt(req.query.skip) : 0
    let limit = req.query.limit ? parseInt(req.query.limit) : 10
    let csv = req.query.csv == "true"
    
    let formTab = await Sidemenu.findOne({_id: ObjectId(form)}).lean();
    let formType = formTab.role
    if(formType === "ULB"){
        filter['ulbName'] = req.query.ulbName
        filter['censusCode'] = req.query.censusCode
        filter['ulbCode'] = req.query.ulbCode
        filter['state'] = req.query.stateName
        filter['ulbType'] = req.query.ulbType
        filter['UA'] = req.query.UA
        filter['status'] = req.query.status
    
        // filled1 -> will be used for all the forms and Provisional of Annual accounts
        // filled2 -> only for annual accounts -> audited section
        filter['filled1'] = req.query.filled1
        filter['filled2'] = req.query.filled2
        if (filter["censusCode"]) {
            let code = filter["censusCode"];
            var digit = code.toString()[0];
            if (digit == "9") {
              delete filter["censusCode"];
              filter["sbCode"] = code;
            }
          }

    }
  
if(formType == 'STATE'){
    filter['state'] = req.query.stateName
    filter['status'] = req.query.status 
}

    let state = req.query.state ?? req.decoded.state
    let getQuery = req.query.getQuery == 'true'

    
    if( !design_year || !form ){
        return res.status(400).json({
            success: false,
            message:"Data Missing"
        })
    }
    //path -> file of models
    console.log(formTab, "----formTab");
let path = formTab.path
let collectionName = formTab.collectionName;
if(collectionName == CollectionNames.annual){
    delete ulbColumnNames['filled']
}else{
    delete ulbColumnNames.filled_audited
    delete ulbColumnNames.filled_provisional
}
let isFormOptional = formTab.optional
 const model = require(`../../models/${path}`)
 let newFilter = await Service.mapFilterNew(filter);
let query = computeQuery(collectionName, formType, isFormOptional,state,design_year,csv,skip, limit, newFilter);
if(getQuery) return res.json({
    query: query[0]
})

// if csv - then no skip and limit, else with skip and limit
let data =  model.aggregate(query[0])
total =  model.aggregate(query[1])
let allData = await Promise.all([data, total]);
data = allData[0]
total = allData[1].length ? allData[1][0]['total'] : 0
console.log(total,data)
//  if(collectionName == CollectionNames.dur || collectionName == CollectionNames.gfc ||
//     collectionName == CollectionNames.odf || collectionName == CollectionNames.slb || 
//     collectionName === CollectionNames.sfc || collectionName === CollectionNames.propTaxState || collectionName === CollectionNames.annual )
 data.forEach(el => {
  el['formStatus'] =  calculateStatus(el.status, el.actionTakenByRole, el.isDraft, formType);   
  el['cantakeAction'] = canTakeActionOrViewOnly(el, loggedInUserRole)
})
 
// if users clicks on Download Button - the data gets downloaded as per the applied filter
if(csv){

    let filename = `Review_${formType}-${collectionName}.csv`;

    // Set approrpiate download headers
    res.setHeader("Content-disposition", "attachment; filename=" + filename);
    res.writeHead(200, { "Content-Type": "text/csv;charset=utf-8,%EF%BB%BF" });
    if(formType === 'ULB'){

        let fixedColumns = `ULB Name, City Finance Code, Census Code, ULB Type, State Name, Population, UA, Form Status, Form Filled Status,`;
        let dynamicColumns = createDynamicColumns(collectionName);
    
        
        if(collectionName != CollectionNames.annual){
            res.write(
                `${fixedColumns} ${dynamicColumns} \r\n`
              );
            
            res.flushHeaders();
            for(let el of data){
                let dynamicElementData = createDynamicElements(collectionName,el);
                
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
                    el.filled +","+
    
                    dynamicElementData +
                    
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
    } else if( formType === "STATE"){
        let fixedColumns = `State Name, City Finance Code, Regional Name`;
        let dynamicColumns = createDynamicColumns(collectionName)
        res.write(
            `${fixedColumns } ${dynamicColumns} \r\n`
        );
        
        res.flushHeaders();
        for(let el of data){
            let dynamicElementData = createDynamicElements(collectionName,el);
            
            res.write(
                el.stateData.name +
                "," +
                el.stateData.code + 
                "," +
                el.stateData.regionalName + 
                "," +
                dynamicElementData +
                
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
     data: data,
     total: total,
     columnNames: formType =='ULB' ? ulbColumnNames : stateColumnNames,
     statusList: formType =='ULB' ? List.ulbFormStatus : List.stateFormStatus,
     ulbType : formType =='ULB' ? List.ulbType : {},
     populationType : formType =='ULB' ? List.populationType : {},
     title: formType == 'ULB' ? 'Review Grant Application' : 'Review State Forms'
 })



})

const computeQuery = (formName, userRole, isFormOptional,state, design_year,csv,skip, limit, filter) => {
 let query_notFilter_pagination = [], query_Filter_total = [], query_Filter_total_count= [], query_3 = [] , query_2 = [], year;
 //handling the cases where filled/not filled status is to be calculated
 let filledQueryExpression = {}, filledProvisionalExpression = {}, filledAuditedExpression = {}
//  query_notFilter_pagination - this query is only for showing data in the table , it will be paginated and it will work when no filter is there

if(isFormOptional){// if form is optional check if the deciding condition is true or false
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
 //query1 and query2 anfd query3 are different parts of a single query. 
//  They are broken so that state Match can be added at appropriate place
 year = "design_year"
 if(formName == CollectionNames.dur)
 year = "designYear"
 let paginate = [
    {$skip: skip},
    {$limit: limit},
]
    query_notFilter_pagination = [
        {
            $match: {
                [year]: ObjectId(design_year)
            }
        }
    ]
    query_Filter_total_count = query_notFilter_pagination.slice();

    if(!csv){
        query_notFilter_pagination.push(...paginate)
    }
    let filterApplied;
switch(userRole){
    case "ULB":
        query_2 = [
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
    

    query_notFilter_pagination.push(...query_2);
    query_Filter_total_count.push(...query_2)
    
        if(state){
            query_notFilter_pagination.push({
                $match: {
                    "ulb.state":ObjectId(state)
                }
            });
            query_Filter_total_count.push({
                $match: {
                    "ulb.state":ObjectId(state)
                }
            })
        } 

        query_3= [
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
                    populationType: {
                        $cond: {
                        if: { $gt: ["$ulb.population", 1000000] },
                        then: "Million Plus" ,
                        else: "Non Million",
                        },
                    },
                    isDraft: formName == CollectionNames.slb ? {$not: ["$isCompleted"]} : "$isDraft",
                    status:"$status",
                    actionTakenByRole:"$actionTakenByRole",
                    actionTakenBy:"$actionTakenBy",
                    lasUpdatedAt:"$modifiedAt",
                    filled: Object.keys(filledQueryExpression).length>0 ? filledQueryExpression : "NA"
                }
            }
        ]
    
        //appending dynamic query based on collectionName
        query_3 = createDynamicQuery(formName, query_3);

        query_notFilter_pagination.push(...query_3)

        query_Filter_total_count.push(...query_3)
        query_Filter_total = query_Filter_total_count;
        filterApplied = Object.keys(filter).length > 0
        if(Object.keys(filter).length>0){
            query_Filter_total.push({
                $match: filter
            },
            {
                $skip:skip
            },
            {$limit: limit}) 
        }
        query_Filter_total_count.push({
            $count:"total"
        })
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
                delete query_notFilter_pagination[query_notFilter_pagination.length-1]['$project']['filled']
            Object.assign(  query_notFilter_pagination[query_notFilter_pagination.length -1]['$project'], {filled_provisional: filledProvisionalExpression, filled_audited:filledAuditedExpression})
    
        default:
            break;
        }
        return [!filterApplied ?  query_notFilter_pagination: query_Filter_total , query_Filter_total_count  ];

        break;

    case "STATE":
        query_2 = [
            {
                $lookup: {
                    from: "states",
                    localField:"state",
                    foreignField: "_id",
                    as: "stateData"
                }

            },{
                $unwind: "$stateData"
            },
        ]
        query_notFilter_pagination.push(...query_2);
        query_Filter_total_count.push(...query_2);
        
        filterApplied = Object.keys(filter).length > 0
        if(Object.keys(filter).length>0){
            query_Filter_total.push({
                $match: filter
            },
            {
                $skip:skip
            },
            {$limit: limit}) 
        }
        query_Filter_total_count.push({
            $count:"total"
        })
        return [!filterApplied ?  query_notFilter_pagination: query_Filter_total , query_Filter_total_count  ];
        break;

}
     
}

