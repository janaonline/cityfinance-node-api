const UlbType = require('../../models/UlbType');
const service = require('../../service');
module.exports.get = async function(req,res) {
    // Get any ulb type
    // UlbType is model name
    let query = {};
    query["isActive"] = true;
    service.find(query,UlbType,function(response,value){
        return res.status(response ? 200 : 400).send(value);
    });

}
module.exports.put = async function(req,res) {
    req.body['modifiedAt'] = new Date();
    let condition = {
        _id : req.params._id
    };
    // Edit any ulb type
    // UlbType is model name
    service.put(condition,req.body,UlbType,function(response,value){
        return res.status(response ? 200 : 400).send(value);
    });

}
module.exports.post = async function(req,res) {
    // Create any ulb type
    // UlbType is model name
    service.post(UlbType,req.body,function(response,value){
        return res.status(response ? 200 : 400).send(value);
    });
}
module.exports.delete = async function(req,res) {
    let condition = {
        _id : req.params._id
    },update = {
        isActive : false
    };
    // Delete any ulb type
    // UlbType is model name
    service.put(condition,update,UlbType,function(response,value){
        return res.status(response ? 200 : 400).send(value);
    });
}