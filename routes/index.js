const express = require('express');
const router = express.Router();

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
router.use('/users', User);

module.exports = router;