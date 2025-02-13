const GeneralAlerts = require('../../models/GeneralAlerts');
const Response = require('../../service/response')

module.exports.createUpdateValue = async(req,res)=>{
    try {
        const { moduleName } = req.body;
        const newData = {
            isActive: req.body.isActive,
            icon: req.body.icon,
            title: req.body.title,
            text: req.body.text,
            position: req.body.position
        };
        const updatedRecord = await GeneralAlerts.findOneAndUpdate(
            { moduleName }, newData,{ upsert: true, new: true }
        );
    
        if (!updatedRecord) {
            return Response.BadRequest(res, {}, "Cannot create or update status");
        }
    
        return Response.OK(res, updatedRecord, "Success");
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
        if (!type) return Response.OK(res, {}, "parameter is required");
        if (type) {
            type = req?.query?.type;
            query.moduleName = type; 
        }
        let output = await GeneralAlerts.findOne(query, {
            title: 1, icon: 1, text: 1, position:1, isActive: 1
        }).sort({ createdAt: -1 }).lean();
        const response = {
            isActive: true,
            message: {
                title: output?.title || "Alert",
                icon: output?.icon || "warning",
                text: output?.text || "Failed",
                position: output?.position || "top-start"
            },
        };
        if (!output) return Response.OK(res, {}, "Invalid parameter");
        return Response.OK(res, response, "Success");
    } catch (error) {
        return Response.BadRequest(res, {}, error.message);
    }
}