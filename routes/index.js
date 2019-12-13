const express = require('express');
const router = express.Router();

const passport = require('passport');
const userService = require('../service/user_service');
const Constants = require('../_helper/constants');
const ulbUploadService = require("../service/ulb-upload")
const State = require("../models/Schema/State");

router.get('/state', passport.authenticate('jwt', {session: false}), State.get);
router.put('/state/:_id', passport.authenticate('jwt', {session: false}), State.put);
router.post('/state', passport.authenticate('jwt', {session: false}), State.post);
router.delete('/state/:_id', passport.authenticate('jwt', {session: false}), State.delete);

const UlbType = require("../models/Schema/UlbType");

router.get('/UlbType', passport.authenticate('jwt', {session: false}), UlbType.get);
router.put('/UlbType/:_id', passport.authenticate('jwt', {session: false}), UlbType.put);
router.post('/UlbType', passport.authenticate('jwt', {session: false}), UlbType.post);
router.delete('/UlbType/:_id', passport.authenticate('jwt', {session: false}), UlbType.delete);


const Ulb = require("../models/Schema/Ulb");

router.get('/Ulb', passport.authenticate('jwt', {session: false}), Ulb.get);
router.put('/Ulb/:_id', passport.authenticate('jwt', {session: false}), Ulb.put);
router.post('/Ulb', passport.authenticate('jwt', {session: false}), Ulb.post);
router.delete('/Ulb/:_id', passport.authenticate('jwt', {session: false}), Ulb.delete);
router.post('/bulk/ulb-upload',(req, res, next) => {
    ulbUploadService.create(req, res);
});

const BulkUpload = require("./bulk-upload");
router.post("/getS3Url", BulkUpload.S3Url);
router.post("/processData", BulkUpload.processData);
router.get("/getProcessStatus/:_id", BulkUpload.getProcessStatus);

const LineItem = require("../models/Schema/LineItem");

router.get('/LineItem', passport.authenticate('jwt', {session: false}), LineItem.get);
router.put('/LineItem/:_id', passport.authenticate('jwt', {session: false}), LineItem.put);
router.post('/LineItem', passport.authenticate('jwt', {session: false}), LineItem.post);
router.delete('/LineItem/:_id', passport.authenticate('jwt', {session: false}), LineItem.delete);
const finacialParamsRoutes = require("../routes/financial-parameter/route");
router.use("/financial-parameter",finacialParamsRoutes);
module.exports = router;
