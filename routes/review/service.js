const catchAsync = require('../../util/catchAsync')
const Sidemenu = require('../../models/Sidemenu')
const CollectionNames = require('../../util/collectionName')
const {calculateStatus} = require('../CommonActionAPI/service')
const ObjectId = require("mongoose").Types.ObjectId;
const STATUS_LIST = require('../../util/newStatusList')
const Service = require('../../service');
const List = require('../../util/15thFCstatus')
const {calculateKeys} = require('../CommonActionAPI/service')
const Ulb = require('../../models/Ulb')
const State = require('../../models/State')
function padTo2Digits(num) {
    return num.toString().padStart(2, '0');
  }
  
  function formatDate(date) {
    return [
      padTo2Digits(date.getDate()),
      padTo2Digits(date.getMonth() + 1),
      date.getFullYear(),
    ].join('/');
  }

function createDynamicColumns(collectionName){
    let columns = ``;
    switch(collectionName){
        
        case CollectionNames.odf: 
        case CollectionNames.gfc:
            columns = `Financial Year,Form Status, Created, Modified, Filled Status, Rating, Score, Certificate URL, Certificate Name, Certificate Issue Date,State Review Status, State Comments,MoHUA Review Status, MoHUA Comments, State Review File URL, MoHUA Review File URL `;
            break;
        case CollectionNames.pfms:
            columns = `Financial Year, Form Status, Created, Modified, Filled Status, Link PFMS, PFMS Account Number, Is Ulb Linked With PFMS, Certificate URL, Certificate Name, Other Doc URL, Other Doc Name,State Review Status, State Comments,MoHUA Review Status, MoHUA Comments, State Review File URL, MoHUA Review File URL `
            break;
        case CollectionNames.propTaxUlb:
           columns = `Financial Year, Form Status, Created, Modified, Filled Status, Collecting Property Taxes in 2022-23,	Operationalized as per the state notification,	Property Tax Valuation Method,	Property Tax Rate Card Url, Property Tax Rate Card Name,	Property Tax Collection for 2019-20,	Property Tax Collection for 2020-21,	Property Tax Collection for 2021-22,	Property Tax Collection Target for 2022-23,	Proof for Property Tax collection for 2021-22 Url, Proof for Property Tax collection for 2021-22 Name `
           break;
        case CollectionNames.propTaxState:
            columns =  `Financial Year, Form Status, Created, Modified, Filled Status, Act Page,Floor Rate Url, Floor Rate Name, Status`
            break;
        case CollectionNames.annual:
            columns = `Financial Year, Form Status, Created, Modified, Filled Status,Type, Audited/Provisional Year,Balance Sheet_PDF_URL, Balance Sheet_Excel_URL,	Balance Sheet_State Review Status,	Balance Sheet_State_Comments,	Balance Sheet_MoHUA Review Status,	Balance Sheet_MoHUA_Comments,	Balance Sheet_Total Amount of Assets,	Balance Sheet_Total Amount of Fixed Assets,	Balance Sheet_Total Amount of State Grants received,	Balance Sheet_Total Amount of Central Grants received,	Balance Sheet Schedule_PDF_URL,	Balance Sheet Schedule_Excel_URL,	Balance Sheet Schedule_State Review Status,	Balance Sheet Schedule_State_Comments,	Balance Sheet Schedule_MoHUA Review Status,	Balance Sheet Schedule_MoHUA_Comments,	Income Expenditure_PDF_URL,	Income Expenditure_Excel_URL, Income Expenditure_State Review Status,	Income Expenditure_State_Comments,	Income Expenditure_MoHUA Review Status,	Income Expenditure_MoHUA_Comments,	Income Expenditure_Total Amount of Revenue,	Income Expenditure_Total Amount of Expenses,	Income Expenditure Schedule_PDF_URL,	Income Expenditure Schedule_Excel_URL,	Income Expenditure Schedule_State Review Status	Income Expenditure Schedule_State_Comments,	Income Expenditure Schedule_MoHUA Review Status,	Income Expenditure Schedule_MoHUA_Comments,	Cash Flow Schedule_PDF_URL,	Cash Flow Schedule_Excel_URL,	Cash Flow Schedule_State Review Status,	Cash Flow Schedule_State_Comments,	Cash Flow Schedule_MoHUA Review Status	,Cash Flow Schedule_MoHUA_Comments, Financials in Standardized Format_Filled Status	,Financials in Standardized Format_Excel URL,	State Review File_URL,	MoHUA Review File_URL`;
            break;
        case CollectionNames.dur:
            columns = `Financial Year, Form Status, Created, Modified, Filled Status, Tied grants for year,	Unutilised Tied Grants from previous installment (INR in lakhs),	15th F.C. Tied grant received during the year (1st & 2nd installment taken together) (INR in lakhs)	,Expenditure incurred during the year i.e. as on 31st March 2021 from Tied grant (INR in lakhs),	Closing balance at the end of year (INR in lakhs),	WM Rejuvenation of Water Bodies Total Tied Grant Utilised on WM(INR in lakhs),	WM Rejuvenation of Water Bodies Number of Projects Undertaken,	WM_Rejuvenation of Water Bodies_Total Project Cost Involved,	WM_Drinking Water_Total Tied Grant Utilised on WM(INR in lakhs),	WM_Drinking Water_Number of Projects Undertaken	,WM_Drinking Water_Total Project Cost Involved,	WM_Rainwater Harvesting_Total Tied Grant Utilised on WM(INR in lakhs),	WM_Rainwater Harvesting_Number of Projects Undertaken,	WM_Rainwater Harvesting_Total Project Cost Involved	,WM_Water Recycling_Total Tied Grant Utilised on WM(INR in lakhs),	WM_Water Recycling_Number of Projects Undertaken,	WM_Water Recycling_Total Project Cost Involved,	SWM_Sanitation_Total Tied Grant Utilised on SWM(INR in lakhs),	SWM_Sanitation_Number of Projects Undertaken,	SWM_Sanitation_Total Project Cost Involved(INR in lakhs),	SWM_Solid Waste Management_Total Tied Grant Utilised on SWM(INR in lakhs),	SWM_Solid Waste Management_Number of Projects Undertaken,	SWM_Solid Waste Management_Total Project Cost Involved(INR in lakhs),	State_Review Status,	State_Comments,	MoHUA Review Status,	MoHUA_Comments,	State_File URL,	MoHUA_File URL `
            break;
        case CollectionNames['28SLB']:
          columns = `Financial Year, Form Status, Created, Modified, Filled Status, Type, Year, Coverage of water supply connections,Per capita supply of water(lpcd) ,Extent of metering of water connections ,Extent of non-revenue water (NRW) ,Continuity of water supply ,Efficiency in redressal of customer complaints, Quality of water supplied , Cost recovery in water supply service , Efficiency in collection of water supply-related charges ,Coverage of toilets , Coverage of waste water network services ,Collection efficiency of waste water network , Adequacy of waste water treatment capacity , Extent of reuse and recycling of waste water , Quality of waste water treatment , Efficiency in redressal of customer complaints , Extent of cost recovery in waste water management ,Efficiency in collection of waste water charges ,Household level coverage of solid waste management services , Efficiency of collection of municipal solid waste ,Extent of segregation of municipal solid waste ,Extent of municipal solid waste recovered ,Extent of scientific disposal of municipal solid waste, Extent of cost recovery in SWM services ,Efficiency in collection of SWM related user related charges ,Efficiency in redressal of customer complaints ,Coverage of storm water drainage network ,Incidence of water logging,State_Review Status,State_Comments,MoHUA Review Status,MoHUA_Comments,State_File URL,MoHUA_File URL `
          break;
        default:
            columns = '';
            break;
    }
    return columns;
}

