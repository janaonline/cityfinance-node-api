const MasterStatus = require('../../models/MasterStatus');
const Response = require('../../service/response')

module.exports.createValue = async(req,res)=>{
    try {
        const output = await MasterStatus.create(req.body);
        if(!output)  Response.BadRequest(res, {}, "Cannot create status")
        return Response.OK(res, output, "Success")
    } catch (error) {
        return Response.BadRequest(res, {}, error.message);
    }
}

module.exports.getAll = async (req, res) =>{
    try {
      let type = req?.query?.type;
      let query = {};
      if (type) {
        type = req?.query?.type;
        query = {
          $or: [{ type }, { multi: { $in: [type] } }],
        };
      }
      let output = await MasterStatus.find(query, {
        status: 1,
        statusId: 1,
      }).lean();
      if (!output || output.length === 0)
        return Response.BadRequest(res, {}, "Failed");
      return Response.OK(res, output, "Success");
    } catch (error) {
      return Response.BadRequest(res, {}, error.message);
    }
}

module.exports.getValue = async (req, res) =>{
    try {
        const {_id} = req.params
        if(!_id) return Response.BadRequest(res, {}, "Pass Mandatory Fields");
        let output = await MasterStatus.findOne({statusId: _id},{status:1, statusId:1}).lean();
        if(!output) return Response.BadRequest(res, {}, "Failed")
        return Response.OK(res, output, "Success")
    } catch (error) {
        return Response.BadRequest(res, {}, error.message);
    }
}