const stateModel = require('../models/state_list');
const ulbModel = require('../models/ulb_list');


module.exports.getStateList = function(){
    return stateModel.getStateList();
}

module.exports.getUlbsByState = function(stateCode){
    return ulbModel.getByState(stateCode);
}

module.exports.getUlbInfo = function(stateCode, ulbCode){
    return ulbModel.getUlbInfo(stateCode, ulbCode);
}

module.exports.getAllUlbs = function(){
    return ulbModel.getAllUlbs();
}
