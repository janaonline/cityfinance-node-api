const express = require('express');
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')
const multer = require('multer');

const { getAll, get2223,getUAByuaCode,getRelatedUAFile,addUAFile,getInfrastructureProjects,getInfProjectsWithState, bulkUpload } = require('./service')
const { create } = require('./service')
const { update } = require('./service')

// Set up multer to handle file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/'); // Choose the directory where uploaded files will be stored
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname); // Use the original file name
    },
  });

 const upload = multer({ storage: storage });


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
router.get('/amrut-bulk-upload', upload.single('file'), bulkUpload);


module.exports = router;