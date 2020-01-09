require('./dbConnect');
const service = require("../../service");

var LineItemSchema = new Schema({
    name: { type: String, required: true },
    code: { type: String, required: true },
    headOfAccount: { type: String, enum : ["Revenue","Expense","Liability","Asset", "Debt","Tax","Other"], required: true ,index:true},
    modifiedAt : { type: Date, default : Date.now() },
    createdAt : { type: Date, default : Date.now() },
    isActive : { type  : Boolean, default : 1 },
},{timestamp : {createdAt : "createdAt", updatedAt : "modifiedAt"}});

LineItemSchema.index(
    { 
        code : 1,
        isActive: 1
    },
    { 
        unique: true 
    }
);
LineItemSchema.index(
    { 
        name : 1,
        code: 1
    },
    { 
        unique: true 
    }
);

const LineItem = module.exports = mongoose.model('LineItem', LineItemSchema);

module.exports.get = async function(req,res) {

    let query = {};
    query["isActive"] = true;
    // Get any line item based on code or overall
    // LineItem is model name
    if(req.params && req.params._code){
        query["code"] = req.params._code
    }

    service.find(query,LineItem,function(response,value){
        return res.status(response ? 200 : 400).send(value);
    });

}
module.exports.put = async function(req,res) {
    req.body['modifiedAt'] = new Date();
    // Edit any Line item
    // LineItem is model name
    let condition = {
        _id : req.params._id
    };
    service.put(condition,req.body,LineItem,function(response,value){
        return res.status(response ? 200 : 400).send(value);
    });

}
module.exports.post = async function(req,res) {
    // Create any financial parameter
    // LineItem is model name
    service.post(LineItem,req.body,function(response,value){
        return res.status(response ? 200 : 400).send(value);
    });
}
module.exports.delete = async function(req,res) {
    // Delete any line item based on uniqueId
    // LineItem is model name
    let condition = {
        _id : req.params._id
    },update = {
        isActive : false
    };
    service.put(condition,update,LineItem,function(response,value){
        return res.status(response ? 200 : 400).send(value);
    });
}
