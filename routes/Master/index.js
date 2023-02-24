const express = require('express');
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')
const ObjectId = require("mongoose").Types.ObjectId;
// const =('mongoose').Types.ObjectId;
const { categoryList, subCategoryList, categoryFileUploadList } = require('./service');
const {
    create, update
} = require("../../service/crud");

router.post('/main_category/create', verifyToken, create("MainCategory"))
router.put('/main_category/update/:_id', verifyToken, (req, res, next) => {
    if (!req.params._id) {
        return res.status(400).json({ status: false, message: "Invalid Request", err: {} });
    }
    next();
}, update("MainCategory", "_id"))

router.post('/sub_category/create', verifyToken, create("SubCategory"))
router.put('/sub_category/update/:_id', verifyToken, (req, res, next) => {
    if (!req.params._id) {
        return res.status(400).json({ status: false, message: "Invalid Request", err: {} });
    }
    next();
}, update("SubCategory", "_id"))

router.get('/main_category/list', categoryList)
router.get('/sub_category/list', subCategoryList)
router.get('/municipalBondRepository/list', categoryFileUploadList);
router.post('/municipalBondRepository/create',verifyToken,create("CategoryFileUpload"));
module.exports = router;