const ObjectId = require('mongoose').Types.ObjectId;
const moongose = require('mongoose');
const Response = require('../../service').response;
const { years } = require('../../service/years');
const Ulb = require('../../models/Ulb');
const State = require('../../models/State');
const FiscalRanking = require('../../models/FiscalRanking');
const FiscalRankingMapper = require('../../models/FiscalRankingMapper');
const ScoringFiscalRanking = require('../../models/ScoringFiscalRanking');
const { registerCustomQueryHandler } = require('puppeteer');

async function getParticipatedUlbCount() {
    const condition = { isActive: true };
    return await ScoringFiscalRanking.countDocuments();
}
async function topCategoryUlb(populationBucket) {
    const condition = { populationBucket };
    return await ScoringFiscalRanking.find(condition).limit(2);
}
async function getTop3ParticipatedState() {
    const condition = { isActive: true };
    return await State.find({ isActive: true }).limit(3).exec();
}
async function getAuditedUlbCount() {
    const condition = { isActive: true };
    return await Ulb.countDocuments(condition);
}
async function getBudgetUlbCount() {
    const condition = { isActive: true };
    return await Ulb.countDocuments(condition);
}
module.exports.dashboard = async (req, res) => {
    try {
        const reqData = req.body;

        const top3ParticipatedState = await getTop3ParticipatedState();
        const category1 = await topCategoryUlb(1);
        const category2 = await topCategoryUlb(2);
        const category3 = await topCategoryUlb(3);
        const category4 = await topCategoryUlb(4);
        const auditedUlbCount = await getAuditedUlbCount();
        const budgetUlbCount = await getBudgetUlbCount();

        const data = {
            participatedUlbCount: await getParticipatedUlbCount(),
            top3ParticipatedState,
            topCategoryUlb: { category1, category2, category3, category4 },
            auditedUlbCount,
            budgetUlbCount,
        };
        return res.status(200).json({ data });
    } catch (error) {
        console.log('error', error);
        return res.status(400).json({
            status: false,
            message: error.message,
        });
    }
};

module.exports.participatedState = async (req, res) => {
    try {
        const data = req.body;
        const condition = { isActive: true };
        const states = await State.find(condition).exec();
        return res.status(200).json({ states });
    } catch (error) {
        console.log('error', error);
        return res.status(400).json({
            status: false,
            message: error.message,
        });
    }
};
module.exports.states = async (req, res) => {
    try {
        const data = req.body;
        const condition = { isActive: true };
        const states = await State.find(condition).exec();
        return res.status(200).json({ states });
    } catch (error) {
        console.log('error', error);
        return res.status(400).json({
            status: false,
            message: error.message,
        });
    }
};
module.exports.topRankedUlbs = async (req, res) => {
    try {
        const { key, order } = req.query;
        const condition = { isActive: true };
        const ulbRes = await ScoringFiscalRanking.find(condition).limit(5).sort({ [key]: order }).exec();
        return res.status(200).json({ ulbs: ulbRes });
    } catch (error) {
        console.log('error', error);
        return res.status(400).json({
            status: false,
            message: error.message,
        });
    }
};
module.exports.ulb = async (req, res) => {
    try {
        const data = req.body;
        const censusCode = 802814;
        const condition = { isActive: true };
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
            message: error.message,
        });
    }
};

function calculateFRPercentage(ulb) { }
module.exports.calculateFRPercentage = async (req, res) => {
    try {
        const data = req.body;
        const censusCode = 802814;
        const condition = { isActive: true };
        const ulbRes = await ScoringFiscalRanking.find(condition).limit(10).lean();
        ulbRes.forEach(async (ulb) => {
            // console.log('ulb', ulb._id);
            await calculateFRPercentage(ulb);
        });
        return res.status(200).json();
    } catch (error) {
        console.log('error', error);
        return res.status(400).json({
            status: false,
            message: error.message,
        });
    }
};
