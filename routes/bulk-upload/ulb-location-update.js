const moment = require("moment");
const Ulb = require('../../models/Ulb');
const service = require("../../service");
const requiredKeys = ["ULBCODE","LAT","LNG"];
module.exports = async (req, res)=>{
    try {
        const jsonArray = req.body.jsonArray;
        let failArr = [];
        if(jsonArray.length){
            let keys = Object.keys(jsonArray[0]);
            if(requiredKeys.every(k=> keys.includes(k))){
                for(let json of jsonArray) {
                    if(json["ULBCODE"] && json["LAT"] && json["LNG"]){
                        let du = {
                            query:{code:json["ULBCODE"]},
                            update:{location:{lng:json["LNG"], lat:json["LAT"]}},
                            options:{upsert : true,setDefaultsOnInsert : true,new: true}
                        }
                        let d = await Ulb.findOneAndUpdate(du.query,du.update,du.options);
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

module.exports.nameUpdate = async (req, res)=>{
    try {
        const jsonArray = req.body.jsonArray;

        for(let eachRow of jsonArray){

            //console.log(eachRow.code,eachRow.name)
            service.put({ code : eachRow.code },eachRow,Ulb,function(response,value){
                if(!response){
                    errors.push("Not able to create ulb => ",eachRow.code+""+response);
                }
                console.log(value.message);
            });

        }
        return res.status(200).json({
            message : "Successfully uploaded file",
            success:true
        })
       
    }catch (e) {
        console.log("Exception:",e);
        return res.status(500).json({message:e.message, success:false})
    }
};