function createDynamicObject(collectionName, formType){
    let obj = {};
    switch (formType) {
      case "ULB":
        switch (collectionName) {
          case CollectionNames.gfc:
          case CollectionNames.odf:
            obj = {
              design_year: {
                year: "",
              },
              createdAt: "",
              modifiedAt: "",
              rating: {
                name: "",
                marks: "",
              },
              cert: {
                url: "",
                name: "",
              },
              certDate: "",
              rejectReason_state: "",
              rejectReason_mohua: "",
              responseFile_state: {
                url: "",
                name: "",
              },
              responseFile_mohua: {
                url: "",
                name: "",
              },
            };
            break;
          case CollectionNames.pfms:
            obj = {
              design_year: {
                year: "",
              },
              createdAt: "",
              modifiedAt: "",
              linkPFMS: "",
              PFMSAccountNumber: "",
              isUlbLinkedWithPFMS: "",
              cert: {
                url: "",
                name: "",
              },
              otherDocs: {
                url: "",
                name: "",
              },
              rejectReason_state: "",
              rejectReason_mohua: "",
              responseFile_state: {
                url: "",
                name: "",
              },
              responseFile_mohua: {
                url: "",
                name: "",
              },
            };
            break;
          case CollectionNames.annual:
            obj = {
              modifiedAt: "",
              createdAt: "",
              design_year: {
                year: "",
              },
              status: "",
              audited: {
                submit_annual_accounts: "",
                submit_standardized_data: "",
                provisional_data: {
                  bal_sheet: {
                    rejectReason: "",
                    pdf: {
                      url: "",
                      name: "",
                    },
                    excel: {
                      url: "",
                      name: "",
                    },
                    status: "",
                    responseFile: {
                      url: "",
                      name: "",
                    },
                  },
                  assets: "",
                  f_assets: "",
                  s_grant: "",
                  c_grant: "",
                  bal_sheet_schedules: {
                    rejectReason: "",
                    pdf: {
                      url: "",
                      name: "",
                    },
                    excel: {
                      url: "",
                      name: "",
                    },
                    status: "",
                    responseFile: {
                      url: "",
                      name: "",
                    },
                  },
                  inc_exp: {
                    rejectReason: "",
                    pdf: {
                      url: "",
                      name: "",
                    },
                    excel: {
                      url: "",
                      name: "",
                    },
                    status: "",
                    responseFile: {
                      url: "",
                      name: "",
                    },
                  },
                  revenue: "",
                  expense: "",
                  inc_exp_schedules: {
                    rejectReason: "",
                    pdf: {
                      url: "",
                      name: "",
                    },
                    excel: {
                      url: "",
                      name: "",
                    },
                    status: "",
                    responseFile: {
                      url: "",
                      name: "",
                    },
                  },
                  cash_flow: {
                    rejectReason: "",
                    pdf: {
                      url: "",
                      name: "",
                    },
                    excel: {
                      url: "",
                      name: "",
                    },
                    status: "",
                    responseFile: {
                      url: "",
                      name: "",
                    },
                  },
                  auditor_report: {
                    rejectReason: "",
                    pdf: {
                      url: "",
                      name: "",
                    },
                    status: "",
                    responseFile: {
                      url: "",
                      name: "",
                    },
                  },
                },
                standardized_data: {
                  declaration: "",
                  excel: {
                    url: "",
                    name: "",
                  },
                },
                audit_status: "",
                year: "",
              },
              unAudited: {
                submit_annual_accounts: "",
                submit_standardized_data: "",
                provisional_data: {
                  bal_sheet: {
                    rejectReason: "",
                    pdf: {
                      url: "",
                      name: "",
                    },
                    excel: {
                      url: "",
                      name: "",
                    },
                    status: "",
                    responseFile: {
                      url: "",
                      name: "",
                    },
                  },
                  assets: "",
                  f_assets: "",
                  s_grant: "",
                  c_grant: "",
                  bal_sheet_schedules: {
                    rejectReason: "",
                    pdf: {
                      url: "",
                      name: "",
                    },
                    excel: {
                      url: "",
                      name: "",
                    },
                    status: "",
                    responseFile: {
                      url: "",
                      name: "",
                    },
                  },
                  inc_exp: {
                    rejectReason: "",
                    pdf: {
                      url: "",
                      name: "",
                    },
                    excel: {
                      url: "",
                      name: "",
                    },
                    status: "",
                    responseFile: {
                      url: "",
                      name: "",
                    },
                  },
                  revenue: "",
                  expense: "",
                  inc_exp_schedules: {
                    rejectReason: "",
                    pdf: {
                      url: "",
                      name: "",
                    },
                    excel: {
                      url: "",
                      name: "",
                    },
                    status: "",
                    responseFile: {
                      url: "",
                      name: "",
                    },
                  },
                  cash_flow: {
                    rejectReason: "",
                    pdf: {
                      url: "",
                      name: "",
                    },
                    excel: {
                      url: "",
                      name: "",
                    },
                    status: "",
                    responseFile: {
                      url: "",
                      name: "",
                    },
                  },
                },
                standardized_data: {
                  declaration: "",
                  excel: {
                    url: "",
                    name: "",
                  },
                },
                audit_status: "",
                year: "",
              },
              actionTakenBy: "",
              filled_provisional: "",
              filled_audited: "",
            };
            break;
          case CollectionNames.propTaxUlb:
            obj = {
              rejectReason_state: "",
              rejectReason_mohua: "",
              isDraft: false,
              history: [],
              ulb: "",
              design_year: "",
              toCollect: "",
              operationalize: "",
              method: "",
              other: "",
              collection2019_20: "",
              collection2020_21: "",
              collection2021_22: "",
              target2022_23: null,
              proof: {
                url: "",
                name: "",
              },
              rateCard: {
                url: "",
                name: "",
              },
              ptCollection: {
                url: "",
                name: "",
              },
              actionTakenBy: "",
              actionTakenByRole: "",
              createdAt: "",
              modifiedAt: "",
              status: "",
            };
            break;
          case CollectionNames.dur:
            obj = {
              _id: "",
              designYear: "",
              financialYear: "",
              ulb: "",
              actionTakenBy: "",
              actionTakenByRole: "",
              categoryWiseData_swm: [
                {
                  category_name: "",
                  grantUtilised: "",
                  numberOfProjects: "",
                  totalProjectCost: "",
                  _id: "",
                },
                {
                  category_name: "",
                  grantUtilised: "",
                  numberOfProjects: "",
                  totalProjectCost: "",
                  _id: "",
                },
              ],
              categoryWiseData_wm: [
                {
                  category_name: "",
                  grantUtilised: "",
                  numberOfProjects: "",
                  totalProjectCost: "",
                  _id: "",
                },
                {
                  category_name: "",
                  grantUtilised: "",
                  numberOfProjects: "",
                  totalProjectCost: "",
                  _id: "",
                },
                {
                  category_name: "",
                  grantUtilised: "",
                  numberOfProjects: "",
                  totalProjectCost: "",
                  _id: "",
                },
                {
                  category_name: "",
                  grantUtilised: "",
                  numberOfProjects: "",
                  totalProjectCost: "",
                  _id: "",
                },
              ],
              createdAt: "",
              declaration: "",
              designation: "",
              grantPosition: {
                unUtilizedPrevYr: "",
                receivedDuringYr: "",
                expDuringYr: "",
                closingBal: "",
              },
              grantType: "",
              history: [],
              isActive: "",
              isDraft: "",
              modifiedAt: "",
              name: "",
              projects: [
                {
                  cost: "",
                  expenditure: "",
                  modifiedAt: "",
                  createdAt: "",
                  isActive: "",
                  _id: "",
                  category: "",
                  name: "",
                  location: {
                    lat: "",
                    long: "",
                  },
                },
              ],
              rejectReason: "",
              rejectReason_mohua: "",
              rejectReason_state: "",
              status: "",
              responseFile_state: {
                url: "",
                name: "",
              },
              design_year: {
                _id: "",
                year: "",
                isActive: "",
              },
            };
            break;
          case CollectionNames["28SLB"]:
            
            obj = {
              _id: "",
              population: "",
              createdAt: "",
              modifiedAt: "",
              isDraft: "",
              rejectReason: "",
              history: [],
              data: [],
              design_year: "",
              ulb: "",
              actionTakenBy: "",
              actionTakenByRole: "",
              status: "",
              actual_year: {
                _id: "",
                year: "",
                isActive: "",
              },
              target_1_year: {
                _id: "",
                year: "",
                isActive: "",
              },
            };
            let quesObj = {
              question: "",
              type: "",
              unit: "",
              range: "",
              actualDisable: "",
              targetDisable: "",
              _id: "",
              actual: {
                year: "",
                value: "",
              },
              target_1: {
                year: "",
                value: "",
              },
              indicatorLineItem: "",
            }
            for(let i =0 ; i<28; i++){ //adding question object to data array
              obj["data"].push(quesObj);
            }
            break;
        }
        break;

      case "STATE":
        switch (collectioName) {
        }
        break;
    }
    return obj;
}

