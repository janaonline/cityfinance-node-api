const express = require("express");
const morgan = require("morgan");
const { logger } = require("../middlewares/loggermiddleware")
const { verifyToken } = require("./auth/services/verifyToken");

const router = express.Router();
// @Base Url
router.use((req, res, next) => {
  req["currentUrl"] = `${req.protocol + "://" + req.headers.host}`;
  next();
});

// @Morgan logger
router.use(logger.setResponseBody)
morgan.token('request', function (req, res) {
  try {
    logger.createLog(req, res)
  }
  catch (err) {
    console.log("token not created ::", err.message)
  }
})
router.use(morgan(":request"))

// @Auth
const Auth = require("./auth");
router.use(Auth);

// @Annual accounts
const AnnualAccountData = require("./annual-accounts");
router.use("/annual-accounts", AnnualAccountData);

//@PFMS Account
const PFMSAccountData = require("./pfmsAccount");
router.use("/pfmsAccount", PFMSAccountData);

const MasterFormData = require("./masterForm");
router.use("/masterForm", MasterFormData);

const UAData = require("./UA");
router.use("/UA", UAData);

// @FinancialYear
const FinancialYear = require("./financial-year");
router.use(FinancialYear);

// @State
const State = require("./state");
router.use(State);

// @ULBType
const UlbType = require("./ulb-type");
router.use(UlbType);

// @ULB
const Ulb = require("./ulb");
router.use(Ulb);

// @ULBUPDATEREQUEST
const ulbUpdateRequest = require("./ulb-update-request");
router.use("/ulb-update-request", ulbUpdateRequest);
// @ULBFINANCIALDATA
const ulbFinancialData = require("./ulb-financial-data");
router.use("/ulb-financial-data", ulbFinancialData);

/**
 * @description Routes for 15th FC Forms
 */
const fcFormData = require("./xv-fc-form");
router.use("/xv-fc-form", fcFormData);

// @LineItem
const LineItem = require("./line-item");
router.use(LineItem);

// @BondIssuerItem
const BondIssuerItem = require("./bond-issuer-item");
router.use(BondIssuerItem);

// @Bulk-Upload
const BulkUploadRoute = require("./bulk-upload");
router.use(BulkUploadRoute);

// @Report
const ReportRoutes = require("./report");
router.use("/report", ReportRoutes);

// @Fileupload
const fileUploadRoutes = require("./file-upload");
router.use(fileUploadRoutes);

// @Downloadlog
const DownloadLog = require("./download-log");
router.use(DownloadLog);

// @Ledger
const Ledger = require("./ledger");
router.use("/ledger", Ledger);

// @User
const User = require("./user");
router.use("/user", User);

// @form
const Form = require("./form");
router.use(Form);

// @category
const Category = require("./category");
router.use(Category);

// // @report
const UtilizationReport = require("./utilization-report");
router.use(UtilizationReport);

//////  
router.get("/emailTrigger", require("../cronjob/stateEmail").emailTrigger);

// // @logs
const SaveLogs = require("./xvfc-grant-request-logs");
router.use(SaveLogs);

// // @Plans
const plans = require("./xvfc-grant-plans");
router.use(plans);

// // @Grant Claims
const grantClaim = require("./grant-claim");
router.use(grantClaim);

// // @xvfc form submit
const submit = require("./xvfc-form-submit");
router.use(submit);

//@Grant Distribution
const grantDistribution = require("./grant-distribution");
router.use("/grantDistribution", grantDistribution);

//STATE FORMS
const StateGTCertificate = require("./State-Forms");
router.use(StateGTCertificate);

//state dashboard
const dashboard = require("./fvcStateDashboard");
router.use("/dashboard", dashboard);

//WaterRejenuvation
const WaterRejenuvation = require("./waterRejenuvation");
router.use(WaterRejenuvation);

//ActionPlans
const ActionPlans = require("./ActionPlans");
router.use(ActionPlans);

//LinkPfmsState
const LinkPfmsState = require("./LinkPfmsState");
router.use(LinkPfmsState);


//tabs
const Tabs = require("./Tabs");
router.use(Tabs)

//SideMenu
const Sidemenu = require("./sidemenu");
router.use(Sidemenu);

const StateMasterForm = require("./stateMasterForm");
router.use('/stateMasterForm', StateMasterForm);

const MoHUADashboard = require("./mohua-dashboard");
router.use('/mohua', MoHUADashboard);

const GrantTransferMohua = require("./grantTransferMohua");
router.use(GrantTransferMohua);

