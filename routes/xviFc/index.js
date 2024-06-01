// Multiple routes - multiple operations - index of a book.
const express = require('express'); //Framework - structure is provided by this - routers...
const router = express.Router();
const passport = require('passport'); //Library - authenticate token.
const verifyToken = require('../auth/services/verifyToken').verifyToken;
const xviFcService = require('./service');
const Constants = require('../../_helper/constants');

// Onboard User - Token
router.post('/onboard', passport.authenticate('jwt', { session: false }), (req, res, next) => {
    if (req.user.role === Constants.USER.ONBOARD_AUTHORITY) {
        userService.register(req, res);
    } else {
        res.json({ success: false, msg: 'Unauthorized user' });
    }
});


// router.post('/', verifyToken, xviFcService.get);
router.get('/fetch_form', xviFcService.getForm);
router.post('/create_tabs', xviFcService.createxviFcForm1Tabs);
router.post('/create_formJson', xviFcService.createxviFcForm1Json);
router.post('/create_formJson2', xviFcService.createxviFcForm2Json);
router.post('/saveAsDraft_form1', xviFcService.saveAsDraftForm1);
router.post('/submit_form1', xviFcService.submitForm1);
router.post('/saveAsDraft_form2', xviFcService.saveAsDraftForm2);
router.post('/submit_form2', xviFcService.submitFrom2);


module.exports = router;