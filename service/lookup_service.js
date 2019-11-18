const stateModel = require('../models/Schema/State');
const ulbModel = require('../models/Schema/Ulb');


module.exports.getUlbsByState = function(stateCode){
    return ulbModel.getByState(stateCode);
}

module.exports.getUlbInfo = function(stateCode, ulbCode){
    return ulbModel.getUlbInfo(stateCode, ulbCode);
}

module.exports.getAllUlbs = function(){
    return ulbModel.getAllUlbs();
}
