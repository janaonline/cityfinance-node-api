const ulbColumnNames = {
    sNo: "S No.",
    ulbName: "ULB Name",
    stateName: "State Name",
    censusCode: "Census/SB Code",
    ulbType: "ULB Type",
    populationType: "Population Type",
    UA: "UA",
    formStatus: "Form Status",
    filled: "Filled Status",
    filled_audited: "Audited Filled Status",
    filled_provisional: "Provisional Filled Status",
    action: "Action"
  }
  const stateColumnNames = {
    sNo: "S No.",
    stateName: "State Name",
    formStatus: "Form Status"
  }
let filterKeys = []
let dbKeys = []
let annualAccountKeys = {
    "filled":"filled_audited",
    "filled2":"filled_provisional"
}
let ulbFilterKeys = {
    formId: 'formId',
    design_year: 'design_year',
    state: 'stateName',
    limit: 'limit',
    skip: 'skip',
    ulbName: 'ulbName',
    // ulbCode: 'ulbCode',
    censusCode: 'censusCode',
    ulbType: 'ulbType',
    UA: 'UA',
    status: 'formData.currentFormStatus',
    filled1: 'filled',
    populationType: 'populationType',
    filled2: 'filled2'
  }

module.exports.projectionQueryUlb1 = (dbCollectionName)=>{
  return {
    $project: {
      ulbName: "$name",
      ulbId: "$_id",
      ulbCode: "$code",
      censusCode: {
        $cond: {
          if: {
            $or: [
              { $eq: ["$censusCode", ""] },
              { $eq: ["$censusCode", null] },
            ],
          },
          then: "$sbCode",
          else: "$censusCode",
        },
      },
      UA: {
        $cond: {
          if: { $eq: ["$isUA", "Yes"] },
          then: "$UA.name",
          else: "NA",
        },
      },
      UA_id: {
        $cond: {
          if: { $eq: ["$isUA", "Yes"] },
          then: "$UA._id",
          else: "NA",
        },
      },
      ulbType: "$ulbType.name",
      ulbType_id: "$ulbType._id",
      population: "$population",
      state_id: "$state._id",
      stateName: "$state.name",
      canTakeAction :handleActions(),
      populationType: {
        $cond: {
          if: { $eq: ["$isMillionPlus", "Yes"] },
          then: "Million Plus",
          else: "Non Million",
        },
      },
      formData: { $ifNull: [`$${dbCollectionName}`, ""] },
    },
  }
}
module.exports.projectionQueryUlb2 = (isFormOptional,filledQueryExpression)=>{
  return {
    $project: {
      ulbName: 1,
      ulbId: 1,
      ulbCode: 1,
      censusCode: 1,
      UA: 1,
      UA_id: 1,
      ulbType: 1,
      ulbType_id: 1,
      population: 1,
      state_id: 1,
      stateName: 1,
      populationType: 1,
      formData: 1,
      filled: {
        $cond: {
          if: {
            $or: [
              { $eq: ["$formData", ""] },
              {
                "$eq": [
                  "$formData.currentFormStatus",
                  1
                ]
              },
              {
                "$eq": [
                  "$formData.currentFormStatus",
                  2
                ]
              }
            ],
          },
          then: "No",
          else: isFormOptional ? filledQueryExpression : "Yes",
        },
      },
    },
  }
}


class actionCaseSwitchCase{
  formTypeUlbCase(){
    return [{
      "case":{
      "$and":[
        {"$eq":["$formType","ULB"]},
        {"$eq":["$role","STATE"]},
        {"$eq":["$formData.currentFormStatus",3]}
      ]
    },
    "then":true,
    },
    {
      "case":{
        "$and":[
          {"$eq":["$formType","ULB"]},
          {"$eq":["$role","MoHUA"]},
          {"$eq":["$formData.currentFormStatus",4]}
        ]
      },
      "then":true
    }]
  }
  formTypeStateCase(){
    return [
    {
      "case":{
        "$and":[
          {"$eq":["$formType","STATE"]},
          {"$eq":["$role","MoHUA"]},
          {"$eq":["$formData.currentFormStatus",4]}
        ]
      },
      "then":true
    }]

  }
}


function handleActions(){
  try{
    let switchCaseService = new actionCaseSwitchCase()
    let cond = {
      "$switch":{
        "branches":[],
        "default":false
      }
    }
    cond["$switch"]["branches"] = cond["$switch"]["branches"].concat(switchCaseService.formTypeUlbCase())
    cond["$switch"]["branches"] = cond["$switch"]["branches"].concat(switchCaseService.formTypeStateCase())
    return cond
  }
  catch(err){
    consle.log("error in handleActions :::: ",err.message)
  }
}

module.exports.ulbFilterKeys = ulbFilterKeys
module.exports.annualAccountKeys = annualAccountKeys
module.exports.ulbColumnNames = ulbColumnNames
module.exports.stateColumnNames = stateColumnNames