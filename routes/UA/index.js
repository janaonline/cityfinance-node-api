const express = require('express');
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')

const { getAll, get2223,getUAByuaCode,getRelatedUAFile,addUAFile,getInfrastructureProjects,getInfProjectsWithState } = require('./service')
const { create } = require('./service')
const { update } = require('./service')


router.get('/getAll', verifyToken, getAll)
router.get('/get2223', get2223)
router.get("/getUA/:uaCode",getUAByuaCode)
router.get('/getUAfile',getRelatedUAFile)
router.post("/addUAfile",addUAFile)
router.put('/update', update)
router.post('/create', verifyToken, create)
router.get("/getUA/:uaCode",getUAByuaCode)
router.get('/getUAfile',getRelatedUAFile)
router.post("/addUAfile",addUAFile)
router.get("/get-mou-project/:ulbId",getInfrastructureProjects)
router.get("/get-projects",getInfProjectsWithState)


module.exports = router;