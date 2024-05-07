const previousFormsAggregation = (params, currentAccessYearKey) => {
    let { state, design_year, prevYear } = params;
    let allYearsToCheck = [design_year, prevYear]
    let query = [
        {
            "$match": {
                "state": state,
                "isActive": true,
                [currentAccessYearKey]: true
            }
        },
        {
            "$lookup": {
                "from": "pfmsaccounts",
                "let": {
                    "design_year": design_year,
                    "ulb": "$_id",
                    "prevYear": prevYear,
                    "years": allYearsToCheck
                },
                "pipeline": [
                    {
                        "$match": {
                            "$expr": {
                                "$and": [
                                    { "$eq": ["$ulb", "$$ulb"] },
                                    {
                                        "$or": [
                                            {"$in":["$design_year", "$$years"]}
                                        ]
                                    },
                                    {

                                        "$or": [
                                            { "$eq": ["$currentFormStatus", 4] },

                                            {
                                                "$eq": ["$currentFormStatus", 6],
                                            },
                                            {
                                                "$or": [{
                                                    "$and": [
                                                        {
                                                            "$eq": [`$actionTakenByRole`,
                                                                "STATE"]
                                                        },
                                                        {
                                                            "$eq": [`$status`,
                                                                "APPROVED"]
                                                        }
                                                    ]
                                                },
                                                {
                                                    "$and": [
                                                        {
                                                            "$eq": [`$actionTakenByRole`,
                                                                "MoHUA"]
                                                        },
                                                        {
                                                            "$eq": [`$status`,
                                                                "APPROVED"]
                                                        }
                                                    ]
                                                },]
                                            }
                                        ]

                                    }
                                ]
                            }
                        }
                    }
                ],
                "as": "pfmsAccount"
            }
        },
        {
            "$addFields": {
                "pfmsFormFilled": {
                    "$cond": {
                        "if": {
                            "$gte": [{ "$size": "$pfmsAccount" }, 1]
                        },
                        "then": "Yes",
                        "else": "No"
                    }
                }
            }
        },
        {
            "$group": {
                "_id": "$state",
                "totalUlbs": {
                    "$sum": 1
                },
                "pfmsFilledCount": {
                    "$sum": {
                        "$cond": {
                            "if": {
                                "$eq": ["$pfmsFormFilled", "Yes"]
                            },
                            "then": 1,
                            "else": 0
                        }
                    }
                }
            }
        },
        {
            "$lookup": {
                "from": "statefinancecommissionformations",
                "let": {
                    "design_year": prevYear,
                    "state": "$_id"
                },
                "pipeline": [
                    {
                        "$match": {
                            "$expr": {
                                "$and": [
                                    {
                                        "$eq": ["$design_year", "$$design_year"],

                                    },
                                    {
                                        "$eq": ["$state", "$$state"],
                                    },
                                    {
                                        "$eq": ["$isDraft", false]
                                    },
                                    {
                                        "$or": [
                                            {
                                                "$and": [
                                                    { "$in": ["$actionTakenByRole",["STATE", "MoHUA"]] } ,
                                                    { "$in": ["$status",["PENDING", "APPROVED"]] },
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                ],
                "as": "sfcForm"
            }
        },
        {
            "$lookup": {
                "from": "propertytaxfloorrates",
                "let": {
                    "design_year": prevYear,
                    "state": "$_id"
                },
                "pipeline": [
                    {
                        "$match": {
                            "$expr": {
                                "$and": [
                                    {
                                        "$eq": ["$design_year", "$$design_year"],
                                    },
                                    {
                                        "$eq": ["$state", "$$state"],
                                    },
                                    {
                                        "$eq": ["$isDraft", false]
                                    },
                                    {
                                        "$or": [
                                            {
                                                "$and": [
                                                    { "$in": ["$actionTakenByRole",["STATE", "MoHUA"]] } ,
                                                    { "$in": ["$status",["PENDING", "APPROVED"]] } 
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                ],
                "as": "pfrForm"
            }
        },
        {
            "$addFields": {
                "IsSfcFormFilled": {
                    "$cond": {
                        "if": {
                            "$gte": [{
                                "$size": "$sfcForm"
                            }, 1]
                        },
                        "then": "Yes",
                        "else": "No"
                    }
                },
                "isPfrFilled": {
                    "$cond": {
                        "if": {
                            "$gte": [{
                                "$size": "$pfrForm"
                            }, 1]
                        },
                        "then": "Yes",
                        "else": "No"
                    }
                }
            },

        },
        {
            "$project": {
                "_id": 0,
                "isPfrFilled": 1,
                "IsSfcFormFilled": 1,
                "pfmsFilledCount": 1,
                "totalUlbs":1,
                "sfcFile": {
                    "$cond": {
                        "if": {
                            "$gte": [{
                                "$size": "$sfcForm"
                            }, 1]
                        },
                        "then": { $arrayElemAt: ["$sfcForm.stateNotification", 0] },
                        "else": ""
                    }
                },
                "pfrFile": {
                    "$cond": {
                        "if": {
                            "$eq": ["$isPfrFilled", "Yes"]
                        },
                        "then": { $arrayElemAt: ["$pfrForm.stateNotification", 0] },
                        "else": ""
                    }
                },
                "pfmsFilledPerc": {
                    "$cond": {
                        "if": {
                            "$gt": ["$pfmsFilledCount", 1]
                        },
                        "then": {
                            "$multiply": [{
                                "$divide": [
                                    "$pfmsFilledCount",
                                    "$totalUlbs",
                                    
                                ]
                            }, 100]
                        },
                        "else": 0
                    }
                }
            }
        }
    ]
    return query
}


const getPFMSFilledQuery = (
  params,
  prevAccessYearKey,
  currentAccessYearKey = null,
  design_year
) => {
  try {
    let query = [
      {
        $match: {
          state: params.state,
          isActive: true,
          [prevAccessYearKey]: true,
        },
      },
      {
        $lookup: {
          from: "pfmsaccounts",
          let: {
            ulb: "$_id",
            prevYear: design_year,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$ulb", "$$ulb"],
                    },
                    {
                      $or: [
                        {
                          $in: ["$design_year", ["$$prevYear"]],
                        },
                      ],
                    },
                    {
                      $or: [
                        {
                          $eq: ["$currentFormStatus", 4],
                        },
                        {
                          $eq: ["$currentFormStatus", 6],
                        },
                        {
                          $or: [
                            {
                              $and: [
                                {
                                  $eq: ["$actionTakenByRole", "STATE"],
                                },
                                {
                                  $eq: ["$status", "APPROVED"],
                                },
                              ],
                            },
                            {
                              $and: [
                                {
                                  $eq: ["$actionTakenByRole", "MoHUA"],
                                },
                                {
                                  $eq: ["$status", "APPROVED"],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              },
            },
          ],
          as: "pfmsAccount",
        },
      },
      {
        $addFields: {
          pfmsFormFilled: {
            $cond: {
              if: {
                $gte: [
                  {
                    $size: "$pfmsAccount",
                  },
                  1,
                ],
              },
              then: "Yes",
              else: "No",
            },
          },
        },
      },
      {
        $group: {
          _id: "$state",
          totalUlbs: {
            $sum: 1,
          },
          pfmsFilledCount: {
            $sum: {
              $cond: {
                if: {
                  $eq: ["$pfmsFormFilled", "Yes"],
                },
                then: 1,
                else: 0,
              },
            },
          },
        },
      },
    ];
    if (currentAccessYearKey) {
      query[0]["$match"] = {
        ...query[0]["$match"],
        [currentAccessYearKey]: true,
        [prevAccessYearKey]: false
      };
    }
    return query;
  } catch (e) {
    console.log(e.message);
  }
};
module.exports.previousFormsAggregation = previousFormsAggregation
module.exports.getPFMSFilledQuery = getPFMSFilledQuery