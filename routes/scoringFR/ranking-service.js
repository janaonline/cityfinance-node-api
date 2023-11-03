
const ObjectId = require('mongoose').Types.ObjectId;
const moongose = require('mongoose');
const Response = require('../../service').response;
const { years } = require('../../service/years');
const Ulb = require('../../models/Ulb');
const FiscalRanking = require('../../models/FiscalRanking');
const FiscalRankingMapper = require('../../models/FiscalRankingMapper');
const ScoringFiscalRanking = require('../../models/ScoringFiscalRanking');
const { registerCustomQueryHandler } = require('puppeteer');

module.exports.dashboard = async (req, res) => {

    try {
        const data = req.body;
        const censusCode = 802814;
        const condition = { isActive: true }
        const ulbRes = await Ulb.find(condition).limit(10).lean();
        ulbRes.forEach(async (ulb) => {
            console.log('ulb', ulb._id);
            await getData(ulb);
        });
        return res.status(200).json();
    } catch (error) {
        console.log('error', error);
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }
}

module.exports.participatedState = async (req, res) => {

    try {
        const data = req.body;
        const censusCode = 802814;
        const condition = { isActive: true }
        const ulbRes = await Ulb.find(condition).limit(10).lean();
        ulbRes.forEach(async (ulb) => {
            console.log('ulb', ulb._id);
            await getData(ulb);
        });
        return res.status(200).json();
    } catch (error) {
        console.log('error', error);
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }
}
module.exports.states = async (req, res) => {

    try {
        const data = req.body;
        const censusCode = 802814;
        const condition = { isActive: true }
        const ulbRes = await Ulb.find(condition).limit(10).lean();
        ulbRes.forEach(async (ulb) => {
            console.log('ulb', ulb._id);
            await getData(ulb);
        });
        return res.status(200).json();
    } catch (error) {
        console.log('error', error);
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }
}
module.exports.topRankedUlbs = async (req, res) => {

    try {
        const data = req.body;
        const censusCode = 802814;
        const condition = { isActive: true }
        const ulbRes = await Ulb.find(condition).limit(10).lean();
        ulbRes.forEach(async (ulb) => {
            console.log('ulb', ulb._id);
            await getData(ulb);
        });
        return res.status(200).json();
    } catch (error) {
        console.log('error', error);
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }
}
module.exports.ulb = async (req, res) => {

    try {
        const data = req.body;
        const censusCode = 802814;
        const condition = { isActive: true }
        const ulbRes = await Ulb.find(condition).limit(10).lean();
        ulbRes.forEach(async (ulb) => {
            console.log('ulb', ulb._id);
            await getData(ulb);
        });
        return res.status(200).json();
    } catch (error) {
        console.log('error', error);
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }
}

function calculateFRPercentage(ulb) {

}
module.exports.calculateFRPercentage = async (req, res) => {

    try {
        const data = req.body;
        const censusCode = 802814;
        const condition = { isActive: true }
        const ulbRes = await ScoringFiscalRanking.find(condition).limit(10).lean();
        ulbRes.forEach(async (ulb) => {
            console.log('ulb', ulb._id);
            await calculateFRPercentage(ulb);
        });
        return res.status(200).json();
    } catch (error) {
        console.log('error', error);
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }
}
// func15 indicator-'paid_property_tax' & func9 indicator-'omExp' have error.