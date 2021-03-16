const express = require('express');
const router = express.Router();
// @Base Url
router.use((req, res, next) => {
    req['currentUrl'] = `${req.protocol + '://' + req.headers.host}`;
    next();
});
// @Auth
const Auth = require('./auth');
router.use(Auth);

// @FinancialYear
const FinancialYear = require('./financial-year');
router.use(FinancialYear);

// @State
const State = require('./state');
router.use(State);

// @ULBType
const UlbType = require('./ulb-type');
router.use(UlbType);

// @ULB
const Ulb = require('./ulb');
router.use(Ulb);

// @ULBUPDATEREQUEST
const ulbUpdateRequest = require('./ulb-update-request');
router.use('/ulb-update-request', ulbUpdateRequest);
// @ULBFINANCIALDATA
const ulbFinancialData = require('./ulb-financial-data');
router.use('/ulb-financial-data', ulbFinancialData);

/**
 * @description Routes for 15th FC Forms
 */
const fcFormData = require('./xv-fc-form');
router.use('/xv-fc-form', fcFormData);

// @LineItem
const LineItem = require('./line-item');
router.use(LineItem);

// @BondIssuerItem
const BondIssuerItem = require('./bond-issuer-item');
router.use(BondIssuerItem);

// @Bulk-Upload
const BulkUploadRoute = require('./bulk-upload');
router.use(BulkUploadRoute);

// @Report
const ReportRoutes = require('./report');
router.use('/report', ReportRoutes);

// @Fileupload
const fileUploadRoutes = require('./file-upload');
router.use(fileUploadRoutes);

// @Downloadlog
const DownloadLog = require('./download-log');
router.use(DownloadLog);

// @Ledger
const Ledger = require('./ledger');
router.use('/ledger', Ledger);

// @User
const User = require('./user');
router.use('/user', User);

// @form
const Form = require('./form');
router.use(Form);

module.exports = router;