const dashboardMaster = require("./DashboardMaster");
router.use(dashboardMaster);

const dashboardHeaders = require("./DashboardHeaders");
router.use(dashboardHeaders);

const searchKeyword = require("./search-keyword");
router.use(searchKeyword);

const recentSearch = require("./recent-search-keyword");
router.use(recentSearch);

const newDashboards = require("./newDashboards");
router.use(newDashboards);

const scorePerformance = require("./score-performance");
router.use(scorePerformance)

const fileUpload = require("./fileUpload");
router.use(fileUpload);

const resourceDashboard = require("./resourceDashboard");
router.use("/resourceDashboard", resourceDashboard);

//form-ratings
const Rating = require('./Ratings');
router.use('/ratings', Rating);

//Gfc-odf-form-Collection
const GfcOdfFormCollection = require('./gfc-odf-form-collection');
router.use('/gfc-odf-form-collection', GfcOdfFormCollection);

// Link-PFMS
const LinkPFMS = require('./LinkPfms');
router.use('/link-pfms', LinkPFMS);

//Common-Action API
const CommonActionAPI = require('./CommonActionAPI');
router.use('/common-action', CommonActionAPI);

//forms-master
// const FormsMaster = require('./FormsMaster');
// router.use('/forms-master', FormsMaster);
//forms-master category
// const FormsMasterCategory = require('./FormsMasterCategory');
// router.use('/forms-master-category', FormsMasterCategory);

//property-tax-floor-rate
const PropertyTaxFloorRate = require('./PropertyTaxFloorRate');
router.use('/property-tax-floor-rate', PropertyTaxFloorRate);

//state-finance-commission-formation
const StateFinanceCommissionFormation = require('./state-finance-commission-formation');
router.use('/state-finance-commission-formation', StateFinanceCommissionFormation);

//calculate-recommendation
const calculateRecommendation = require('./Scoring');
router.use('/calculate-recommendation', calculateRecommendation);

//grant-transfer-certificate
const GrantTransferCertificate = require('./GrantTransferCertificate');
router.use('/grant-transfer-certificate', GrantTransferCertificate);

//28-slbs
const TwentyEightSlbsForm = require('./TwentyEightSlbsForm');
router.use('/28-slbs', TwentyEightSlbsForm);

//dashboard
const FormDashboard = require('./FormDashboard');
router.use('/dashboard', FormDashboard);

//Property Tax Operationalisation
const PropertyTaxOp = require('./PropertyTaxOp');
router.use('/propTaxOp', PropertyTaxOp);

//Property Tax Operationalisation DropDown
const PropertyTaxOpDropDown = require('./PropertyTaxOpDropdown');
router.use('/propTaxOpDropDown', PropertyTaxOpDropDown);

const indicatorLineItem = require("./indicatorLineItem");
router.use("/indicatorLineItem", indicatorLineItem);


const FRHomePageContent = require("./FRHomePageContent");
router.use("/FRHomePageContent", FRHomePageContent);

const review = require("./review");
router.use(review);

// @getS3Url
const getS3Url = require("../service/getS3Url");
router.post("/getS3Url", getS3Url);

// @getBlobUrl
const getBlobUrl = require("../service/getBlobUrl");
router.post("/getBlobUrl", getBlobUrl);

//deletefile
const DeleteFileApi = require('./DeleteFileApi');
router.use('/deleteFile', DeleteFileApi);

const FiscalRanking = require('./FiscalRanking');
router.use('/fiscal-ranking', FiscalRanking);

router.use(require('./s3ServerFile'));

const FormJson = require("./FormJsons")
router.use('/form-json', FormJson)

const CommonHistory = require('./CommonHistory')
router.use('/common-history', CommonHistory)
const MasterStatus = require('./MasterStatus');
router.use('/master-status', MasterStatus)

const MasterSkipValue = require('./MasterSkipValues');
router.use('/master-skip-value', MasterSkipValue)

const MunicipalityBudgets = require("./MunicipalityBudgets");
router.use('/municipality-budgets', MunicipalityBudgets);

/* Link Record to store links data*/
const LinkRecord = require('./LinkRecord');
router.use('/link-record', LinkRecord)

const stateResources = require("./stateResources");
router.use('/state-resources', verifyToken, stateResources);

const generalAlerts = require("./generalAlerts")
router.use('/general-alert', generalAlerts);

//calculate fiscal ranking score
const scoringFR = require('./scoringFR');
router.use('/scoring-fr', scoringFR);

router.use(require('./Master'))

module.exports = router;
