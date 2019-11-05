const downloadLogModel = require('../models/download_log_model');



module.exports.getAll = function (req, res) {
    downloadLogModel.getAll({}, (err, out) => {
        if (err) {
            res.json({success: false, msg: 'Invalid Payload', data: err.toString() });
        }
        res.json({success: true, msg: 'Success', data: out });
    })
};

module.exports.addLog = function(req, res){
    let newLog = new downloadLogModel({
		particular: req.body.particular,
		mobile: req.body.mobile,
		email: req.body.email,
		isUserExist: req.body.isUserExist
	});

	downloadLogModel.addLog(newLog, (err, user)=>{
		if(err){
			res.json({success:false, msg:'Failed to log'});
		}else{
			res.json({success:true, msg:'Log registered'})
		}
	});
};


