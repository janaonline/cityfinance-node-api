const MasterSkipValue = require('../../models/MasterSkipValue');
const Response = require('../../service/response')

module.exports.createValue = async(req,res)=>{
    try {
        const output = await MasterSkipValue.create(req.body);
        if(!output)  Response.BadRequest(res, {}, "Cannot create status")
        return Response.OK(res, output, "Success")
    } catch (error) {
        return Response.BadRequest(res, {}, error.message);
    }
}

module.exports.getAll = async (req, res) =>{
    try {
        let output = await MasterSkipValue.find({},{skipId:1, value: 1, category:1}).lean();
        if(!output || output.length === 0) return Response.BadRequest(res, {}, "Failed")
        return Response.OK(res, output, "Success")
    } catch (error) {
        return Response.BadRequest(res, {}, error.message);
    }
}

module.exports.getValue = async (req, res) =>{
    try {
        const {_id} = req.params;
        if(!_id) return Response.BadRequest(res, {}, "Pass Mandatory Fields");
        let output = await MasterSkipValue.findOne({skipId: _id},{skipId:1, value: 1, category:1}).lean();
        if(!output) return Response.BadRequest(res, {}, "Failed")
        return Response.OK(res, output, "Success")
    } catch (error) {
        return Response.BadRequest(res, {}, error.message);
    }
}