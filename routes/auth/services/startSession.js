const VisitSession = require('../../../models/VisitSession');
const Response = require('../../../service').response;


module.exports.startSession = (req, res) => {
    let visitSession = new VisitSession();
    visitSession.save((err, data) => {
        if (err) {
            return Response.DbError(res, err);
        } else {
            return Response.OK(res, { _id: data._id });
        }
    });
};