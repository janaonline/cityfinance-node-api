const express = require('express');
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')

const { getAll, get2223 ,getRelatedUAFile,addUAFile,getUAByuaCode} = require('./service')
const { create } = require('./service')
const { update } = require('./service')


router.get('/getAll', verifyToken, getAll)
router.get('/get2223', get2223)
router.get("/getUA/:uaCode",getUAByuaCode)
router.get('/getUAfile',getRelatedUAFile)
router.post("/addUAfile",addUAFile)
router.put('/update', update)
router.post('/create', verifyToken, create)


module.exports = router;