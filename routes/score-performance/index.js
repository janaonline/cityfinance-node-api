const express = require( 'express' );
const router = express.Router();
const verifyToken = require( '../auth/services/verifyToken' ).verifyToken;
const { addScoreQuestion , getAddScoreQuestion, postQuestionAnswer, getPostedAnswer, getAnswerByUlb} = require( './service' );

router.post("/scorePerformance", addScoreQuestion)
router.get("/scorePerformance", getAddScoreQuestion)
router.get("/scorePerformanceQuestionAnswer", getPostedAnswer)
router.post( "/scorePerformanceQuestionAnswer", postQuestionAnswer )
router.get("/scorePerformanceByUlb", getAnswerByUlb)

module.exports = router;