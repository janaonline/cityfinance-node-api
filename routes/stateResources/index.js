const express = require('express');
const router = express.Router();
const {
    handleDatabaseUpload,
    getResourceList,
    removeStateFromFiles,
    getCategoryWiseResource,
    getTemplate,
    createOrUpdate
} = require('./service');

const { allowedRoles } = require('../auth/services/roleAuthorize');


router.get('/getResourceList', allowedRoles(['MoHUA', 'PMU']), getResourceList);
router.get('/list/:stateId?', allowedRoles(['STATE', 'MoHUA']), getCategoryWiseResource);
router.post('/createOrUpdate', allowedRoles(['MoHUA', 'PMU']), handleDatabaseUpload, createOrUpdate);

router.get('/template/:templateName', allowedRoles(['MoHUA', 'PMU']), getTemplate);

router.post('/removeStateFromFiles', allowedRoles(['MoHUA', 'PMU']), removeStateFromFiles);


module.exports = router;