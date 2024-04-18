const previousFormsAggregation = (params) => {
    let { state, design_year, prevYear } = params;
    let query = [
        {
            "$match": {
                "state": state,
                "isActive": true
            }
        },
        {
            "$lookup": {
                "from": "pfmsaccounts",
                "let": {
                    "design_year": design_year,
                    "ulb": "$_id",
                    "prevYear": prevYear
                },
                "pipeline": [
                    {
                        "$match": {
                            "$expr": {
                                "$and": [
                                    { "$eq": ["$ulb", "$$ulb"] },
                                    {
                                        "$or": [
                                            { "$eq": ["$design_year", "$$design_year"] },
                                            { "$eq": ["$design_year", "$$prevYear"] },
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

module.exports.previousFormsAggregation = previousFormsAggregation