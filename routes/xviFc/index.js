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
router.get('/fetch_form1', xviFcService.getForm1);
router.post('/create_tabs', xviFcService.createxviFcForm1Tabs);
router.post('/create_formJson', xviFcService.createxviFcForm1Json);
router.post('/submit_form1', xviFcService.submitFrom1);


module.exports = router;