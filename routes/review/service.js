const catchAsync = require('../../util/catchAsync')
const Sidemenu = require('../../models/Sidemenu')
const CollectionNames = require('../../util/collectionName')
const { calculateStatus, canTakeActionOrViewOnly } = require('../CommonActionAPI/service')
const ObjectId = require("mongoose").Types.ObjectId;
const ExcelJS = require("exceljs");
const fs = require("fs")
const UA = require('../../models/UA')
const IndicatorLineItems = require('../../models/indicatorLineItems');
const { createObjectFromArray, addActionKeys } = require('../CommonFormSubmissionState/service');
const STATUS_LIST = require('../../util/newStatusList')
const Service = require('../../service');
const List = require('../../util/15thFCstatus')
const { calculateKeys } = require('../CommonActionAPI/service')
const Ulb = require('../../models/Ulb')
const State = require('../../models/State');
const MasterForm = require('../../models/MasterForm');
const { PREV_MASTER_FORM_STATUS, MASTER_STATUS_ID, MASTER_FORM_STATUS } = require('../../util/FormNames');
const { concatenateUrls } = require('../../service/common');
const Response = require("../../service").response;

function padTo2Digits(num) {
  return num.toString().padStart(2, '0');
}

function formatDate(date) {
  try{
    date = new Date(date);
    return [
      padTo2Digits(date.getDate()),
      padTo2Digits(date.getMonth() + 1),
      date.getFullYear(),
    ].join('/');
  }catch(err){
      throw Error({message: `formatDate:: ${err.message}`})
  }
  
}

function createDynamicColumns(collectionName) {
  let columns = ``;
  switch (collectionName) {
    case CollectionNames.odf:
    case CollectionNames.gfc:
      columns = `Financial Year,Form Status, Created, Submitted On, Filled Status, Rating, Score, Certificate URL, Certificate Name, Certificate Issue Date,State Review Status, State Comments,MoHUA Review Status, MoHUA Comments, State Review File URL, MoHUA Review File URL `;
      break;
    case CollectionNames.pfms:
      columns = `Financial Year, Form Status, Created, Submitted On, Filled Status, Link PFMS, PFMS Account Number, Is Ulb Linked With PFMS, Certificate URL, Certificate Name, Other Doc URL, Other Doc Name,State Review Status, State Comments,MoHUA Review Status, MoHUA Comments, State Review File URL, MoHUA Review File URL `
      break;
    case CollectionNames.propTaxUlb:
      columns = `Financial Year, Form Status, Created, Submitted On, Filled Status, Collecting Property Taxes in 2022-23,	Operationalized as per the state notification,Proof of operationalization of Property Tax Collection Process Url,Proof of operationalization of Property Tax Collection Process Name	,Property Tax Valuation Method,	Property Tax Rate Card Url, Property Tax Rate Card Name,	Property Tax Collection for 2019-20,	Property Tax Collection for 2020-21,	Property Tax Collection for 2021-22,	Property Tax Collection Target for 2022-23,	Proof for Property Tax collection for 2021-22 Url, Proof for Property Tax collection for 2021-22 Name,State Review Status, State Comments,MoHUA Review Status, MoHUA Comments, State Review File URL, MoHUA Review File URL `
      break;
    case CollectionNames.annual:
      columns = `Financial Year, Form Status, Created, Submitted On, Filled Status,Type, Audited/Provisional Year,Balance Sheet_PDF_URL, Balance Sheet_Excel_URL,	Balance Sheet_State Review Status,	Balance Sheet_State_Comments,	Balance Sheet_MoHUA Review Status,	Balance Sheet_MoHUA_Comments,	Balance Sheet_Total Amount of Assets,	Balance Sheet_Total Amount of Fixed Assets,	Balance Sheet_Total Amount of State Grants received,	Balance Sheet_Total Amount of Central Grants received,	Balance Sheet Schedule_PDF_URL,	Balance Sheet Schedule_Excel_URL,	Balance Sheet Schedule_State Review Status,	Balance Sheet Schedule_State_Comments,	Balance Sheet Schedule_MoHUA Review Status,	Balance Sheet Schedule_MoHUA_Comments, Income Expenditure_PDF_URL,	Income Expenditure_Excel_URL, Income Expenditure_State Review Status,	Income Expenditure_State_Comments,	Income Expenditure_MoHUA Review Status,	Income Expenditure_MoHUA_Comments, 	Income Expenditure_Total Amount of Revenue,	Income Expenditure_Total Amount of Expenses,	Income Expenditure Schedule_PDF_URL,	Income Expenditure Schedule_Excel_URL,	Income Expenditure Schedule_State Review Status, Income Expenditure Schedule_State_Comments, 	Income Expenditure Schedule_MoHUA Review Status,	Income Expenditure Schedule_MoHUA_Comments,	Cash Flow Schedule_PDF_URL,	Cash Flow Schedule_Excel_URL,	Cash Flow Schedule_State Review Status,	Cash Flow Schedule_State_Comments, 	Cash Flow Schedule_MoHUA Review Status	,Cash Flow Schedule_MoHUA_Comments,	Auditor Report PDF_URL,	Auditor Report State Review Status,	Auditor Report State_Comments,	Auditor Report MoHUA Review Status	,Auditor Report MoHUA_Comments ,Financials in Standardized Format_Filled Status	,Financials in Standardized Format_Excel URL,	State Comments if Accounts for 2021-22 is selected No, MoHUA Comments if Accounts for 2021-22 is selected No,State Review File_URL,	MoHUA Review File_URL`;
      break;
    case CollectionNames.dur:
      columns = `Financial Year, Form Status, Created, Submitted On, Filled Status, Tied grants for year,	Unutilised Tied Grants from previous installment (INR in lakhs),	15th F.C. Tied grant received during the year (1st & 2nd installment taken together) (INR in lakhs)	,Expenditure incurred during the year i.e. as on 31st March 2021 from Tied grant (INR in lakhs),	Closing balance at the end of year (INR in lakhs),	WM Rejuvenation of Water Bodies Total Tied Grant Utilised on WM(INR in lakhs),	WM Rejuvenation of Water Bodies Number of Projects Undertaken,	WM_Rejuvenation of Water Bodies_Total Project Cost Involved,	WM_Drinking Water_Total Tied Grant Utilised on WM(INR in lakhs),	WM_Drinking Water_Number of Projects Undertaken	,WM_Drinking Water_Total Project Cost Involved,	WM_Rainwater Harvesting_Total Tied Grant Utilised on WM(INR in lakhs),	WM_Rainwater Harvesting_Number of Projects Undertaken,	WM_Rainwater Harvesting_Total Project Cost Involved	,WM_Water Recycling_Total Tied Grant Utilised on WM(INR in lakhs),	WM_Water Recycling_Number of Projects Undertaken,	WM_Water Recycling_Total Project Cost Involved,	SWM_Sanitation_Total Tied Grant Utilised on SWM(INR in lakhs),	SWM_Sanitation_Number of Projects Undertaken,	SWM_Sanitation_Total Project Cost Involved(INR in lakhs),	SWM_Solid Waste Management_Total Tied Grant Utilised on SWM(INR in lakhs),	SWM_Solid Waste Management_Number of Projects Undertaken,	SWM_Solid Waste Management_Total Project Cost Involved(INR in lakhs),	Name, Designation, State_Review Status,	State_Comments,	MoHUA Review Status,	MoHUA_Comments,	State_File URL,	MoHUA_File URL `
      break;
    case CollectionNames['28SLB']:
      columns = `Financial Year, Form Status, Created, Submitted On, Filled Status, Type, Year, Coverage of water supply connections,Per capita supply of water(lpcd),Extent of metering of water connections,Continuity of water supply,Quality of water supplied,Efficiency in redressal of customer complaints,Cost recovery in water supply service,Efficiency in collection of water supply-related charges,Extent of non-revenue water (NRW),Coverage of toilets,Coverage of waste water network services,Collection efficiency of waste water network,Adequacy of waste water treatment capacity,Quality of waste water treatment,Extent of reuse and recycling of waste water,Efficiency in collection of waste water charges,Efficiency in redressal of customer complaints,Extent of cost recovery in waste water management,Household level coverage of solid waste management services,Extent of segregation of municipal solid waste,Extent of municipal solid waste recovered,Extent of cost recovery in SWM services,Efficiency in collection of SWM related user related charges,Efficiency of collection of municipal solid waste,Extent of scientific disposal of municipal solid waste,Efficiency in redressal of customer complaints,Incidence of water logging,Coverage of storm water drainage network,State_Review Status,State_Comments,MoHUA Review Status,MoHUA_Comments,State_File URL,MoHUA_File URL `
      break;
    case CollectionNames.propTaxState:
      columns = `Financial Year, Form Status, Created, Submitted On, Filled Status,Notification Url , Notfication Name, Act Page Number,Minimum Floor Rate Url, Minimum Floor Rate Name,  Operationalization of the notification Url, Operationalization of the notification Name, Number of extant acts for municipal bodies, Names of all the extant acts, Extant Acts Url, Extant Acts Name, MoHUA Review Status, MoHUA Comments, MoHUA file Url`
      break;
    case CollectionNames.sfc:
      columns = `Financial Year, Form Status, Created, Submitted On, Filled Status, Constituted State Finance Commission,  State Act/GO/Notification Url, State Act/GO/Notification Name , MoHUA Review Status, MoHUA Comments, MoHUA file Url`
      break;
    case CollectionNames.state_gtc:
      columns = `Financial Year, Form Status, Created, Submitted On, Filled Status, Type, File Url, File Name,  MoHUA Review Status, MoHUA Comments, MoHUA file Url `
      break;
    default:
      columns = '';
      break;
  }
  return columns;
}

function createDynamicObject(collectionName, formType) {
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
            ulbSubmit: "",
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
            ulbSubmit: "",
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
            ulbSubmit: "",
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
                  rejectReason_state: "",
                  rejectReason_mohua: "",
                  responseFile_state: {
                    url: "",
                    name: "",
                  },
                  responseFile_mohua: {
                    url: "",
                    name: ""
                  },
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
                  rejectReason_state: "",
                  rejectReason_mohua: "",
                  responseFile_state: {
                    url: "",
                    name: "",
                  },
                  responseFile_mohua: {
                    url: "",
                    name: ""
                  },
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
                  rejectReason_state: "",
                  rejectReason_mohua: "",
                  responseFile_state: {
                    url: "",
                    name: "",
                  },
                  responseFile_mohua: {
                    url: "",
                    name: ""
                  },
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
                  rejectReason_state: "",
                  rejectReason_mohua: "",
                  responseFile_state: {
                    url: "",
                    name: "",
                  },
                  responseFile_mohua: {
                    url: "",
                    name: ""
                  },
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
                  rejectReason_state: "",
                  rejectReason_mohua: "",
                  responseFile_state: {
                    url: "",
                    name: "",
                  },
                  responseFile_mohua: {
                    url: "",
                    name: ""
                  },
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
                  rejectReason_state: "",
                  rejectReason_mohua: "",
                  responseFile_state: {
                    url: "",
                    name: "",
                  },
                  responseFile_mohua: {
                    url: "",
                    name: ""
                  },
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
              rejectReason_state: "",
              rejectReason_mohua: "",
              responseFile_state: {
                url: "",
                name: "",
              },
              responseFile_mohua: {
                url: "",
                name: ""
              },
              rejectReason: "",
              responseFile: {
                url: "",
                name: ""
              }
            },
            unAudited: {
              rejectReason: "",
              responseFile: {
                url: "",
                name: ""
              },
              rejectReason_state: "",
              rejectReason_mohua: "",
              responseFile_state: {
                url: "",
                name: "",
              },
              responseFile_mohua: {
                url: "",
                name: ""
              },
              submit_annual_accounts: "",
              submit_standardized_data: "",
              provisional_data: {
                bal_sheet: {
                  rejectReason: "",
                  rejectReason_state: "",
                  rejectReason_mohua: "",
                  responseFile_state: {
                    url: "",
                    name: "",
                  },
                  responseFile_mohua: {
                    url: "",
                    name: ""
                  },
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
                  rejectReason_state: "",
                  rejectReason_mohua: "",
                  responseFile_state: {
                    url: "",
                    name: "",
                  },
                  responseFile_mohua: {
                    url: "",
                    name: ""
                  },
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
                  rejectReason_state: "",
                  rejectReason_mohua: "",
                  responseFile_state: {
                    url: "",
                    name: "",
                  },
                  responseFile_mohua: {
                    url: "",
                    name: ""
                  },
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
                  rejectReason_state: "",
                  rejectReason_mohua: "",
                  responseFile_state: {
                    url: "",
                    name: "",
                  },
                  responseFile_mohua: {
                    url: "",
                    name: ""
                  },
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
                  rejectReason_state: "",
                  rejectReason_mohua: "",
                  responseFile_state: {
                    url: "",
                    name: "",
                  },
                  responseFile_mohua: {
                    url: "",
                    name: ""
                  },
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
            ulbSubmit: "",
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
            ulbSubmit: "",
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
          };
          for (let i = 0; i < 28; i++) {
            //adding question object to data array
            obj["data"].push(quesObj);
          }
          break;
      }
      break;

    case "STATE":
      switch (collectionName) {
        case CollectionNames["propTaxState"]:
          obj = {
            actPage: "",
            isDraft: "",
            rejectReason: "",
            history: [],
            state: "",
            design_year: "",
            floorRate: {
              url: "",
              name: "",
            },
            stateNotification: {
              url: "",
              name: "",
            },
            actionTakenBy: "",
            actionTakenByRole: "",
            createdAt: "",
            modifiedAt: "",
            __v: "",
            comManual: {
              url: "",
              name: "",
            },
            status: "",
            rejectReason_mohua: "",
            responseFile_mohua: {
              url: "",
              name: "",
            },
          };
          break;
        case CollectionNames["sfc"]:
          obj = {
            _id: "",
            isDraft: "",
            rejectReason: "",
            history: [],
            constitutedSfc: "",
            state: "",
            design_year: "",
            actionTakenBy: "",
            actionTakenByRole: "",
            createdAt: "",
            modifiedAt: "",
            __v: "",
            stateNotification: {
              url: "",
              name: "",
            },
            status: "",
            rejectReason_mohua: "",
            responseFile_mohua: {
              url: "",
              name: "",
            },
          };
          break;
        case CollectionNames['state_gtc']:
          obj = {
            _id: "",
            isDraft: "",
            rejectReason: "",
            history: [],
            installment: "",
            year: "",
            type: "",
            file: {
              name: "",
              url: "",
            },
            status: "",
            state: "",
            design_year: "",
            actionTakenBy: "",
            actionTakenByRole: "",
            createdAt: "",
            modifiedAt: "",
            __v: "",
            rejectReason_mohua: "",
            responseFile_mohua: {
              url: "",
              name: "",
            },
          };
          break;
      }
      break;
  }
  return obj;
}

