const FinancialYear = require('../../models/FinancialYear');
const UlbFinancialData = require('../../models/UlbFinancialData');
const Response = require('../../service').response;
const ObjectId = require('mongoose').Types.ObjectId;
module.exports.get = async function (req, res) {
    let query = {};
    query['isActive'] = true;
    try {
        let years = await FinancialYear.find(query, '_id name');

        return Response.OK(res, years, `Financial year list.`);
    } catch (e) {
        return Response.InternalError(res, {}, `Exception: ${e.message}.`);
    }
};

/**
 * Dynamic Financial Years are  those years which are contain any Financial Data.
 * The list changes based upon the datas present in collection UlbFinancialData.
 *  */
module.exports.yearsContainingFinancialYear = async function (req, res) {
    let query = {};
    query['isActive'] = true;
    try {
        let years = await UlbFinancialData.distinct('financialYear');

        return Response.OK(res, years, `Financial year list.`);
    } catch (e) {
        return Response.InternalError(res, {}, `Exception: ${e.message}.`);
    }
};

module.exports.put = async function (req, res) {
    if (req.decoded.role != 'ADMIN') {
        return Response.BadRequest(res, {}, `Action not allowed.`);
    }
    req.body['modifiedAt'] = new Date();
    let condition = {
        _id: ObjectId(req.params._id),
    };
    try {
        let du = await FinancialYear.update(condition, { $set: req.body });
        return Response.OK(res, du, ``);
    } catch (e) {
        return Response.DbError(res, e, e.message);
    }
};
module.exports.post = async function (req, res) {
    if (req.decoded.role != 'ADMIN') {
        return Response.BadRequest(res, {}, `Action not allowed.`);
    }
    try {
        let financialYear = new FinancialYear(req.body);
        let du = await financialYear.save();
        return Response.OK(res, du, ``);
    } catch (e) {
        return Response.DbError(res, e, e.message);
    }
};
module.exports.delete = async function (req, res) {
    if (req.decoded.role != 'ADMIN') {
        return Response.BadRequest(res, {}, `Action not allowed.`);
    }
    let condition = {
            _id: ObjectId(req.params._id),
        },
        update = {
            isActive: false,
            modifiedAt: new Date(),
        };
    try {
        let du = await FinancialYear.update(condition, update);
        return Response.OK(res, du, ``);
    } catch (e) {
        return Response.DbError(res, e, e.message);
    }
};