function actionTakenByResponse(entity){

    let obj = {
        state_status:"",
        mohua_status:"",
        rejectReason_state: "",
        rejectReason_mohua: "",
        responseFile_state: {
            url: "",
            name: ""
          },
          responseFile_mohua: {
            url: "",
            name: ""
          }
    };

    let histories = entity["formData"]["history"];
    if(!histories){
        return obj;
    }
    let stateFlag =true;
    let mohuaFlag = true;
    for(let i = histories.length -1; i>=0; i--){
      let history = histories[i];

      if(history['actionTakenByRole'] === "MoHUA" && mohuaFlag){
        if(history['rejectReason_mohua']){
          obj.rejectReason_mohua = history['rejectReason_mohua']; 
        }
        if(history['responseFile_mohua']){
          obj.responseFile_mohua = history['responseFile_state'];
        }
        if(history['status']){
          obj.mohua_status = history['status'];
        }
        mohuaFlag = false;
      } else if(history['actionTakenByRole'] === "STATE" && stateFlag){
        if(history['rejectReason_state']){
            obj.rejectReason_state = history['rejectReason_state']; 
        }
        if(history['responseFile_state']){
            obj.responseFile_state = history['responseFile_state'];
        }
        if(history['status']){
            obj.state_status = history['status'];
        }
        stateFlag = false;
      }
      if(!stateFlag && !mohuaFlag) break;
    }
    return obj;
}

function nullToEmptyStrings(obj) {
  if (typeof obj === "object" && obj !== null) {
    if (Object.keys(obj).length > 0) {
      for (let key of Object.keys(obj)) {
        if (typeof obj[key] === "object"  && obj !== null && !Array.isArray(obj[key])) {
          if (obj[key] === null) {
            obj[key] = "";
            continue;
          }
          if(obj[key].hasOwnProperty('_bsontype')){
            if( obj[key]["_bsontype"] !== "ObjectID" ){
              if (obj[key] === null) {
                obj[key] = "";
              }
              nullToEmptyStrings(obj[key]);
            }
          }else {
            if (obj[key] === null) {
              obj[key] = "";
            }
            nullToEmptyStrings(obj[key]);
          }
      
        } 
      }
    }
  }
  return obj;
}


