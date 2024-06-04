const express = require('express');
const router = express.Router();
const passport = require('passport');
const verifyToken = require('../auth/services/verifyToken').verifyToken;
const xviFcService = require('./service');
const Constants = require('../../_helper/constants');

router.post('/onboard', passport.authenticate('jwt', { session: false }), (req, res, next) => {
    if (req.user.role === Constants.USER.ONBOARD_AUTHORITY) {
        userService.register(req, res);
    } else {
        res.json({ success: false, msg: 'Unauthorized user' });
    }
});

// router.post('/', verifyToken, xviFcService.get);
router.post('/create_tabs', xviFcService.createxviFcFormTabs);
router.post('/create_formJson', xviFcService.createxviFcFormJson);
router.get('/fetch_form', xviFcService.getForm);
router.post('/saveAsDraft', xviFcService.saveAsDraftForm);
router.post('/submit_form', xviFcService.submitFrom);

module.exports = router;