function actionTakenByResponse(entity, formStatus, formType, collectionName) {
  let obj = {
    state_status: "",
    mohua_status: "",
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
  if (collectionName === CollectionNames['annual']) {
    obj.auditedResponseFile_state = {
      url: "",
      name: ""
    };
    obj.unAuditedResponseFile_state = {
      url: "",
      name: ""
    };
    obj.auditedResponseFile_mohua = {
      url: "",
      name: ""
    };
    obj.unAuditedResponseFile_mohua = {
      url: "",
      name: ""
    };
  }
  if (formType === "STATE") {
    obj = {
      mohua_status: "",
      rejectReason_mohua: "",
      responseFile_mohua: {
        url: "",
        name: "",
      },
    };
    if (
      formStatus === STATUS_LIST.In_Progress ||
      formStatus === STATUS_LIST.Under_Review_By_MoHUA ||
      formStatus === STATUS_LIST.Not_Started
    ) {
      return obj;
    }
    if (
      formStatus === STATUS_LIST.Approved_By_MoHUA ||
      formStatus === STATUS_LIST.Rejected_By_MoHUA
    ) {
      if (entity["status"]) {
        obj.mohua_status = entity["status"];
      }
      if (entity["rejectReason_mohua"]) {
        obj.rejectReason_mohua = removeEscapeChars(entity["rejectReason_mohua"]);
      }
      if (entity["responseFile_mohua"]) {
        entity["responseFile_mohua"]["name"] = removeEscapeChars(entity["responseFile_mohua"]["name"])
        obj.responseFile_mohua = entity["responseFile_mohua"];
      }
      return obj;
    }

  }

  if (
    formStatus === STATUS_LIST.In_Progress ||
    formStatus === STATUS_LIST.Under_Review_By_State ||
    formStatus === STATUS_LIST.Not_Started
  ) {
    return obj;
  }

  let stateFlag = true;
  let mohuaFlag = true;

  if (
    formStatus === STATUS_LIST.Under_Review_By_MoHUA ||
    formStatus === STATUS_LIST.Rejected_By_State
  ) {
    if (entity["rejectReason_state"]) {
      obj.rejectReason_state = removeEscapeChars(entity["rejectReason_state"]);
    }
    if (entity["responseFile_state"]) {
      entity["responseFile_state"]["name"] = removeEscapeChars(entity["responseFile_state"]["name"])
      obj.responseFile_state = entity["responseFile_state"];
    }
    if (entity["status"]) {
      obj.state_status = entity["status"];
    }

    if (collectionName === CollectionNames['annual']) {
      if (entity.audited.responseFile_state) {
        entity.audited.responseFile_state.name = removeEscapeChars(entity.audited.responseFile_state?.name)
        obj.auditedResponseFile_state = entity.audited.responseFile_state;
      }
      if (entity.unAudited.responseFile_state) {
        entity.unAudited.responseFile_state.name = removeEscapeChars(entity.unAudited.responseFile_state?.name)
        obj.unAuditedResponseFile_state = entity.unAudited.responseFile_state;
      }
    }
    return obj;
  }
  if (
    formStatus === STATUS_LIST.Approved_By_MoHUA ||
    formStatus === STATUS_LIST.Rejected_By_MoHUA
  ) {
    if (entity["rejectReason_mohua"]) {
      obj.rejectReason_mohua = removeEscapeChars(entity["rejectReason_mohua"]);
    }
    if (entity["responseFile_mohua"]) {
      entity["responseFile_mohua"]["name"] = removeEscapeChars(entity["responseFile_mohua"]["name"])
      obj.responseFile_mohua = entity["responseFile_mohua"];
    }
    if (entity["status"]) {
      obj.mohua_status = entity["status"];
    }
    if (collectionName === CollectionNames['annual']) {
      if (entity.audited.responseFile_mohua) {
        entity.audited.responseFile_mohua.name = removeEscapeChars(entity.audited.responseFile_mohua?.name)
        obj.auditedResponseFile_mohua = entity.audited.responseFile_mohua;
      }
      if (entity.unAudited.responseFile_mohua) {
        entity.unAudited.responseFile_mohua.name = removeEscapeChars(entity.unAudited.responseFile_mohua?.name)
        obj.unAuditedResponseFile_mohua = entity.unAudited.responseFile_mohua;
      }
    }
    mohuaFlag = false;
  }
  let histories = entity["history"];
  if (!histories) {
    return obj;
  }
  for (let i = histories.length - 1; i >= 0; i--) { // finding state response
    let history = histories[i];
    if (!stateFlag && !mohuaFlag) break;
    if (history["actionTakenByRole"] === "STATE" && stateFlag) {
      if (history["rejectReason_state"]) {
        obj.rejectReason_state = removeEscapeChars(history["rejectReason_state"]);
      }
      if (history["responseFile_state"]) {
        entity["responseFile_state"]["name"] = removeEscapeChars(entity["responseFile_state"]["name"])
        obj.responseFile_state = history["responseFile_state"];
      }
      if (history["status"]) {
        obj.state_status = history["status"];
      }

      if (collectionName === CollectionNames['annual']) {
        if (history.audited.responseFile_state) {
          history["audited"]["responseFile_state"]["name"] = removeEscapeChars(history["audited"]["responseFile_state"]["name"])
          obj.auditedResponseFile_state = history.audited.responseFile_state;
        }
        if (history.unAudited.responseFile_state) {
          history["unAudited"]["responseFile_state"]["name"] = removeEscapeChars(history["unAudited"]["responseFile_state"]["name"])
          obj.unAuditedResponseFile_state = history.unAudited.responseFile_state;
        }
      }
      stateFlag = false;
    }
  }
  return obj;
}

function removeEscapeChars(entity) {
  return !entity ? entity : entity.replace(/(\n|,)/gm, " ");
}

async function createDynamicElements(collectionName, formType, entity) {
  if (!entity.formData) {
    entity["filled"] = "No";
    entity['formData'] = createDynamicObject(collectionName, formType);
  }
  let actions = actionTakenByResponse(entity.formData, entity.formStatus, formType, collectionName);
  if (formType === "ULB") {

    if (!entity["formData"]["rejectReason_state"]) {
      entity["formData"]["rejectReason_state"] = ""
    }
    if (!entity["formData"]["rejectReason_mohua"]) {
      entity["formData"]["rejectReason_mohua"] = ""
    }
    if (!entity["formData"]["responseFile_state"]) {
      entity["formData"]["responseFile_state"] = {
        url: "",
        name: ""
      }
    }
    if (!entity["formData"]["responseFile_mohua"]) {
      entity["formData"]["responseFile_mohua"] = {
        url: "",
        name: ""
      }
    }
    if (entity?.formData.ulbSubmit) {
      entity["formData"]["ulbSubmit"] = formatDate(
        entity?.formData.ulbSubmit
      );
    }

  } else if (formType === "STATE") {
    if (!entity["formData"]["rejectReason_mohua"]) {
      entity["formData"]["rejectReason_mohua"] = "";
    }
    if (!entity["formData"]["responseFile_mohua"]) {
      entity["formData"]["responseFile_mohua"] = {
        url: "",
        name: "",
      };
    }
    if (entity?.formData.stateSubmit) {
      entity["formData"]["stateSubmit"] = formatDate(
        entity?.formData.stateSubmit
      );
    }

  }

  if (!entity["formData"]["design_year"]) {
    entity["formData"]["design_year"] = {
      year: ""
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

  let data = entity?.formData;
  switch (formType) {
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
          entity = ` ${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""
            }, ${data?.createdAt ?? ""}, ${data?.ulbSubmit ?? ""},${entity.filled ?? ""
            }, ${data["rating"]["name"] ?? ""},${data["rating"]["marks"] ?? ""
            },${data["cert"]["url"] ?? ""},${data["cert"]["name"] ?? ""},${data["certDate"] ?? ""
            },${actions["state_status"] ?? ""},${actions["rejectReason_state"] ?? ""
            },${actions["mohua_status"] ?? ""},${actions["rejectReason_mohua"] ?? ""
            },${actions["responseFile_state"]["url"] ?? ""},${actions["responseFile_mohua"]["url"] ?? ""
            } `;
          break;

        case CollectionNames.pfms:

          data["cert"]["name"] = removeEscapeChars(data["cert"]["name"]);
          data["otherDocs"]["name"] = removeEscapeChars(data["otherDocs"]["name"]);
          data["PFMSAccountNumber"] ? data["PFMSAccountNumber"] = `'${data["PFMSAccountNumber"]}'` : ""
          entity = ` ${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""}, ${data?.createdAt ?? ""}, ${data?.ulbSubmit ?? ""},${entity.filled ?? ""}, ${data["linkPFMS"] ?? ""},${data["PFMSAccountNumber"] ?? ""},${data["isUlbLinkedWithPFMS"] ?? ""},${data["cert"]["url"] ?? ""},${data["cert"]["name"] ?? ""},${data["otherDocs"]["url"] ?? ""},${data["otherDocs"]["name"] ?? ""},${actions["state_status"] ?? ""},${actions["rejectReason_state"] ?? ""},${actions["mohua_status"] ?? ""},${actions["rejectReason_mohua"] ?? ""},${actions["responseFile_state"]["url"] ?? ""},${actions["responseFile_mohua"]["url"] ?? ""} `;
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

          removeEscapesFromAnnual(unAuditedProvisional);
          removeEscapesFromAnnual(auditedProvisional);
          removeEscapesFromAnnual(unAuditedStandardized);
          removeEscapesFromAnnual(auditedStandardized);
          if (data.audited.rejectReason_mohua) {
            data.audited.rejectReason_mohua = removeEscapeChars(data?.audited?.rejectReason_mohua);
          }
          if (data.audited.rejectReason_state) {
            data.audited.rejectReason_state = removeEscapeChars(data?.audited?.rejectReason_state)
          }
          if (data.unAudited.rejectReason_mohua) {
            data.unAudited.rejectReason_mohua = removeEscapeChars(data?.unAudited?.rejectReason_mohua);
          }
          if (data.audited.rejectReason_state) {
            data.unAudited.rejectReason_state = removeEscapeChars(data?.unAudited?.rejectReason_state)
          }

          /* Destructuring the data from the annualAccountCsvFormat function. */
          ({ auditedEntity, unAuditedEntity } = annualAccountCsvFormat(data, auditedEntity, entity, auditedProvisional, auditedStandardized, actions, unAuditedEntity, unAuditedProvisional, unAuditedStandardized));
          return [auditedEntity, unAuditedEntity];
          break;

        case CollectionNames.propTaxUlb:
          data["proof"]["name"] = removeEscapeChars(data["proof"]["name"]);
          data["rateCard"]["name"] = removeEscapeChars(data["rateCard"]["name"]);
          data["ptCollection"]["name"] = removeEscapeChars(data["ptCollection"]["name"]);

          entity = ` ${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""
            }, ${data?.createdAt ?? ""}, ${data?.ulbSubmit ?? ""},${entity.filled ?? ""
            }, ${data["toCollect"] ?? ""},${data["operationalize"] ?? ""},${data["proof"]["url"] ?? ""
            }, ${data["proof"]["name"] ?? ""},${data["method"] ?? ""},${data["rateCard"]["url"] ?? ""
            },${data["rateCard"]["name"] ?? ""},${data["collection2019_20"] ?? ""
            },${data["collection2020_21"] ?? ""},${data["collection2021_22"] ?? ""
            },${data["target2022_23"] ?? ""},${data["ptCollection"]["url"] ?? ""
            },${data["ptCollection"]["name"] ?? ""},${actions["state_status"] ?? ""
            },${actions["rejectReason_state"] ?? ""},${actions["mohua_status"] ?? ""
            },${actions["rejectReason_mohua"] ?? ""},${actions["responseFile_state"]["url"] ?? ""
            },${actions["responseFile_mohua"]["url"] ?? ""} `;
          break;

        case CollectionNames.dur:
          if (
            data?.categoryWiseData_wm &&
            data?.categoryWiseData_wm.length > 0
          ) {
            let wm = await convertValue({
              data: data.categoryWiseData_wm,
              keyArr: ["grantUtilised", "numberOfProjects", "totalProjectCost"],
            });
            data.categoryWiseData_wm = wm;
          }
          if (
            data?.categoryWiseData_swm &&
            data?.categoryWiseData_swm.length > 0
          ) {
            let swm = await convertValue({
              data: data.categoryWiseData_swm,
              keyArr: ["grantUtilised", "numberOfProjects", "totalProjectCost"],
            });
            data.categoryWiseData_swm = swm;
          }
          let wmData = data?.categoryWiseData_wm;
          let swmData = data?.categoryWiseData_swm;

          data.name = removeEscapeChars(data['name']);
          data.designation = removeEscapeChars(data['designation'])
          entity = ` ${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""
            }, ${data?.createdAt ?? ""}, ${data?.ulbSubmit ?? ""},${entity.filled ?? ""
            },${data?.["financialYear"]["year"] ?? ""}, ${(typeof data?.grantPosition?.unUtilizedPrevYr === "number"
              ? Number(data?.grantPosition?.unUtilizedPrevYr).toFixed(2)
              : "") ?? ""
            } ,${(typeof data?.grantPosition?.receivedDuringYr === "number"
              ? Number(data?.grantPosition?.receivedDuringYr).toFixed(2)
              : "") ?? ""
            }, ${(typeof data?.grantPosition?.expDuringYr === "number"
              ? Number(data?.grantPosition?.expDuringYr).toFixed(2)
              : "") ?? ""
            },${data?.grantPosition?.closingBal ? (
              Number(data?.grantPosition?.closingBal).toFixed(2)
              ?? "") : ""
            },${wmData[0]?.["grantUtilised"] ?? ""
            },${wmData[0]?.["numberOfProjects"] ?? ""
            }, ${wmData[0]?.["totalProjectCost"] ?? ""
            },${wmData[1]?.["grantUtilised"] ?? ""
            },${wmData[1]?.["numberOfProjects"] ?? ""
            }, ${wmData[1]?.["totalProjectCost"] ?? ""
            },${wmData[2]?.["grantUtilised"] ?? ""
            },${wmData[2]?.["numberOfProjects"] ?? ""
            }, ${wmData[2]?.["totalProjectCost"] ?? ""
            },${wmData[3]?.["grantUtilised"] ?? ""
            },${wmData[3]?.["numberOfProjects"] ?? ""
            }, ${wmData[3]?.["totalProjectCost"] ?? ""
            },${swmData[0]?.["grantUtilised"] ?? ""
            },${swmData[0]?.["numberOfProjects"] ?? ""
            }, ${swmData[0]?.["totalProjectCost"] ?? ""
            },${swmData[1]?.["grantUtilised"] ?? ""
            },${swmData[1]?.["numberOfProjects"] ?? ""
            }, ${swmData[1]?.["totalProjectCost"] ?? ""
            }, ${data?.name ?? ""
            }, ${data?.designation ?? ""
            }, ${actions["state_status"] ?? ""},${actions["rejectReason_state"] ?? ""
            },${actions["mohua_status"] ?? ""},${actions["rejectReason_mohua"] ?? ""
            },${actions["responseFile_state"]["url"] ?? ""},${actions["responseFile_mohua"]["url"] ?? ""
            }`;
          break;

        case CollectionNames['28SLB']:
          let i = 0;
          let actualEntity = `${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""
            }, ${data?.createdAt ?? ""}, ${data?.ulbSubmit ?? ""},${entity.filled ?? ""
            },Actual,${data["actual_year"]["year"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
            },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
            },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
            },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
            },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
            },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
            },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
            },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
            },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
            },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
            },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
            },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
            },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
            },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
            },${data["data"][i++]["actual"]["value"] ?? ""}, ${actions["state_status"] ?? ""
            },${actions["rejectReason_state"] ?? ""},${actions["mohua_status"] ?? ""
            },${actions["rejectReason_mohua"] ?? ""},${actions["responseFile_state"]["url"] ?? ""
            },${actions["responseFile_mohua"]["url"] ?? ""} `;
          i = 0;
          let targetEntity = `${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""}, ${data?.createdAt ?? ""}, ${data?.ulbSubmit ?? ""},${entity.filled ?? ""},Target,${data['target_1_year']['year'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""}, ${actions["state_status"] ?? ""},${actions["rejectReason_state"] ?? ""},${actions["mohua_status"] ?? ""},${actions["rejectReason_mohua"] ?? ""},${actions["responseFile_state"]["url"] ?? ""},${actions["responseFile_mohua"]["url"] ?? ""} `

          return [actualEntity, targetEntity];
          break;
      };
      break;
    case "STATE":
      switch (collectionName) {
        case CollectionNames.propTaxState:

          if (!data.hasOwnProperty("comManual") || !data["comManual"]["name"]) {
            data['comManual'] = {
              name: "",
              url: ""
            }
          }
          if (
            !data.hasOwnProperty("extantActDoc") ||
            !data["extantActDoc"]["name"]
          ) {
            data["extantActDoc"] = {
              name: "",
              url: "",
            };
          }
          if (!data.hasOwnProperty("stateNotification") || !data["stateNotification"]["name"]) {
            data['stateNotification'] = {
              name: "",
              url: ""
            }
          } if (!data.hasOwnProperty("floorRate") || !data["floorRate"]["name"]) {
            data['floorRate'] = {
              name: "",
              url: ""
            }
          }
          data["stateNotification"]["name"] = removeEscapeChars(data["stateNotification"]["name"]);
          data["comManual"]["name"] = removeEscapeChars(data["comManual"]["name"]);
          data["floorRate"]["name"] = removeEscapeChars(data["floorRate"]["name"]);
          data["extantActDoc"]["name"] = removeEscapeChars(data["extantActDoc"]["name"]);
          entity = `${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""
            }, ${data?.createdAt ?? ""}, ${data?.stateSubmit ?? ""},${entity.filled ?? ""
            },${data.stateNotification.url ?? ""},${data.stateNotification.name ?? ""
            },${data.actPage ?? ""}, ${data.floorRate.url ?? ""}, ${data.floorRate.name ?? ""
            }, ${data.comManual.url ?? ""}, ${data.comManual.name ?? ""},${data.actMunicipal ?? ""},${data.extantAct ?? ""},${data.extantActDoc.url ?? ""},${data.extantActDoc.name ?? ""}, ${actions["mohua_status"] ?? ""
            },${actions["rejectReason_mohua"] ?? ""}, ${actions["responseFile_mohua"]["url"] ?? ""
            }`;
          break;
        case CollectionNames.sfc:
          entity = `${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""
            }, ${data?.createdAt ?? ""}, ${data?.stateSubmit ?? ""},${entity.filled ?? ""
            },${data.constitutedSfc ?? ""},${data.stateNotification.url ?? ""
            },${data.stateNotification.name ?? ""}, ${actions["mohua_status"] ?? ""
            },${actions["rejectReason_mohua"] ?? ""}, ${actions["responseFile_mohua"]["url"] ?? ""
            }`;
          break;
        case CollectionNames.state_gtc:
          entity = `${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""}, ${data?.createdAt ?? ""}, ${data?.stateSubmit ?? ""},${entity.filled ?? ""}, ${data.type ?? ""}, ${data.file['url'] ?? ""}, ${data.file['name']}, ${actions["mohua_status"] ?? ""},${actions["rejectReason_mohua"] ?? ""}, ${actions["responseFile_mohua"]["url"] ?? ""} `
          break;

          if (
            data?.categoryWiseData_wm &&
            data?.categoryWiseData_wm.length > 0
          ) {
            let wm = await convertValue({
              data: data.categoryWiseData_wm,
              keyArr: ["grantUtilised", "numberOfProjects", "totalProjectCost"],
            });
            data.categoryWiseData_wm = wm;
          }
          console.log("su", data);
          if (
            data?.categoryWiseData_swm &&
            data?.categoryWiseData_swm.length > 0
          ) {
            let swm = await convertValue({
              data: data.categoryWiseData_swm,
              keyArr: ["grantUtilised", "numberOfProjects", "totalProjectCost"],
            });
            data.categoryWiseData_swm = swm;
          }
          let wmData = data?.categoryWiseData_wm;
          let swmData = data?.categoryWiseData_swm;


          entity = ` ${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""
            }, ${data?.createdAt ?? ""}, ${data?.ulbSubmit ?? ""},${entity.filled ?? ""
            },${data?.["financialYear"]["year"] ?? ""}, ${(typeof data?.grantPosition?.unUtilizedPrevYr === "number"
              ? Number(data?.grantPosition?.unUtilizedPrevYr).toFixed(2)
              : "") ?? ""
            } ,${(typeof data?.grantPosition?.receivedDuringYr === "number"
              ? Number(data?.grantPosition?.receivedDuringYr).toFixed(2)
              : "") ?? ""
            }, ${(typeof data?.grantPosition?.expDuringYr === "number"
              ? Number(data?.grantPosition?.expDuringYr).toFixed(2)
              : "") ?? ""
            },${data?.grantPosition?.closingBal ? (
              Number(data?.grantPosition?.closingBal).toFixed(2)
              ?? "") : ""
            },${wmData[0]?.["grantUtilised"] ?? ""
            },${wmData[0]?.["numberOfProjects"] ?? ""
            }, ${wmData[0]?.["totalProjectCost"] ?? ""
            },${wmData[1]?.["grantUtilised"] ?? ""
            },${wmData[1]?.["numberOfProjects"] ?? ""
            }, ${wmData[1]?.["totalProjectCost"] ?? ""
            },${wmData[2]?.["grantUtilised"] ?? ""
            },${wmData[2]?.["numberOfProjects"] ?? ""
            }, ${wmData[2]?.["totalProjectCost"] ?? ""
            },${wmData[3]?.["grantUtilised"] ?? ""
            },${wmData[3]?.["numberOfProjects"] ?? ""
            }, ${wmData[3]?.["totalProjectCost"] ?? ""
            },${swmData[0]?.["grantUtilised"] ?? ""
            },${swmData[0]?.["numberOfProjects"] ?? ""
            }, ${swmData[0]?.["totalProjectCost"] ?? ""
            },${swmData[1]?.["grantUtilised"] ?? ""
            },${swmData[1]?.["numberOfProjects"] ?? ""
            }, ${swmData[1]?.["totalProjectCost"] ?? ""
            }, ${actions["state_status"] ?? ""},${actions["rejectReason_state"] ?? ""
            },${actions["mohua_status"] ?? ""},${actions["rejectReason_mohua"] ?? ""
            },${actions["responseFile_state"]["url"] ?? ""},${actions["responseFile_mohua"]["url"] ?? ""
            }`;
          break;

        case CollectionNames['28SLB']:
          let i = 0;
          let actualEntity = `${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""
            }, ${data?.createdAt ?? ""}, ${data?.ulbSubmit ?? ""},${entity.filled ?? ""
            },Actual,${data["actual_year"]["year"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
            },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
            },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
            },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
            },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
            },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
            },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
            },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
            },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
            },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
            },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
            },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
            },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
            },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
            },${data["data"][i++]["actual"]["value"] ?? ""}, ${actions["state_status"] ?? ""
            },${actions["rejectReason_state"] ?? ""},${actions["mohua_status"] ?? ""
            },${actions["rejectReason_mohua"] ?? ""},${actions["responseFile_state"]["url"] ?? ""
            },${actions["responseFile_mohua"]["url"] ?? ""} `;
          i = 0;
          let targetEntity = `${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""}, ${data?.createdAt ?? ""}, ${data?.ulbSubmit ?? ""},${entity.filled ?? ""},Target,${data['target_1_year']['year'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""}, ${actions["state_status"] ?? ""},${actions["rejectReason_state"] ?? ""},${actions["mohua_status"] ?? ""},${actions["rejectReason_mohua"] ?? ""},${actions["responseFile_state"]["url"] ?? ""},${actions["responseFile_mohua"]["url"] ?? ""} `

          return [actualEntity, targetEntity];
          break;
      };
      break;
    case "STATE":
      switch (collectionName) {
        case CollectionNames.propTaxState:

          if (!data.hasOwnProperty("comManual") || !data["comManual"]["name"]) {
            data['comManual'] = {
              name: "",
              url: ""
            }
          }
          if (
            !data.hasOwnProperty("extantActDoc") ||
            !data["extantActDoc"]["name"]
          ) {
            data["extantActDoc"] = {
              name: "",
              url: "",
            };
          }
          if (!data.hasOwnProperty("stateNotification") || !data["stateNotification"]["name"]) {
            data['stateNotification'] = {
              name: "",
              url: ""
            }
          } if (!data.hasOwnProperty("floorRate") || !data["floorRate"]["name"]) {
            data['floorRate'] = {
              name: "",
              url: ""
            }
          }
          data["stateNotification"]["name"] = removeEscapeChars(data["stateNotification"]["name"]);
          data["comManual"]["name"] = removeEscapeChars(data["comManual"]["name"]);
          data["floorRate"]["name"] = removeEscapeChars(data["floorRate"]["name"]);
          data["extantActDoc"]["name"] = removeEscapeChars(data["extantActDoc"]["name"]);
          entity = `${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""
            }, ${data?.createdAt ?? ""}, ${data?.stateSubmit ?? ""},${entity.filled ?? ""
            },${data.stateNotification.url ?? ""},${data.stateNotification.name ?? ""
            },${data.actPage ?? ""}, ${data.floorRate.url ?? ""}, ${data.floorRate.name ?? ""
            }, ${data.comManual.url ?? ""}, ${data.comManual.name ?? ""},${data.actMunicipal ?? ""},${data.extantAct ?? ""},${data.extantActDoc.url ?? ""},${data.extantActDoc.name ?? ""}, ${actions["mohua_status"] ?? ""
            },${actions["rejectReason_mohua"] ?? ""}, ${actions["responseFile_mohua"]["url"] ?? ""
            }`;
          break;
        case CollectionNames.sfc:
          entity = `${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""
            }, ${data?.createdAt ?? ""}, ${data?.stateSubmit ?? ""},${entity.filled ?? ""
            },${data.constitutedSfc ?? ""},${data.stateNotification.url ?? ""
            },${data.stateNotification.name ?? ""}, ${actions["mohua_status"] ?? ""
            },${actions["rejectReason_mohua"] ?? ""}, ${actions["responseFile_mohua"]["url"] ?? ""
            }`;
          break;
        case CollectionNames.state_gtc:
          // entity = sortGtcData(entity);
          entity = `${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""}, ${data?.createdAt ?? ""}, ${data?.stateSubmit ?? ""},${entity.filled ?? ""}, ${data.type ?? ""}, ${data.file['url'] ?? ""}, ${data.file['name']}, ${actions["mohua_status"] ?? ""},${actions["rejectReason_mohua"] ?? ""}, ${actions["responseFile_mohua"]["url"] ?? ""} `
          break;

      }
  }
  return entity;
}
const convertValue = async (objData) => {
  const { data, keyArr } = objData;
  let arr = [];
  if (data.length > 0) {
    for (let el of data) {
      if (keyArr.length) {
        for (let pf of keyArr) {
          if (el.hasOwnProperty(pf)) {
            el[pf] =
              el[pf] !== null && el[pf] !== "" ? Number(el[pf]).toFixed(2) : "";
          }
        }
        arr.push(el);
      }
    }
  }
  return arr;
};

function annualAccountCsvFormat(data, auditedEntity, entity, auditedProvisional, auditedStandardized, actions, unAuditedEntity, unAuditedProvisional, unAuditedStandardized) {
  if (data?.actionTakenByRole === "STATE") {
    if (data?.audited?.submit_annual_accounts === false) {
      auditedEntity = ` ${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""
        }, ${data?.createdAt ?? ""}, ${data?.ulbSubmit ?? ""},${entity?.filled_audited ?? ""
        }, Audited,${data?.auditedYear?.year ?? ""}, , , ,, , ,  ,, , ,,, , , , ,  , ,, , , , , ,,, ,, , ,,, , , , ,,, , , , ,, ${data?.audited?.submit_annual_accounts === false
          ? (data?.audited?.rejectReason_state ?? "")
          : ""
        },${data?.audited?.submit_annual_accounts === false
          ? (data?.audited?.rejectReason_mohua ?? "")
          : ""
        } ,${actions["auditedResponseFile_state"]["url"] ?? ""},${actions["auditedResponseFile_mohua"]["url"] ?? ""
        }  `;
    } else {
      auditedEntity = ` ${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""
        }, ${data?.createdAt ?? ""}, ${data?.ulbSubmit ?? ""},${entity?.filled_audited ?? ""
        }, Audited,${data?.auditedYear?.year ?? ""}, ${auditedProvisional?.bal_sheet?.pdf?.url ?? ""
        }, ${auditedProvisional?.bal_sheet?.excel?.url ?? ""}, ${auditedProvisional?.bal_sheet?.status ?? ""
        }, ${auditedProvisional?.bal_sheet?.rejectReason_state ?? ""}, , ,  ${auditedProvisional?.assets ?? ""
        }, ${auditedProvisional?.f_assets ?? ""}, ${auditedProvisional?.s_grant ?? ""
        }, ${auditedProvisional?.c_grant ?? ""}, ${auditedProvisional?.bal_sheet_schedules?.pdf?.url ?? ""
        }, ${auditedProvisional?.bal_sheet_schedules?.excel?.url ?? ""}, ${auditedProvisional?.bal_sheet_schedules?.status ?? ""
        }, ${auditedProvisional?.bal_sheet_schedules?.rejectReason_state ?? ""
        }, , ,${auditedProvisional?.inc_exp?.pdf?.url ?? ""}, ${auditedProvisional?.inc_exp?.excel?.url ?? ""
        }, ${auditedProvisional?.inc_exp?.status ?? ""}, ${auditedProvisional?.inc_exp?.rejectReason_state ?? ""
        }, , , ${auditedProvisional?.revenue ?? ""}, ${auditedProvisional?.expense ?? ""
        },${auditedProvisional?.inc_exp_schedules?.pdf?.url ?? ""}, ${auditedProvisional?.inc_exp_schedules?.excel?.url ?? ""
        }, ${auditedProvisional?.inc_exp_schedules?.status ?? ""}, ${auditedProvisional?.inc_exp_schedules?.rejectReason_state ?? ""
        }, , ,${auditedProvisional?.cash_flow?.pdf?.url ?? ""}, ${auditedProvisional?.cash_flow?.excel?.url ?? ""
        }, ${auditedProvisional?.cash_flow?.status ?? ""}, ${auditedProvisional?.cash_flow?.rejectReason_state ?? ""
        } , , ,${auditedProvisional?.auditor_report?.pdf?.url ?? ""},${auditedProvisional?.auditor_report?.status ?? ""
        }, ${auditedProvisional?.auditor_report?.rejectReason_state ?? ""}, , , ${data?.audited?.submit_standardized_data ?? ""
        }, ${auditedStandardized?.excel?.url ?? ""}, ${data?.audited?.submit_annual_accounts === false
          ? (data?.audited?.rejectReason_state ?? "")
          : ""
        },${data?.audited?.submit_annual_accounts === false
          ? (data?.audited?.rejectReason_mohua ?? "")
          : ""
        } ,${actions["auditedResponseFile_state"]["url"] ?? ""},${actions["auditedResponseFile_mohua"]["url"] ?? ""
        }  `;
    }
    if (data?.unAudited?.submit_annual_accounts === false) {
      unAuditedEntity = `${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""
        }, ${data?.createdAt ?? ""}, ${data?.ulbSubmit ?? ""},${entity?.filled_provisional ?? ""
        }, Provisional,${data?.unAuditedYear?.year ?? ""}, , , ,, , ,  ,, , ,,, , , , ,  , ,, , , , , ,,, ,, , ,,, , , , ,,, , , , ,, ${data?.unAudited?.submit_annual_accounts === false
          ? (data?.unAudited?.rejectReason_state ?? "")
          : ""
        },${data?.unAudited?.submit_annual_accounts === false
          ? (data?.unAudited?.rejectReason_mohua ?? "")
          : ""
        }, ${actions["unAuditedResponseFile_state"]["url"] ?? ""},${actions["unAuditedResponseFile_mohua"]["url"] ?? ""
        } `;
    } else {
      unAuditedEntity = `${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""
        }, ${data?.createdAt ?? ""}, ${data?.ulbSubmit ?? ""},${entity?.filled_provisional ?? ""
        }, Provisional,${data?.unAuditedYear?.year ?? ""}, ${unAuditedProvisional?.bal_sheet?.pdf?.url ?? ""
        }, ${unAuditedProvisional?.bal_sheet?.excel?.url ?? ""}, ${unAuditedProvisional?.bal_sheet?.status ?? ""
        }, ${unAuditedProvisional?.bal_sheet?.rejectReason_state ?? ""}, , , ${unAuditedProvisional?.assets ?? ""
        }, ${unAuditedProvisional?.f_assets ?? "" ?? ""}, ${unAuditedProvisional?.s_grant ?? ""
        }, ${unAuditedProvisional?.c_grant ?? ""}, ${unAuditedProvisional?.bal_sheet_schedules?.pdf?.url ?? ""
        }, ${unAuditedProvisional?.bal_sheet_schedules?.excel?.url ?? ""}, ${unAuditedProvisional?.bal_sheet_schedules?.status ?? ""
        }, ${unAuditedProvisional?.bal_sheet_schedules?.rejectReason_state ?? ""
        }, , ,${unAuditedProvisional?.inc_exp?.pdf?.url ?? ""}, ${unAuditedProvisional?.inc_exp?.excel?.url ?? ""
        }, ${unAuditedProvisional?.inc_exp?.status ?? ""}, ${unAuditedProvisional?.inc_exp?.rejectReason_state ?? ""
        }, , , ${unAuditedProvisional?.revenue ?? ""}, ${unAuditedProvisional?.expense ?? ""
        },${unAuditedProvisional?.inc_exp_schedules?.pdf?.url ?? ""}, ${unAuditedProvisional?.inc_exp_schedules?.excel?.url ?? ""
        }, ${unAuditedProvisional?.inc_exp_schedules?.status ?? ""}, ${unAuditedProvisional?.inc_exp_schedules?.rejectReason_state ?? ""
        }, , ,${unAuditedProvisional?.cash_flow?.pdf?.url ?? ""}, ${unAuditedProvisional?.cash_flow?.excel?.url ?? ""
        }, ${unAuditedProvisional?.cash_flow?.status ?? ""}, ${unAuditedProvisional?.cash_flow?.rejectReason_state ?? ""
        },  , , , , , , , ${data?.unAudited?.submit_standardized_data ?? ""}, ${unAuditedStandardized?.excel?.url ?? ""
        }, ${data?.unAudited?.submit_annual_accounts === false
          ? (data?.unAudited?.rejectReason_state ?? "")
          : ""
        },${data?.unAudited?.submit_annual_accounts === false
          ? (data?.unAudited?.rejectReason_mohua ?? "")
          : ""
        }, ${actions["unAuditedResponseFile_state"]["url"] ?? ""},${actions["unAuditedResponseFile_mohua"]["url"] ?? ""
        } `;
    }

  } else if (data?.actionTakenByRole === "MoHUA") {
    let stateHistoryAuditedProvisional = data?.history[data?.history.length - 2]?.audited?.provisional_data
    let stateHistoryUnAuditedProvisional = data?.history[data?.history.length - 2]?.unAudited?.provisional_data

    if (data?.audited?.submit_annual_accounts === false) {
      auditedEntity = ` ${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""
        }, ${data?.createdAt ?? ""}, ${data?.ulbSubmit ?? ""},${entity?.filled_audited ?? ""
        }, Audited, ${data?.auditedYear?.year ?? ""}, , , ,, , ,  ,, , ,,, , , , ,  , ,, , , , , ,,, ,, , ,,, , , , ,,, , , , ,, ${data?.audited?.submit_annual_accounts === false
          ? (data?.audited?.rejectReason_state ?? "")
          : ""
        } ,${data?.audited?.submit_annual_accounts === false
          ? (data?.audited?.rejectReason_mohua ?? "")
          : ""
        },  ${actions["auditedResponseFile_state"]["url"] ?? ""},${actions["auditedResponseFile_mohua"]["url"] ?? ""
        } `;
    } else {
      auditedEntity = ` ${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""
        }, ${data?.createdAt ?? ""}, ${data?.ulbSubmit ?? ""},${entity?.filled_audited ?? ""
        }, Audited, ${data?.auditedYear?.year ?? ""},${auditedProvisional?.bal_sheet?.pdf?.url ?? ""
        }, ${auditedProvisional?.bal_sheet?.excel?.url ?? ""}, ${stateHistoryAuditedProvisional?.bal_sheet?.status ?? ""}, ${auditedProvisional?.bal_sheet?.rejectReason_state ?? ""},${auditedProvisional?.bal_sheet?.status ?? ""
        }, ${auditedProvisional?.bal_sheet?.rejectReason_mohua ?? ""},  ${auditedProvisional?.assets ?? ""
        }, ${auditedProvisional?.f_assets ?? ""}, ${auditedProvisional?.s_grant ?? ""
        }, ${auditedProvisional?.c_grant ?? ""}, ${auditedProvisional?.bal_sheet_schedules?.pdf?.url ?? ""
        }, ${auditedProvisional?.bal_sheet_schedules?.excel?.url ?? ""}, ${stateHistoryAuditedProvisional?.bal_sheet_schedules?.status ?? ""
        }, ${auditedProvisional?.bal_sheet_schedules?.rejectReason_state}, ${auditedProvisional?.bal_sheet_schedules?.status ?? ""
        }, ${auditedProvisional?.bal_sheet_schedules?.rejectReason_mohua ?? ""},${auditedProvisional?.inc_exp?.pdf?.url ?? ""
        }, ${auditedProvisional?.inc_exp?.excel?.url ?? ""}, ${stateHistoryAuditedProvisional?.inc_exp?.status ?? ""
        }, ${auditedProvisional?.inc_exp?.rejectReason_state}, ${auditedProvisional?.inc_exp?.status ?? ""
        }, ${auditedProvisional?.inc_exp?.rejectReason_mohua ?? ""}, ${auditedProvisional?.revenue ?? ""
        }, ${auditedProvisional?.expense ?? ""},${auditedProvisional?.inc_exp_schedules?.pdf?.url ?? ""
        }, ${auditedProvisional?.inc_exp_schedules?.excel?.url ?? ""}, ${stateHistoryAuditedProvisional?.inc_exp_schedules?.status ?? ""
        }, ${auditedProvisional?.inc_exp_schedules?.rejectReason_state},${auditedProvisional?.inc_exp_schedules?.status ?? ""
        }, ${auditedProvisional?.inc_exp_schedules?.rejectReason_mohua ?? ""}, ${auditedProvisional?.cash_flow?.pdf?.url ?? ""
        }, ${auditedProvisional?.cash_flow?.excel?.url ?? ""}, ${stateHistoryAuditedProvisional?.cash_flow?.status ?? ""
        }, ${auditedProvisional?.cash_flow?.rejectReason_state}, ${auditedProvisional?.cash_flow?.status ?? ""
        }, ${auditedProvisional?.cash_flow?.rejectReason_mohua ?? ""}, ${auditedProvisional?.auditor_report?.pdf?.url ?? ""
        }, ${stateHistoryAuditedProvisional?.auditor_report?.status ?? ""
        }, ${auditedProvisional?.auditor_report?.rejectReason_state},${auditedProvisional?.auditor_report?.status ?? ""}, ${auditedProvisional?.auditor_report?.rejectReason_mohua ?? ""
        }, ${data?.audited?.submit_standardized_data ?? ""}, ${auditedStandardized?.excel?.url ?? ""
        } ,${data?.audited?.submit_annual_accounts === false
          ? (data?.audited?.rejectReason_state ?? "")
          : ""
        } ,${data?.audited?.submit_annual_accounts === false
          ? (data?.audited?.rejectReason_mohua ?? "")
          : ""
        },  ${actions["auditedResponseFile_state"]["url"] ?? ""},${actions["auditedResponseFile_mohua"]["url"] ?? ""
        } `;
    }
    if (data?.unAudited?.submit_annual_accounts === false) {
      unAuditedEntity = `${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""
        }, ${data?.createdAt ?? ""}, ${data?.ulbSubmit ?? ""},${entity?.filled_provisional ?? ""
        }, Provisional,${data?.unAuditedYear?.year ?? ""}, , , ,, , ,  ,, , ,,, , , , ,  , ,, , , , , ,,, ,, , ,,, , , , ,,, , , , ,,  ${data?.unAudited?.submit_annual_accounts === false
          ? (data?.unAudited?.rejectReason_state ?? "")
          : ""
        }, ${data?.unAudited?.submit_annual_accounts === false
          ? (data?.unAudited?.rejectReason_mohua ?? "")
          : ""
        }, ${actions["unAuditedResponseFile_state"]["url"] ?? ""},${actions["unAuditedResponseFile_mohua"]["url"] ?? ""
        } `;

    } else {
      unAuditedEntity = `${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""
        }, ${data?.createdAt ?? ""}, ${data?.ulbSubmit ?? ""},${entity?.filled_provisional ?? ""
        }, Provisional,${data?.unAuditedYear?.year ?? ""}, ${unAuditedProvisional?.bal_sheet?.pdf?.url ?? ""
        }, ${unAuditedProvisional?.bal_sheet?.excel?.url ?? ""}, ${stateHistoryUnAuditedProvisional?.bal_sheet?.status ?? ""
        }, ${unAuditedProvisional?.bal_sheet?.rejectReason_state},  ${unAuditedProvisional?.bal_sheet?.status ?? ""
        }, ${unAuditedProvisional?.bal_sheet?.rejectReason_mohua ?? ""},  ${unAuditedProvisional?.assets ?? ""
        }, ${unAuditedProvisional?.f_assets ?? "" ?? ""}, ${unAuditedProvisional?.s_grant ?? ""
        }, ${unAuditedProvisional?.c_grant ?? ""}, ${unAuditedProvisional?.bal_sheet_schedules?.pdf?.url ?? ""
        }, ${unAuditedProvisional?.bal_sheet_schedules?.excel?.url ?? ""}, ${stateHistoryUnAuditedProvisional?.bal_sheet_schedules?.status ?? ""
        }, ${unAuditedProvisional?.bal_sheet_schedules?.rejectReason_state}, ${unAuditedProvisional?.bal_sheet_schedules?.status ?? ""
        }, ${unAuditedProvisional?.bal_sheet_schedules?.rejectReason_mohua ?? ""
        }, ${unAuditedProvisional?.inc_exp?.pdf?.url ?? ""}, ${unAuditedProvisional?.inc_exp?.excel?.url ?? ""
        }, ${stateHistoryUnAuditedProvisional?.inc_exp?.status ?? ""
        }, ${unAuditedProvisional?.inc_exp?.rejectReason_state}, ${unAuditedProvisional?.inc_exp?.status ?? ""}, ${unAuditedProvisional?.inc_exp?.rejectReason_mohua ?? ""
        },  ${unAuditedProvisional?.revenue ?? ""}, ${unAuditedProvisional?.expense ?? ""
        },${unAuditedProvisional?.inc_exp_schedules?.pdf?.url ?? ""}, ${unAuditedProvisional?.inc_exp_schedules?.excel?.url ?? ""
        }, ${stateHistoryUnAuditedProvisional?.inc_exp_schedules?.status ?? ""
        }, ${unAuditedProvisional?.inc_exp_schedules?.rejectReason_state},  ${unAuditedProvisional?.inc_exp_schedules?.status ?? ""}, ${unAuditedProvisional?.inc_exp_schedules?.rejectReason_mohua ?? ""
        }, ${unAuditedProvisional?.cash_flow?.pdf?.url ?? ""}, ${unAuditedProvisional?.cash_flow?.excel?.url ?? ""
        }, ${stateHistoryUnAuditedProvisional?.cash_flow?.status ?? ""
        }, ${unAuditedProvisional?.cash_flow?.rejectReason_state},  ${unAuditedProvisional?.cash_flow?.status ?? ""}, ${unAuditedProvisional?.cash_flow?.rejectReason_mohua ?? ""
        }, , , , , , ${data?.unAudited?.submit_standardized_data ?? ""}, ${unAuditedStandardized?.excel?.url ?? ""
        } , ${data?.unAudited?.submit_annual_accounts === false
          ? (data?.unAudited?.rejectReason_state ?? "")
          : ""
        }, ${data?.unAudited?.submit_annual_accounts === false
          ? (data?.unAudited?.rejectReason_mohua ?? "")
          : ""
        }, ${actions["unAuditedResponseFile_state"]["url"] ?? ""},${actions["unAuditedResponseFile_mohua"]["url"] ?? ""
        } `;

    }
  } else {
    if (data?.audited?.submit_annual_accounts === false) {
      auditedEntity = ` ${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""
        }, ${data?.createdAt ?? ""}, ${data?.ulbSubmit ?? ""},${entity?.filled_audited ?? ""
        }, Audited, ${data?.auditedYear?.year ?? ""}, , , ,, , ,  ,, , ,,, , , , ,  , ,, , , , , ,,, ,, , ,,, , , , ,,, , , , ,,   , ,${actions["auditedResponseFile_state"]["url"] ?? ""},${actions["auditedResponseFile_mohua"]["url"] ?? ""
        } `;
    } else {
      auditedEntity = ` ${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""
        }, ${data?.createdAt ?? ""}, ${data?.ulbSubmit ?? ""},${entity?.filled_audited ?? ""
        }, Audited, ${data?.auditedYear?.year ?? ""}, ${auditedProvisional?.bal_sheet?.pdf?.url ?? ""
        }, ${auditedProvisional?.bal_sheet?.excel?.url ?? ""},  , , , , ${auditedProvisional?.assets ?? ""
        }, ${auditedProvisional?.f_assets ?? ""}, ${auditedProvisional?.s_grant ?? ""
        }, ${auditedProvisional?.c_grant ?? ""}, ${auditedProvisional?.bal_sheet_schedules?.pdf?.url ?? ""
        }, ${auditedProvisional?.bal_sheet_schedules?.excel?.url ?? ""}, , , ,  ,${auditedProvisional?.inc_exp?.pdf?.url ?? ""
        }, ${auditedProvisional?.inc_exp?.excel?.url ?? ""}, , , ,  , ${auditedProvisional?.revenue ?? ""
        }, ${auditedProvisional?.expense ?? ""},${auditedProvisional?.inc_exp_schedules?.pdf?.url ?? ""
        }, ${auditedProvisional?.inc_exp_schedules?.excel?.url ?? ""}, , , ,  ,${auditedProvisional?.cash_flow?.pdf?.url ?? ""
        }, ${auditedProvisional?.cash_flow?.excel?.url ?? ""}, , , ,  ,${auditedProvisional?.auditor_report?.pdf?.url ?? ""
        }, , , , , ${data?.audited?.submit_standardized_data ?? ""}, ${auditedStandardized?.excel?.url ?? ""
        } , , ,${actions["auditedResponseFile_state"]["url"] ?? ""},${actions["auditedResponseFile_mohua"]["url"] ?? ""
        } `;
    }
    if (data?.unAudited?.submit_annual_accounts === false) {
      unAuditedEntity = `${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""
        }, ${data?.createdAt ?? ""}, ${data?.ulbSubmit ?? ""},${entity?.filled_provisional ?? ""
        }, Provisional,${data?.unAuditedYear?.year ?? ""}, , , ,, , ,  ,, , ,,, , , , ,  , ,, , , , , ,,, ,, , ,,, , , , ,,, , , , ,,   , ,${actions["unAuditedResponseFile_state"]["url"] ?? ""
        },${actions["unAuditedResponseFile_mohua"]["url"] ?? ""} `;
    } else {
      unAuditedEntity = `${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""
        }, ${data?.createdAt ?? ""}, ${data?.ulbSubmit ?? ""},${entity?.filled_provisional ?? ""
        }, Provisional,${data?.unAuditedYear?.year ?? ""}, ${unAuditedProvisional?.bal_sheet?.pdf?.url ?? ""
        }, ${unAuditedProvisional?.bal_sheet?.excel?.url ?? ""}, , ,  , ,  ${unAuditedProvisional?.assets ?? ""
        }, ${unAuditedProvisional?.f_assets ?? "" ?? ""}, ${unAuditedProvisional?.s_grant ?? ""
        }, ${unAuditedProvisional?.c_grant ?? ""}, ${unAuditedProvisional?.bal_sheet_schedules?.pdf?.url ?? ""
        }, ${unAuditedProvisional?.bal_sheet_schedules?.excel?.url ?? ""
        }, , , , ,${unAuditedProvisional?.inc_exp?.pdf?.url ?? ""}, ${unAuditedProvisional?.inc_exp?.excel?.url ?? ""
        }, , , , ,${unAuditedProvisional?.revenue ?? ""}, ${unAuditedProvisional?.expense ?? ""
        },${unAuditedProvisional?.inc_exp_schedules?.pdf?.url ?? ""}, ${unAuditedProvisional?.inc_exp_schedules?.excel?.url ?? ""
        }, , , , ,${unAuditedProvisional?.cash_flow?.pdf?.url ?? ""}, ${unAuditedProvisional?.cash_flow?.excel?.url ?? ""
        }, , , , , , , , , , ${data?.unAudited?.submit_standardized_data ?? ""
        }, ${unAuditedStandardized?.excel?.url ?? ""} , , , ${actions["unAuditedResponseFile_state"]["url"] ?? ""
        },${actions["unAuditedResponseFile_mohua"]["url"] ?? ""} `;
    }
  }
  return { auditedEntity, unAuditedEntity };
}
function removeEscapesFromAnnual(element) {
  for (let key in element) {
    if (element[key] && typeof element[key] === "object") {
      if (element[key].hasOwnProperty("rejectReason_state")) {
        element[key]["rejectReason_state"] = removeEscapeChars(element[key]["rejectReason_state"]);
      }
      if (element[key].hasOwnProperty("rejectReason_mohua")) {
        element[key]["rejectReason_mohua"] = removeEscapeChars(element[key]["rejectReason_mohua"]);
      }
    }
  }
}

function createDynamicQuery(collectionName, oldQuery, userRole, csv) {
  let query_2 = {};
  let query_3 = {}, query_4 = {}, query_5 = {};
  let pipelineIndex;
  for (let i = 0; i < oldQuery.length; i++) {
    if (oldQuery[i].hasOwnProperty("$lookup")) {
      let lookupQuery = oldQuery[i]["$lookup"];
      if (lookupQuery.hasOwnProperty("pipeline") && lookupQuery.hasOwnProperty("let")) {
        pipelineIndex = i;
        break;
      }
    }
  }
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

          oldQuery[pipelineIndex]["$lookup"]["pipeline"].push(query_2);
          oldQuery[pipelineIndex]["$lookup"]["pipeline"].push(query_3);
          break;

        case CollectionNames.pfms:

          break;
        case CollectionNames.annual:
          query_2 = {
            $lookup: {
              "from": "years",
              "localField": "audited.year",
              "foreignField": "_id",
              "as": "auditedYear"
            },
          }
          query_3 = {
            $unwind: {
              "path": "$auditedYear"
            }
          };

          query_4 = {

            $lookup: {
              "from": "years",
              "localField": "unAudited.year",
              "foreignField": "_id",
              "as": "unAuditedYear"
            }
          }

          query_5 = {
            $unwind: {
              "path": "$unAuditedYear"
            }
          }

          oldQuery[pipelineIndex]["$lookup"]["pipeline"].push(query_2);
          oldQuery[pipelineIndex]["$lookup"]["pipeline"].push(query_3);
          oldQuery[pipelineIndex]["$lookup"]["pipeline"].push(query_4);
          oldQuery[pipelineIndex]["$lookup"]["pipeline"].push(query_5);

          break;

        case CollectionNames['28SLB']:
          query_2 = {
            $lookup: {
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
            $lookup: {
              from: "years",
              localField: "data.target_1.year",
              foreignField: "_id",
              as: "target_1_year"
            }
          };
          query_5 = {
            $unwind: "$target_1_year"
          };

          oldQuery[pipelineIndex]["$lookup"]["pipeline"].push(query_2);
          oldQuery[pipelineIndex]["$lookup"]["pipeline"].push(query_3);
          oldQuery[pipelineIndex]["$lookup"]["pipeline"].push(query_4);
          oldQuery[pipelineIndex]["$lookup"]["pipeline"].push(query_5);
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
          oldQuery[pipelineIndex]["$lookup"]["pipeline"].push(query_2);
          oldQuery[pipelineIndex]["$lookup"]["pipeline"].push(query_3);
          break;
        default:
          query = {};
          break;
      }
      break;
    case "STATE":
      switch (collectionName) {
        case CollectionNames.state_gtc:
          if (!csv) {
            query_2 = {
              $group: {
                _id: "$state",
                status: { $push: "$formData.status" },
                stateName: { $first: "$stateName" },
                state: { $first: "$state" },
                stateCode: { $first: "$stateCode" },
              },
            };
            oldQuery.push(query_2);
          }
          //   else {
          //    query_2 = {
          //      $group: {
          //       "_id": "$state",
          //       "regionalName": {$first: "$regionalName"},
          //       "stateName":{$first: "$stateName"},
          //       "stateCode":{$first: "$stateCode"},
          //       "allFormData": {
          //           "$push": "$$ROOT"
          //       }
          //      },
          //    };
          //  }
          break;
        case CollectionNames.state_grant_alloc:
          query_2 = {
            $group: {
              _id: "$state",
              draft: { $push: "$formData.isDraft" },
              stateName: { $first: "$stateName" },
              state: { $first: "$state" },
              stateCode: { $first: "$stateCode" },
              regionalName : {$first: "$regionalName"}
            }
          }
          oldQuery.push(query_2);
          break;
      }
  }
  return oldQuery;
}

// function canTakeActionOrViewOnly(data, userRole) {
//   let status = data['formStatus'];
//   switch (true) {
//     case status == STATUS_LIST.Not_Started:
//       return false;
//       break;
//     case status == STATUS_LIST.In_Progress:
//       return false;
//       break;
//     case status == STATUS_LIST.Under_Review_By_State && userRole == 'STATE':
//       return true;
//       break;
//     case status == STATUS_LIST.Under_Review_By_State && (userRole == 'MoHUA' || userRole == 'ADMIN'):
//       return false;
//       break;
//     case status == STATUS_LIST.Rejected_By_State:
//       return false;
//       break;
//     case status == STATUS_LIST.Rejected_By_MoHUA:
//       return false;
//       break;
//     case status == STATUS_LIST.Under_Review_By_MoHUA && userRole == 'STATE':
//       return false;
//       break;
//     case status == STATUS_LIST.Under_Review_By_MoHUA && userRole == 'MoHUA':
//       return true;
//       break;
//     case status == STATUS_LIST.Approved_By_MoHUA:
//       return false;
//       break;

//     default:
//       break;
//   }
// }

module.exports.get = catchAsync(async (req, res) => {
  try {
  
  let loggedInUserRole = req.decoded.role
  let filter = {};
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
  //    formId --> sidemenu collection --> e.g Annual Accounts --> _id = formId
  let total;
  let design_year = req.query.design_year;
  let form = req.query.formId
  if (!design_year || !form) {
    return res.status(400).json({
      success: false,
      message: "Missing FormId or Design Year"
    })
  }
  let skip = req.query.skip ? parseInt(req.query.skip) : 0
  let limit = req.query.limit ? parseInt(req.query.limit) : 10
  let csv = req.query.csv == "true"
  let keys;
  let formTab = await Sidemenu.findOne({ _id: ObjectId(form) }).lean();
  if (loggedInUserRole == "STATE") {
    delete ulbColumnNames['stateName']
  }
  let title_value = formTab.role == 'ULB' ? 'Review Grant Application' : 'Review State Forms';

  if ((loggedInUserRole == "MoHUA" || loggedInUserRole == "ADMIN") && title_value === "Review Grant Application") {
    delete ulbColumnNames['stateName']
  }

  let dbCollectionName = formTab?.dbCollectionName
  let formType = formTab.role
  if (formType === "ULB") {
    filter['ulbName'] = req.query.ulbName != 'null' ? req.query.ulbName : ""
    filter['censusCode'] = req.query.censusCode != 'null' ? req.query.censusCode : ""
    filter['populationType'] = req.query.populationType != 'null' ? req.query.populationType : ""
    filter['state'] = req.query.stateName != 'null' ? req.query.stateName : ""
    filter['ulbType'] = req.query.ulbType != 'null' ? req.query.ulbType : ""
    filter['UA'] = req.query.UA != 'null' ? req.query.UA : ""
    filter['status'] = req.query.status != 'null' ? req.query.status : ""
    keys = calculateKeys(filter['status'], formType);

    Object.assign(filter, keys)
    delete filter['status']

    // filled1 -> will be used for all the forms and Provisional of Annual accounts
    // filled2 -> only for annual accounts -> audited section
    filter['filled1'] = req.query.filled1 != 'null' ? req.query.filled1 : ""
    filter['filled2'] = req.query.filled2 != 'null' ? req.query.filled2 : ""
    if (filter["censusCode"]) {
      let code = filter["censusCode"];
      var digit = code.toString()[0];
      if (digit == "9") {
        delete filter["censusCode"];
        filter["sbCode"] = code;
      }
    }

  }
  if (formTab.collectionName == CollectionNames.annual) {
    filter['filled_audited'] = filter['filled1']
    filter['filled_provisional'] = filter['filled2']
    delete filter['filled1']
    delete filter['filled2']
  } else {
    filter['filled'] = filter['filled1']
    delete filter['filled1']
  }
  if (formType == 'STATE') {
    // filter['state'] = req.query.stateName
    // filter['status'] = req.query.status 
    filter['status'] = req.query.status != 'null' ? req.query.status : "";
    filter['state'] = req.query.state != 'null' ? req.query.state : ""
    keys = calculateKeys(filter['status'], formType);
    Object.assign(filter, keys)
    delete filter['status']
  }
  let state = req.query.state ?? req.decoded.state
  if (req.decoded.role === "STATE") {
    state = req.decoded.state
  }
  let getQuery = req.query.getQuery == 'true'
  if (!design_year || !form) {
    return res.status(400).json({
      success: false,
      message: "Data Missing"
    })
  }
  //path -> file of models
  let path = formTab.path
  let collectionName = formTab.collectionName;
  if (collectionName == CollectionNames.annual) {
    delete ulbColumnNames['filled']
  } else {
    delete ulbColumnNames.filled_audited
    delete ulbColumnNames.filled_provisional
  }
  let isFormOptional = formTab.optional
  // const model = require(`../../models/${path}`)
  let newFilter = await Service.mapFilterNew(filter);
  statusSpecificCases(req.query.status, newFilter);
  let folderName = formTab?.folderName;

  let query = computeQuery(collectionName, formType, isFormOptional, state, design_year, csv, skip, limit, newFilter, dbCollectionName, folderName);
  if (getQuery) return res.json({
    query: query[0] 
  })

  // if csv - then no skip and limit, else with skip and limit
  if (csv) {
    await createCSV({ formType, collectionName, res, loggedInUserRole, query });
    return;
  }
  let data = formType == "ULB" ? Ulb.aggregate(query[0]).allowDiskUse(true) : State.aggregate(query[0]).allowDiskUse(true)
  total = formType == "ULB" ? Ulb.aggregate(query[1]).allowDiskUse(true) : State.aggregate(query[1]).allowDiskUse(true)
  let allData = await Promise.all([data, total]);
  data = allData[0]
  total = allData[1].length ? allData[1][0]['total'] : 0;
  if(!data.length){
    return res.status(200).json({
      success: true,
      data: data,
      total: total,
      columnNames: formType == 'ULB' ? ulbColumnNames : stateColumnNames,
      statusList: formType == 'ULB' ? List.ulbFormStatus : List.stateFormStatus,
      ulbType: formType == 'ULB' ? List.ulbType : {},
      populationType: formType == 'ULB' ? List.populationType : {},
      title: formType == 'ULB' ? 'Review Grant Application' : 'Review State Forms'
    })
  }
  //  if(collectionName == CollectionNames.dur || collectionName == CollectionNames.gfc ||
  //     collectionName == CollectionNames.odf || collectionName == CollectionNames.slb || 
  //     collectionName === CollectionNames.sfc || collectionName === CollectionNames.propTaxState || collectionName === CollectionNames.annual )
  let approvedUlbs = await masterForms2122(collectionName, data);
  const sequentialReview = `Cannot review since last year form is not approved by MoHUA.`
  data.forEach(el => {
    el['info'] = '';
    el['prevYearStatus'] = '';
    el['prevYearStatusId'] = '';
    if (!el.formData) {
      el['formStatus'] = "Not Started";
      el['cantakeAction'] = false;
    } else {
      el['formStatus'] = calculateStatus(el.formData.status, el.formData.actionTakenByRole, el.formData.isDraft, formType);
      el['cantakeAction'] = req.decoded.role === "ADMIN" ? false : canTakeActionOrViewOnly(el, loggedInUserRole)
      if (collectionName === CollectionNames.dur || collectionName === CollectionNames['28SLB']) {
      //   el['cantakeAction'] = req.decoded.role === "ADMIN" ? false : canTakeActionOrViewOnly(el, loggedInUserRole);
      //   if (!(approvedUlbs.find(ulb => ulb.toString() === el.ulbId.toString())) && loggedInUserRole === "MoHUA") {
      //     el['cantakeAction'] = false
      //     el['formStatus'] === STATUS_LIST['Under_Review_By_MoHUA'] ? el['info'] = sequentialReview : ""
      //   }
        el['prevYearStatus'] = approvedUlbs[el._id] ?? STATUS_LIST['Not_Started'];
        const previousStatus =  el['prevYearStatus']?.toUpperCase().split(' ').join('_')
        el['prevYearStatusId'] = PREV_MASTER_FORM_STATUS[previousStatus] ??  PREV_MASTER_FORM_STATUS['NOT_STARTED']

      } 
      // else {
        // el['cantakeAction'] = req.decoded.role === "ADMIN" ? false : canTakeActionOrViewOnly(el, loggedInUserRole)
      // }
    }
  })

  if (
    collectionName === CollectionNames.state_gtc ||
    collectionName === CollectionNames.state_grant_alloc
  ) {
    data.forEach((element) => {
      // element.stateName = element["stateName"];
      let { status, pending } = countStatusData(element, collectionName);
      element.formStatus = status;
      if (pending > 0 && collectionName === CollectionNames.state_gtc) {
        element.cantakeAction = true;
      }
    });
  }

  //  console.log(data)
  data.forEach(el => {
    if (el.formData || el.formData === "") delete el.formData;

  })
  return res.status(200).json({
    success: true,
    data: data,
    total: total,
    columnNames: formType == 'ULB' ? ulbColumnNames : stateColumnNames,
    statusList: formType == 'ULB' ? List.ulbFormStatus : List.stateFormStatus,
    ulbType: formType == 'ULB' ? List.ulbType : {},
    populationType: formType == 'ULB' ? List.populationType : {},
    title: formType == 'ULB' ? 'Review Grant Application' : 'Review State Forms'
  })
  } catch (error) {
    return Response.BadRequest(res, "Something went wrong!")
  }
})


/**
 * The function applies a filter to a request based on the status value.
 * @param newFilter - The `newFilter` parameter is an object that represents the filter criteria to be
 * applied to a request. It is passed as an argument to the `statusSpecificCases` function.
 */
function statusSpecificCases(status, newFilter) {
  try {
    if (status === STATUS_LIST.Not_Started) { // to apply not started filter
      Object.assign(newFilter, { formData: "" });
    }else if(status == STATUS_LIST.In_Progress){
      delete newFilter['formData.actionTakenByRole']
    }
  } catch (error) {
    throw Error({message: `statusSpecificCases: ${error.message}`})
    
  }
}

/**
 * The function `createCSV` is an asynchronous function that generates a CSV file based on the provided
 * parameters, including the form type, collection name, response object, logged-in user role, request
 * object, and query.
 */
async function createCSV(params) {
  const { formType, collectionName, res, loggedInUserRole, query } =
    params;
  try {
    let data =
      formType == "ULB"
        ? await Ulb.aggregate(query[0]).allowDiskUse(true).exec()
        : await State.aggregate(query[0]).allowDiskUse(true);
    data.forEach((el) => {
      el["formStatus"] = el.formData
        ? calculateStatus(
            el.formData.status,
            el.formData.actionTakenByRole,
            el.formData.isDraft,
            formType
          )
        : MASTER_STATUS_ID[MASTER_FORM_STATUS['NOT_STARTED']];
    });
    if (formType === "ULB") {
      let filename = `Review_${formType}-${collectionName}.csv`;
      // Set approrpiate download headers
      res.setHeader("Content-disposition", "attachment; filename=" + filename);
      res.writeHead(200, { "Content-Type": "text/csv;charset=utf-8,%EF%BB%BF" });

      let fixedColumns = `State Name, ULB Name, City Finance Code, Census Code, Population Category, UA, UA Name,`;
      let dynamicColumns = createDynamicColumns(collectionName);
      if (collectionName != CollectionNames.annual && collectionName != CollectionNames['28SLB']) {
        res.write(
          "\ufeff" +
            `${fixedColumns.toString()} ${dynamicColumns.toString()} \r\n`
        );

        res.flushHeaders();
        for (let el of data) {
          el = JSON.parse(JSON.stringify(el));
          el = concatenateUrls(el);
          let dynamicElementData = await createDynamicElements(
            collectionName,
            formType,
            el
          );
          if (el.UA === "null") {
            el.UA = "NA";
          }
          if (el.UA === "NA") {
            el.isUA = "No";
          } else if (el.UA !== "NA") {
            el.isUA = "Yes";
          }
          if (!el.censusCode) {
            el.censusCode = "NA";
          }
          res.write(
            "\ufeff" +
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
              dynamicElementData.toString() +
              "\r\n"
          );
        }
        res.end();
        return;
      } else {
        res.write(
          "\ufeff" +
            `State Name, ULB Name, City Finance Code, Census Code, Population Category, UA, UA Name, ${dynamicColumns.toString()}  \r\n`
        );

        res.flushHeaders();
        for (let el of data) {
          el = JSON.parse(JSON.stringify(el));
          el = concatenateUrls(el);
          let [row1, row2] = await createDynamicElements(
            collectionName,
            formType,
            el
          );

          if (el.UA === "null") {
            el.UA = "NA";
          }
          if (el.UA === "NA") {
            el.isUA = "No";
          } else if (el.UA !== "NA") {
            el.isUA = "Yes";
          }
          if (!el.censusCode) {
            el.censusCode = "NA";
          }

          res.write(
            "\ufeff" +
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
              row1.toString() +
              "\r\n"
          );
          res.write(
            "\ufeff" +
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
              row2.toString() +
              "\r\n"
          );
        }
        res.end();
        return;
      }
    } else if (formType === "STATE") {
      if (collectionName == "WaterRejenuvationRecycling") {
        await waterSenitationXlsDownload(
          data,
          res,
          collectionName,
          formType,
          loggedInUserRole
        );
      } else if (collectionName == "ActionPlan") {
        await actionPlanXlsDownload(
          data,
          res,
          collectionName,
          formType,
          loggedInUserRole
        ); // xls
      } else {
        let filename = `Review_${formType}-${collectionName}.csv`;
        // Set approrpiate download headers
        res.setHeader(
          "Content-disposition",
          "attachment; filename=" + filename
        );
        res.writeHead(200, {
          "Content-Type": "text/csv;charset=utf-8,%EF%BB%BF",
        });

        let fixedColumns = `State Name, City Finance Code, Regional Name,`;
        let dynamicColumns = createDynamicColumns(collectionName);
        res.write(
          "\ufeff" +
            `${fixedColumns.toString()} ${dynamicColumns.toString()} \r\n`
        );

        res.flushHeaders();
        if (data?.length) {
          for (let el of data) {
            el = JSON.parse(JSON.stringify(el));
            el = concatenateUrls(el);
            let dynamicElementData = await createDynamicElements(
              collectionName,
              formType,
              el
            );

            res.write(
              "\ufeff" +
                el.stateName +
                "," +
                el.stateCode +
                "," +
                el.regionalName +
                "," +
                dynamicElementData.toString() +
                "\r\n"
            );
          }
        } else {
          res.write("\ufeff" + "");
        }

        res.end();
        return;
      }
    }
  } catch (error) {
    console.log("CSV Download Error", error);
    return Response.BadRequest(res, {}, error.message);
  }
}

async function grantAllCsvDownload(el, res) {
  let { stateName, stateCode, formData } = el;
  let row = [stateName, stateCode];
  if (formData && formData.length && (formData[0] !== "")) {
    for (let pf of formData) {
      let tempArr = [pf?.type, pf?.installment, pf?.url];
      let str = [...row, ...tempArr].join(',') + "\r\n";
      res.write("\ufeff" + str);
    }
  } else {
    let str = [...row].join(',') + "\r\n";
    res.write("\ufeff" + str);
  }
}

async function masterForms2122(collectionName, data) {
  try {
    let ulbsArray = [], approvedUlbs = [];
    let ulbsObject = {},
      masterForms2122;
    if (collectionName === CollectionNames.dur || collectionName === CollectionNames['28SLB']) {
      ulbsArray = data.map((el) => {
        return el.ulbId;
      });
      // for (let entity of ulbsArray) {
      //   ulbsObject[entity] = false;
      // }
      if (Array.isArray(ulbsArray) && ulbsArray.length) {
        masterForms2122 = await MasterForm.find(
          {
            ulb: { $in: ulbsArray },
          },
          { history: 0, steps: 0 }
        ).lean();
      }
      approvedUlbs = getUlbsApprovedByMoHUA(masterForms2122)
    }
    return approvedUlbs;
  } catch (error) {
    throw (`masterForms2122:: ${error.message}`)
  }
}

function getUlbsApprovedByMoHUA(forms) {
  try {
    let ulbArray = {};
    for (let form of forms) {
      // if (form.actionTakenByRole === "MoHUA" && form.isSubmit && form.status === "APPROVED") {
        ulbArray[form.ulb] = calculateStatus(form.status,form.actionTakenByRole, !form.isSubmit,"ULB");
      // }
    }
    return ulbArray;
  } catch (error) {
    throw ({message:`getUlbsApprovedByMoHUA:: ${error.message}`});
  }
}
function countStatusData(element, collectionName) {
  let total = 0;
  let notStarted = 0;
  let status = "";
  let arr = collectionName === CollectionNames.state_gtc ? element.status : element.draft

  if (collectionName === CollectionNames.state_gtc) {
    total = 8;
    notStarted = 8;
  } else if (collectionName === CollectionNames.state_grant_alloc) {
    total = 5;
    notStarted = 5;
  }
  let pending = 0, rejected = 0, approved = 0;
  if (arr.length <= 0) {
    status = collectionName === CollectionNames.state_gtc ? `${notStarted} Not Started` : `${notStarted} Not Submitted`;
    return { status, pending };
  } else {
    if (collectionName === CollectionNames.state_gtc) {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] === "PENDING") {
          pending++;
        } else if (arr[i] === "APPROVED") {
          approved++;
        } else if (arr[i] === "REJECTED") {
          rejected++;
        }
      }
      notStarted = total - pending - approved - rejected;
      status = ` ${approved} Approved, ${rejected} Rejected, ${pending} Pending`;
      if (notStarted > 0) {
        status = `${status}, ${notStarted} Not Started`;
      }
      return { status, pending };
    } else if (collectionName === CollectionNames.state_grant_alloc) {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] === false) {
          notStarted--;
        }
      }
      status = `${total - notStarted} submitted`
      return { status, pending };
    }
  }
}
const computeQuery = (formName, userRole, isFormOptional, state, design_year, csv, skip, limit, filter, dbCollectionName, folderName) => {
  let filledQueryExpression = {}
  if (isFormOptional) {
    // if form is optional check if the deciding condition is true or false
    switch (formName) {
      case CollectionNames.slb:
        filledQueryExpression = {
          $cond: {
            if: { $eq: [`$formData.blank`, true] },
            then: STATUS_LIST.Not_Submitted,
            else: STATUS_LIST.Submitted,
          },
        };
        break;
      case CollectionNames.pfms:
        filledQueryExpression = {
          $cond: {
            if: { $eq: [`$formData.linkPFMS`, "Yes"] },
            then: STATUS_LIST.Submitted,
            else: STATUS_LIST.Not_Submitted,
          },
        };
        break;
      case CollectionNames.propTaxUlb:
        filledQueryExpression = {
          $cond: {
            if: { $eq: [`$formData.toCollect`, "Yes"] },
            then: STATUS_LIST.Submitted,
            else: STATUS_LIST.Not_Submitted,
          },
        };
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
        };
        break;
      case CollectionNames.sfc:
        filledQueryExpression = {
          $cond: {
            if: { $eq: [`$formData.constitutedSfc`, "Yes"] },
            then: STATUS_LIST.Submitted,
            else: STATUS_LIST.Not_Submitted,
          },
        };
      default:
        break;
    }


  }
  let dY = "$design_year";
  let designYearField = "design_year"
  if (formName == CollectionNames.dur) {
    dY = "$designYear";
    designYearField = "designYear";
  }
  switch (userRole) {
    case "ULB":
      let query = [
        {
          $match: {
            "access_2223": true,
            "isActive": true,
          }
        },
        {
          $lookup: {

            from: "states",
            localField: "state",
            foreignField: "_id",
            as: "state"
          }
        }, {
          $unwind: "$state"
        },
        {
          $match: {
            "state.accessToXVFC": true
          }
        }]
      if (state && state !== 'null') {
        query.push({
          $match: {
            "state._id": ObjectId(state)
          }

        })
      }
      let query_2 = [{
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
              $lookup: {
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
      }, {
        $unwind: {
          path: `$${dbCollectionName}`,
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {

          from: "uas",
          localField: "UA",
          foreignField: "_id",
          as: "UA"
        }
      },
      {
        $unwind: {
          "path": "$UA",
          "preserveNullAndEmptyArrays": true
        }
      },
      {
        $lookup: {

          from: "ulbtypes",
          localField: "ulbType",
          foreignField: "_id",
          as: "ulbType"
        }
      }, {
        $unwind: "$ulbType"
      },
      {
        $project: {
          ulbName: "$name",
          ulbId: "$_id",
          ulbCode: "$code",
          access: "$access_2122",
          censusCode: {
            $cond: {
              if: {
                $or: [
                  { $eq: ["$censusCode", ""] },
                  { $eq: ["$censusCode", null] },
                ]
              },
              then: "$sbCode",
              else: "$censusCode"
            }

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
          populationType: {
            $cond: {
              if: { $eq: ["$isMillionPlus", "Yes"] },
              then: "Million Plus",
              else: "Non Million",
            },
          },
          formData: { $ifNull: [`$${dbCollectionName}`, ""] }

        }
      },
      {
        $project: {
          ulbName: 1,
          ulbId: 1,
          access: 1,
          ulbCode: 1,
          access: 1,
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
          filled:
          {
            $cond: { if: { $or: [{ $eq: ["$formData", ""] }, { $eq: ["$formData.isDraft", true] }] }, then: "No", else: isFormOptional ? filledQueryExpression : "Yes" }
          }

        }
      },
      {
        $sort: { formData: -1 }
      }


      ]
      query.push(...query_2)
      //temp filter for duplicate dur entries
      let pipelineIndex;
      for (let i = 0; i < query.length; i++) {
        if (query[i].hasOwnProperty("$lookup")) {
          let lookupQuery = query[i]["$lookup"];
          if (
            lookupQuery.hasOwnProperty("pipeline") &&
            lookupQuery.hasOwnProperty("let")
          ) {
            pipelineIndex = i;
            break;
          }
        }
      }
      if (formName === CollectionNames.dur) {
        query[pipelineIndex]["$lookup"]["pipeline"][0]["$match"]["$expr"]["$and"].push(
          {
            $eq: [
              "$financialYear",
              ObjectId("606aaf854dff55e6c075d219")
            ]
          }
        )
      }
      //dynamic query based on condition
      if (csv) {
        query = createDynamicQuery(formName, query, userRole, csv);
      }




      if (formName == CollectionNames.annual) {
        delete query[query.length - 2]['$project']['filled']
        Object.assign(query[query.length - 2]['$project'], { filled_provisional: filledProvisionalExpression, filled_audited: filledAuditedExpression })
      }
      let filterApplied = Object.keys(filter).length > 0
      if (filterApplied) {
        if (filter.sbCode) {
          delete Object.assign(filter, { ["censusCode"]: filter["sbCode"] })["sbCode"];
        }
        query.push({
          $match: filter
        },
        )
      }
      let countQuery = query.slice()
      countQuery.push({
        $count: "total"
      })

      let paginator = [
        { $addFields: { "dummy": [] } },
        {
          $unwind: {
            path: "$dummy",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $skip: skip
        },
        { $limit: limit }
      ]
      if (!csv) {
        query.push(...paginator)
      }
      // query.push( {
      //   allowDiskUse: true
      // })
      return [query, countQuery]
      break;
    case "STATE":
      let query_s = [
        {
          $match: {
            accessToXVFC: true,
          },
        }
      ];

      if ([List.CollectionNames['waterRej'], List.CollectionNames['actionPlan']].includes(dbCollectionName)) {
        query_s.push(...[
          {
            "$lookup": {
              "from": "uas",
              "localField": "_id",
              "foreignField": "state",
              "as": "uas"
            }
          },
          {
            "$match": {
              "uas": { "$ne": [] }
            }
          }
        ])
      }

      query_s.push(...[
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
              {
                $lookup: {
                  from: "years",
                  localField: "design_year",
                  foreignField: "_id",
                  as: "design_year",
                },
              },
              {
                $unwind: "$design_year",
              },
            ],
            as: dbCollectionName,
          },
        },
        {
          $unwind: {
            path: `$${dbCollectionName}`,
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            state: "$_id",
            stateName: "$name",
            stateCode: "$code",
            regionalName: 1,
            formData: { $ifNull: [`$${dbCollectionName}`, ""] },
            filled:
            {
              $cond: { if: { $or: [{ $eq: ["$formData", ""] }, { $eq: ["$formData.isDraft", true] }] }, then: "No", else: isFormOptional ? filledQueryExpression : "Yes" }
            }
          },
        },
        {
          $sort: { formData: -1 },
        },
      ])


      query_s = createDynamicQuery(formName, query_s, userRole, csv);
      /* Checking if the user role is STATE and the folder name is IndicatorForWaterSupply. */
      if (folderName === List['FolderName']['IndicatorForWaterSupply']) {
        let startIndex = query_s.findIndex((el) => {
          return el.hasOwnProperty("$lookup");
        })

        /* Splicing the query_s string starting at the startIndex. */
        query_s.splice(startIndex);
        query_s.push({
          $project: {
            state: "$_id",
            stateName: "$name",
            stateCode: "$code",
            regionalName: 1,
            filled: "Not Applicable"
          },

        })
      }
      let filterApplied_s = Object.keys(filter).length > 0
      if (filterApplied_s) {
        query_s.push({
          $match: filter
        },
        )
      }
      let countQuery_s = query_s.slice()
      countQuery_s.push({
        $count: "total"
      })
      let paginator_s = [
        {
          $skip: skip
        },
        { $limit: limit }
      ]
      if (!csv) {
        query_s.push(...paginator_s)
      }
      return [query_s, countQuery_s]
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

const waterSenitationXlsDownload = async (data, res, collectionName, formType, role) => {
  try {
    const tempFilePath = "uploads/excel";
    if (!fs.existsSync(tempFilePath)) {
      fs.mkdirSync(tempFilePath);
    }
    const filename = `${Date.now()}__waterSupplyAndSanitation.xlsx`;
    const workbook = new ExcelJS.Workbook();
    const waterBodies = workbook.addWorksheet('waterBodies');
    const reuseWater = workbook.addWorksheet('reuseWater');
    const serviceLevelIndicators = workbook.addWorksheet('serviceLevelIndicators');
    let uaFormData = await UA.find({}).lean();
    let indicatorLineItems = await IndicatorLineItems.find({ "type": "water supply" }).lean();
    waterBodies.addRow([
      "State Name", "State Code", "Form Status", "UA Name", "Project Name", "Name of water body", "Area",
      "Latitude", "Longitude", "BOD in mg/L (Current)", "BOD in mg/L (Expected)",
      "COD in mg/L (Current)", "COD in mg/L (Expected)", "DO in mg/L (Current)", "DO in mg/L(Expected)", "TDS in mg/L (Current)",
      "TDS in mg/L(Expected)", "Turbidity in  NTU (Current)", "Turbidity in  NTU(Expected)", "Project Details", "Preparation of  DPR",
      "Completion  of tendering process", "%  of  work completion", "MoHUA Review For UA Wise Status", "MoHUA Review Comments", "MoHUA Review Files"
    ]);
    reuseWater.addRow([
      "State Name", "State Code", "Form Status", "UA Name", "Project Name",
      "Latitude", "Longitude", "Proposed capacity of STP(MLD)", "Proposed water quantity  to be reused(MLD)",
      "Target customers/ consumer for  reuse of  water", "Preparation of  DPR", "Completion of tendering process", "%  of  work completion",
      "MoHUA Review For UA Wise Status", "MoHUA Review Comments", "MoHUA Review Files"
    ]);
    serviceLevelIndicators.addRow([
      "State Name", "State Code", "Form Status", "UA Name", "Project Name", "Physical  Components",
      "Indicator", "Existing  (As- is)", "After  (To-be)", "Estimated  Cost (Amount  in  INR Lakhs)",
      "Preparation of  DPR", "Completion of tendering process", "%  of  work completion",
      "MoHUA Review For UA Wise Status", "MoHUA Review Comments", "MoHUA Review Files"
    ]);

    let counter = { waterBodies: 2, serviceLevelIndicators: 2, reuseWater: 2 } // counter
    if (data?.length) {
      for (let el of data) {

        el = JSON.parse(JSON.stringify(el));
        el = concatenateUrls(el);
        if (!el.formData) {
          el['formStatus'] = "Not Started";
        } else {
          el['formStatus'] = calculateStatus(el?.formData?.status, el?.formData?.actionTakenByRole, el?.formData?.isDraft, formType);

          if ((collectionName === CollectionNames.dur || collectionName === CollectionNames['28SLB']) &&
            loggedInUserRole === "MoHUA" && el.access &&
            !approvedUlbs.some(ulb => ulb.toString() === el.ulbId.toString())) {
            el['cantakeAction'] = false;
            el['formStatus'] === STATUS_LIST['Under_Review_By_MoHUA'] ? el['info'] = sequentialReview : "";
          }
        }

        let rowsArr = [el?.stateName, el?.stateCode, el?.formStatus];
        let sortKeys = { waterBodies, reuseWater, serviceLevelIndicators };
        if (el?.formData) {
          let { uaData } = el?.formData;
          let uaCode = await UA.find({ state: ObjectId(el?.state) }, { UACode: 1 }).lean();
          uaCode = createObjectFromArray(uaCode);
          for (const ua of uaData) {
            let UAName = uaFormData?.length ? uaFormData.find(e => e?._id?.toString() == ua?.ua?.toString()) : null;
            rowsArr[3] = UAName?.name
            for (const key in sortKeys) {
              let projData = ua[key];
              let keysArr = sortKeysWaterSenitation(key)
              for (const proj of projData) {
                let projArr = [];
                for (const k of keysArr) {
                  if (k == "indicator") {
                    let indiData = indicatorLineItems?.length ? indicatorLineItems.find(e => e?.lineItemId?.toString() == proj[k]) : null
                    let indicatorName = indiData ? indiData?.name : ""
                    projArr.push(indicatorName)
                  } else {
                    projArr.push(proj[k])
                  }
                }
                sortKeys[key].addRow([...rowsArr, ...projArr]);
                sortKeys[key].getRow(counter[key])
                counter[key]++
              }
            }
          }
        } else {
          for (const key in sortKeys) {
            sortKeys[key].addRow([...rowsArr]);
            sortKeys[key].getRow(counter[key])
            counter[key]++
          }
        }
      }
    }

    // Create a write stream
    const writeStream = fs.createWriteStream(`${tempFilePath}/${filename}`);
    // Write the stream to the file
    await workbook.xlsx.write(writeStream);
    // Set response headers for downloading the file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader("Content-Disposition", "attachment; filename=" + `${filename}`);
    // Write the stream to the response object
    fs.unlink(`${tempFilePath}/${filename}`, (err) => console.log(err))
    await workbook.xlsx.write(res);
  } catch (error) {
    console.log("CSV Download Error", error);
    return Response.BadRequest(res, {}, error.message);
  }
}

const actionPlanXlsDownload = async (data, res, collectionName, formType, role) => {
  try {
    const tempFilePath = "uploads/excel";
    if (!fs.existsSync(tempFilePath)) {
      fs.mkdirSync(tempFilePath);
    }
    const filename = `${Date.now()}__actionPlan.xlsx`;
    const workbook = new ExcelJS.Workbook();

    const projectExecute = workbook.addWorksheet('Projects to be Executed with 15th FC Grants');
    const sourceFund = workbook.addWorksheet('Project List and Source of Funds (Annual In INR Lakhs)');
    const yearOutlay = workbook.addWorksheet('Year wise Outlay for 15th FC Grants(Annual In INR Lakhs)');

    let uaFormData = await UA.find({}).lean();
    projectExecute.addRow([
      "State Name", "State Code", "Form Status", "UA Name", "Project_Code", "Project_Name", "Project_Details", "Project_Cost", "Executing_Agency", "Parastatal_Agency", "Sector", "Project_Type", "Estimated_Outcome", "Review Status", "MoHUA Comments", "Review Documents"
    ]);
    sourceFund.addRow([
      "State Name", "State Code", "Form Status", "UA Name", "Project_Code", "Project_Code", "XV_FC", "Other", "Total", "2021-22", "2022-23", "2023-24", "2024-25", "2025-26", "Review Status", "MoHUA Comments", "Review Documents"
    ]);
    yearOutlay.addRow([
      "State Name", "State Code", "Form Status", "UA Name", "Project_Code", "Project_Name", "Project_Cost", "Funding", "Amount", "2021-22", "2022-23", "2023-24", "2024-25", "2025-26", "Review Status", "MoHUA Comments", "Review Documents"
    ]);

    let counter = { projectExecute: 2, sourceFund: 2, yearOutlay: 2 } // counter
    if (data?.length) {
      for (let el of data) {
        el = JSON.parse(JSON.stringify(el));
        el = concatenateUrls(el);
        if (!el.formData) {
          el['formStatus'] = "Not Started";
        } else {
          el['formStatus'] = calculateStatus(el?.formData?.status, el?.formData?.actionTakenByRole, el?.formData?.isDraft, formType);

          if ((collectionName === CollectionNames.dur || collectionName === CollectionNames['28SLB']) &&
            loggedInUserRole === "MoHUA" && el.access &&
            !approvedUlbs.some(ulb => ulb.toString() === el.ulbId.toString())) {
            el['cantakeAction'] = false;
            el['formStatus'] === STATUS_LIST['Under_Review_By_MoHUA'] ? el['info'] = sequentialReview : "";
          }
        }
        let rowsArr = [el?.stateName, el?.stateCode, el?.formStatus];
        let sortKeys = { projectExecute, sourceFund, yearOutlay };
        if (el?.formData) {
          let { uaData } = el?.formData;
          let uaCode = await UA.find({ state: ObjectId(el?.state) }, { UACode: 1 }).lean();
          uaCode = createObjectFromArray(uaCode);

          for (const ua of uaData) {
            let UAName = uaFormData?.length ? uaFormData.find(e => e?._id?.toString() == ua?.ua?.toString()) : null
            rowsArr[3] = UAName?.name
            for (const key in sortKeys) {
              let projData = ua[key];
              let keysArr = sortKeysWaterSenitation(key)
              for (const proj of projData) {
                let projArr = [];
                for (const k of keysArr) {
                  if (proj[k] && typeof proj[k] !== 'number') {
                    proj[k] = proj[k].split(',').join(' ')
                  }
                  projArr.push(proj[k])
                }
                sortKeys[key].addRow([...rowsArr, ...projArr]);
                sortKeys[key].getRow(counter[key])
                counter[key]++
              }
            }
          }
        } else {
          for (const key in sortKeys) {
            sortKeys[key].addRow([...rowsArr]);
            sortKeys[key].getRow(counter[key])
            counter[key]++
          }
        }
      }
    }
    // Create a write stream
    const writeStream = fs.createWriteStream(`${tempFilePath}/${filename}`);
    // Write the stream to the file
    await workbook.xlsx.write(writeStream);
    // Set response headers for downloading the file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader("Content-Disposition", "attachment; filename=" + `${filename}`);
    // Write the stream to the response object
    fs.unlink(`${tempFilePath}/${filename}`, (err) => console.log(err))
    await workbook.xlsx.write(res);
  } catch (error) {
    console.log("CSV Download Error", error);
    return Response.BadRequest(res, {}, error.message);
  }
}


const sortKeysWaterSenitation = (key) => {
  switch (key) {
    case 'waterBodies':
      return [
        "name", "nameOfBody", "area", "lat", "long", "bod", "bod_expected", "cod", "cod_expected", "do", "do_expected",
        "tds", "tds_expected", "turbidity", "turbidity_expected", "details", "dprPreparation", "dprCompletion", "workCompletion"
      ]
    case "serviceLevelIndicators":
      return ["name", "component", "indicator", "existing", "after", "cost", "dprPreparation", "dprCompletion", "workCompletion"]
    case "reuseWater":
      return ["name", "lat", "long", "stp", "treatmentPlant", "targetCust", "dprPreparation", "dprCompletion", "workCompletion"]
    case "projectExecute":
      return ["Project_Code", "Project_Name", "Details", "Cost", "Executing_Agency", "Parastatal_Agency", "Sector", "Type", "Estimated_Outcome"]
    case "sourceFund":
      return ["Project_Code", "Project_Name", "Cost", "XV_FC", "Other", "Total", "2021-22", "2022-23", "2023-24", "2024-25", "2025-26"]
    case "yearOutlay":
      return ["Project_Code", "Project_Name", "Cost", "Funding", "Amount", "2021-22", "2022-23", "2023-24", "2024-25", "2025-26"]
    default:
      return []
  }
}

module.exports.createDynamicColumns = createDynamicColumns
module.exports.createDynamicElements = createDynamicElements


// function createDynamicColumns(collectionName) {
//   let columns = ``;
//   switch (collectionName) {
//     case CollectionNames.odf:
//     case CollectionNames.gfc:
//       columns = `Financial Year,Form Status,Created,Submitted On,Filled Status,Rating,Score,Certificate URL,Certificate Name,Certificate Issue Date,State Review Status,State Comments,MoHUA Review Status,MoHUA Comments,State Review File URL,MoHUA Review File URL`;
//       break;
//     case CollectionNames.pfms:
//       columns = `Financial Year,Form Status,Created,Submitted On,Filled Status,Link PFMS,PFMS Account Number,Is Ulb Linked With PFMS,Certificate URL,Certificate Name, Other Doc URL,Other Doc Name,State Review Status,State Comments,MoHUA Review Status,MoHUA Comments,State Review File URL,MoHUA Review File URL `
//       break;
//     case CollectionNames.propTaxUlb:
//       columns = `Financial Year,Form Status,Created,Submitted On,Filled Status,Collecting Property Taxes in 2022-23,Operationalized as per the state notification,Proof of operationalization of Property Tax Collection Process Url,Proof of operationalization of Property Tax Collection Process Name,Property Tax Valuation Method,Property Tax Rate Card Url,Property Tax Rate Card Name,Property Tax Collection for 2019-20,Property Tax Collection for 2020-21,Property Tax Collection for 2021-22,Property Tax Collection Target for 2022-23,Proof for Property Tax collection for 2021-22 Url,Proof for Property Tax collection for 2021-22 Name,State Review Status,State Comments,MoHUA Review Status,MoHUA Comments,State Review File URL,MoHUA Review File URL `
//       break;
//     case CollectionNames.annual:
//       columns = `Financial Year,Form Status,Created,Submitted On,Filled Status,Type, Audited/Provisional Year,Balance Sheet_PDF_URL,Balance Sheet_Excel_URL,Balance Sheet_State Review Status,Balance Sheet_State_Comments,Balance Sheet_MoHUA Review Status,Balance Sheet_MoHUA_Comments,Balance Sheet_Total Amount of Assets,Balance Sheet_Total Amount of Fixed Assets,Balance Sheet_Total Amount of State Grants received,Balance Sheet_Total Amount of Central Grants received,Balance Sheet Schedule_PDF_URL,Balance Sheet Schedule_Excel_URL,Balance Sheet Schedule_State Review Status,Balance Sheet Schedule_State_Comments,Balance Sheet Schedule_MoHUA Review Status,Balance Sheet Schedule_MoHUA_Comments,Income Expenditure_PDF_URL,Income Expenditure_Excel_URL,Income Expenditure_State Review Status,Income Expenditure_State_Comments,Income Expenditure_MoHUA Review Status,Income Expenditure_MoHUA_Comments,Income Expenditure_Total Amount of Revenue,Income Expenditure_Total Amount of Expenses,Income Expenditure Schedule_PDF_URL,Income Expenditure Schedule_Excel_URL,Income Expenditure Schedule_State Review Status,Income Expenditure Schedule_State_Comments,Income Expenditure Schedule_MoHUA Review Status,Income Expenditure Schedule_MoHUA_Comments,Cash Flow Schedule_PDF_URL,Cash Flow Schedule_Excel_URL,Cash Flow Schedule_State Review Status,	Cash Flow Schedule_State_Comments, 	Cash Flow Schedule_MoHUA Review Status	,Cash Flow Schedule_MoHUA_Comments,	Auditor Report PDF_URL,	Auditor Report State Review Status,	Auditor Report State_Comments,	Auditor Report MoHUA Review Status	,Auditor Report MoHUA_Comments ,Financials in Standardized Format_Filled Status	,Financials in Standardized Format_Excel URL,	State Comments if Accounts for 2021-22 is selected No, MoHUA Comments if Accounts for 2021-22 is selected No,State Review File_URL,	MoHUA Review File_URL`;
//       break;
//     case CollectionNames.dur:
//       columns = `Financial Year,Form Status,Created,Submitted On,Filled Status,Tied grants for year,Unutilised Tied Grants from previous installment (INR in lakhs),15th F.C. Tied grant received during the year (1st & 2nd installment taken together) (INR in lakhs),Expenditure incurred during the year i.e. as on 31st March 2021 from Tied grant (INR in lakhs),Closing balance at the end of year (INR in lakhs),WM Rejuvenation of Water Bodies Total Tied Grant Utilised on WM(INR in lakhs),WM Rejuvenation of Water Bodies Number of Projects Undertaken,WM_Rejuvenation of Water Bodies_Total Project Cost Involved,WM_Drinking Water_Total Tied Grant Utilised on WM(INR in lakhs),WM_Drinking Water_Number of Projects Undertaken,WM_Drinking Water_Total Project Cost Involved,WM_Rainwater Harvesting_Total Tied Grant Utilised on WM(INR in lakhs),WM_Rainwater Harvesting_Number of Projects Undertaken,WM_Rainwater Harvesting_Total Project Cost Involved,WM_Water Recycling_Total Tied Grant Utilised on WM(INR in lakhs),WM_Water Recycling_Number of Projects Undertaken,WM_Water Recycling_Total Project Cost Involved,SWM_Sanitation_Total Tied Grant Utilised on SWM(INR in lakhs),SWM_Sanitation_Number of Projects Undertaken,	SWM_Sanitation_Total Project Cost Involved(INR in lakhs),	SWM_Solid Waste Management_Total Tied Grant Utilised on SWM(INR in lakhs),	SWM_Solid Waste Management_Number of Projects Undertaken,	SWM_Solid Waste Management_Total Project Cost Involved(INR in lakhs),	Name, Designation, State_Review Status,	State_Comments,	MoHUA Review Status,	MoHUA_Comments,	State_File URL,	MoHUA_File URL `
//       break;
//     case CollectionNames['28SLB']:
//       columns = `Financial Year,Form Status,Created,Submitted On,Filled Status, Type, Year, Coverage of water supply connections,Per capita supply of water(lpcd),Extent of metering of water connections,Continuity of water supply,Quality of water supplied,Efficiency in redressal of customer complaints,Cost recovery in water supply service,Efficiency in collection of water supply-related charges,Extent of non-revenue water (NRW),Coverage of toilets,Coverage of waste water network services,Collection efficiency of waste water network,Adequacy of waste water treatment capacity,Quality of waste water treatment,Extent of reuse and recycling of waste water,Efficiency in collection of waste water charges,Efficiency in redressal of customer complaints,Extent of cost recovery in waste water management,Household level coverage of solid waste management services,Extent of segregation of municipal solid waste,Extent of municipal solid waste recovered,Extent of cost recovery in SWM services,Efficiency in collection of SWM related user related charges,Efficiency of collection of municipal solid waste,Extent of scientific disposal of municipal solid waste,Efficiency in redressal of customer complaints,Incidence of water logging,Coverage of storm water drainage network,State_Review Status,State_Comments,MoHUA Review Status,MoHUA_Comments,State_File URL,MoHUA_File URL `
//       break;
//     case CollectionNames.propTaxState:
//       columns = `Financial Year,Form Status,Created, Submitted On,Filled Status,Notification Url , Notfication Name, Act Page Number,Minimum Floor Rate Url, Minimum Floor Rate Name,  Operationalization of the notification Url, Operationalization of the notification Name, Number of extant acts for municipal bodies, Names of all the extant acts, Extant Acts Url, Extant Acts Name, MoHUA Review Status, MoHUA Comments, MoHUA file Url`
//       break;
//     case CollectionNames.sfc:
//       columns = `Financial Year,Form Status,Created, Submitted On,Filled Status, Constituted State Finance Commission,  State Act/GO/Notification Url, State Act/GO/Notification Name , MoHUA Review Status, MoHUA Comments, MoHUA file Url`
//       break;
//     case CollectionNames.state_gtc:
//       columns = `Financial Year,Form Status,Created,Submitted On,Filled Status, Type, File Url, File Name,  MoHUA Review Status, MoHUA Comments, MoHUA file Url `
//       break;
//     default:
//       columns = '';
//       break;
//   }
//   return columns;
// }