function createDynamicElements(collectionName, formType, entity) {
    if(!entity.formData){
        entity["filled"] = "No";
        entity['formData'] =  createDynamicObject(collectionName ,formType);
    }    
    let actions = actionTakenByResponse(entity);
    
    if(!entity["formData"]["rejectReason_state"]){
        entity["formData"]["rejectReason_state"] = ""
    }
    if(!entity["formData"]["rejectReason_mohua"]){
        entity["formData"]["rejectReason_mohua"] = ""
    }
    if( !entity["formData"]["responseFile_state"] ){
        entity["formData"]["responseFile_state"]= {
            url:"",
            name:""
        }
    }
    if(!entity["formData"]["responseFile_mohua"]){
        entity["formData"]["responseFile_mohua"] = {
            url: "",
            name:""
        }
    }

    if(!entity["formData"]["design_year"]) {
        entity["formData"]["design_year"] ={
            year :""
        }
    }

    if (entity?.formData.createdAt) {
        entity["formData"]["createdAt"] = formatDate(
          entity?.formData.createdAt
        );
      }
      if (entity?.formData.modifiedAt) {
        entity["formData"]["modifiedAt"] = formatDate(
          entity?.formData.modifiedAt
        );
      }

      let data  = entity?.formData;          
      switch(formType){
        case "ULB":
          switch (collectionName) {
            case CollectionNames.odf:
            case CollectionNames.gfc:
              if (entity?.formData.certDate) {
                entity["formData"]["certDate"] = formatDate(
                  entity?.formData.certDate
                );
              }
              if (!entity?.formData.certDate) {
                entity.formData.certDate = "";
              }

              entity = ` ${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""}, ${data?.createdAt ?? ""}, ${data?.modifiedAt ?? ""},${entity.filled ?? ""}, ${data["rating"]["name"] ?? ""},${data["rating"]["marks"] ?? ""},${data["cert"]["url"] ?? ""},${data["cert"]["name"] ?? ""},${data["certDate"] ?? ""},${actions["state_status"] ?? ""},${actions["rejectReason_state"] ?? ""},${actions["mohua_status"] ?? ""},${actions["rejectReason_mohua"] ?? ""},${actions["responseFile_state"]["url"] ?? ""},${actions["responseFile_mohua"]["url"] ?? ""} `;
              break;

            case CollectionNames.pfms:
              entity = ` ${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""}, ${data?.createdAt ?? ""}, ${data?.modifiedAt ?? ""},${entity.filled ?? ""}, ${data["linkPFMS"] ?? ""},${data["PFMSAccountNumber"] ?? ""},${data["isUlbLinkedWithPFMS"] ?? ""},${data["cert"]["url"] ?? ""},${data["cert"]["name"] ?? ""},${data["otherDocs"]["url"] ?? ""},${data["otherDocs"]["name"] ?? ""},${actions["state_status"] ?? ""},${actions["rejectReason_state"] ?? ""},${actions["mohua_status"] ?? ""},${actions["rejectReason_mohua"] ?? ""},${actions["responseFile_state"]["url"] ?? ""},${actions["responseFile_mohua"]["url"] ?? ""} `;
              break;

            case CollectionNames.annual:
              let auditedEntity, unAuditedEntity;

              // if(entity.formData){
              //   entity.formData = nullToEmptyStrings(entity.formData);
              // }

              let unAuditedProvisional = data?.unAudited?.provisional_data; 
              let auditedProvisional = data?.audited?.provisional_data;

              let unAuditedStandardized = data?.unAudited?.standardized_data;
              let auditedStandardized = data?.audited?.standardized_data

              if(data?.actionTakenByRole === "STATE"){
                auditedEntity = ` ${data?.design_year?.year}, ${entity?.formStatus}, ${data?.createdAt}, ${data?.modifiedAt},${entity?.filled_audited}, Audited,${data?.auditedYear?.year ?? ""}, ${auditedProvisional?.bal_sheet?.pdf?.url ?? ""}, ${auditedProvisional?.bal_sheet?.excel?.url ?? ""}, ${auditedProvisional?.bal_sheet?.status ?? ""}, ${auditedProvisional?.bal_sheet?.rejectReason ?? ""}, , ,  ${auditedProvisional?.assets ?? ""}, ${auditedProvisional?.f_assets ?? ""}, ${auditedProvisional?.s_grant ?? ""}, ${auditedProvisional?.c_grant ?? ""}, ${auditedProvisional?.bal_sheet_schedules?.pdf?.url ?? ""}, ${auditedProvisional?.bal_sheet_schedules?.excel?.url ?? ""}, ${auditedProvisional?.bal_sheet_schedules?.status ?? "" }, ${auditedProvisional?.bal_sheet_schedules?.rejectReason ?? ""}, , ,${auditedProvisional?.inc_exp?.pdf?.url ?? ""}, ${auditedProvisional?.inc_exp?.excel?.url ?? ""}, ${auditedProvisional?.inc_exp?.status ?? ""}, ${auditedProvisional?.inc_exp?.rejectReason ?? ""}, , , ${auditedProvisional?.revenue ?? ""}, ${auditedProvisional?.expense ?? ""},${auditedProvisional?.inc_exp_schedules?.pdf?.url ?? ""}, ${auditedProvisional?.inc_exp_schedules?.excel?.url ?? ""}, ${auditedProvisional?.inc_exp_schedules?.status ?? ""}, ${auditedProvisional?.inc_exp_schedules?.rejectReason ?? ""}, , ,${auditedProvisional?.cash_flow?.pdf?.url ?? ""}, ${auditedProvisional?.cash_flow?.excel?.url ?? ""}, ${auditedProvisional?.cash_flow?.status ?? ""}, ${auditedProvisional?.cash_flow?.rejectReason ?? ""}, , , ${data?.audited?.submit_standardized_data ?? ""}, ${auditedStandardized?.excel?.url ?? ""}, ${actions["responseFile_state"]["url"] ?? ""},${actions["responseFile_mohua"]["url"] ?? ""}  `
                  unAuditedEntity = `${data?.design_year?.year}, ${entity?.formStatus}, ${data?.createdAt}, ${data?.modifiedAt},${entity?.filled_provisional}, Provisional,${data?.unAuditedYear?.year ?? ""}, ${unAuditedProvisional?.bal_sheet?.pdf?.url ?? ""}, ${unAuditedProvisional?.bal_sheet?.excel?.url ?? ""}, ${unAuditedProvisional?.bal_sheet?.status ?? ""}, ${unAuditedProvisional?.bal_sheet?.rejectReason ?? ""}, , ,  ${unAuditedProvisional?.assets ?? ""}, ${unAuditedProvisional?.f_assets ?? "" ?? ""}, ${unAuditedProvisional?.s_grant ?? ""}, ${unAuditedProvisional?.c_grant ?? ""}, ${unAuditedProvisional?.bal_sheet_schedules?.pdf?.url ?? ""}, ${unAuditedProvisional?.bal_sheet_schedules?.excel?.url ?? ""}, ${unAuditedProvisional?.bal_sheet_schedules?.status ?? ""}, ${unAuditedProvisional?.bal_sheet_schedules?.rejectReason ?? ""}, , ,${unAuditedProvisional?.inc_exp?.pdf?.url ?? ""}, ${unAuditedProvisional?.inc_exp?.excel?.url ?? ""}, ${unAuditedProvisional?.inc_exp?.status ?? ""}, ${unAuditedProvisional?.inc_exp?.rejectReason ?? ""}, , , ${unAuditedProvisional?.revenue ?? ""}, ${unAuditedProvisional?.expense ?? ""},${unAuditedProvisional?.inc_exp_schedules?.pdf?.url ?? ""}, ${unAuditedProvisional?.inc_exp_schedules?.excel?.url ?? ""}, ${unAuditedProvisional?.inc_exp_schedules?.status ?? ""}, ${unAuditedProvisional?.inc_exp_schedules?.rejectReason ?? ""}, , ,${unAuditedProvisional?.cash_flow?.pdf?.url ?? ""}, ${unAuditedProvisional?.cash_flow?.excel?.url ?? ""}, ${unAuditedProvisional?.cash_flow?.status ?? ""}, ${unAuditedProvisional?.cash_flow?.rejectReason ?? ""}, , , ${data?.unAudited?.submit_standardized_data  ?? ""}, ${unAuditedStandardized?.excel?.url ?? ""}, ${actions["responseFile_state"]["url"] ?? ""},${actions["responseFile_mohua"]["url"] ?? ""} `
                
              }else if( data?.actionTakenByRole === "MoHUA"){
                auditedEntity = ` ${data?.design_year?.year}, ${entity?.formStatus}, ${data?.createdAt}, ${data?.modifiedAt},${entity?.filled_audited}, Audited, ${data?.auditedYear?.year ?? ""},${auditedProvisional?.bal_sheet?.pdf?.url ?? ""}, ${auditedProvisional?.bal_sheet?.excel?.url ?? ""}, , , ${auditedProvisional?.bal_sheet?.status ?? ""}, ${auditedProvisional?.bal_sheet?.rejectReason ?? ""},   ${auditedProvisional?.assets ?? ""}, ${auditedProvisional?.f_assets ?? ""}, ${auditedProvisional?.s_grant ?? ""}, ${auditedProvisional?.c_grant ?? ""}, ${auditedProvisional?.bal_sheet_schedules?.pdf?.url ?? ""}, ${auditedProvisional?.bal_sheet_schedules?.excel?.url ?? ""}, , , ${auditedProvisional?.bal_sheet_schedules?.status ?? "" }, ${auditedProvisional?.bal_sheet_schedules?.rejectReason ?? ""},${auditedProvisional?.inc_exp?.pdf?.url ?? ""}, ${auditedProvisional?.inc_exp?.excel?.url ?? ""}, , , ${auditedProvisional?.inc_exp?.status ?? ""}, ${auditedProvisional?.inc_exp?.rejectReason ?? ""},  ${auditedProvisional?.revenue ?? ""}, ${auditedProvisional?.expense ?? ""},${auditedProvisional?.inc_exp_schedules?.pdf?.url ?? ""}, ${auditedProvisional?.inc_exp_schedules?.excel?.url ?? ""}, , ,${auditedProvisional?.inc_exp_schedules?.status ?? ""}, ${auditedProvisional?.inc_exp_schedules?.rejectReason ?? ""}, ${auditedProvisional?.cash_flow?.pdf?.url ?? ""}, ${auditedProvisional?.cash_flow?.excel?.url ?? ""}, , , ${auditedProvisional?.cash_flow?.status ?? ""}, ${auditedProvisional?.cash_flow?.rejectReason ?? ""},  ${data?.audited?.submit_standardized_data ?? ""}, ${auditedStandardized?.excel?.url ?? ""} , ${actions["responseFile_state"]["url"] ?? ""},${actions["responseFile_mohua"]["url"] ?? ""} `
                  unAuditedEntity = `${data?.design_year?.year}, ${entity?.formStatus}, ${data?.createdAt}, ${data?.modifiedAt},${entity?.filled_provisional}, Provisional,${data?.unAuditedYear?.year ?? ""}, ${unAuditedProvisional?.bal_sheet?.pdf?.url ?? ""}, ${unAuditedProvisional?.bal_sheet?.excel?.url ?? ""}, , , ${unAuditedProvisional?.bal_sheet?.status ?? ""}, ${unAuditedProvisional?.bal_sheet?.rejectReason ?? ""},  ${unAuditedProvisional?.assets ?? ""}, ${unAuditedProvisional?.f_assets ?? "" ?? ""}, ${unAuditedProvisional?.s_grant ?? ""}, ${unAuditedProvisional?.c_grant ?? ""}, ${unAuditedProvisional?.bal_sheet_schedules?.pdf?.url ?? ""}, ${unAuditedProvisional?.bal_sheet_schedules?.excel?.url ?? ""}, , , ${unAuditedProvisional?.bal_sheet_schedules?.status ?? ""}, ${unAuditedProvisional?.bal_sheet_schedules?.rejectReason ?? ""}, ${unAuditedProvisional?.inc_exp?.pdf?.url ?? ""}, ${unAuditedProvisional?.inc_exp?.excel?.url ?? ""}, , , ${unAuditedProvisional?.inc_exp?.status ?? ""}, ${unAuditedProvisional?.inc_exp?.rejectReason ?? ""},  ${unAuditedProvisional?.revenue ?? ""}, ${unAuditedProvisional?.expense ?? ""},${unAuditedProvisional?.inc_exp_schedules?.pdf?.url ?? ""}, ${unAuditedProvisional?.inc_exp_schedules?.excel?.url ?? ""}, , , ${unAuditedProvisional?.inc_exp_schedules?.status ?? ""}, ${unAuditedProvisional?.inc_exp_schedules?.rejectReason ?? ""}, ${unAuditedProvisional?.cash_flow?.pdf?.url ?? ""}, ${unAuditedProvisional?.cash_flow?.excel?.url ?? ""}, , , ${unAuditedProvisional?.cash_flow?.status ?? ""}, ${unAuditedProvisional?.cash_flow?.rejectReason ?? ""}, ${data?.unAudited?.submit_standardized_data ?? ""}, ${unAuditedStandardized?.excel?.url ?? ""} , ${actions["responseFile_state"]["url"] ?? ""},${actions["responseFile_mohua"]["url"] ?? ""} `
              } else {
                auditedEntity = ` ${data?.design_year?.year}, ${entity?.formStatus}, ${data?.createdAt}, ${data?.modifiedAt},${entity?.filled_audited}, Audited, ${data?.auditedYear?.year ?? ""}, ${auditedProvisional?.bal_sheet?.pdf?.url ?? ""}, ${auditedProvisional?.bal_sheet?.excel?.url ?? ""}, , , ,  ${auditedProvisional?.assets ?? ""}, ${auditedProvisional?.f_assets ?? ""}, ${auditedProvisional?.s_grant ?? ""}, ${auditedProvisional?.c_grant ?? ""}, ${auditedProvisional?.bal_sheet_schedules?.pdf?.url ?? ""}, ${auditedProvisional?.bal_sheet_schedules?.excel?.url ?? ""}, , , , ,${auditedProvisional?.inc_exp?.pdf?.url ?? ""}, ${auditedProvisional?.inc_exp?.excel?.url ?? ""}, , , , , ${auditedProvisional?.revenue ?? ""}, ${auditedProvisional?.expense ?? ""},${auditedProvisional?.inc_exp_schedules?.pdf?.url ?? ""}, ${auditedProvisional?.inc_exp_schedules?.excel?.url ?? ""}, , , , ,${auditedProvisional?.cash_flow?.pdf?.url ?? ""}, ${auditedProvisional?.cash_flow?.excel?.url ?? ""}, , , , , ${data?.audited?.submit_standardized_data ?? ""}, ${auditedStandardized?.excel?.url ?? ""} , ${actions["responseFile_state"]["url"] ?? ""},${actions["responseFile_mohua"]["url"] ?? ""} `
                  unAuditedEntity = `${data?.design_year?.year}, ${entity?.formStatus}, ${data?.createdAt}, ${data?.modifiedAt},${entity?.filled_provisional}, Provisional,${data?.unAuditedYear?.year ?? ""}, ${unAuditedProvisional?.bal_sheet?.pdf?.url ?? ""}, ${unAuditedProvisional?.bal_sheet?.excel?.url ?? ""},  , , , ,  ${unAuditedProvisional?.assets ?? ""}, ${unAuditedProvisional?.f_assets ?? "" ?? ""}, ${unAuditedProvisional?.s_grant ?? ""}, ${unAuditedProvisional?.c_grant ?? ""}, ${unAuditedProvisional?.bal_sheet_schedules?.pdf?.url ?? ""}, ${unAuditedProvisional?.bal_sheet_schedules?.excel?.url ?? ""}, , , , ,${unAuditedProvisional?.inc_exp?.pdf?.url ?? ""}, ${unAuditedProvisional?.inc_exp?.excel?.url ?? ""}, , , , , ${unAuditedProvisional?.revenue ?? ""}, ${unAuditedProvisional?.expense ?? ""},${unAuditedProvisional?.inc_exp_schedules?.pdf?.url ?? ""}, ${unAuditedProvisional?.inc_exp_schedules?.excel?.url ?? ""}, , , , ,${unAuditedProvisional?.cash_flow?.pdf?.url ?? ""}, ${unAuditedProvisional?.cash_flow?.excel?.url ?? ""}, , ,  , ,  ${data?.unAudited?.submit_standardized_data ?? ""}, ${unAuditedStandardized?.excel?.url ?? ""} , ${actions["responseFile_state"]["url"] ?? ""},${actions["responseFile_mohua"]["url"] ?? ""} `
              }
              return [auditedEntity, unAuditedEntity];
              break;
            
            case CollectionNames.propTaxUlb:
            entity = ` ${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""}, ${data?.createdAt ?? ""}, ${data?.modifiedAt ?? ""},${entity.filled ?? ""}, ${data["toCollect"] ?? ""},${data["operationalize"] ?? ""},${data["method"] ?? ""},${data["rateCard"]["url"] ?? ""},${data["rateCard"]["name"] ?? ""},${data["collection2019_20"] ?? ""},${data["collection2020_21"] ?? ""},${data["collection2021_22"] ?? ""},${data["target2022_23"] ?? ""},${data["ptCollection"]["url"] ?? ""},${data["ptCollection"]["name"] ?? ""},${actions["state_status"] ?? ""},${actions["rejectReason_state"] ?? ""},${actions["mohua_status"] ?? ""},${actions["rejectReason_mohua"] ?? ""},${actions["responseFile_state"]["url"] ?? ""},${actions["responseFile_mohua"]["url"] ?? ""} `;
            break; 

            case CollectionNames.dur:
              let wmData = data?.categoryWiseData_wm;
              let swmData = data?.categoryWiseData_swm;
              entity = ` ${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""}, ${data?.createdAt ?? ""}, ${data?.modifiedAt ?? ""},${entity.filled ?? ""},${data?.["financialYear"]["year"] ?? ""}, ${data?.grantPosition?.unUtilizedPrevYr ?? ""} ,${data?.grantPosition?.receivedDuringYr ?? ""}, ${data?.grantPosition?.expDuringYr ?? ""},${data?.grantPosition?.closingBal ?? ""},${wmData[0]?.["grantUtilised"] ?? ""},${wmData[0]?.["numberOfProjects"] ?? ""}, ${wmData[0]?.["totalProjectCost"] ?? ""},${wmData[1]?.["grantUtilised"] ?? ""},${wmData[1]?.["numberOfProjects"] ?? ""}, ${wmData[1]?.["totalProjectCost"] ?? ""},${wmData[2]?.["grantUtilised"] ?? ""},${wmData[2]?.["numberOfProjects"] ?? ""}, ${wmData[2]?.["totalProjectCost"] ?? ""},${wmData[3]?.["grantUtilised"] ?? ""},${wmData[3]?.["numberOfProjects"] ?? ""}, ${wmData[3]?.["totalProjectCost"] ?? ""},${swmData[0]?.["grantUtilised"] ?? ""},${swmData[0]?.["numberOfProjects"] ?? ""}, ${swmData[0]?.["totalProjectCost"] ?? ""},${swmData[1]?.["grantUtilised"] ?? ""},${swmData[1]?.["numberOfProjects"] ?? ""}, ${swmData[1]?.["totalProjectCost"] ?? ""}, ${actions["state_status"] ?? ""},${actions["rejectReason_state"] ?? ""},${actions["mohua_status"] ?? ""},${actions["rejectReason_mohua"] ?? ""},${actions["responseFile_state"]["url"] ?? ""},${actions["responseFile_mohua"]["url"] ?? ""}`
              break;
            
            case CollectionNames['28SLB']:
          
              let actualEntity = `${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""}, ${data?.createdAt ?? ""}, ${data?.modifiedAt ?? ""},${entity.filled ?? ""},Actual,${data['actual_year']['year'] ?? ""},${data['data'][0]['actual']['value'] ?? ""},${data['data'][1]['actual']['value'] ?? ""},${data['data'][2]['actual']['value'] ?? ""},${data['data'][3]['actual']['value'] ?? ""},${data['data'][4]['actual']['value'] ?? ""},${data['data'][5]['actual']['value'] ?? ""},${data['data'][6]['actual']['value'] ?? ""},${data['data'][7]['actual']['value'] ?? ""},${data['data'][8]['actual']['value'] ?? ""},${data['data'][9]['actual']['value'] ?? ""},${data['data'][10]['actual']['value'] ?? ""},${data['data'][11]['actual']['value'] ?? ""},${data['data'][12]['actual']['value'] ?? ""},${data['data'][13]['actual']['value'] ?? ""},${data['data'][14]['actual']['value'] ?? ""},${data['data'][15]['actual']['value'] ?? ""},${data['data'][16]['actual']['value'] ?? ""},${data['data'][17]['actual']['value'] ?? ""},${data['data'][18]['actual']['value'] ?? ""},${data['data'][19]['actual']['value'] ?? ""},${data['data'][20]['actual']['value'] ?? ""},${data['data'][21]['actual']['value'] ?? ""},${data['data'][22]['actual']['value'] ?? ""},${data['data'][23]['actual']['value'] ?? ""},${data['data'][24]['actual']['value'] ?? ""},${data['data'][25]['actual']['value'] ?? ""},${data['data'][26]['actual']['value'] ?? ""},${data['data'][27]['actual']['value'] ?? ""}, ${actions["state_status"] ?? ""},${actions["rejectReason_state"] ?? ""},${actions["mohua_status"] ?? ""},${actions["rejectReason_mohua"] ?? ""},${actions["responseFile_state"]["url"] ?? ""},${actions["responseFile_mohua"]["url"] ?? ""} `
              let targetEntity = `${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""}, ${data?.createdAt ?? ""}, ${data?.modifiedAt ?? ""},${entity.filled ?? ""},Target,${data['target_1_year']['year'] ?? ""},${data['data'][0]['target_1']['value'] ?? ""},${data['data'][1]['target_1']['value'] ?? ""},${data['data'][2]['target_1']['value'] ?? ""},${data['data'][3]['target_1']['value'] ?? ""},${data['data'][4]['target_1']['value'] ?? ""},${data['data'][5]['target_1']['value'] ?? ""},${data['data'][6]['target_1']['value'] ?? ""},${data['data'][7]['target_1']['value'] ?? ""},${data['data'][8]['target_1']['value'] ?? ""},${data['data'][9]['target_1']['value'] ?? ""},${data['data'][10]['target_1']['value'] ?? ""},${data['data'][11]['target_1']['value'] ?? ""},${data['data'][12]['target_1']['value'] ?? ""},${data['data'][13]['target_1']['value'] ?? ""},${data['data'][14]['target_1']['value'] ?? ""},${data['data'][15]['target_1']['value'] ?? ""},${data['data'][16]['target_1']['value'] ?? ""},${data['data'][17]['target_1']['value'] ?? ""},${data['data'][18]['target_1']['value'] ?? ""},${data['data'][19]['target_1']['value'] ?? ""},${data['data'][20]['target_1']['value'] ?? ""},${data['data'][21]['target_1']['value'] ?? ""},${data['data'][22]['target_1']['value'] ?? ""},${data['data'][23]['target_1']['value'] ?? ""},${data['data'][24]['target_1']['value'] ?? ""},${data['data'][25]['target_1']['value'] ?? ""},${data['data'][26]['target_1']['value'] ?? ""},${data['data'][27]['target_1']['value'] ?? ""}, ${actions["state_status"] ?? ""},${actions["rejectReason_state"] ?? ""},${actions["mohua_status"] ?? ""},${actions["rejectReason_mohua"] ?? ""},${actions["responseFile_state"]["url"] ?? ""},${actions["responseFile_mohua"]["url"] ?? ""} `

              return [actualEntity, targetEntity];
              break;
          };
        break;
        case "STATE":
          switch (collectionName) {
            case CollectionNames.propTaxState:
                entity = `${data?.design_year?.year}, ${entity?.formStatus}, ${data?.createdAt}, ${data?.modifiedAt},${entity.filled},${entity.actPage}, ${entity.floorRate.url}, ${entity.floorRate.name},${entity.status}`
                break;
          }
    }
    return entity;
}

