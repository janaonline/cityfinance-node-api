const { ledgerLogCondition, matchCondition, populationCategoryData, ulbTypeData,
} = require('../../utils/queryTemplates');

// <----- Query Templates ----->
// Return ULBs count from 'ledgerLogs' distributed as per 'Population Category'.
module.exports.populationCategoryQuery = (stateId, year) => {
    return [
        ...ledgerLogCondition(year),
        {
            $lookup: {
                from: 'ulbs',
                let: { ulbId: '$ulb_id' },
                pipeline: [
                    { $match: matchCondition(stateId) },
                    { $project: { population: 1 } }
                ],
                as: 'ulbData'
            }
        },
        { $unwind: { path: '$ulbData', preserveNullAndEmptyArrays: false } },
        { $addFields: { populationCategory: populationCategoryData('$ulbData.population') } },
        // { $unset: ['ulbData'] }, // TODO: not supported by current Monogo version
        {
            $group: {
                _id: '$populationCategory',
                totalUlbs: { $sum: 1 }
            }
        }
    ]
};

// Return ULBs count from 'ledgerLogs' distributed as per 'ULB Type Category'.
module.exports.ulbTypeQuery = (stateId, year) => {
    return [
        ...ledgerLogCondition(year),
        {
            $lookup: {
                from: 'ulbs',
                let: { ulbId: '$ulb_id' },
                pipeline: [
                    { $match: matchCondition(stateId) },
                    { $project: { ulbType: 1 } }
                ],
                as: 'ulbData'
            }
        },
        { $unwind: { path: '$ulbData', preserveNullAndEmptyArrays: false } },
        { $addFields: { ulbType: '$ulbData.ulbType' } },
        ...ulbTypeData('ulbType'),
        // { $unset: ['ulbData', 'ulbTypeData'] }, // TODO: not supported by current Monogo version
        {
            $group: {
                _id: '$ulbType',
                totalUlbs: { $sum: 1 }
            }
        }
    ]
};

// <----- Data availabity ----->
const columnHeaderLabels = { populationCategory: 'Population Category', ulbType: 'ULB Type' };
// const populationCategorySequence = { '4M+': 0, '1M-4M': 1, '500K-1M': 2, '<100K': 3 };

// Column Headers.
module.exports.dataAvailabilityColumnHeader = (key = 'populationCategory') => {
    return [
        {
            'key': key,
            'display_name': columnHeaderLabels[key],
            // 'width': 23,
        },
        {
            'key': 'numberOfULBs',
            'display_name': 'Number Of ULBs',
            // 'width': 23,
        },
        {
            'key': 'ulbsWithData',
            'display_name': 'ULBs With Data',
            // 'width': 23,
        },
        {
            'key': 'DataAvailPercentage',
            'display_name': 'Data Availability Percentage',
            // width': 23,
        },
        // {
        //     'key': 'urbanPopulationPercentage',
        //     'display_name': 'Urban Population Percentage'
        // }
    ]
};

// Create respose structure.
module.exports.createResponseStructure = (key = 'populationCategory', totalUlbCount, ledgerUlbCount) => {
    if (!totalUlbCount.length) throw new Error('Incomplete Data: createResponseStructure()');

    const ulbData = { DummyObj: {} };
    let ledgerUlbsCount = 0;
    let totalUlbsCount = 0;

    // ['4M+', '1M-4M', '500K-1M', '100K-500K', '<100K']

    totalUlbCount.forEach((ele) => {
        ulbData[ele._id] = {
            [key]: ele._id,
            numberOfULBs: ele.totalUlbs,
            ulbsWithData: 0,
            DataAvailPercentage: '0 %',
        };
        totalUlbsCount += ele.totalUlbs;
    });

    ledgerUlbCount.forEach((ele) => {
        ulbData[ele._id] = Object.assign(
            ulbData[ele._id],
            {
                ulbsWithData: ele.totalUlbs,
                DataAvailPercentage: ele.totalUlbs && ulbData[ele._id]['numberOfULBs'] ?
                    ((ele.totalUlbs / ulbData[ele._id]['numberOfULBs']) * 100).toFixed(0) + ' %' :
                    '0 %',
            }
        );

        ledgerUlbsCount += ele.totalUlbs;

    });

    return {
        dataAvailabilitySplit: ulbData,
        dataAvailability: ledgerUlbsCount && totalUlbsCount ?
            Number(((ledgerUlbsCount / totalUlbsCount) * 100).toFixed(0)) :
            0,
    };
};