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

router.post('/create_tabs', verifyToken, xviFcService.createxviFcFormTabs);
router.post('/create_formJson', verifyToken, xviFcService.createxviFcFormJson);
router.get('/fetch_form', verifyToken, xviFcService.getForm);
router.post('/saveAsDraft', verifyToken, xviFcService.saveAsDraftForm);
router.post('/submit_form', verifyToken, xviFcService.submitFrom);

router.post('/form_list', verifyToken, xviFcService.formList);

router.post('/approve', verifyToken, xviFcService.approveUlbForms);
router.post('/reject', verifyToken, xviFcService.rejectUlbForms);

router.get('/progressReport', verifyToken, xviFcService.progressReport);

module.exports = router;