function createDynamicQuery(collectionName, oldQuery,userRole) {
    let query = {};
    let query_2 = {};
    let query_3 = {}, query_4 = {}, query_5 = {};
    switch (userRole) {
      case "ULB":
        switch (collectionName) {
          case CollectionNames.odf:
          case CollectionNames.gfc:
            query_2 = {
              $lookup: {
                from: "ratings",
                localField: "rating",
                foreignField: "_id",
                as: "rating",
              },
            };
            query_3 = { $unwind: { path: "$rating" } };

            oldQuery[5]["$lookup"]["pipeline"].push(query_2);
            oldQuery[5]["$lookup"]["pipeline"].push(query_3);
            break;

          case CollectionNames.pfms:
            
            break;
          case CollectionNames.annual:
            query_2 = {
              $lookup:{
                  "from": "years",
                  "localField": "audited.year",
                  "foreignField": "_id",
                  "as": "auditedYear"
              },
            }
             query_3 = {
               $unwind:{
                "path": "$auditedYear"
               }  
             };
          
             query_4 ={

               $lookup:{
                    "from": "years",
                    "localField": "unAudited.year",
                    "foreignField": "_id",
                    "as": "unAuditedYear"
                }
             } 

            query_5 ={
                $unwind: {
                "path": "$unAuditedYear"
              }
          }

        oldQuery[5]["$lookup"]["pipeline"].push(query_2);
        oldQuery[5]["$lookup"]["pipeline"].push(query_3);
        oldQuery[5]["$lookup"]["pipeline"].push(query_4);
        oldQuery[5]["$lookup"]["pipeline"].push(query_5);

        break;
        
        case CollectionNames['28SLB']:
          query_2 = {
            $lookup:{
                from: "years",
                localField: "data.actual.year",
                foreignField: "_id",
                as: "actual_year"
            }
          }
          query_3 = {
            $unwind: "$actual_year"
        }

        query_4 = {
          $lookup:{
              from: "years",
              localField: "data.target_1.year",
              foreignField: "_id",
              as: "target_1_year"
          }
      };
      query_5 = {
        $unwind: "$target_1_year"
        };

        oldQuery[5]["$lookup"]["pipeline"].push(query_2);
        oldQuery[5]["$lookup"]["pipeline"].push(query_3);
        oldQuery[5]["$lookup"]["pipeline"].push(query_4);
        oldQuery[5]["$lookup"]["pipeline"].push(query_5);
        break;
        case CollectionNames.dur:
          query_2 = {
            "$lookup": {
                "from": "years",
                "localField": "financialYear",
                "foreignField": "_id",
                "as": "financialYear"
            }
          };
            query_3 = {
                "$unwind": "$financialYear"
            }
            oldQuery[5]["$lookup"]["pipeline"].push(query_2);
        oldQuery[5]["$lookup"]["pipeline"].push(query_3);
        break;
          default:
            query = {};
            break;
        }
        break;
      case "STATE":
        switch (collectionName) {
          case CollectionNames.propTaxState:
            break;
        }
    }
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
    let keys;
    let formTab = await Sidemenu.findOne({_id: ObjectId(form)}).lean();
    if(loggedInUserRole == "STATE"){
        delete ulbColumnNames['stateName']
    }
    let dbCollectionName = formTab?.dbCollectionName
    let formType = formTab.role
    if(formType === "ULB"){
        filter['ulbName'] = req.query.ulbName != 'null' ? req.query.ulbName  : ""
        filter['censusCode'] = req.query.censusCode != 'null' ? req.query.censusCode  : ""
        filter['populationType'] = req.query.populationType != 'null' ? req.query.populationType  : ""
        filter['state'] = req.query.stateName != 'null' ? req.query.stateName  : ""
        filter['ulbType'] = req.query.ulbType != 'null' ? req.query.ulbType  : ""
        filter['UA'] = req.query.UA != 'null' ? req.query.UA  : ""
        filter['status'] = req.query.status != 'null' ? req.query.status  : ""
      keys =  calculateKeys(filter['status'], formType);
      Object.assign(filter,keys )
      delete filter['status']
        // filled1 -> will be used for all the forms and Provisional of Annual accounts
        // filled2 -> only for annual accounts -> audited section
        filter['filled1'] = req.query.filled1 != 'null' ? req.query.filled1  : ""
        filter['filled2'] = req.query.filled2  != 'null' ? req.query.filled2  : ""
        if (filter["censusCode"]) {
            let code = filter["censusCode"];
            var digit = code.toString()[0];
            if (digit == "9") {
              delete filter["censusCode"];
              filter["sbCode"] = code;
            }
          }

    }
  if(formTab.collectionName == CollectionNames.annual){
    filter['filled_audited'] = filter['filled1']
    filter['filled_provisional'] = filter['filled2']
    delete filter['filled1']
    delete filter['filled2']
  }else{
    filter['filled'] = filter['filled1']
    delete filter['filled1']
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
 
let query = computeQuery(collectionName, formType, isFormOptional,state,design_year,csv,skip, limit, newFilter, dbCollectionName);
if(getQuery) return res.json({
    query: query[0]
})

// if csv - then no skip and limit, else with skip and limit
let data = formType == "ULB" ? Ulb.aggregate(query[0]) : State.aggregate(query[0])
total =  formType == "ULB" ?  Ulb.aggregate(query[1]) : State.aggregate(query[1])
let allData = await Promise.all([data, total]);
data = allData[0]
total = allData[1].length ? allData[1][0]['total'] : 0
console.log(total,data)
//  if(collectionName == CollectionNames.dur || collectionName == CollectionNames.gfc ||
//     collectionName == CollectionNames.odf || collectionName == CollectionNames.slb || 
//     collectionName === CollectionNames.sfc || collectionName === CollectionNames.propTaxState || collectionName === CollectionNames.annual )
 data.forEach(el => {
    
    if(!el.formData){
        el['formStatus']="Not Started";
        el['cantakeAction'] = false;
    }else{
        el['formStatus'] =  calculateStatus(el.formData.status, el.formData.actionTakenByRole, el.formData.isDraft, formType);   
        el['cantakeAction'] = canTakeActionOrViewOnly(el, loggedInUserRole)
    }
  
})

 
// if users clicks on Download Button - the data gets downloaded as per the applied filter
if(csv){

    let filename = `Review_${formType}-${collectionName}.csv`;

    // Set approrpiate download headers
    res.setHeader("Content-disposition", "attachment; filename=" + filename);
    res.writeHead(200, { "Content-Type": "text/csv;charset=utf-8,%EF%BB%BF" });
    if(formType === 'ULB'){

        let fixedColumns = `State Name, ULB Name, City Finance Code, Census Code, Population Category, UA, UA Name,`;
        let dynamicColumns = createDynamicColumns(collectionName);
    
        
        if(collectionName != CollectionNames.annual && collectionName != CollectionNames['28SLB']){
            res.write(
                `${fixedColumns} ${dynamicColumns} \r\n`
              );
            
            res.flushHeaders();
            for(let el of data){
                let dynamicElementData = createDynamicElements(collectionName,formType,el);
                if(el.UA === "null"){
                    el.UA = "NA"
                }
                if(el.UA === "NA"){
                    el.isUA = "No";
                }else if( el.UA !== "NA"){
                    el.isUA = "Yes";
                }
                if(!el.censusCode){
                    el.censusCode = "NA"
                }
                res.write(
                    el.stateName +
                    "," +
                    el.ulbName +
                    "," +
                    el.ulbCode + 
                    "," +
                    el.censusCode +
                    "," +
                    el.populationType +
                    "," +
                    el.isUA +
                    "," + 
                    el.UA +
                    "," +
    
                    dynamicElementData +
                    
                    "\r\n"
                )
            
            }
            res.end();
          return
        } else{
            res.write(
                `State Name, ULB Name, City Finance Code, Census Code, Population Category, UA, UA Name, ${dynamicColumns}  \r\n`
              );
              
              res.flushHeaders();
            for(let el of data){
              
              let [ row1, row2] = createDynamicElements(collectionName,formType,el);
              
                if(el.UA === "null"){
                    el.UA = "NA"
                }
                if(el.UA === "NA"){
                    el.isUA = "No";
                }else if( el.UA !== "NA"){
                    el.isUA = "Yes";
                }
                if(!el.censusCode){
                    el.censusCode = "NA"
                }

                res.write(
                    
                    el.stateName +
                    "," +
                    el.ulbName +
                    "," +
                    el.ulbCode + 
                    "," +
                    el.censusCode +
                    "," +
                    el.populationType +
                    "," +
                    el.isUA +
                    "," + 
                    el.UA +
                    "," +
                    row1 +
                    
                    
                    "\r\n"
                )
                res.write(
                    
                  el.stateName +
                  "," +
                  el.ulbName +
                  "," +
                  el.ulbCode + 
                  "," +
                  el.censusCode +
                  "," +
                  el.populationType +
                  "," +
                  el.isUA +
                  "," + 
                  el.UA +
                  "," +
                  row2 +
                  
                  
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

const computeQuery = (formName, userRole, isFormOptional,state, design_year,csv,skip, limit, filter, dbCollectionName) => {
    let filledQueryExpression ={}
    if(isFormOptional){
    // if form is optional check if the deciding condition is true or false
     switch (formName) {
         case CollectionNames.slb:
filledQueryExpression = {
    $cond: {
      if: { $eq: [`$formData.blank`, true] },
      then: STATUS_LIST.Not_Submitted,
      else: STATUS_LIST.Submitted,
    },
  }
             break;
             case CollectionNames.pfms:
filledQueryExpression = {
    $cond: {
      if:  {$eq: [`$formData.linkPFMS`, "Yes" ] },
      then: STATUS_LIST.Submitted,
      else: STATUS_LIST.Not_Submitted,
    },
  }
             break;
             case CollectionNames.propTaxUlb:
                filledQueryExpression = {
                    $cond: {
                      if:  {$eq: [`$formData.toCollect`, "Yes" ]},
                      then: STATUS_LIST.Submitted,
                      else: STATUS_LIST.Not_Submitted,
                    },
                  }
                             break;
     case CollectionNames.annual:
        filledProvisionalExpression = {
            $cond: {
              if: { $eq: [`$formData.unAudited.submit_annual_accounts`, true] },
              then: STATUS_LIST.Submitted,
              else: STATUS_LIST.Not_Submitted,
            },
          };
          filledAuditedExpression = {
            $cond: {
              if: { $eq: [`$formData.audited.submit_annual_accounts`, true] },
              then: STATUS_LIST.Submitted,
              else: STATUS_LIST.Not_Submitted,
            },
          }

         default:
             break;
     }


   }
   let dY = "$design_year";
   let designYearField = "design_year"
   if(formName == CollectionNames.dur){

     dY = "$designYear";
     designYearField = "designYear";
   }
   switch (userRole) {
    case "ULB":
        let query = [
            {
                $match:{
                    "access_2223": true
                }
            },
            {
                                $lookup: {
                        
                                    from:"states",
                                    localField:"state",
                                    foreignField:"_id",
                                    as:"state"
                                }
                            },{
                                $unwind:"$state"
                            },
                            {
                                $match: {
                                    "state.accessToXVFC" : true
                                }
                            }]
    if(state){
        query.push({
            $match: {
    "state._id": ObjectId(state)
            }
            
        })
    }
                 let query_2 =           [{
                    $lookup: {
                        from: dbCollectionName,
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
                                    $eq: [dY, "$$firstUser"],
                                  },
                                  {
                                    $eq: ["$ulb", "$$secondUser"],
                                  },
                                ],
                              },
                            },
                          },
                          {
                            $lookup:{
                                from: "years",
                                localField: designYearField,
                                foreignField: "_id",
                                as: "design_year"
                            }
                          },
                          {
                            $unwind: "$design_year"
                          }
                        ],
                        as: dbCollectionName,
                      }
                            },{
                                $unwind:{
                                    path:`$${dbCollectionName}`,
                                    preserveNullAndEmptyArrays:true
                                }
                            },
                            {
                                $lookup: {
                        
                                    from:"uas",
                                    localField:"UA",
                                    foreignField:"_id",
                                    as:"UA"
                                }
                            },
                            {
                                $unwind:{
                                    "path": "$UA",
                                    "preserveNullAndEmptyArrays": true
                                 }
                            },
                            {
                                $lookup: {
                        
                                    from:"ulbtypes",
                                    localField:"ulbType",
                                    foreignField:"_id",
                                    as:"ulbType"
                                }
                            },{
                                $unwind:"$ulbType"
                            },
                            {
                                $project: {
                                                        ulbName:"$name",
                                                        ulbId:"$_id",
                                                        ulbCode:"$code",
                                                        censusCode: {$ifNull: ["$censusCode","$sbCode"]},
                                                        UA: {
                                                            $cond: {
                                                            if: { $eq: ["$isUA", "Yes"] },
                                                            then: "$UA.name",
                                                            else: "NA",
                                                            },
                                                        },
                                                        UA_id:{
                                                            $cond: {
                                                            if: { $eq: ["$isUA", "Yes"] },
                                                            then: "$UA._id",
                                                            else: "NA",
                                                            },
                                                        },
                                                        ulbType:"$ulbType.name",
                                                        ulbType_id:"$ulbType._id",
                                                        population:"$population",
                                                        state_id:"$state._id",
                                                        stateName:"$state.name",
                                                        populationType: {
                                                            $cond: {
                                                            if: { $eq: ["$isMillionPlus", "Yes"] },
                                                            then: "Million Plus" ,
                                                            else: "Non Million",
                                                            },
                                                        },
                                                      formData:{$ifNull: [`$${dbCollectionName}`, "" ]} 
    
                                }
                            },
                            {
                                $project: {
                                    ulbName:1,
                                                        ulbId:1,
                                                        ulbCode:1,
                                                        censusCode: 1,
                                                        UA: 1,
                                                        UA_id:1,
                                                        ulbType:1,
                                                        ulbType_id:1,
                                                        population:1,
                                                        state_id:1,
                                                        stateName:1,
                                                        populationType:1,
                                                      formData:1 ,
                                                      filled:
                                                      {
                                                        $cond: { if: { $or: [{ $eq: [ "$formData", "" ]},{ $eq: [ "$formData.status", "PENDING" ]}] }, then: "No" , else: isFormOptional ? filledQueryExpression : "Yes" }
                                                      }
    
                                }
                            },
                            {
                                $sort: {formData: -1}
                            }
    
        ]
        query.push(...query_2)

        //dynamic query based on condition
        if(csv){
          query = createDynamicQuery(formName, query, userRole);
        }




        if(formName == CollectionNames.annual){
                            delete query[query.length-2]['$project']['filled']
                Object.assign(  query[query.length -2]['$project'], {filled_provisional: filledProvisionalExpression, filled_audited:filledAuditedExpression})
        }
               let  filterApplied = Object.keys(filter).length > 0
            if(filterApplied){
                query.push({
                    $match: filter
                },
               ) 
            }
            let countQuery = query.slice()
            countQuery.push({
                $count:"total"
            })

            let paginator = [
                {
                    $skip:skip
                },
                {$limit: limit}
            ]
            if(!csv){
                query.push(...paginator)
            }
            return [query,countQuery ]
        break;
        case "STATE":
        let query_s = [
            {
                $match: {
                    "accessToXVFC" : true
                }
            },
            {
                $lookup: {
                    from: dbCollectionName,
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
                                $eq: ["$state", "$$secondUser"],
                              },
                            ],
                          },
                        },
                      },
                    ],
                    as: dbCollectionName,
                  }
                        },{
                            $unwind:{
                                path:`$${dbCollectionName}`,
                                preserveNullAndEmptyArrays:true
                            }
                        },
                        {
                            $project:{
                              state: "$_id",
                                stateName  :"$name",
                                    formData:{$ifNull: [`$${dbCollectionName}`, "" ]} ,
                            }
                        }

        ]
        let  filterApplied_s = Object.keys(filter).length > 0
        if(filterApplied_s){
            query_s.push({
                $match: filter
            },
           ) 
        }
        let countQuery_s = query_s.slice()
        countQuery_s.push({
            $count:"total"
        })
        let paginator_s = [
            {
                $skip:skip
            },
            {$limit: limit}
        ]
        if(!csv){
            query_s.push(...paginator_s)
        }
        return [query_s,countQuery_s ]
        break;
   
    default:
        break;
   }
 
