const express = require('express');
const router = express.Router();

const lookupService = require('../service/lookup_service');

// Get state list
router.get('/states', (req, res, next)=>{
	res.json({
		success: true,
		msg: 'State List',
		data: lookupService.getStateList()
	})
});

// Get ULBs by state
router.get('/states/:stateCode/ulbs', (req, res, next)=>{
	if(! req.params.stateCode){
		res.json({success:false, msg:'State field required'});
	}
	res.json({success:true, data: lookupService.getUlbsByState(req.params.stateCode), msg:'Success'})
});

router.get('/ulbs', (req, res, next)=>{
	res.json({success:true, data: lookupService.getAllUlbs(), msg:'Success'})
});


module.exports = router;