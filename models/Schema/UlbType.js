require('./dbConnect');
const service = require("../../service");

var UlbTypeSchema = new Schema({
    name: { type: String, required: true },
    modifiedAt : { type: Date, default : Date.now() },
    createdAt : { type: Date, default : Date.now() },
    isActive : { type  : Boolean, default : 1 },
},{timestamp : {createdAt : "createdAt", updatedAt : "modifiedAt"}});


UlbTypeSchema.index(
    { 
        name : 1,
        isActive: 1
    },
    { 
        unique: true 
    }
);

const UlbType = module.exports = mongoose.model('UlbType', UlbTypeSchema);

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