const express = require('express');
const router = express.Router();
const { 
    handleDatabaseUpload, 
    getResourceList, 
    removeStateFromFiles,
    getCategoryWiseResource,
    getTemplate
} = require('./service');

const {
    createOrUpdate
} = require("../../service/crud");


router.get('/getResourceList', getResourceList);
router.get('/list',  getCategoryWiseResource );
// router.post('/createOrUpdate', handleDatabaseUpload);//, createOrUpdate('CategoryFileUpload', { module: 'state_resource' }));
router.post('/createOrUpdate', handleDatabaseUpload, createOrUpdate('CategoryFileUpload', { module: 'state_resource' }));

router.get('/template/:templateName', getTemplate);

router.post('/removeStateFromFiles',  removeStateFromFiles );


module.exports = router;