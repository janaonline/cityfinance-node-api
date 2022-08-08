const express = require('express');
const router = express.Router();
const passport = require('passport');
const verifyToken = require('../auth/services/verifyToken').verifyToken;
const userService = require('./service');
const Constants = require('../../_helper/constants');

// Onboard User
router.post('/onboard', passport.authenticate('jwt', { session: false }), (req, res, next) => {
    if (req.user.role === Constants.USER.ONBOARD_AUTHORITY) {
        userService.register(req, res);
    } else {
        res.json({ success: false, msg: 'Unauthorized user' });
    }
});


router.post('/', verifyToken, userService.get);
router.post('/all', verifyToken, userService.getAll);
router.get('/all', verifyToken, userService.getAll);
router.get('/nodal/:_id', userService.getNodalOfficers)
router.put('/profile', verifyToken, userService.profileUpdate)
router.put('/profile/:_id', verifyToken, userService.profileUpdate)


router.post('/verify', verifyToken,userService.userVerification2223)

//Profile
router.get('/profile', verifyToken, userService.profileGet);

// @Create
router.post('/create', verifyToken, userService.create);

// @Delete
router.delete('/:_id', verifyToken, userService.delete);
// @Ulb SignUp action
router.put('/ulb-status/:_id', verifyToken, userService.ulbSignupAction);
module.exports = router;