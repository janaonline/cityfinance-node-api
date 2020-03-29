const express = require('express');
const router = express.Router();
const passport = require('passport');

const userService = require('./service');
const Constants = require('../../_helper/constants');

// Register User
router.post('/signup', (req, res, next)=>{
    req.body.role = Constants.USER.DEFAULT_ROLE;
    userService.register(req, res);
});

// Onboard User
router.post('/onboard', passport.authenticate('jwt', {session: false}), (req, res, next)=>{
    if(req.user.role === Constants.USER.ONBOARD_AUTHORITY){
        userService.register(req, res);
    } else{
        res.json({success:false, msg:'Unauthorized user'});
    }
});

// Authenticate User
router.post('/signin', (req, res, next)=>{
    userService.authenticate(req, res);
});

router.post('/getAll', (req, res, next)=>{
    userService.getAll(req, res);
});

router.put('/update', (req, res, next) => {
    userService.update(req, res);
})

//Profile
router.get('/profile', passport.authenticate('jwt', {session: false}), (req, res, next)=>{
    res.json({user: req.user});
});

//Validate
router.get('/validate', (req, res, next)=>{
    res.send('Validate');
});
module.exports = router;