//  let query_notFilter_pagination = [], query_Filter_total = [], query_Filter_total_count= [], query_3 = [] , query_2 = [], year;
//  //handling the cases where filled/not filled status is to be calculated
//  let filledQueryExpression = {}, filledProvisionalExpression = {}, filledAuditedExpression = {}
// //  query_notFilter_pagination - this query is only for showing data in the table , it will be paginated and it will work when no filter is there

// if(isFormOptional){// if form is optional check if the deciding condition is true or false
//      switch (formName) {
//          case CollectionNames.slb:
// filledQueryExpression = {
//     $cond: {
//       if: { $eq: ["$blank", true] },
//       then: STATUS_LIST.Not_Submitted,
//       else: STATUS_LIST.Submitted,
//     },
//   }
//              break;
//              case CollectionNames.pfms:
// filledQueryExpression = {
//     $cond: {
//       if:  {$eq: ["$linkPFMS", "Yes" ] },
//       then: STATUS_LIST.Submitted,
//       else: STATUS_LIST.Not_Submitted,
//     },
//   }
//              break;
//              case CollectionNames.propTaxUlb:
//                 filledQueryExpression = {
//                     $cond: {
//                       if:  {$eq: ["$submit", "Yes" ]},
//                       then: STATUS_LIST.Submitted,
//                       else: STATUS_LIST.Not_Submitted,
//                     },
//                   }
//                              break;
//      case CollectionNames.annual:
//         filledProvisionalExpression = {
//             $cond: {
//               if: { $eq: ["$unAudited.submit_annual_accounts", true] },
//               then: STATUS_LIST.Submitted,
//               else: STATUS_LIST.Not_Submitted,
//             },
//           };
//           filledAuditedExpression = {
//             $cond: {
//               if: { $eq: ["$audited.submit_annual_accounts", true] },
//               then: STATUS_LIST.Submitted,
//               else: STATUS_LIST.Not_Submitted,
//             },
//           }

