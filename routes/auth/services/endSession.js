
const VisitSession = require('../../../models/VisitSession');
const Response = require('../../../service').response;
const ObjectId = require('mongoose').Types.ObjectId;

module.exports.endSession = async (req, res) => {
    try {
        let visitSession = await VisitSession.update(
            { _id: ObjectId(req.params._id) },
            { $set: { isActive: false } }
        );
        return Response.OK(res, visitSession);
    } catch (e) {
        return Response.DbError(res, e);
    }
};