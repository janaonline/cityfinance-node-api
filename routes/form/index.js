const express = require("express");
const router = express.Router();
const formService = require("./service");
const verifyToken = require("../auth/services/verifyToken").verifyToken;

router.post('/dataCollectionForm', formService.post);
router.get('/dataCollectionDeFunct', formService.defunc);
router.get('/dataCollectionForm', verifyToken, formService.get);
router.get("/dataCollectionForm/check", formService.check);
module.exports = router;
