const GeneralAlerts = require('../../models/GeneralAlerts');
const Response = require('../../service/response')

module.exports.createValue = async(req,res)=>{
    try {
        const output = await GeneralAlerts.create(req.body);
        if(!output)  Response.BadRequest(res, {}, "Cannot create status")
        return Response.OK(res, output, "Success")
    } catch (error) {
        return Response.BadRequest(res, {}, error.message);
    }
}

module.exports.getAll = async (req, res) =>{
    try {
     
      let query = {};
      let output = await GeneralAlerts.find().lean();
      if (!output || output.length === 0)
        return Response.BadRequest(res, {}, "Failed");
      return Response.OK(res, output, "Success");
    } catch (error) {
      return Response.BadRequest(res, {}, error.message);
    }
}

module.exports.getValue = async (req, res) =>{
    try {
        let type = req?.query?.type;
        let query = { isActive: true }; 
        if (type) {
            type = req?.query?.type;
            query.moduleName = type; 
        }
        let output = await GeneralAlerts.findOne(query, {
            title: 1, icon: 1, text: 1, isActive: 1
        }).sort({ createdAt: -1 }).lean();
        const response = {
            isActive: true,
            message: {
                title: output?.title || "Alert",
                icon: output?.icon || "warning",
                text: output?.text || "Failed"
            },
        };
        if (!output) return Response.BadRequest(res, {}, "Failed");
        return Response.OK(res, response, "Success");
    } catch (error) {
        return Response.BadRequest(res, {}, error.message);
    }
}