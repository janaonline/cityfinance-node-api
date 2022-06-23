const express = require("express");
const router = express.Router();
// @Base Url
router.use((req, res, next) => {
  req["currentUrl"] = `${req.protocol + "://" + req.headers.host}`;
  next();
});
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
router.use( newDashboards );

const scorePerformance = require( "./score-performance" );
router.use(scorePerformance)

const fileUpload = require("./fileUpload");
router.use(fileUpload);

const resourceDashboard = require("./resourceDashboard");
router.use("/resourceDashboard", resourceDashboard);

//form-ratings
const Rating = require('./Ratings');
router.use('/ratings', Rating);

//Gfc-form-Collection
const GfcOdfFormCollection = require('./gfc-odf-form-collection');
router.use('/gfc-odf-form-collection', GfcOdfFormCollection);

// //Link-PFMS
// const LinkPFMS = require('./LinkPfms');
// router.use('/link-pfms', LinkPFMS);

// //form-master
// const FormMaster = require('./FormMaster');
// router.use('/form-master', FormMaster);

const indicatorLineItem = require("./indicatorLineItem");
router.use("/indicatorLineItem", indicatorLineItem);

module.exports = router;
