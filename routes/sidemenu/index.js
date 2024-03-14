const express = require('express');
const router = express.Router();

const verifyToken = require('../auth/services/verifyToken').verifyToken;
const Sidemenu = require('./service')

//get 
router.get(
    '/menu',
    verifyToken,
    Sidemenu.get
);

router.get(
    '/menulist',
    verifyToken,
    Sidemenu.list
);


//post
router.post(
    '/menu',
    verifyToken,
    Sidemenu.post
);


//update
router.put(
    '/menu',
    verifyToken,
    Sidemenu.put
);

//delete
router.delete(
    '/menu',
    verifyToken,
    Sidemenu.delete
);

module.exports = router;