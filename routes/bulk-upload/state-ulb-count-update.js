const moment = require("moment");
const State = require('../../models/State');
const requiredKeys = ["STATECODE","ULBCOUNT"];
module.exports = async (req, res)=>{
    try {
        const jsonArray = req.body.jsonArray;
        let failArr = [];
        if(jsonArray.length){
            let keys = Object.keys(jsonArray[0]);
            if(requiredKeys.every(k=> keys.includes(k))){
                for(let json of jsonArray) {
                    if(json["STATECODE"] && json["ULBCOUNT"]){
                        let du = {
                            query:{code:json["STATECODE"]},
                            update:{totalUlbs:json["ULBCOUNT"]},
                            options:{upsert : true,setDefaultsOnInsert : true,new: true}
                        }
                        let d = await State.findOneAndUpdate(du.query,du.update,du.options);
                    }else {
                        failArr.push(json);
                    }
                }
            }else {
                failArr.push({message:"keys are missing.", requiredKeys:requiredKeys, requestKeys:keys});
            }
        }else {
            failArr.push({message:"No row found."});
        }
        return res.status(200).json({success:true, data:failArr});
    }catch (e) {
        console.log("Exception:",e);
        return res.status(500).json({message:e.message, success:false})
    }
};