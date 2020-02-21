const moment = require('moment');
const UlbLedger = require("../../../models/Schema/UlbLedger");
module.exports = async (req, res, next)=>{
    let queryArr = req.body.queryArr;
    let data=  [];
    for(query of queryArr){
        let obj = { year: query.financialYear, data:[]};
        for(d of query.data){
            let q = getAggregatedDataQuery(query.financialYear, d.range, d.ulb,d.totalUlb);
            try{
                let ulbData = await UlbLedger.aggregate(q).exec();
                if(ulbData.length){
                    obj["data"].push(ulbData[0]);
                }
            }catch (e) {
                console.log("Exception",e);
            }
        }
        data.push(obj);
    }
    return res.status(200).json({
        timestamp:moment().unix(),
        success:true,
        message:"",
        data:data
    });
}
const getAggregatedDataQuery = (financialYear, populationCategory, ulbs,totalUlb)=>{
    return [
        {
          $match : {
              financialYear:financialYear,
              ulb:ulbs // contains $in
          }
        },
        {
            $addFields:{
                financialYear:financialYear,
                populationCategory:populationCategory,
                ulbs:ulbs["$in"]
            }
        },
        {
            "$lookup": {
                "from": "lineitems",
                "localField": "lineItem",
                "foreignField": "_id",
                "as": "lineItem"
            }
        },
        {
            "$unwind": "$lineItem"
        },
        {
            "$lookup": {
                "from": "ulbs",
                "localField": "ulb",
                "foreignField": "_id",
                "as": "ulb"
            }
        },
        {
            "$unwind": "$ulb"
        },
        {
            "$group": {
                "_id": {
                    "ulb": "$ulb._id",
                    "financialYear": "$financialYear"
                },
                "populationCategory": {
                    "$first": "$populationCategory"
                },
                "ulbs" : {
                    $addToSet:{
                        "_id" : "$ulb._id",
                        "name" : "$ulb.name",
                        "population" : "$ulb.population",
                        "LoanFromCentralGovernment": {
                            "$sum": {
                                "$cond": [
                                    {
                                        "$eq": [
                                            "$lineItem.code",
                                            "33001"
                                        ]
                                    },
                                    "$amount",
                                    {
                                        "$cond": [
                                            {
                                                "$eq": [
                                                    "$lineItem.code",
                                                    "33101"
                                                ]
                                            },
                                            "$amount",
                                            0
                                        ]
                                    }
                                ]
                            }
                        },
                        "loanFromFIIB": {
                            "$sum": {
                                "$cond": [
                                    {
                                        "$eq": [
                                            "$lineItem.code",
                                            "33003"
                                        ]
                                    },
                                    "$amount",
                                    {
                                        "$cond": [
                                            {
                                                "$eq": [
                                                    "$lineItem.code",
                                                    "33103"
                                                ]
                                            },
                                            "$amount",
                                            0
                                        ]
                                    }
                                ]
                            }
                        },
                        "loanFromStateGovernment": {
                            "$sum": {
                                "$cond": [
                                    {
                                        "$eq": [
                                            "$lineItem.code",
                                            "33002"
                                        ]
                                    },
                                    "$amount",
                                    {
                                        "$cond": [
                                            {
                                                "$eq": [
                                                    "$lineItem.code",
                                                    "33102"
                                                ]
                                            },
                                            "$amount",
                                            0
                                        ]
                                    }
                                ]
                            }
                        },
                        "bondsAndOtherDebtInstruments": {
                            "$sum": {
                                "$cond": [
                                    {
                                        "$eq": [
                                            "$lineItem.code",
                                            "33004"
                                        ]
                                    },
                                    "$amount",
                                    {
                                        "$cond": [
                                            {
                                                "$eq": [
                                                    "$lineItem.code",
                                                    "33104"
                                                ]
                                            },
                                            "$amount",
                                            0
                                        ]
                                    }
                                ]
                            }
                        },
                        "others": {
                            "$sum": {
                                "$cond": [
                                    {
                                        "$eq": [
                                            "$lineItem.code",
                                            "33000"
                                        ]
                                    },
                                    "$amount",
                                    {
                                        "$cond": [
                                            {
                                                "$eq": [
                                                    "$lineItem.code",
                                                    "33100"
                                                ]
                                            },
                                            "$amount",
                                            0
                                        ]
                                    }
                                ]
                            }
                        },
                        "total": {
                            "$sum":{ "$cond": [
                                {
                                    "$eq": [
                                        "$lineItem.code",
                                        "33000"
                                    ]
                                },
                                "$amount",
                                {
                                    "$cond": [
                                        {
                                            "$eq": [
                                                "$lineItem.code",
                                                "33100"
                                            ]
                                        },
                                        "$amount",
                                        0
                                    ]
                                }
                            ]}
                        }
                    }
                },
                "numOfUlb": {
                    "$first": {"$size" : "$ulbs"}
                },
                "LoanFromCentralGovernment": {
                    "$sum": {
                        "$cond": [
                            {
                                "$eq": [
                                    "$lineItem.code",
                                    "33001"
                                ]
                            },
                            "$amount",
                            {
                                "$cond": [
                                    {
                                        "$eq": [
                                            "$lineItem.code",
                                            "33101"
                                        ]
                                    },
                                    "$amount",
                                    0
                                ]
                            }
                        ]
                    }
                },
                "loanFromFIIB": {
                    "$sum": {
                        "$cond": [
                            {
                                "$eq": [
                                    "$lineItem.code",
                                    "33003"
                                ]
                            },
                            "$amount",
                            {
                                "$cond": [
                                    {
                                        "$eq": [
                                            "$lineItem.code",
                                            "33103"
                                        ]
                                    },
                                    "$amount",
                                    0
                                ]
                            }
                        ]
                    }
                },
                "loanFromStateGovernment": {
                    "$sum": {
                        "$cond": [
                            {
                                "$eq": [
                                    "$lineItem.code",
                                    "33002"
                                ]
                            },
                            "$amount",
                            {
                                "$cond": [
                                    {
                                        "$eq": [
                                            "$lineItem.code",
                                            "33102"
                                        ]
                                    },
                                    "$amount",
                                    0
                                ]
                            }
                        ]
                    }
                },
                "bondsAndOtherDebtInstruments": {
                    "$sum": {
                        "$cond": [
                            {
                                "$eq": [
                                    "$lineItem.code",
                                    "33004"
                                ]
                            },
                            "$amount",
                            {
                                "$cond": [
                                    {
                                        "$eq": [
                                            "$lineItem.code",
                                            "33104"
                                        ]
                                    },
                                    "$amount",
                                    0
                                ]
                            }
                        ]
                    }
                },
                "others": {
                    "$sum": {
                        "$cond": [
                            {
                                "$eq": [
                                    "$lineItem.code",
                                    "33000"
                                ]
                            },
                            "$amount",
                            {
                                "$cond": [
                                    {
                                        "$eq": [
                                            "$lineItem.code",
                                            "33100"
                                        ]
                                    },
                                    "$amount",
                                    0
                                ]
                            }
                        ]
                    }
                }
            }
        },
        {
            "$project": {
                "_id": 0,
                "ulbs": 1,
                "populationCategory": "$populationCategory",
                "numOfUlb": 1,
                "LoanFromCentralGovernment": 1,
                "loanFromFIIB": 1,
                "loanFromStateGovernment": 1,
                "bondsAndOtherDebtInstruments": 1,
                "others": 1,
                "total": {
                    "$sum": [
                        "$LoanFromCentralGovernment",
                        "$loanFromFIIB",
                        "$loanFromStateGovernment",
                        "$bondsAndOtherDebtInstruments",
                        "$others"
                    ]
                }
            }
        },
        {$addFields: { totalUlb : totalUlb} }
    ];
}