require('./dbConnect');

const service = require("../../service");
var OverallUlbSchema = new Schema({
    name: { type: String, required: true },
    code: { type: String, required: true, index: { unique: true } },
    state : { type: Schema.Types.ObjectId, ref: 'State' ,required : true},
    population : { type : Number, default : 0},    
    populationCategory : { type: String, required: true, index:true },
    modifiedAt : { type: Date, default : Date.now() },
    createdAt : { type: Date, default : Date.now() },
    isActive : { type  : Boolean, default : 1 }
},{timestamp : {createdAt : "createdAt", updatedAt : "modifiedAt"}});


const OverallUlb = module.exports = mongoose.model('OverallUlb', OverallUlbSchema);

module.exports.get = async function(req,res) {

    let query = {};
    query["isActive"] = true;
    if(req.params && req.params._code){
        query["code"] = req.params._code
    }
    // Get any ulb
    // Ulb is model name
    service.find(query,OverallUlb,function(response,value){
        return res.status(response ? 200 : 400).send(value);
    });

}

