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
const { allowedRoles } = require('../auth/services/roleAuthorize');


router.get('/getResourceList', allowedRoles(['MoHUA', 'PMU']), getResourceList);
router.get('/list', allowedRoles(['STATE']), getCategoryWiseResource);
router.post('/createOrUpdate', allowedRoles(['MoHUA', 'PMU']), handleDatabaseUpload, createOrUpdate('CategoryFileUpload', { module: 'state_resource' }));

router.get('/template/:templateName', allowedRoles(['MoHUA', 'PMU']), getTemplate);

router.post('/removeStateFromFiles', allowedRoles(['MoHUA', 'PMU']), removeStateFromFiles);


module.exports = router;