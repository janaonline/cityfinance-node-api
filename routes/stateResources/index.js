const express = require('express');
const router = express.Router();
const { handleDatabaseUpload, getMainCategory, getResourceList } = require('./service');

const {
    createOrUpdate, list, deleteById
} = require("../../service/crud");


router.get('/getCategories', getMainCategory)
router.get('/getResourceList', getResourceList);
router.get('/list', list('CategoryFileUpload', { module: 'state_resource' }));
router.post('/createOrUpdate', handleDatabaseUpload, createOrUpdate('CategoryFileUpload', { module: 'state_resource' }))
router.delete('/deleteById/:id', deleteById('StateResource'))

module.exports = router;