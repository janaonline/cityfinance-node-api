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
            "ulb.isGsdpEligible": true,
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
              totalUlbMpc: [
                ulbLookup,
                ulbUnwind,
                {
                  $match: {
                    $and: [
                      isActiveMatch,
                      isMillionPlusMatch, 
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
                { $match: { $and: [isActiveMatch, isUAMatch] } },
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
                      isNonMillionMatch,
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
                      // isMillionPlusMatch,
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
                    $and: [isActiveMatch, 
                      // isDulyElectedMatch, 
                      hasGSDPMatch],
                  },
                },
                countUlb,
              ],
            },
          },
          {
            $unwind: {
              path: "$totalUlbs",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: "$totalUlbMpc",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: "$totalUlbNonMillionPlusPipeline",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: "$totalUlbsInUA",
              preserveNullAndEmptyArrays: true,
            },
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
                TotalofMPCs: "$totalUlbMpc.totalUlb",
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