const LinkRecord = require('../../models/LinkRecord');
const { checkUndefinedValidations } = require('../FiscalRanking/service');
const Response = require("../../service").response


const getLink = async (req,res)=>{
    try {
        let {key} = req.query;
        let validation = checkUndefinedValidations({key});
        if (!validation.valid) { return Response.BadRequest(res,{}, validation?.message) }
        let data = await LinkRecord.find({key}).lean()
        if(data){ return  Response.OK(res,data,""); }
    } catch (error) {
        return Response.BadRequest(res,{}, "Something went wrong")
    }
}


const createLinkRecords = async(req,res)=>{
    try {
        let {input} = req.body;
        for(let {key,shortKey,url} of input){
            let validation = checkUndefinedValidations({key, shortKey, url});
            if (!validation.valid) { return Response.BadRequest(res,{}, validation?.message) }
            const output = await LinkRecord.create({key, url, shortKey}).lean();
            if(!output) {return Response.BadRequest(res, {}, "Cannot create record!")}
        }
        return Response.OK(res, {}, "Success")
    } catch (error) {
        return Response.BadRequest(res, {}, error.message);
    }
}
module.exports = {
    createLinkRecords,
    getLink
}