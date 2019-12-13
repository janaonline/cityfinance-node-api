require('./dbConnect');
const service = require("../../service");

var FinancialParameterSchema = new Schema({
    name: { type: String, required: true },
    modifiedAt : { type: Date, default : Date.now() },
    createdAt : { type: Date, default : Date.now() },
    isActive : { type  : Boolean, default : 1 },
},{timestamp : {createdAt : "createdAt", updatedAt : "modifiedAt"}});


FinancialParameterSchema.index(
    { 
        name : 1,
        isActive: 1
    },
    { 
        unique: true 
    }
);

const FinancialParameter = module.exports = mongoose.model('FinancialParameter', FinancialParameterSchema);

module.exports.get = async function(req,res) {

    let query = {};
    query["isActive"] = true;
    if(req.params && req.params._code){
        query["code"] = req.params._code
    }

    service.find(query,FinancialParameter,function(response,value){
        return res.status(response ? 200 : 400).send(value);
    });

}
module.exports.put = async function(req,res) {
    req.body['modifiedAt'] = new Date();
    let condition = {
        _id : req.params._id
    };
    service.put(condition,req.body,FinancialParameter,function(response,value){
        return res.status(response ? 200 : 400).send(value);
    });

}
module.exports.post = async function(req,res) {
    service.post(FinancialParameter,req.body,function(response,value){
        return res.status(response ? 200 : 400).send(value);
    });
}
module.exports.delete = async function(req,res) {
    let condition = {
        _id : req.params._id
    },update = {
        isActive : false
    };
    service.put(condition,update,FinancialParameter,function(response,value){
        return res.status(response ? 200 : 400).send(value);
    });
}
