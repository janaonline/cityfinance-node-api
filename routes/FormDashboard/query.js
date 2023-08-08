const ObjectId = require('mongoose').Types.ObjectId;


function getPopulationDataQueries(state) {
    try {
        const ulbLookup = {
            $lookup: {
                from: "ulbs",
                localField: "_id",
                foreignField: "state",
                as: "ulb",
            },
        };
        const ulbUnwind = {
            $unwind: "$ulb",
        };
        const countUlb = {
            $group: {
                _id: "$_id",
                totalUlb: { $sum: 1 },
            },
        };

        const isActiveMatch = {
            "ulb.isActive": true,
        };

        const isMillionPlusMatch = {
            "ulb.isMillionPlus": "Yes",
        };
        const isNonMillionMatch = { "ulb.isMillionPlus": "No" }
        const isUAMatch = {
            "ulb.isUA": "Yes",
        };

        const isDulyElectedMatch = {
            "ulb.isDulyElected": true,
        };

        const hasGSDPMatch = {
            "ulb.hasGSDP": true,
        };

        const ulbPipeline = [
          {
            $match: {
              _id: ObjectId(state),
            },
          },
          {
            $facet: {
              totalUlbs: [
                ulbLookup,
                ulbUnwind,
                { $match: isActiveMatch },
                countUlb,
              ],
              totalUlbMpcAndNmpcUAPipeline: [
                ulbLookup,
                ulbUnwind,
                {
                  $match: {
                    $and: [
                      isActiveMatch,
                      { $or: [isMillionPlusMatch, isUAMatch] },
                    ],
                  },
                },
                countUlb,
              ],
              totalUlbNonMillionPlusPipeline: [
                ulbLookup,
                ulbUnwind,
                { $match: { $and: [isActiveMatch, isNonMillionMatch] } },
                countUlb,
              ],
              totalUlbsInUA: [
                ulbLookup,
                ulbUnwind,
                { $match: isUAMatch },
                countUlb,
              ],
              totalDulyElectedNMPCs: [
                ulbLookup,
                ulbUnwind,
                {
                  $match: {
                    $and: [
                      isActiveMatch,
                      isDulyElectedMatch,
                      isMillionPlusMatch,
                    ],
                  },
                },
                countUlb,
              ],
              totalDulyElectedULBsInUA: [
                ulbLookup,
                ulbUnwind,
                {
                  $match: {
                    $and: [
                      isActiveMatch,
                      isDulyElectedMatch,
                      isMillionPlusMatch,
                      isUAMatch,
                    ],
                  },
                },
                countUlb,
              ],
              totalEligibleULBsOnPTaxGSDP: [
                ulbLookup,
                ulbUnwind,
                {
                  $match: {
                    $and: [isActiveMatch, isDulyElectedMatch, hasGSDPMatch],
                  },
                },
                countUlb,
              ],
            },
          },
          {
            $unwind: "$totalUlbs",
          },
          {
            $unwind: "$totalUlbMpcAndNmpcUAPipeline",
          },
          {
            $unwind: "$totalUlbNonMillionPlusPipeline",
          },
          {
            $unwind: "$totalUlbsInUA",
          },
          {
            $unwind: {
              path: "$totalDulyElectedNMPCs",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: "$totalDulyElectedULBsInUA",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: "$totalEligibleULBsOnPTaxGSDP",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project:{
                totalUlbs: "$totalUlbs.totalUlb",
                TotalofMPCs: "$totalUlbMpcAndNmpcUAPipeline.totalUlb",
                TotalofNMPCs: "$totalUlbNonMillionPlusPipeline.totalUlb",
                TotalULBsUAs: "$totalUlbsInUA.totalUlb",
                totalDulyElectedNMPCs: "$totalDulyElectedNMPCs.totalUlb",
                totalDulyElectedULBsInUA:"$totalDulyElectedULBsInUA.totalUlb",
                totalEligibleULBsOnPTaxGSDP: "$totalEligibleULBsOnPTaxGSDP.totalUlb"
            }
        }
        ];
        return ulbPipeline;
    } catch (error) {
        throw { message: `getPopulationData: ${error.message}` };
    }
}

module.exports.getPopulationDataQueries = getPopulationDataQueries