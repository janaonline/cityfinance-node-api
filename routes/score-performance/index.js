const express = require( 'express' );
const router = express.Router();
const { addScoreQuestion , getAddScoreQuestion, postQuestionAnswer, getPostedAnswer, getAnswerByUlb} = require( './service' );

router.post("/scorePerformance", addScoreQuestion)
router.get("/scorePerformance", getAddScoreQuestion)
router.get("/scorePerformanceQuestionAnswer", getPostedAnswer)
router.post( "/scorePerformanceQuestionAnswer", postQuestionAnswer )
router.get("/scorePerformanceByUlb/:ulbId", getAnswerByUlb)

module.exports = router;