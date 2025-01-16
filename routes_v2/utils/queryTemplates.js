const ObjectId = require("mongoose").Types.ObjectId;

// Match conditions from ulbs collections.
// During aggregation: countDoc = false | During find query/ aggregation on ULBs collection: countDoc = true.
module.exports.matchCondition = (stateId = null, countDoc = false) => {
    const conditions = [{ $eq: ['$$ulbId', '$_id'] }, { $eq: ['$isActive', true] }];

    if (countDoc) { conditions.shift() }
    if (ObjectId.isValid(stateId)) conditions.push({ $eq: ['$state', ObjectId(stateId)] });

    return { $expr: { $and: conditions } };
};

// Template to get "_id" of ULBs from "ledgerLogs" (Overview sheet, where 'isStandardizable' != No).
module.exports.ledgerLogCondition = (year = "2021-22") => {
    return [
        {
            $match: {
                year,
                isStandardizable: { $ne: 'No' }
            }
        },
        {
            $project: {
                ulb_id: 1,
                year: 1
            }
        },
    ]
};

// Template to get "Population Category" based on population.
module.exports.populationCategoryData = (population = null) => {
    return {
        $switch: {
            branches: [
                { case: { $lt: [population, 100000] }, then: '<100K' },
                { case: { $and: [{ $gte: [population, 100000] }, { $lt: [population, 500000] }] }, then: '100K-500K' },
                { case: { $and: [{ $gte: [population, 500000] }, { $lt: [population, 1000000] }] }, then: '500K-1M' },
                { case: { $and: [{ $gte: [population, 1000000] }, { $lt: [population, 4000000] }] }, then: '1M-4M' },
                { case: { $gte: [population, 4000000] }, then: '4M+' }
            ],
            default: 'Unknown'
        }
    }
};

// Template to get "ulbType" data.
module.exports.ulbTypeData = (ulbType = 'ulbType') => {
    return [
        {
            $lookup: {
                from: 'ulbtypes',
                localField: ulbType,
                foreignField: '_id',
                as: 'ulbTypeData'
            }
        },
        { $addFields: { ulbType: { $arrayElemAt: ['$ulbTypeData.name', 0] } } }
    ];
};

// Aggregation - "ulbs" Collection - returns total ULBs in each "Population Category". 
module.exports.totalUlbsAsPerPopulationCategoryQuery = (stateId = null) => {
    return [
        {
            $project: {
                population: 1,
                isActive: 1,
                state: 1,
            }
        },
        { $match: this.matchCondition(stateId, true) },
        { $addFields: { populationCategory: this.populationCategoryData('$population') } },
        {
            $group: {
                _id: '$populationCategory',
                totalUlbs: { $sum: 1 }
            }
        },
        { $sort: { totalUlbs: 1 } } 
    ]
};

// Aggregation - "ulbs" Collection - returns total ULBs in each "ULB Type Category". 
module.exports.totalUlbsAsPerUlbTypeQuery = (stateId = null) => {
    return [
        {
            $project: {
                ulbType: 1,
                isActive: 1,
                state: 1,
            }
        },
        { $match: this.matchCondition(stateId, true) },
        ...this.ulbTypeData('ulbType'),
        // { $unset: ['ulbTypeData'] }, // TODO: not supported by current Monogo version
        {
            $group: {
                _id: '$ulbType',
                totalUlbs: { $sum: 1 }
            }
        }
    ]
};
