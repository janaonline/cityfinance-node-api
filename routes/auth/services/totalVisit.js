
const VisitSession = require('../../../models/VisitSession');
const Response = require('../../../service').response;


module.exports.totalVisit = (req, res) => {
    VisitSession.count((err, count) => {
        if (err) {
            return Response.DbError(res, err);
        } else {
            return Response.OK(res, count);
        }
    });
};