//          default:
//              break;
//      }
//  }
//  //query1 and query2 anfd query3 are different parts of a single query. 
// //  They are broken so that state Match can be added at appropriate place
//  year = "design_year"
//  if(formName == CollectionNames.dur)
//  year = "designYear"
//  let paginate = [
//     {$skip: skip},
//     {$limit: limit},
// ]
//     query_notFilter_pagination = [
//         {
//             $match: {
//                 [year]: ObjectId(design_year)
//             }
//         }
//     ]
//     query_Filter_total_count = query_notFilter_pagination.slice();

//     if(!csv){
//         query_notFilter_pagination.push(...paginate)
//     }
//     let filterApplied;
// switch(userRole){
//     case "ULB":
//         query_2 = [
//             {
//                 $lookup: {
        
//                     from:"ulbs",
//                     localField:"ulb",
//                     foreignField:"_id",
//                     as:"ulb"
//                 }
//             },{
//                 $unwind:"$ulb"
//             }
//         ]
    

//     query_notFilter_pagination.push(...query_2);
//     query_Filter_total_count.push(...query_2)
    
//         if(state){
//             query_notFilter_pagination.push({
//                 $match: {
//                     "ulb.state":ObjectId(state)
//                 }
//             });
//             query_Filter_total_count.push({
//                 $match: {
//                     "ulb.state":ObjectId(state)
//                 }
//             })
//         } 

