const awsService = require("../../service/s3-services");
module.exports = function(req, res, next){
    if(req.body && Array.isArray(req.body)){
        let finalArray = [];
        let prmsArr = [];
        for(single of req.body){
            var promise = new Promise((resolve, reject)=>{
                awsService.generateSignedUrl(single,function(err,data){
                    var mergeData = Object.assign(single,data);
                    finalArray.push(mergeData);
                    resolve();
                })
            });
            prmsArr.push(promise);
        }
        Promise.all(prmsArr).then(values => {
            return res.status(200).json({success: true, data: finalArray});
        })
    }else{
        return res.status(400).json({success: false, data: req.body});
    }
};
