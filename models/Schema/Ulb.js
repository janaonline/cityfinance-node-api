require('./dbConnect');

const State = require("./State");
const UlbType = require("./UlbType");
const service = require("../../service");

var UlbSchema = new Schema({
    name: { type: String, required: true },
    regionalName: { type: String, default : "" },
    code: { type: String, required: true, index: { unique: true } },
    state : { type: Schema.Types.ObjectId, ref: 'State' ,required : true},
    ulbType : { type: Schema.Types.ObjectId, ref: 'UlbType' ,required : true},
    natureOfUlb : { type : String, default : null},
    wards : { type : Number, default : 0},
    area : { type : Number, default : 0},
    population : { type : Number, default : 0},
    amrut : { type : String ,  default : ""},
    modifiedAt : { type: Date, default : Date.now() },
    createdAt : { type: Date, default : Date.now() },
    isActive : { type  : Boolean, default : 1 }
},{timestamp : {createdAt : "createdAt", updatedAt : "modifiedAt"}});


const Ulb = module.exports = mongoose.model('Ulb', UlbSchema);

module.exports.get = async function(req,res) {

    let query = {};
    query["isActive"] = true;
    if(req.params && req.params._code){
        query["code"] = req.params._code
    }
    // Get any ulb
    // Ulb is model name
    service.find(query,Ulb,function(response,value){
        return res.status(response ? 200 : 400).send(value);
    });

}
module.exports.put = async function(req,res) {
    req.body['modifiedAt'] = new Date();
    let condition = {
        _id : req.params._id
    };
    let obj = req.body;
    // Edit any ULB
    // Check for state and type
    if(obj.state || obj.type){
        try{
            let message = "";
            // Find state exists based on name
            let state = await State.findOne({ name : obj.state,isActive : true},{ _id:1 }).exec();

            // Find ulb types exists based on name
            let ulbType = await UlbType.findOne({ name : obj.type,isActive : true},{ _id:1 }).exec();
            
            obj.state  ? ( state ? obj.state = state._id : message+="State Doesn't Exists" ) : "Do nothing"
            obj.type  ? ( ulbType ? obj.ulbType = ulbType._id : message+="Ulb Type Doesn't Exists" ) : "Do nothing"

        }catch(err){
            console.log("Error caught",err)
            return res.status(500).send({
                message : "Error Caught",
                err: err
            })  
        }
    }
    // Edit ulb here
    service.put(condition,obj,Ulb,function(response,value){
        return res.status(response ? 200 : 400).send(value);
    });

}
module.exports.post = async function(req,res) {
    let obj = req.body;
    // state and ulb type is compulsory
    if(obj.state && obj.type){
        try{
            let message = "";
            // find state  information based on name
            let state = await State.findOne({ name : obj.state,isActive : true},{ _id:1 }).exec();

            // find ulb type information based on name
            let ulbType = await UlbType.findOne({ name : obj.type,isActive : true},{ _id:1 }).exec();
            
            state ? obj.state = state._id : message+="State don't exists"
            ulbType ? obj.ulbType = ulbType._id : message+=" Ulb don't exists"

            if(!message){
                service.post(Ulb,obj,function(response,value){
                    return res.status(response ? 200 : 400).send(value);
                });
            }else{
                return res.status(400).send({
                    message : message,
                    data : {}
                })  
            }
        }catch(err){
            console.log("Error caught",err)
            return res.status(500).send({
                message : "Error Caught",
                err: err
            })  
        }
    }else{
        return res.status(400).send({
            message : "State and Ulb type is compulsory",
            data: {}
        })
    }

}
module.exports.delete = async function(req,res) {
    // Delete ulb based 
    let condition = {
        _id : req.params._id
    },update = {
        isActive : false
    };
    service.put(condition,update,Ulb,function(response,value){
        return res.status(response ? 200 : 400).send(value);
    });
}


