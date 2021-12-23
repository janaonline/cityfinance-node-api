const express = require( 'express' );
const router = express.Router();
const verifyToken = require( '../auth/services/verifyToken' ).verifyToken;
const { addScoreQuestion , getAddScoreQuestion} = require( './service' );

router.post("/scorePerformance", addScoreQuestion)
router.get("/scorePerformance", getAddScoreQuestion)
// router.post("/scorePerformanceQuestion", addScorePerformanceQuestion)

module.exports = router;