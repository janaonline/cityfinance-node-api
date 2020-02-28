require('./dbConnect');

const service = require("../../service");

var StateSchema = new Schema({
    name: { type: String, required: true  },
    code: { type: String, required: true },
    regionalName: { type: String, required: true,default : "" },
    censusCode:{ type: String, default:null },
    totalUlbs: { type: Number, default:0 },
    modifiedAt : { type: Date },
    createdAt : { type: Date },
    isActive : { type  : Boolean, default : 1 },
},{timestamp : {createdAt : "createdAt", updatedAt : "modifiedAt"}});

StateSchema.index(
    { 
        code : 1,
        isActive: 1
    },
    { 
        unique: true 
    }
);
StateSchema.index(
    { 
        name : 1,
        isActive: 1
    },
    { 
        unique: true 
    }
);

const State = module.exports = mongoose.model('State', StateSchema);

module.exports.get = async function(req,res) {

    let query = {};
    query["isActive"] = true;
    if(req.params && req.params._code){
        query["code"] = req.params._code
    }
    // Get any state
    // State is model name
    service.find(query,State,function(response,value){
        return res.status(response ? 200 : 400).send(value);
    });

}
module.exports.put = async function(req,res) {
    req.body['modifiedAt'] = new Date();
    let condition = {
        _id : req.params._id
    };
    // Edit any state
    // State is model name
    service.put(condition,req.body,State,function(response,value){
        return res.status(response ? 200 : 400).send(value);
    });

}
module.exports.post = async function(req,res) {
    // Create any state
    // State is model name
    service.post(State,req.body,function(response,value){
        return res.status(response ? 200 : 400).send(value);
    });
}
module.exports.delete = async function(req,res) {
    // Delete any State based on uniqueId
    // State is model name
    let condition = {
        _id : req.params._id
    },update = {
        isActive : false
    };
    service.put(condition,update,State,function(response,value){
        return res.status(response ? 200 : 400).send(value);
    });
}