module.exports.getByState = async function(req,res){
    try{
        // Get ulb list by state code
        let data =  await Ulb.aggregate([
            {
                $lookup:{
                    from: "states",
                    localField : "state",
                    foreignField:"_id",
                    as : "state"
                }

            },
            {$unwind : "$state"},
            {
                $match : { "state.code" : req.params.stateCode}
            },
            {
                $lookup:{
                    from: "ulbtypes",
                    localField : "ulbType",
                    foreignField:"_id",
                    as : "ulbType"
                }

            },
            {$unwind : "$ulbType"},
            {
                $group:{
                      _id : "$state.code",
                      state : { $first : "$state.name"},
                      ulbs : {
                          $push : {
                              state : "$state.name",
                              code : "$code",
                              name : "$name",
                              natureOfUlb : "$natureOfUlb",
                              type : "$ulbType.name",
                              ward : "$ward",
                              area : "$area",
                              population : "$population",
                              amrut : "$amrut"
                          }
                      }
                }
            },
            {
                $project:{
                    _id : 0,
                    stateCode : "$_id",
                    state : 1,
                    ulbs : 1
                }
            }
        ]).exec();

        if(data.length==1){
            return res.status(200).send({ success:true, data: data[0], msg:'ULBS Found'} )
        }else{
            return res.status(200).send({ success:true, data: {}, msg:'No ULBS for this state Found'} )
        }
    }catch (e) {
        console.log("Error",e.message);
        return res.status(500).send({ success:false, err : e.message, message :e.message} )
    }
}

module.exports.getUlbInfo = async function(stateCode, ulbCode){
    try {
        // Get ulb information using ulbCode
        let response = await Ulb.findOne({code : ulbCode}).exec();
        if(response){
            return response;
        }else{
            return null;
        }
    }catch (e) {
        console.log("Error",e);
        return  {};
    }
}

module.exports.getUlbByCode = async function(ulbCode){

    try {
        // get ulb information and other information based on ulbCode
        let response =  await Ulb.aggregate([
            {$match:{code : ulbCode}},
            {
                $lookup:{
                    from: "states",
                    localField : "state",
                    foreignField:"_id",
                    as : "state"
                }

            },
            {$unwind : "$state"},
            {
                $lookup:{
                    from: "ulbtypes",
                    localField : "ulbType",
                    foreignField:"_id",
                    as : "ulbType"
                }

            },
            {$unwind : "$ulbType"},
            {
                $project:{
                    _id : 1,
                    stateCode : "$_id",
                    ulbs : 1,
                    state :"$state.name",
                    type : "$ulbType.name",
                    wards:1,
                    area:1,
                    population:1,
                    natureOfUlb:1,
                    code : 1,
                    name : 1,
                    amrut : 1
                }
            }  
        ]).exec();

        if(response){
            return response;
        }else{
            return null;
        }

    }catch (e) {
        console.log("Error",e);
        return  [];
    }
}

module.exports.getAllUlbs = async function(req,res){
    try {
        // Get all ulbs list in older format, so that everything works fine
        let data = await Ulb.aggregate([
            {
                $lookup:{
                    from: "states",
                    localField : "state",
                    foreignField:"_id",
                    as : "state"
                }

            },
            {$unwind : "$state"},
            {
                $lookup:{
                    from: "ulbtypes",
                    localField : "ulbType",
                    foreignField:"_id",
                    as : "ulbType"
                }

            },
            {$unwind : "$ulbType"},
            {
                $group:{
                    _id : "$state.code",
                    state : { $first : "$state.name"},
                    ulbs : {
                        $push : {
                            _id:"$_id",
                            state : "$state.name",
                            code : "$code",
                            name : "$name",
                            natureOfUlb : "$natureOfUlb",
                            type : "$ulbType.name",
                            ward : "$ward",
                            area : "$area",
                            population : "$population",
                            amrut  : "$amrut"
                        }
                    }
                }
            },
            {
                $project:{
                    _id : 0,
                    stateCode : "$_id",
                    ulbs : 1,
                    state : 1
                }
            }
        ]).exec();
        if(data.length){
            let obj = {}
            for(let el of data){
                obj[el.stateCode] = {
                    state : el.state ,
                    ulbs : el.ulbs
                }
            }
            return res.status(200).send({ success:true, data: obj, msg:'ULBS Found'} )
        }else{
            return res.status(200).send({ success:true, data: {}, msg:'No ULBS Found'} )
        }
    }catch (e) {
        console.log("Erro",e)
        return  {};
    }
}