//         query_3= [
//             {
//                 $lookup: {
        
//                     from:"ulbtypes",
//                     localField:"ulb.ulbType",
//                     foreignField:"_id",
//                     as:"ulbType"
//                 }
//             },{
//                 $unwind:"$ulbType"
//             },{
//                 $lookup: {
        
//                     from:"states",
//                     localField:"ulb.state",
//                     foreignField:"_id",
//                     as:"state"
//                 }
//             },{
//                 $unwind:"$state"
//             },
//             {
//             $match:{
//                 "state.accessToXVFC": true
//             }
//             },
//             {
//                 $lookup: {
        
//                     from:"uas",
//                     localField:"ulb.UA",
//                     foreignField:"_id",
//                     as:"UA"
//                 }
//             },
//             {
//                 $project:{
//                     ulbName:"$ulb.name",
//                     ulbId:"$ulb._id",
//                     ulbCode:"$ulb.code",
//                     censusCode: {$ifNull: ["$ulb.censusCode","$ulb.sbCode"]},
//                     UA: {
//                         $cond: {
//                         if: { $eq: ["$ulb.isUA", "Yes"] },
//                         then: { $arrayElemAt: ["$ulb.UA.name", 0] },
//                         else: "NA",
//                         },
//                     },
//                     UA_id:{
//                         $cond: {
//                         if: { $eq: ["$ulb.isUA", "Yes"] },
//                         then: { $arrayElemAt: ["$ulb.UA._id", 0] },
//                         else: "NA",
//                         },
//                     },
//                     ulbType:"$ulbType.name",
//                     ulbType_id:"$ulbType._id",
//                     population:"$ulb.population",
//                     state_id:"$state._id",
//                     stateName:"$state.name",
//                     formId:"$_id",
//                     populationType: {
//                         $cond: {
//                         if: { $gt: ["$ulb.population", 1000000] },
//                         then: "Million Plus" ,
//                         else: "Non Million",
//                         },
//                     },
//                     isDraft: formName == CollectionNames.slb ? {$not: ["$isCompleted"]} : "$isDraft",
//                     status:"$status",
//                     actionTakenByRole:"$actionTakenByRole",
//                     actionTakenBy:"$actionTakenBy",
//                     lasUpdatedAt:"$modifiedAt",
//                     filled: Object.keys(filledQueryExpression).length>0 ? filledQueryExpression : "NA"
//                 }
//             }
//         ]
    
//         //appending dynamic query based on collectionName
//         query_3 = createDynamicQuery(formName, query_3);

//         query_notFilter_pagination.push(...query_3)

//         query_Filter_total_count.push(...query_3)
//         query_Filter_total = query_Filter_total_count.slice();
//         filterApplied = Object.keys(filter).length > 0
//         if(Object.keys(filter).length>0){
//             query_Filter_total.push({
//                 $match: filter
//             },
//             {
//                 $skip:skip
//             },
//             {$limit: limit}) 
//         }
//         query_Filter_total_count.push({
//             $count:"total"
//         })
//         switch (formName) {
//             //  currently, the above query can  uniformly work for all the commented forms. 
//             // If later, these forms have to be modified, then handle the cases here

//         //  case CollectionNames.dur:
//         //     case CollectionNames.slb:
//         //         case CollectionNames.gfc:
//         //             case CollectionNames.odf:
//         //                 case CollectionName.propTaxUlb:
//         //                     case CollectionNames.pfms:



            
//         //      break;
//             case CollectionNames.annual:
//                 delete query_notFilter_pagination[query_notFilter_pagination.length-1]['$project']['filled']
//             Object.assign(  query_notFilter_pagination[query_notFilter_pagination.length -1]['$project'], {filled_provisional: filledProvisionalExpression, filled_audited:filledAuditedExpression})
    
//         default:
//             break;
//         }
//         return [!filterApplied ?  query_notFilter_pagination: query_Filter_total , query_Filter_total_count  ];

//         break;

//     case "STATE":
//         query_2 = [
//             {
//                 $lookup: {
//                     from: "states",
//                     localField:"state",
//                     foreignField: "_id",
//                     as: "stateData"
//                 }

//             },{
//                 $unwind: "$stateData"
//             },
//         ]
//         query_notFilter_pagination.push(...query_2);
//         query_Filter_total_count.push(...query_2);
        
//         filterApplied = Object.keys(filter).length > 0
//         if(Object.keys(filter).length>0){
//             query_Filter_total.push({
//                 $match: filter
//             },
//             {
//                 $skip:skip
//             },
//             {$limit: limit}) 
//         }
//         query_Filter_total_count.push({
//             $count:"total"
//         })
//         return [!filterApplied ?  query_notFilter_pagination: query_Filter_total , query_Filter_total_count  ];
//         break;

// }
     
}

