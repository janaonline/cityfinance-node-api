const previousFormsAggregation = (params) => {
    let { state, design_year, prevYear } = params
    let query = [
        {
            "$match": {
                "state": state
            }
        },
        {
            "$lookup": {
                "from": "pfmsaccounts",
                "let": {
                    "design_year": design_year,
                    "ulb": "$_id"
                },
                "pipeline": [
                    {
                        "$match": {
                            "$expr": {
                                "$and": [
                                    { "$eq": ["$ulb", "$$ulb"] },
                                    { "$eq": ["$design_year", "$$design_year"] },
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
                                        "$eq": ["$state", "$$state"],
                                        "$eq": ["$isDraft", false]
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
                                        "$eq": ["$state", "$$state"],
                                        "$eq": ["$isDraft", false]
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
                "isPfrFilled": 1,
                "IsSfcFormFilled": 1,
                "pfrFile":{ $arrayElemAt: [ "$pfrForm.stateNotification", 0 ] },
                "pfmsFilledPerc": {
                    "$cond": {
                        "if": {
                            "$gt": ["$pfmsFilledCount", 1]
                        },
                        "then": {
                            "$multiply": [{
                                "$divide": [
                                    "$totalUlbs",
                                    "$pfmsFilledCount"
                                ]
                            }, 100]
                        },
                        "else": 0
                    }
                }
            }
        }
    ]
}

module.exports.previousFormsAggregation = previousFormsAggregation