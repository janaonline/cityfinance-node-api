const express = require('express');
const router = express.Router();
const passport = require('passport');
const verifyToken = require('../auth/service').verifyToken;
const userService = require('./service');
const Constants = require('../../_helper/constants');

// Onboard User
router.post('/onboard', passport.authenticate('jwt', {session: false}), (req, res, next)=>{
    if(req.user.role === Constants.USER.ONBOARD_AUTHORITY){
        userService.register(req, res);
    } else{
        res.json({success:false, msg:'Unauthorized user'});
    }
});


router.post('/', verifyToken,userService.get);
router.put('/profile', verifyToken, userService.profileUpdate)

//Profile
router.get('/profile', verifyToken, userService.profileGet);

// @Create
router.post('/create',verifyToken, userService.create);
//Validate
router.get('/validate', (req, res, next)=>{
    res.send('Validate');
});
module.exports = router;