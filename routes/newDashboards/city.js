const Ulb = require("../../models/Ulb");
const UlbLedger = require("../../models/UlbLedger");
const LINEITEM = require("../../models/LineItem");
const Sate = require("../../models/State");
const ULB = require("../../models/Ulb");
const Response = require("../../service").response;
const ObjectId = require("mongoose").Types.ObjectId;
const Redis = require("../../service/redis");
const { from } = require("form-data");
const LineItem = require("../../models/LineItem");
const util = require('util')
const headOfAccountDeficit = [
  ObjectId("5dd10c2885c951b54ec1d77e"),
  ObjectId("5dd10c2785c951b54ec1d77c"),
  ObjectId("5dd10c2785c951b54ec1d778"),
  ObjectId("5dd10c2785c951b54ec1d776"),
  ObjectId("5dd10c2685c951b54ec1d762"),
  ObjectId("5dd10c2685c951b54ec1d761"),
  ObjectId("5dd10c2685c951b54ec1d760"),
  ObjectId("5dd10c2585c951b54ec1d75f"),
  ObjectId("5dd10c2585c951b54ec1d75e"),
  ObjectId("5dd10c2585c951b54ec1d75b"),
  ObjectId("5dd10c2585c951b54ec1d75a"),
  ObjectId("5dd10c2585c951b54ec1d756"),
  ObjectId("5dd10c2585c951b54ec1d755"),
  ObjectId("5dd10c2585c951b54ec1d753"),
  ObjectId("5dd10c2485c951b54ec1d74f"),
  ObjectId("5dd10c2485c951b54ec1d74e"),
  ObjectId("5dd10c2485c951b54ec1d74b"),
  ObjectId("5dd10c2485c951b54ec1d74a"),
  ObjectId("5dd10c2385c951b54ec1d748"),
  ObjectId("5dd10c2385c951b54ec1d746"),
  ObjectId("5dd10c2385c951b54ec1d744"),
  ObjectId("5dd10c2385c951b54ec1d743"),
];
const headOfAccountIds = {
  ["Revenue"]: [
    ObjectId("5dd10c2885c951b54ec1d77e"),
    ObjectId("5dd10c2785c951b54ec1d778"),
    ObjectId("5dd10c2785c951b54ec1d776"),
    ObjectId("5dd10c2685c951b54ec1d762"),
    ObjectId("5dd10c2685c951b54ec1d761"),
    ObjectId("5dd10c2585c951b54ec1d75b"),
    ObjectId("5dd10c2485c951b54ec1d74f"),
    ObjectId("5dd10c2485c951b54ec1d74b"),
    ObjectId("5dd10c2485c951b54ec1d74a"),
    ObjectId("5dd10c2385c951b54ec1d748"),
  ],
  ["own_revenue"]: [
    ObjectId("5dd10c2885c951b54ec1d77e"),
    ObjectId("5dd10c2685c951b54ec1d762"),
    ObjectId("5dd10c2485c951b54ec1d74b"),
    ObjectId("5dd10c2485c951b54ec1d74a"),
    ObjectId("5dd10c2385c951b54ec1d748"),
    // ObjectId("5dd10c2285c951b54ec1d737"),
  ],
  ["revenue_expenditure_mix"]: [
    ObjectId("5dd10c2685c951b54ec1d760"),
    ObjectId("5dd10c2585c951b54ec1d75a"),
    ObjectId("5dd10c2585c951b54ec1d756"),
    ObjectId("5dd10c2585c951b54ec1d753"),
    ObjectId("5dd10c2385c951b54ec1d743"),
  ],
  ["Expense"]: [
    ObjectId("5dd10c2785c951b54ec1d77c"),
    ObjectId("5dd10c2685c951b54ec1d760"),
    ObjectId("5dd10c2585c951b54ec1d75f"),
    ObjectId("5dd10c2585c951b54ec1d75e"),
    ObjectId("5dd10c2585c951b54ec1d75a"),
    ObjectId("5dd10c2585c951b54ec1d756"),
    ObjectId("5dd10c2585c951b54ec1d755"),
    ObjectId("5dd10c2585c951b54ec1d753"),
    ObjectId("5dd10c2485c951b54ec1d74e"),
    ObjectId("5dd10c2385c951b54ec1d746"),
    ObjectId("5dd10c2385c951b54ec1d744"),
    ObjectId("5dd10c2385c951b54ec1d743"),
  ],
  ["capital_expenditure"]: [
    ObjectId("5dd10c2785c951b54ec1d779"),
    ObjectId("5dd10c2785c951b54ec1d774"),
  ],
  ["revenue_expenditure"]: [
    ObjectId("5dd10c2885c951b54ec1d77e"),
    ObjectId("5dd10c2685c951b54ec1d762"),
    ObjectId("5dd10c2685c951b54ec1d760"),
    ObjectId("5dd10c2585c951b54ec1d75a"),
    ObjectId("5dd10c2585c951b54ec1d756"),
    ObjectId("5dd10c2585c951b54ec1d753"),
    ObjectId("5dd10c2485c951b54ec1d74b"),
    ObjectId("5dd10c2485c951b54ec1d74a"),
    ObjectId("5dd10c2385c951b54ec1d748"),
    ObjectId("5dd10c2385c951b54ec1d743"),
  ],
};

const Capital_Expenditure = [
  "5dd10c2785c951b54ec1d779",
  "5dd10c2785c951b54ec1d774",
];

const calculateStateAvg = (data) => {
  let numerator = 0,
    denominator = 0;

  data.forEach((el) => {
    numerator +=
      (el.value || el.value == 0 ? el.value : el.amount) * el.population;
    denominator = el.population + denominator;
  });
  return Number((numerator / denominator).toFixed(2));
};

const indicator = async (req, res) => {
  try {
    let {
      ulb,
      financialYear,
      headOfAccount,
      filterName,
      isPerCapita,
      compareType,
      getQuery,
      stateId,
      ulbTypeId,
    } = req.body;
    if (
      !headOfAccount ||
      (!ulb && !stateId) ||
      !financialYear ||
      !filterName ||
      !Array.isArray(financialYear) ||
      !Array.isArray(ulb)
    )
      return Response.BadRequest(
        res,
        null,
        "check ulb as array, financialYear as array, headOfAccount, filterName, stateId or ulb should be there"
      );
    let matchObj = {
      financialYear: { $in: financialYear },
      ulb: { $in: ulb.map((value) => ObjectId(value)) },
    };
    Object.assign(matchObj, {
      lineItem: { $in: headOfAccountIds[headOfAccount] },
    });
    let query = [
      {
        $match: matchObj,
      },
      {
        $lookup: {
          from: "ulbs",
          localField: "ulb",
          foreignField: "_id",
          as: "ulb",
        },
      },
      { $unwind: "$ulb" },
      {
        $lookup: {
          from: "lineitems",
          localField: "lineItem",
          foreignField: "_id",
          as: "lineitems",
        },
      },
      { $unwind: "$lineitems" },
    ];

    switch (filterName) {
      case "revenue":
        let group = {
          _id: {
            ulb: "$ulb._id",
            financialYear: "$financialYear",
          },
          amount: { $sum: "$amount" },
          ulbName: { $first: "$ulb.name" },
        };
        if (isPerCapita) {
          group.population = {
            $first: "$ulb.population",
          };
        }
        query.push({
          $group: group,
        });
        if (isPerCapita)
          query.push({
            $project: {
              _id: 1,
              amount: {
                $divide: ["$amount", "$population"],
              },
              ulbName: 1,
            },
          });
        query.push({
          $sort: { "_id.financialYear": 1 },
        });
        break;
      case "expenditure_mix":
      case "revenue_mix":
        query.push({
          $group: {
            _id: {
              ulb: "$ulb._id",
              lineItem: "$lineitems.name",
            },
            ulbName: { $first: "$ulb.name" },
            colour: { $first: "$lineitems.colour" },
            amount: { $sum: "$amount" },
            code: { $first: "$lineitems.code" },
          },
        });
        break;
      case "property_tax":
        query.map((value) => {
          if (value["$lookup"]?.from === "lineitems") {
            Object.assign(value["$lookup"].pipeline[0]?.$match?.$expr, {
              $eq: ["$name", "Property Tax"],
            });
          }
        });
        query.push({
          $group: {
            _id: {
              ulb: "$ulb._id",
              financialYear: "$financialYear",
            },
            ulbName: { $first: "$ulb.name" },
            amount: { $sum: "$amount" },
          },
        });
        break;
      case "total_surplus/deficit":
        matchObj["lineItem"].$in = headOfAccountDeficit;
        query.push(
          {
            $group: {
              _id: {
                ulb: "$ulb._id",
                financialYear: "$financialYear",
              },
              ulbName: {
                $first: "$ulb.name",
              },
              amount: {
                $sum: "$amount",
              },
              revenue: {
                $sum: {
                  $cond: {
                    if: { $eq: ["$lineitems.headOfAccount", "Revenue"] },
                    then: "$amount",
                    else: 0,
                  },
                },
              },
              expense: {
                $sum: {
                  $cond: {
                    if: { $eq: ["$lineitems.headOfAccount", "Expense"] },
                    then: "$amount",
                    else: 0,
                  },
                },
              },
            },
          },
          {
            $project: {
              _id: 1,
              ulbName: 1,
              revenue: 1,
              expense: 1,
              amount: { $subtract: ["$revenue", "$expense"] },
            },
          }
        );
        break;
      case "capital_expenditure":
       
    // for capital expenditure and capex per capita
//     let ulbIDs = [],
//     AllULBs = [];

//   AllULBs = await Ulb.find({ state: ObjectId(stateId) })
//     .select("_id")
//     .lean();
//   AllULBs = AllULBs.map((each) => {
//     HashTable.set(each._id.toString(), true);
//     return each._id;
//   });
//   if (!ulb.length) {
//     ulbIDs = AllULBs;
//   } else {
//     ulb = ulb.map((value) => {
//       return ObjectId(value);
//     });
//     ulbIDs = ulb;
//   }
//   let base_query = [
//     {
//       $match: {
//         financialYear: financialYear,
//         ulb: {
//           $in: [...ulbIDs],
//         },
//       },
//     },
//   ];
//   // state Avg is calculatd separately to handle the ulb specific searches
//   let state_avg_base_query = [
//     {
//       $match: {
//         financialYear: financialYear,
//         ulb: {
//           $in: [...AllULBs],
//         },
//       },
//     },
//   ];

//     let financialYearArr = [];
//     financialYear.forEach((el, index)=> {
//       financialYearArr.push(el,financialYear[index+1] );
       
      

//     })
   
  
//  let ulbIds_query = [
//   {
//       $match: {
//   $or : [{financialYear:financialYearArr[0]},{financialYear:financialYearArr[1]}],
//           lineItem: {
//               $in: [
//               ObjectId("5dd10c2785c951b54ec1d779"),
//               ObjectId("5dd10c2785c951b54ec1d774")
//               ]
//               }
//           }
//       },
//       {
//           $group: {
//               _id : "$financialYear",
//               ulbs: {$addToSet: "$ulb"}
//               }
//           },
//           {
//               $group: {
//                   _id: null,
//                   ulbPrev : {
//                       $addToSet: {
//                            $cond: [
//                       {$eq: ["$_id", financialYearArr[1]]},
//                       "$ulbs",
//                       null
//                       ]
//                           }
                     
//                       },
//                         ulbNew : {
//                       $addToSet: {
//                            $cond: [
//                       {$eq: ["$_id", financialYearArr[0]]},
//                       "$ulbs",
//                       null
//                       ]
//                           }
                     
//                       }
                      
//                   }
//               },
//               {
//                   $project: {
//                       ulbPrev: {$arrayElemAt: ["$ulbPrev", 0]},
//                                           ulbNew: {$arrayElemAt: ["$ulbNew", 1]},
//                       }
//                   },
//                    { $project: { commonToBoth: { $setIntersection: [ "$ulbPrev", "$ulbNew" ] }} }
//   ]

// let output =   await UlbLedger.aggregate(ulbIds_query)
// let ulbID = output[0]?.commonToBoth
// ulbID = ulbID.map((value) => {
//   return ObjectId(value);
// });
// if(!ulbID.includes(ulb[0])){
//   return res.json({
//     success: false,
//     message: "ULB previous year data not found"
//   })
//     }
//   state_avg_base_query = [
//     {
//       $match: {
//         financialYear: { $in: [...financialYearArr] },
//         ulb: {
//           $in: [...AllULBs],
//         },
//       },
//     },
//   ];

//   let query = [
//     {
//       $match: {
//          $or: [{financialYear: financialYearArr[0]},{financialYear: financialYearArr[1]}],
//         lineItem: {
//           $in: [...Capital_Expenditure.map((value) => ObjectId(value))],
//         },
// ulb: {
// $in: ulb
// }
//       },
//     },
//     {
//       $lookup: {
//         from: "ulbs",
//         localField: "ulb",
//         foreignField: "_id",
//         as: "ulb",
//       },
//     },
//     {
//       $unwind: "$ulb",
//     },
//     {
//       $match: {

//         "ulb.state": ObjectId(stateId)
//       }
//     },
//     {
//       $lookup: {
//         from: "ulbtypes",
//         localField: "ulb.ulbType",
//         foreignField: "_id",
//         as: "ulbType",
//       },
//     },
//     {
//       $unwind: "$ulbType",
//     },
//     {
//       $group: {
//         _id: "$ulb._id",
//         ulbName: { $first: "$ulb.name" },
//         ulbId: { $first: "$ulb._id" },
//         ulbType: { $first: "$ulbType.name" },
//         population: { $first: "$ulb.population" },
//         capitalWorkPrevYear: {
//           $sum: {
//             $cond: [
//               {
//                 $and: [
//                   { $eq: ["$financialYear", financialYearArr[1]] },
//                   {
//                     $eq: ["$lineItem", ObjectId("5dd10c2785c951b54ec1d774")],
//                   },
//                 ],
//               },
//               "$amount",
//               0,
//             ],
//           },
//         },
//         capitalWorkCurrYear: {
//           $sum: {
//             $cond: [
//               {
//                 $and: [
//                   { $eq: ["$financialYear", financialYearArr[0]] },
//                   {
//                     $eq: ["$lineItem", ObjectId("5dd10c2785c951b54ec1d774")],
//                   },
//                 ],
//               },
//               "$amount",
//               0,
//             ],
//           },
//         },
//         grossBlockPrevYear: {
//           $sum: {
//             $cond: [
//               {
//                 $and: [
//                   { $eq: ["$financialYear", financialYearArr[1]] },
//                   {
//                     $eq: ["$lineItem", ObjectId("5dd10c2785c951b54ec1d779")],
//                   },
//                 ],
//               },
//               "$amount",
//               0,
//             ],
//           },
//         },
//         grossBlockCurrYear: {
//           $sum: {
//             $cond: [
//               {
//                 $and: [
//                   { $eq: ["$financialYear", financialYearArr[0]] },
//                   {
//                     $eq: ["$lineItem", ObjectId("5dd10c2785c951b54ec1d779")],
//                   },
//                 ],
//               },
//               "$amount",
//               0,
//             ],
//           },
//         },
//       },
//     },
//     {
//       $project: {
//         ulbName: 1,
//         ulbType: 1,
//         ulbId: 1,
//         population: 1,
//         amount: {
//           $add: [
//             { $subtract: ["$grossBlockCurrYear", "$grossBlockPrevYear"] },
//             { $subtract: ["$capitalWorkCurrYear", "$capitalWorkPrevYear"] },
//           ],
//         },
//       },
//     },
//     {
//       $sort: {
//         amount: -1,
//       },
//     },
//   ];
//   let query_s = [
//     {
//       $match: {
//          $or: [{financialYear: financialYearArr[0]},{financialYear: financialYearArr[1]}],
//         lineItem: {
//           $in: [...Capital_Expenditure.map((value) => ObjectId(value))],
//         },
// ulb: {
// $in: ulbID
// }
//       },
//     },
//     {
//       $lookup: {
//         from: "ulbs",
//         localField: "ulb",
//         foreignField: "_id",
//         as: "ulb",
//       },
//     },
//     {
//       $unwind: "$ulb",
//     },
//     {
//       $match: {

//         "ulb.state": ObjectId(stateId)
//       }
//     },
//     {
//       $lookup: {
//         from: "ulbtypes",
//         localField: "ulb.ulbType",
//         foreignField: "_id",
//         as: "ulbType",
//       },
//     },
//     {
//       $unwind: "$ulbType",
//     },
//     {
//       $group: {
//         _id: "$ulb._id",
//         ulbName: { $first: "$ulb.name" },
//         ulbId: { $first: "$ulb._id" },
//         ulbType: { $first: "$ulbType.name" },
//         population: { $first: "$ulb.population" },
//         capitalWorkPrevYear: {
//           $sum: {
//             $cond: [
//               {
//                 $and: [
//                   { $eq: ["$financialYear", financialYearArr[1]] },
//                   {
//                     $eq: ["$lineItem", ObjectId("5dd10c2785c951b54ec1d774")],
//                   },
//                 ],
//               },
//               "$amount",
//               0,
//             ],
//           },
//         },
//         capitalWorkCurrYear: {
//           $sum: {
//             $cond: [
//               {
//                 $and: [
//                   { $eq: ["$financialYear", financialYearArr[0]] },
//                   {
//                     $eq: ["$lineItem", ObjectId("5dd10c2785c951b54ec1d774")],
//                   },
//                 ],
//               },
//               "$amount",
//               0,
//             ],
//           },
//         },
//         grossBlockPrevYear: {
//           $sum: {
//             $cond: [
//               {
//                 $and: [
//                   { $eq: ["$financialYear", financialYearArr[1]] },
//                   {
//                     $eq: ["$lineItem", ObjectId("5dd10c2785c951b54ec1d779")],
//                   },
//                 ],
//               },
//               "$amount",
//               0,
//             ],
//           },
//         },
//         grossBlockCurrYear: {
//           $sum: {
//             $cond: [
//               {
//                 $and: [
//                   { $eq: ["$financialYear", financialYearArr[0]] },
//                   {
//                     $eq: ["$lineItem", ObjectId("5dd10c2785c951b54ec1d779")],
//                   },
//                 ],
//               },
//               "$amount",
//               0,
//             ],
//           },
//         },
//       },
//     },
//     {
//       $project: {
//         ulbName: 1,
//         ulbType: 1,
//         ulbId: 1,
//         population: 1,
//         amount: {
//           $add: [
//             { $subtract: ["$grossBlockCurrYear", "$grossBlockPrevYear"] },
//             { $subtract: ["$capitalWorkCurrYear", "$capitalWorkPrevYear"] },
//           ],
//         },
//       },
//     },
//     {
//       $sort: {
//         amount: -1,
//       },
//     },
//   ];
  
//   finalQuery = query;
//   finalQuery_stateAvg = [...state_avg_base_query, ...query_s];
//   console.log(util.inspect(finalQuery, {showHidden: false, depth: null}))
//   if (getQuery)
//     return res.status(200).json({ finalQuery, finalQuery_stateAvg });
//     console.log(util.inspect(finalQuery, {showHidden: false, depth: null}))
//   let tenData = [];
//   // console.log(util.inspect(finalQuery, { showHidden: false, depth: null }));
//   // is per capita attachment code
//   if (isPerCapita) {
//     let perCapitaQuery = [
//       {
//         $project: {
//           ulbName: 1,
//           population: 1,
//           ulbType: 1,
//           amount: {
//             $cond: [
//               { $eq: ["$population", 0] },
//               0,
//               { $divide: ["$amount", "$population"] },
//             ],
//           },
//         },
//       },
//     ];
//     finalQuery.push(...perCapitaQuery);
//     finalQuery_stateAvg.push(...perCapitaQuery);
//   }

//   let data = await Promise.all([
//     UlbLedger.aggregate(finalQuery),
//     UlbLedger.aggregate(finalQuery_stateAvg),
//   ]);
  
//   // calculating State Avg
//   let stateAvg = calculateStateAvg(data[1]);
  


//     // scatter plot api called
//     return res.status(200).json({
//       success: true,
//       data: data[0],
//       stateAvg : stateAvg
//     });
  

//         break;
      case "capital_expenditure_per_capita":
        matchObj["lineItem"].$in = headOfAccountIds["capital_expenditure"];
        let group2 = {
          _id: {
            ulb: "$ulb._id",
            financialYear: "$financialYear",
            lineItemName: "$lineitems.name",
          },
          amount: { $sum: "$amount" },
          ulbName: { $first: "$ulb.name" },
          colour: { $first: "$lineitems.colour" },
          code: { $first: "$lineitems.code" },
        };
        if (isPerCapita) {
          group2.amount = {
            $sum: {
              $cond: [
                { $eq: ["$ulb.population", 0] },
                0,
                { $divide: ["$amount", "$ulb.population"] },
              ],
            },
          };
        }
        let group3 = {
          $group: {
            _id: "$_id.financialYear",
            yearData: {
              $push: {
                name: "$_id.lineItemName",
                amount: "$amount",
                ulbName: "$ulbName",
                code: "$code",
              },
            },
          },
        };

        query.push({
          $group: group2,
        });

        query.push(group3, {
          $sort: { _id: 1 },
        });
        break;
      case "total_own_revenue":
      case "own_revenue_per_capita":
        matchObj["lineItem"].$in = headOfAccountIds["own_revenue"];
        let groupNew = {
          _id: {
            ulb: "$ulb._id",
            financialYear: "$financialYear",
          },
          amount: { $sum: "$amount" },
          ulbName: { $first: "$ulb.name" },
          amount2: {
            $sum: {
              $cond: {
                if: { $eq: ["$lineitems.code", "11001"] },
                then: "$amount",
                else: 0,
              },
            },
          },
        };
        if (isPerCapita) {
          groupNew.population = {
            $first: "$ulb.population",
          };
        }
        query.push({
          $group: groupNew,
        });

        if (isPerCapita) {
          query.push({
            $project: {
              _id: 1,
              amount: {
                $divide: [
                  { $subtract: ["$amount", "$amount2"] },
                  "$population",
                ],
              },
              ulbName: 1,
            },
          });
        } else {
          query.push({
            $project: {
              _id: 1,
              amount: { $subtract: ["$amount", "$amount2"] },
              ulbName: 1,
              population: 1,
            },
          });
        }
        query.push({
          $sort: { "_id.financialYear": 1 },
        });
        break;
      case "own_revenue_mix":
        matchObj["lineItem"].$in = headOfAccountIds["own_revenue"];
        query.push({
          $group: {
            _id: {
              ulb: "$ulb._id",
              lineItem: "$lineitems.name",
            },
            ulbName: { $first: "$ulb.name" },
            amount: { $sum: "$amount" },
            colour: { $first: "$lineitems.colour" },
            amount2: {
              $sum: {
                $cond: {
                  if: { $eq: ["$linitems.code", "11001"] },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            code: { $first: "$lineitems.code" },
          },
        });
        break;
      case "revenue_expenditure_mix":
        matchObj["lineItem"].$in = headOfAccountIds["revenue_expenditure_mix"];
        query.push({
          $group: {
            _id: {
              ulb: "$ulb._id",
              lineItem: "$lineitems.name",
            },
            ulbName: { $first: "$ulb.name" },
            colour: { $first: "$lineitems.colour" },
            amount: { $sum: "$amount" },
            code: { $first: "$lineitems.code" },
          },
        });
        break;
      case "revenue_expenditure":
        Object.assign(matchObj, {
          lineItem: {
            $in: headOfAccountIds["revenue_expenditure"],
          },
        });
        let groupObj = {
          _id: {
            ulb: "$ulb._id",
            financialYear: "$financialYear",
          },
          amount: { $sum: "$amount" },
          ulbName: { $first: "$ulb.name" },
        };
        Object.assign(groupObj, {
          revenue: {
            $sum: {
              $cond: {
                if: {
                  $in: ["$lineitems.code", ["110", "130", "140", "150", "180"]],
                },
                then: "$amount",
                else: 0,
              },
            },
          },
          expense: {
            $sum: {
              $cond: {
                if: {
                  $in: ["$lineitems.code", ["200", "210", "220", "230", "240"]],
                },
                then: "$amount",
                else: 0,
              },
            },
          },
        });
        query.push({
          $group: groupObj,
        });
        break;
      default:
        break;
    }

    let newQuery;
    if (compareType)
      newQuery = await comparator(
        compareType,
        query,
        ulb[0],
        isPerCapita,
        filterName,
        req.body
      );
    if (getQuery) return res.json({ query, newQuery });
    let redisKey = JSON.stringify({ query, newQuery });
    let redisData = await Redis.getDataPromise(redisKey);
    let compData, data, returnData;
    if (!redisData) {
      if (newQuery) compData = UlbLedger.aggregate(newQuery);
      data = UlbLedger.aggregate(query);
      let allData = await Promise.all([data, compData]);
      data = allData[0];
      compData = allData[1];
      returnData = { ulbData: data, compData };
      Redis.set(redisKey, JSON.stringify(returnData));
    } else {
      returnData = JSON.parse(redisData);
    }

    if (!returnData.ulbData.length)
      return Response.BadRequest(res, null, "No RecordFound");

    return Response.OK(res, returnData);
  } catch (error) {
    console.log(error);
    return Response.DbError(res, null, error.message);
  }
};

const comparator = async (compareFrom, query, ulb, isPerCapita, from, body) => {
  if (from == "revenue_expenditure")
    return revenueExpenditureQueryCompare(
      compareFrom,
      query,
      ulb,
      isPerCapita,
      body
    );
  if (from.includes("expenditure") || from.includes("surplus")) {
    return expenseQueryCompare(
      compareFrom,
      query,
      ulb,
      isPerCapita,
      from,
      body
    );
  }
  if (from.includes("revenue"))
    return revenueQueryCompare(
      compareFrom,
      query,
      ulb,
      isPerCapita,
      from,
      body
    );
  let newData = JSON.parse(JSON.stringify(query)); //deep copy of prev query
  if (newData[0]["$match"]["lineItem"])
    newData[0]["$match"]["lineItem"]["$in"] = newData[0]["$match"]["lineItem"][
      "$in"
    ].map((value) => ObjectId(value));
  let ulbData = await Ulb.findOne({ _id: ObjectId(ulb) }).lean();
  switch (compareFrom) {
    case "ULB Population Category Average":
    case "ULB Type Average":
    case "National Average":
    case "State "  :
      case  "State Average" :
      if (compareFrom == "National Average") delete newData[0]?.$match?.ulb;
      else {
        let ids;
        if (compareFrom.includes('State'))
          ids = await Ulb.find({ state: ulbData.state })
            .select({ _id: 1 })
            .lean();
        if (compareFrom == "ULB Type Average")
          ids = await Ulb.find({ ulbType: ulbData.ulbType })
            .select({ _id: 1 })
            .lean();
        if (compareFrom == "ULB Population Category Average") {
          let temp = getPopulationIds(ulbData.population);
          ids = await Ulb.find(temp).select({ _id: 1 }).lean();
        }
        newData[0]["$match"]["ulb"] = {
          $in: ids.map((value) => ObjectId(value._id)),
        };
      }
      if (ulbData)
        newData.splice(2, 0, {
          $match: { "ulb.state": ObjectId(ulbData.state) },
        });
      newData.splice(3, 0, {
        $lookup: {
          from: "states",
          localField: "ulb.state",
          foreignField: "_id",
          as: "state",
        },
      });
      newData = newData.map((value, index) => {
        if (value["$group"]) {
          delete value["$group"]._id?.ulb;
          if (from == "total_surplus/deficit") {
            Object.assign(value["$group"], {
              population: { $sum: "$ulb.population" },
            });
          }
          Object.assign(value["$group"]._id, { state: "$ulb.state" });
          value["$group"].ulbName = { $first: "$state.name" };
          Object.assign(value["$group"], {
            numerator: {
              $sum: isPerCapita
                ? "$amount"
                : { $multiply: ["$amount", "$ulb.population"] },
            },
            numerator2: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$lineitems.code", "11001"],
                  },
                  then: isPerCapita
                    ? "$amount"
                    : { $multiply: ["$amount", "$ulb.population"] },
                  else: 0,
                },
              },
            },
            denominator: { $sum: "$ulb.population" },
            ulbName: {
              $first: "$state.name",
            },
          });
        }
        if (value["$project"]) {
          Object.assign(value["$project"], {
            numerator: { $subtract: ["$numerator", "$numerator2"] },
            denominator: 1,
          });
        }
        return value;
      });
      if (
        isPerCapita &&
        from != "capital_expenditure" &&
        from != "capital_expenditure_per_capita" &&
        from !== "own_revenue_per_capita"
      ) {
        let temp = newData.pop();
        newData.pop();
        newData.push(temp);
      }
      if (from == "total_surplus/deficit") {
        newData[newData.length - 1]["$project"] = {
          _id: 1,
          ulbName: 1,
          revenue: 1,
          expense: 1,
          amount: {
            $subtract: ["$revenue", "$expense"],
          },
        };
      }
      if (
        from != "total_surplus/deficit" &&
        from != "capital_expenditure" &&
        from != "capital_expenditure_per_capita"
      )
        newData.push({
          $project: {
            _id: 1,
            amount: { $divide: ["$numerator", "$denominator"] },
            ulbName: 1,
            code: 1,
          },
        });
      if (
        from == "capital_expenditure" ||
        from == "capital_expenditure_per_capita"
      ) {
        newData.splice(newData.length - 2, 0, {
          $project: {
            _id: 1,
            amount: { $divide: ["$numerator", "$denominator"] },
            ulbName: 1,
            code: 1,
          },
        });
      }
      break;
  }
  return newData;
};

let globalState;

async function revenueExpenditureQueryCompare(
  compareFrom,
  query,
  ulb,
  isPerCapita,
  body
) {
  console.log(compareFrom, query, ulb);
  let ulbData;
  let ulbId;
  let tempQ;
  switch (compareFrom) {
    case "State ": 
    case  'State Average':
      ulbData = await ULB.findOne({ _id: ulb }).lean();
      ulbId = await ULB.find({ state: ulbData.state }).lean();
      tempQ = [
        {
          $match: {
            financialYear: {
              $in: body.financialYear,
            },
            ulb: {
              $in: ulbId.map((val) => val._id),
            },
            lineItem: {
              $in: headOfAccountIds["revenue_expenditure"],
            },
          },
        },
        {
          $lookup: {
            from: "ulbs",
            localField: "ulb",
            foreignField: "_id",
            as: "ulb",
          },
        },
        {
          $unwind: "$ulb",
        },
        {
          $lookup: {
            from: "states",
            localField: "ulb.state",
            foreignField: "_id",
            as: "state",
          },
        },
        {
          $unwind: "$state",
        },
        {
          $lookup: {
            from: "lineitems",
            localField: "lineItem",
            foreignField: "_id",
            as: "lineitems",
          },
        },
        {
          $unwind: "$lineitems",
        },
        {
          $group: {
            _id: {
              financialYear: "$financialYear",
              ulb: "$ulb._id",
            },
            state: {
              $first: "$state._id",
            },
            ulbName: {
              $first: "$state.name",
            },
            revenue: {
              $sum: {
                $cond: {
                  if: {
                    $in: [
                      "$lineitems.code",
                      ["110", "130", "140", "150", "180"],
                    ],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            expense: {
              $sum: {
                $cond: {
                  if: {
                    $in: [
                      "$lineitems.code",
                      ["200", "210", "220", "230", "240"],
                    ],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            population: {
              $first: "$ulb.population",
            },
          },
        },
        {
          $group: {
            _id: {
              financialYear: "$_id.financialYear",
              state: "$state",
            },
            ulbName: {
              $first: "$ulbName",
            },
            revenue: {
              $sum: { $multiply: ["$revenue", "$population"] },
            },
            expense: {
              $sum: { $multiply: ["$expense", "$population"] },
            },
            denominator: {
              $sum: "$population",
            },
          },
        },
        {
          $project: {
            _id: 1,
            revenue: {
              $cond: {
                if: { $lt: ["$denominator", 1] },
                then: 0,
                else: { $divide: ["$revenue", "$denominator"] },
              },
            },
            expense: {
              $cond: {
                if: { $lt: ["$denominator", 1] },
                then: 0,
                else: { $divide: ["$expense", "$denominator"] },
              },
            },
            ulbName: 1,
            code: 1,
          },
        },
      ];
      return tempQ;
      break;
    case "ULB Population Category Average":
    case "National Average":
      ulbData = await ULB.findOne({ _id: ulb }).lean();
      ulbId = await ULB.find({ state: ulbData.state }).lean();
      tempQ = [
        {
          $match: {
            financialYear: {
              $in: ["2020-21", "2019-20", "2018-19"],
            },
            // ulb: {
            //   $in: ulbId.map((val) => val._id),
            // },
            lineItem: {
              $in: headOfAccountIds["revenue_expenditure"],
            },
          },
        },
        {
          $lookup: {
            from: "ulbs",
            localField: "ulb",
            foreignField: "_id",
            as: "ulb",
          },
        },
        {
          $lookup: {
            from: "states",
            localField: "ulb.state",
            foreignField: "_id",
            as: "state",
          },
        },
        {
          $unwind: "$ulb",
        },
        {
          $lookup: {
            from: "lineitems",
            localField: "lineItem",
            foreignField: "_id",
            as: "lineitems",
          },
        },
        {
          $unwind: "$lineitems",
        },
        {
          $group: {
            _id: {
              financialYear: "$financialYear",
              state: "$ulb.state",
            },
            amount: {
              $sum: "$amount",
            },
            ulbName: {
              $first: "$state.name",
            },
            revenue: {
              $sum: {
                $cond: {
                  if: {
                    $in: [
                      "$lineitems.code",
                      ["110", "130", "140", "150", "180"],
                    ],
                  },
                  then: isPerCapita
                    ? "$amount"
                    : { $multiply: ["$amount", "$ulb.population"] },
                  else: 0,
                },
              },
            },
            expense: {
              $sum: {
                $cond: {
                  if: {
                    $in: [
                      "$lineitems.code",
                      ["200", "210", "220", "230", "240"],
                    ],
                  },
                  then: isPerCapita
                    ? "$amount"
                    : { $multiply: ["$amount", "$ulb.population"] },
                  else: 0,
                },
              },
            },
            denominator: {
              $sum: "$ulb.population",
            },
          },
        },
        {
          $project: {
            _id: 1,
            revenue: {
              $divide: ["$revenue", "$denominator"],
            },
            expense: {
              $divide: ["$expense", "$denominator"],
            },
            ulbName: 1,
            code: 1,
          },
        },
      ];
      return tempQ;
      break;

    case "ULB Type Average":
      ulbData = await ULB.findOne({ _id: ulb }).lean();
      ulbId = await ULB.find({ state: ulbData.ulbType }).lean();
      tempQ = [
        {
          $match: {
            financialYear: {
              $in: ["2020-21", "2019-20", "2018-19"],
            },
            // ulb: {
            //   $in: ulbId.map((val) => val._id),
            // },
            lineItem: {
              $in: headOfAccountIds["revenue_expenditure"],
            },
          },
        },
        {
          $lookup: {
            from: "ulbs",
            localField: "ulb",
            foreignField: "_id",
            as: "ulb",
          },
        },
        {
          $lookup: {
            from: "states",
            localField: "ulb.state",
            foreignField: "_id",
            as: "state",
          },
        },
        {
          $unwind: "$ulb",
        },
        {
          $lookup: {
            from: "lineitems",
            localField: "lineItem",
            foreignField: "_id",
            as: "lineitems",
          },
        },
        {
          $unwind: "$lineitems",
        },
        {
          $group: {
            _id: {
              financialYear: "$financialYear",
              state: "$ulb.state",
            },
            amount: {
              $sum: "$amount",
            },
            ulbName: {
              $first: "$state.name",
            },
            revenue: {
              $sum: {
                $cond: {
                  if: {
                    $in: [
                      "$lineitems.code",
                      ["110", "130", "140", "150", "180"],
                    ],
                  },
                  then: isPerCapita
                    ? "$amount"
                    : { $multiply: ["$amount", "$ulb.population"] },
                  else: 0,
                },
              },
            },
            expense: {
              $sum: {
                $cond: {
                  if: {
                    $in: [
                      "$lineitems.code",
                      ["200", "210", "220", "230", "240"],
                    ],
                  },
                  then: isPerCapita
                    ? "$amount"
                    : { $multiply: ["$amount", "$ulb.population"] },
                  else: 0,
                },
              },
            },
            denominator: {
              $sum: "$ulb.population",
            },
          },
        },
        {
          $project: {
            _id: 1,
            revenue: {
              $divide: ["$revenue", "$denominator"],
            },
            expense: {
              $divide: ["$expense", "$denominator"],
            },
            ulbName: 1,
            code: 1,
          },
        },
      ];
      return tempQ;
      break;

    default:
      break;
  }
}

async function revenueQueryCompare(
  compareFrom,
  query,
  ulb,
  isPerCapita,
  from,
  body
) {
  let ulbData;
  let ulbId, lineItemIds;
  let tempQ;
  if (from.includes("own") && from.includes("revenue")) {
    lineItemIds = await LINEITEM.find({
      code: { $in: ["110", "130", "140", "150", "180"] },
    });
  } else {
    lineItemIds = await LINEITEM.find({ headOfAccount: "Revenue" });
  }
  switch (compareFrom) {
    case "State " : 
    case 'State Average':
      ulbData = await ULB.findOne({ _id: ulb });
      ulbId = await ULB.find({ state: ulbData.state });
      tempQ = [
        {
          $match: {
            financialYear: {
              $in: body.financialYear,
            },
            ulb: {
              $in: ulbId.map((val) => val._id),
            },
            lineItem: {
              $in: lineItemIds.map((val) => val._id),
            },
          },
        },
        {
          $lookup: {
            from: "ulbs",
            localField: "ulb",
            foreignField: "_id",
            as: "ulb",
          },
        },
        {
          $lookup: {
            from: "states",
            localField: "ulb.state",
            foreignField: "_id",
            as: "state",
          },
        },
        { $unwind: "$state" },
        {
          $unwind: "$ulb",
        },
        {
          $lookup: {
            from: "lineitems",
            localField: "lineItem",
            foreignField: "_id",
            as: "lineitems",
          },
        },
        {
          $unwind: "$lineitems",
        },
      ];
      if (from.includes("mix")) {
        tempQ.push({
          $group: {
            _id: {
              state: "$state._id",
              lineItem: "$lineitems.name",
            },
            colour: { $first: "$lineitems.colour" },
            ulbName: { $first: "$state.name" },
            code: { $first: "$lineitems.code" },
            amount: { $sum: "$amount" },
          },
        });
      } else {
        if (isPerCapita) {
          tempQ.push(
            {
              $group: {
                _id: {
                  financialYear: "$financialYear",
                  ulb: "$ulb._id",
                },
                state: {
                  $first: "$state.name",
                },
                amount: {
                  $sum: "$amount",
                },
                population: {
                  $first: "$ulb.population",
                },
              },
            },
            {
              $unwind: "$state",
            },
            {
              $group: {
                _id: {
                  financialYear: "$_id.financialYear",
                },
                state: {
                  $first: "$state",
                },
                amount: {
                  $sum: "$amount",
                },
                population: {
                  $sum: "$population",
                },
              },
            },
            {
              $project: {
                _id: 1,
                amount: { $divide: ["$amount", "$population"] },
                ulbName: "$state",
              },
            },
            { $sort: { "_id.financialYear": 1 } }
          );
        } else {
          tempQ.push(
            {
              $group: {
                _id: {
                  financialYear: "$financialYear",
                  ulb: "$ulb._id",
                },
                state: { $first: "$state.name" },
                stateId: { $first: "$state._id" },
                amount: {
                  $sum: "$amount",
                },
                population: {
                  $first: "$ulb.population",
                },
              },
            },
            { $unwind: "$stateId" },
            {
              $group: {
                _id: {
                  financialYear: "$_id.financialYear",
                  state: "$stateId",
                },
                numerator: {
                  $sum: {
                    $multiply: [
                      "$amount",
                      {
                        $cond: {
                          if: { $eq: ["$population", 0] },
                          then: 1,
                          else: "$population",
                        },
                      },
                    ],
                  },
                },
                ulbName: {
                  $first: "$state",
                },
                denominator: {
                  $sum: "$population",
                },
              },
            },
            {
              $project: {
                _id: 1,
                amount: {
                  $divide: ["$numerator", "$denominator"],
                },
                ulbName: 1,
              },
            },
            { $sort: { "_id.financialYear": 1 } }
          );
        }
      }
      return tempQ;
      break;
    case "ULB Population Category Average":
      ulbData = await ULB.findOne({ _id: ulb }).lean();
      let matchObj = {};
      if (ulbData.hasOwnProperty("population")) {
        if (ulbData.population < 100000) {
          Object.assign(matchObj, { population: { $lt: 100000 } });
        } else if (100000 < ulbData.population < 500000) {
          Object.assign(matchObj, {
            $and: [
              { population: { $gt: 100000 } },
              { population: { $lt: 500000 } },
            ],
          });
        } else if (500000 < ulbData.population < 1000000) {
          Object.assign(matchObj, {
            $and: [
              { population: { $gt: 500000 } },
              { population: { $lt: 1000000 } },
            ],
          });
        } else if (1000000 < ulbData.population < 1000000) {
          Object.assign(matchObj, {
            $and: [
              { population: { $gt: 1000000 } },
              { population: { $lt: 1000000 } },
            ],
          });
        } else {
          Object.assign(matchObj, { population: { $gt: 4000000 } });
        }
      }
      ulbId = await ULB.find(matchObj).lean();
      tempQ = [
        {
          $match: {
            financialYear: {
              $in: body.financialYear,
            },
            lineItem: {
              $in: lineItemIds.map((val) => val._id),
            },
            ulb: {
              $in: ulbId.map((val) => val._id),
            },
          },
        },
      ];

      tempQ.push(
        {
          $lookup: {
            from: "ulbs",
            localField: "ulb",
            foreignField: "_id",
            as: "ulb",
          },
        },
        {
          $unwind: "$ulb",
        },
        {
          $lookup: {
            from: "lineitems",
            localField: "lineItem",
            foreignField: "_id",
            as: "lineitems",
          },
        },
        {
          $unwind: "$lineitems",
        }
      );
      if (from.includes("mix")) {
        tempQ.push({
          $group: {
            _id: { lineItem: "$lineitems" },
            amount: { $sum: { $multiply: ["$amount", "$ulb.population"] } },
            code: { $first: "$lineitems.code" },
            population: { $sum: "$amount" },
            colour: { $first: "$lineitems.colour" },
          },
        });
      } else {
        if (isPerCapita) {
          tempQ.push(
            {
              $lookup: {
                from: "states",
                localField: "ulb.state",
                foreignField: "_id",
                as: "state",
              },
            },
            {
              $unwind: "$state",
            },
            {
              $group: {
                _id: {
                  financialYear: "$financialYear",
                  ulb: "$ulb._id",
                },
                state: {
                  $first: "$state.name",
                },
                amount: {
                  $sum: "$amount",
                },
                population: {
                  $first: "$ulb.population",
                },
              },
            },
            {
              $unwind: "$state",
            },
            {
              $group: {
                _id: {
                  financialYear: "$_id.financialYear",
                },
                state: {
                  $first: "$state",
                },
                amount: {
                  $sum: "$amount",
                },
                population: {
                  $sum: "$population",
                },
                ulbName: {
                  $first: "ULB Population Category",
                },
              },
            },
            {
              $project: {
                _id: 1,
                amount: { $divide: ["$amount", "$population"] },
                ulbName: 1,
              },
            },
            { $sort: { "_id.financialYear": 1 } }
          );
        } else {
          tempQ.push(
            {
              $group: {
                _id: {
                  financialYear: "$financialYear",
                  ulb: "$ulb._id",
                },
                amount: {
                  $sum: "$amount",
                },
                ulbName: {
                  $first: "ULB Population Category",
                },
                population: {
                  $first: "$ulb.population",
                },
              },
            },
            {
              $group: {
                _id: {
                  financialYear: "$_id.financialYear",
                },
                numerator: {
                  $sum: { $multiply: ["$amount", "$population"] },
                },
                ulbName: {
                  $first: "ULB Population Category",
                },
                denominator: {
                  $sum: "$population",
                },
              },
            },
            {
              $project: {
                _id: 1,
                amount: {
                  $divide: ["$numerator", "$denominator"],
                },
                ulbName: 1,
              },
            },
            { $sort: { "_id.financialYear": 1 } }
          );
        }
      }
      return tempQ;
      break;

    case "National Average":
      ulbData = await ULB.findOne({ _id: ulb });
      ulbId = await ULB.find({ state: ulbData.state });
      tempQ = [
        {
          $match: {
            financialYear: {
              $in: body.financialYear,
            },
            lineItem: {
              $in: lineItemIds.map((val) => val._id),
            },
          },
        },
      ];

      tempQ.push(
        {
          $lookup: {
            from: "ulbs",
            localField: "ulb",
            foreignField: "_id",
            as: "ulb",
          },
        },
        {
          $lookup: {
            from: "states",
            localField: "ulb.state",
            foreignField: "_id",
            as: "state",
          },
        },
        {
          $unwind: "$ulb",
        },
        {
          $lookup: {
            from: "lineitems",
            localField: "lineItem",
            foreignField: "_id",
            as: "lineitems",
          },
        },
        {
          $unwind: "$lineitems",
        }
      );
      if (from.includes("mix")) {
        tempQ.push({
          $group: {
            _id: { lineItem: "$lineitems.name" },
            code: { $first: "$lineitems.code" },
            colour: { $first: "$lineitems.colour" },
            amount: { $sum: "$amount" },
          },
        });
      } else {
        if (isPerCapita) {
          tempQ.push(
            {
              $group: {
                _id: {
                  financialYear: "$financialYear",
                  ulb: "$ulb._id",
                },
                state: {
                  $first: "$state.name",
                },
                amount: {
                  $sum: "$amount",
                },
                population: {
                  $first: "$ulb.population",
                },
              },
            },
            {
              $unwind: "$state",
            },
            {
              $group: {
                _id: {
                  financialYear: "$_id.financialYear",
                },
                state: {
                  $first: "$state",
                },
                amount: {
                  $sum: "$amount",
                },
                population: {
                  $sum: "$population",
                },
              },
            },
            {
              $project: {
                _id: 1,
                amount: { $divide: ["$amount", "$population"] },
                ulbName: 1,
              },
            },
            { $sort: { "_id.financialYear": 1 } }
          );
        } else {
          tempQ.push(
            {
              $group: {
                _id: {
                  financialYear: "$financialYear",
                  ulb: "$ulb._id",
                },
                state: { $first: "$ulb.name" },
                amount: {
                  $sum: "$amount",
                },
                ulbName: {
                  $first: "$state.name",
                },
                population: {
                  $first: "$ulb.population",
                },
              },
            },
            {
              $group: {
                _id: {
                  financialYear: "$_id.financialYear",
                },
                numerator: {
                  $sum: {
                    $multiply: [
                      "$amount",
                      {
                        $cond: {
                          if: { $eq: ["$population", 0] },
                          then: 1,
                          else: "$population",
                        },
                      },
                    ],
                  },
                },
                ulbName: { $first: "National" },
                denominator: {
                  $sum: "$population",
                },
              },
            },
            {
              $project: {
                _id: 1,
                amount: {
                  $divide: ["$numerator", "$denominator"],
                },
                ulbName: 1,
              },
            },
            { $sort: { "_id.financialYear": 1 } }
          );
        }
      }
      return tempQ;
      break;

    case "ULB Type Average":
      ulbData = await ULB.findOne({ _id: ulb });
      ulbId = await ULB.find({ ulbType: ulbData.ulbType });
      tempQ = [
        {
          $match: {
            ulb: { $in: ulbId.map((val) => val._id) },
            financialYear: {
              $in: body.financialYear,
            },
            lineItem: {
              $in: lineItemIds.map((val) => val._id),
            },
          },
        },
      ];

      tempQ.push(
        {
          $lookup: {
            from: "ulbs",
            localField: "ulb",
            foreignField: "_id",
            as: "ulb",
          },
        },
        {
          $lookup: {
            from: "ulbtypes",
            localField: "ulb.ulbType",
            foreignField: "_id",
            as: "ulbType",
          },
        },
        {
          $unwind: "$ulb",
        },
        {
          $lookup: {
            from: "lineitems",
            localField: "lineItem",
            foreignField: "_id",
            as: "lineitems",
          },
        },
        {
          $unwind: "$lineitems",
        }
      );
      if (from.includes("mix")) {
        tempQ.push({
          $group: {
            _id: { lineItem: "$lineitems" },
            amount: { $sum: "$amount" },
            code: { $first: "$lineitems.code" },
            colour: { $first: "$lineitems.colour" },
          },
        });
      } else {
        if (isPerCapita) {
          tempQ.push(
            {
              $lookup: {
                from: "states",
                localField: "ulb.state",
                foreignField: "_id",
                as: "state",
              },
            },
            { $unwind: "$state" },
            {
              $group: {
                _id: {
                  financialYear: "$financialYear",
                  ulb: "$ulb._id",
                },
                state: {
                  $first: "$state.name",
                },
                amount: {
                  $sum: "$amount",
                },
                population: {
                  $first: "$ulb.population",
                },
              },
            },
            {
              $group: {
                _id: {
                  financialYear: "$_id.financialYear",
                },
                state: {
                  $first: "$state",
                },
                amount: {
                  $sum: "$amount",
                },
                population: {
                  $sum: "$population",
                },
              },
            },
            {
              $project: {
                _id: 1,
                ulbName: 1,
                amount: { $divide: ["$amount", "$population"] },
              },
            },
            { $sort: { "_id.financialYear": 1 } }
          );
        } else {
          tempQ.push(
            {
              $group: {
                _id: {
                  financialYear: "$financialYear",
                  ulb: "$ulb._id",
                },
                amount: {
                  $sum: "$amount",
                },
                ulbTypeId: { $first: "$ulbType._id" },
                ulbName: {
                  $first: "$ulbType.name",
                },
                population: {
                  $first: "$ulb.population",
                },
              },
            },
            { $unwind: "$ulbTypeId" },
            {
              $group: {
                _id: {
                  financialYear: "$_id.financialYear",
                  ulbType: "$ulbTypeId",
                },
                numerator: {
                  $sum: {
                    $multiply: [
                      "$amount",
                      {
                        $cond: {
                          if: { $eq: ["$population", 0] },
                          then: 1,
                          else: "$population",
                        },
                      },
                    ],
                  },
                },
                ulbName: {
                  $first: "$ulbName",
                },
                denominator: {
                  $sum: "$population",
                },
              },
            },
            {
              $project: {
                _id: 1,
                amount: {
                  $divide: ["$numerator", "$denominator"],
                },
                ulbName: 1,
              },
            },
            { $sort: { "_id.financialYear": 1 } }
          );
        }
      }
      return tempQ;
      break;
  }
}

async function expenseQueryCompare(
  compareFrom,
  query,
  ulb,
  isPerCapita,
  from,
  body
) {
  let ulbData;
  let ulbId, lineItemIds;
  let tempQ;
  if (from.includes("capital")) {
    lineItemIds = await LINEITEM.find({ code: { $in: ["410", "412"] } });
  } else if (from.includes("surplus")) {
    lineItemIds = await LINEITEM.find({
      headOfAccount: { $in: ["Expense", "Revenue"] },
    });
  } else if (from.includes("revenue") && from.includes("expenditure")) {
    lineItemIds = await LINEITEM.find({
      code: { $in: ["200", "210", "220", "230", "240"] },
    });
  } else lineItemIds = await LINEITEM.find({ headOfAccount: "Expense" });
  switch (compareFrom) {
    case "State ": 
    case  'State Average':
      ulbData = await ULB.findOne({ _id: ulb }).lean();
      ulbId = await ULB.find({ state: ulbData.state }).lean();
      ulbId = ulbId.map((val) => val._id);
      tempQ = [
        {
          $match: {
            financialYear: {
              $in: body.financialYear,
            },
            ulb: {
              $in: ulbId,
            },
            lineItem: {
              $in: lineItemIds.map((val) => val._id),
            },
          },
        },
        {
          $lookup: {
            from: "ulbs",
            localField: "ulb",
            foreignField: "_id",
            as: "ulb",
          },
        },
        {
          $lookup: {
            from: "states",
            localField: "ulb.state",
            foreignField: "_id",
            as: "state",
          },
        },
        { $unwind: "$state" },
        {
          $unwind: "$ulb",
        },
        {
          $lookup: {
            from: "lineitems",
            localField: "lineItem",
            foreignField: "_id",
            as: "lineitems",
          },
        },
        {
          $unwind: "$lineitems",
        },
      ];
      if (from.includes("mix")) {
        tempQ.push({
          $group: {
            _id: {
              state: "$state._id",
              lineItem: "$lineitems.name",
            },
            colour: { $first: "$lineitems.colour" },
            ulbName: { $first: "$state.name" },
            code: { $first: "$lineitems.code" },
            amount: { $sum: "$amount" },
          },
        });
      } else {
        if (from.includes("surplus")) {
          tempQ.push(
            {
              $group: {
                _id: { financialYear: "$financialYear", state: "$state._id" },
                revenue: {
                  $sum: {
                    $cond: {
                      if: { $eq: ["$lineitems.headOfAccount", "Revenue"] },
                      then: "$amount",
                      else: 0,
                    },
                  },
                },
                expense: {
                  $sum: {
                    $cond: {
                      if: { $eq: ["$lineitems.headOfAccount", "Expense"] },
                      then: "$amount",
                      else: 0,
                    },
                  },
                },
                ulbName: { $first: "$state.name" },
              },
            },
            {
              $project: {
                _id: 1,
                amount: { $subtract: ["$revenue", "$expense"] },
                revenue: 1,
                expense: 1,
                ulbName: 1,
              },
            }
          );
        } else if (from.includes("capital")) {
          tempQ = await capitalLogic(tempQ);
          tempQ.push(
            {
              $group: {
                _id: {
                  financialYear: "$financialYear",
                  lineItemName: "$lineitems.name",
                  state: "$state._id",
                },
                colour: { $first: "$lineitems.colour" },
                amount: {
                  $sum: "$amount",
                },
                ulbName: {
                  $first: "$state.name",
                },
                code: {
                  $first: "$lineitems.code",
                },
                numerator: {
                  $sum: isPerCapita
                    ? "$amount"
                    : {
                        $multiply: [
                          "$amount",
                          {
                            $cond: {
                              if: { $eq: ["$ulb.population", 0] },
                              then: 1,
                              else: "$ulb.population",
                            },
                          },
                        ],
                      },
                },
                denominator: {
                  $sum: "$ulb.population",
                },
              },
            },
            {
              $project: {
                _id: 1,
                amount: {
                  $divide: ["$numerator", "$denominator"],
                },
                ulbName: 1,
                code: 1,
              },
            },
            {
              $group: {
                _id: "$_id.financialYear",
                yearData: {
                  $push: {
                    name: "$_id.lineItemName",
                    amount: "$amount",
                    ulbName: "$ulbName",
                    code: "$code",
                  },
                },
              },
            },
            {
              $sort: {
                _id: 1,
              },
            }
          );
        }
      }
      return tempQ;
      break;
    case "ULB Population Category Average":
      ulbData = await ULB.findOne({ _id: ulb }).lean();
      let matchObj = {};
      if (ulbData.hasOwnProperty("population")) {
        if (ulbData.population < 100000) {
          Object.assign(matchObj, { population: { $lt: 100000 } });
        } else if (100000 < ulbData.population < 500000) {
          Object.assign(matchObj, {
            $or: [
              { population: { $gt: 100000 } },
              { population: { $lt: 100000 } },
            ],
          });
        } else if (500000 < ulbData.population < 1000000) {
          Object.assign(matchObj, {
            $or: [
              { population: { $gt: 500000 } },
              { population: { $lt: 1000000 } },
            ],
          });
        } else if (1000000 < ulbData.population < 1000000) {
          Object.assign(matchObj, {
            $or: [
              { population: { $gt: 1000000 } },
              { population: { $lt: 1000000 } },
            ],
          });
        } else {
          Object.assign(matchObj, { population: { $gt: 4000000 } });
        }
      }
      ulbId = await ULB.find(matchObj).lean();
      tempQ = [
        {
          $match: {
            financialYear: {
              $in: body.financialYear,
            },
            lineItem: {
              $in: lineItemIds.map((val) => val._id),
            },
            ulb: {
              $in: ulbId.map((val) => val._id),
            },
          },
        },
      ];

      tempQ.push(
        {
          $lookup: {
            from: "ulbs",
            localField: "ulb",
            foreignField: "_id",
            as: "ulb",
          },
        },
        {
          $unwind: "$ulb",
        },
        {
          $lookup: {
            from: "lineitems",
            localField: "lineItem",
            foreignField: "_id",
            as: "lineitems",
          },
        },
        {
          $unwind: "$lineitems",
        },
        {
          $lookup: {
            from: "states",
            localField: "ulb.state",
            foreignField: "_id",
            as: "state",
          },
        },
        {
          $unwind: "$state",
        }
      );
      if (from.includes("mix")) {
        tempQ.push({
          $group: {
            _id: {
              state: "$state._id",
              lineItem: "$lineitems.name",
            },
            colour: { $first: "$lineitems.colour" },
            ulbName: { $first: "$state.name" },
            code: { $first: "$lineitems.code" },
            amount: { $sum: "$amount" },
          },
        });
      } else {
        if (from.includes("surplus")) {
          tempQ.push(
            {
              $group: {
                _id: { financialYear: "$financialYear" },
                revenue: {
                  $sum: {
                    $cond: {
                      if: { $eq: ["$lineitems.headOfAccount", "Revenue"] },
                      then: "$amount",
                      else: 0,
                    },
                  },
                },
                expense: {
                  $sum: {
                    $cond: {
                      if: { $eq: ["$lineitems.headOfAccount", "Expense"] },
                      then: "$amount",
                      else: 0,
                    },
                  },
                },
                ulbName: { $first: "ULB Population Category" },
              },
            },
            {
              $project: {
                _id: 1,
                amount: { $subtract: ["$revenue", "$expense"] },
                revenue: 1,
                expense: 1,
                ulbName: 1,
              },
            }
          );
        } else if (from.includes("capital")) {
          tempQ = await capitalLogic(tempQ);
          tempQ.push(
            {
              $group: {
                _id: {
                  financialYear: "$financialYear",
                  lineItemName: "$lineitems.name",
                },
                colour: { $first: "$lineitems.colour" },
                amount: {
                  $sum: "$amount",
                },
                ulbName: {
                  $first: "ULB Population Category",
                },
                code: {
                  $first: "$lineitems.code",
                },
                numerator: {
                  $sum: isPerCapita
                    ? "$amount"
                    : {
                        $multiply: [
                          "$amount",
                          {
                            $cond: {
                              if: { $eq: ["$ulb.population", 0] },
                              then: 1,
                              else: "$ulb.population",
                            },
                          },
                        ],
                      },
                },
                denominator: {
                  $sum: "$ulb.population",
                },
              },
            },
            {
              $project: {
                _id: 1,
                amount: {
                  $cond: {
                    if: { $gt: ["$denominator", 0] },
                    then: { $divide: ["$numerator", "$denominator"] },
                    else: 0,
                  },
                },
              },
            },
            {
              $group: {
                _id: "$_id.financialYear",
                yearData: {
                  $push: {
                    name: "$_id.lineItemName",
                    amount: "$amount",
                    ulbName: "$ulbName",
                    code: "$code",
                  },
                },
              },
            },
            {
              $sort: {
                _id: 1,
              },
            }
          );
        }
      }
      return tempQ;
      break;

    case "National Average":
      ulbData = await ULB.findOne({ _id: ulb });
      ulbId = await ULB.find({ state: ulbData.state });
      tempQ = [
        {
          $match: {
            financialYear: {
              $in: body.financialYear,
            },
            lineItem: {
              $in: lineItemIds.map((val) => val._id),
            },
          },
        },
      ];

      tempQ.push(
        {
          $lookup: {
            from: "ulbs",
            localField: "ulb",
            foreignField: "_id",
            as: "ulb",
          },
        },
        {
          $lookup: {
            from: "states",
            localField: "ulb.state",
            foreignField: "_id",
            as: "state",
          },
        },
        {
          $unwind: "$ulb",
        },
        {
          $lookup: {
            from: "lineitems",
            localField: "lineItem",
            foreignField: "_id",
            as: "lineitems",
          },
        },
        {
          $unwind: "$lineitems",
        }
      );
      if (from.includes("mix")) {
        tempQ.push({
          $group: {
            _id: {
              lineItem: "$lineitems.name",
            },
            colour: { $first: "$lineitems.colour" },
            ulbName: { $first: "$state.name" },
            code: { $first: "$lineitems.code" },
            amount: { $sum: "$amount" },
          },
        });
      } else {
        if (from.includes("surplus")) {
          tempQ.push(
            {
              $group: {
                _id: {             year:"$financialYear",
                ulb:"$ulb._id" },
                revenue: {
                  $sum: {
                    $cond: {
                      if: { $eq: ["$lineitems.headOfAccount", "Revenue"] },
                      then: "$amount",
                      else: 0,
                    },
                  },
                },
                expense: {
                  $sum: {
                    $cond: {
                      if: { $eq: ["$lineitems.headOfAccount", "Expense"] },
                      then: "$amount",
                      else: 0,
                    },
                  },
                },
                "ulbName": {
                  "$first": "$ulb.name"
              },
               "population": {
                  "$first": "$ulb.population"
              },
                              "year": {
                  "$first": "$financialYear"
              }
              },
            },
            {
              $project: {
                "_id": 0,
                "amount": {
                    "$subtract": [
                        "$revenue",
                        "$expense"
                    ]
                },
       
                "ulbName": 1,
                "year":1,
                "population":1,
                "expense":1,
                "revenue":1
              },
            },
            {
              $group: {
                  _id: "$year",
  
                  numer1 : {
                      $sum: {  $multiply : ["$population", "$expense"] }
                     
                      },
                        numer2 : {
                      $sum: {  $multiply : ["$population", "$revenue"] }
                     
                      },
                          numer3 : {
                      $sum: {  $multiply : ["$population", "$amount"] }
                     
                      },
                      denom : {$sum : "$population"}
                  }
              },
              {
                  $project: {
                      expense : {$divide: ["$numer1", "$denom"]},
                       revenue : {$divide: ["$numer2", "$denom"]},
                        amount : {$divide: ["$numer3", "$denom"]},
                        ulbName:"National"
                      }
                  }
          );
        } else if (from.includes("capital")) {
          tempQ = await capitalLogic(tempQ);
          tempQ.push(
            {
              $group: {
                _id: {
                  financialYear: "$financialYear",
                  lineItemName: "$lineitems.name",
                },
                colour: { $first: "$lineitems.colour" },
                amount: {
                  $sum: "$amount",
                },
                ulbName: {
                  $first: "$state.name",
                },
                code: {
                  $first: "$lineitems.code",
                },
                numerator: {
                  $sum: isPerCapita
                    ? "$amount"
                    : {
                        $multiply: [
                          "$amount",
                          {
                            $cond: {
                              if: { $eq: ["$ulb.population", 0] },
                              then: 1,
                              else: "$ulb.population",
                            },
                          },
                        ],
                      },
                },
                denominator: {
                  $sum: "$ulb.population",
                },
              },
            },
            {
              $project: {
                _id: 1,
                amount: {
                  $divide: ["$numerator", "$denominator"],
                },
                ulbName: 1,
                code: 1,
              },
            },
            {
              $group: {
                _id: "$_id.financialYear",
                yearData: {
                  $push: {
                    name: "$_id.lineItemName",
                    amount: "$amount",
                    ulbName: "$ulbName",
                    code: "$code",
                  },
                },
              },
            },
            {
              $sort: {
                _id: 1,
              },
            }
          );
        }
      }
      return tempQ;
      break;

    case "ULB Type Average":
      ulbData = await ULB.findOne({ _id: ulb }).lean();
      ulbId = await ULB.find({ ulbType: ulbData.ulbType }).lean();
      tempQ = [
        {
          $match: {
            ulb: { $in: ulbId.map((val) => val._id) },
            financialYear: {
              $in: body.financialYear,
            },
            lineItem: {
              $in: lineItemIds.map((val) => val._id),
            },
          },
        },
      ];

      tempQ.push(
        {
          $lookup: {
            from: "ulbs",
            localField: "ulb",
            foreignField: "_id",
            as: "ulb",
          },
        },
        {
          $lookup: {
            from: "UlbTypes",
            localField: "ulb.ulbType",
            foreignField: "_id",
            as: "ulbType",
          },
        },
        {
          $unwind: "$ulb",
        },
        {
          $lookup: {
            from: "lineitems",
            localField: "lineItem",
            foreignField: "_id",
            as: "lineitems",
          },
        },
        {
          $unwind: "$lineitems",
        }
      );
      if (from.includes("mix")) {
        tempQ.push({
          $group: {
            _id: {
              lineItem: "$lineitems.name",
            },
            colour: { $first: "$lineitems.colour" },
            ulbName: { $first: "$ulbType.name" },
            code: { $first: "$lineitems.code" },
            amount: { $sum: "$amount" },
          },
        });
      } else {
        if (from.includes("surplus")) {
          tempQ.push(
            {
              $group: {
                _id: { financialYear: "$financialYear" },
                revenue: {
                  $sum: {
                    $cond: {
                      if: { $eq: ["$lineitems.headOfAccount", "Revenue"] },
                      then: "$amount",
                      else: 0,
                    },
                  },
                },
                expense: {
                  $sum: {
                    $cond: {
                      if: { $eq: ["$lineitems.headOfAccount", "Expense"] },
                      then: "$amount",
                      else: 0,
                    },
                  },
                },
                ulbName: { $first: "$ulbType.name" },
              },
            },
            {
              $project: {
                _id: 1,
                amount: { $subtract: ["$revenue", "$expense"] },
                revenue: 1,
                expense: 1,
                ulbName: 1,
              },
            }
          );
        } else if (from.includes("capital")) {
          tempQ = await capitalLogic(tempQ);
          tempQ.push(
            {
              $group: {
                _id: {
                  financialYear: "$financialYear",
                  lineItemName: "$lineitems.name",
                  ulbType: "$ulbType._id",
                },
                colour: { $first: "$lineitems.colour" },
                amount: {
                  $sum: "$amount",
                },
                ulbName: {
                  $first: "$state.name",
                },
                code: {
                  $first: "$lineitems.code",
                },
                numerator: {
                  $sum: isPerCapita
                    ? "$amount"
                    : {
                        $multiply: [
                          "$amount",
                          {
                            $cond: {
                              if: { $eq: ["$ulb.population", 0] },
                              then: 1,
                              else: "$ulb.population",
                            },
                          },
                        ],
                      },
                },
                denominator: {
                  $sum: "$ulb.population",
                },
              },
            },
            {
              $project: {
                _id: 1,
                amount: {
                  $divide: ["$numerator", "$denominator"],
                },
                ulbName: 1,
                code: 1,
              },
            },
            {
              $group: {
                _id: "$_id.financialYear",
                yearData: {
                  $push: {
                    name: "$_id.lineItemName",
                    amount: "$amount",
                    ulbName: "$ulbName",
                    code: "$code",
                  },
                },
              },
            },
            {
              $sort: {
                _id: 1,
              },
            }
          );
        }
      }
      return tempQ;
      break;
  }
}

async function capitalLogic(aggregateQuery) {
  aggregateQuery.push({
    $group: {
      _id: {
        financialYear: "$financialYear",
      },
      ulb: { $addToSet: "$ulb._id" },
    },
  });
  let ulbId = [];
  let newUlbs = await UlbLedger.aggregate(aggregateQuery);
  newUlbs = JSON.parse(JSON.stringify(newUlbs));
  if (newUlbs.length > 2) {
    newUlbs[0].ulb.forEach((val) => {
      if (newUlbs[1]?.ulb?.includes(val) && newUlbs[2]?.ulb?.includes(val)) {
        ulbId.push(ObjectId(val));
      }
    });
  } else {
    newUlbs[0].ulb.forEach((val) => {
      if (newUlbs[1]?.ulb?.includes(val)) {
        ulbId.push(ObjectId(val));
      }
    });
  }
  Object.assign(aggregateQuery[0]?.$match, { ulb: { $in: ulbId } });
  aggregateQuery.pop();
  return aggregateQuery;
}

const aboutCalculation = async (req, res) => {
  try {
    let {
      state,
      ulbType,
      getQuery,
      financialYear,
      ulb,
      compare,
      populationCategory,
      headOfAccount,
      filterName,
    } = req.query;

    if (ulb) {
      let ulbData = await ULB.findOne({ _id: ulb }).lean();
      ulbType = ulbData.ulbType;
      state = ulbData.state;
      globalState = state;
      populationCategory = getPopulationQuery(ulb.population);
      populationCategory?.inState?.$max?.$cond?.if?.$and.push({
        $eq: ["$ulb.state", ObjectId(globalState)],
      });
    }

    let matchObj = {
      financialYear: {
        $in: [financialYear],
      },
    };

    let query = [
      {
        $match: matchObj,
      },
      {
        $lookup: {
          from: "ulbs",
          localField: "ulb",
          foreignField: "_id",
          as: "ulb",
        },
      },
      {
        $unwind: "$ulb",
      },
    ];
    if (!compare)
      query.push({
        $match: {
          "ulb.ulbType": ObjectId(ulbType),
          "ulb.state": ObjectId(state),
        },
      });

    if (headOfAccount) {
      let ids = await LineItem.find({ headOfAccount })
        .select({ _id: 1 })
        .lean();
      Object.assign(matchObj, {
        lineItem: { $in: ids.map((value) => ObjectId(value._id)) },
      });
    }
    if (filterName) {
      if (filterName.includes("own")) {
        let ids = await LineItem.find({
          code: { $in: ["180", "140", "110", "130", "150"] },
        })
          .select({ _id: 1 })
          .lean();
        Object.assign(matchObj, {
          lineItem: { $in: ids.map((value) => ObjectId(value._id)) },
        });
      }
      if (filterName.includes("surplus")) {
        let ids = await LineItem.find({
          headOfAccount: { $in: ["Revenue", "Expense"] },
        })
          .select({ _id: 1 })
          .lean();
        Object.assign(matchObj, {
          lineItem: { $in: ids.map((value) => ObjectId(value._id)) },
        });
      }
    }

    query.push(
      {
        $lookup: {
          from: "lineitems",
          localField: "lineItem",
          foreignField: "_id",
          as: "lineItem",
        },
      },
      {
        $unwind: "$lineItem",
      }
      // { $match: { "lineItem.headOfAccount": "Revenue" } }
    );

    let groupStage = {
      _id: null,
      amount: { $sum: "$amount" },
      totalPopulation: { $sum: "$ulb.population" },
      ulbAmount: {
        $sum: {
          $cond: {
            if: { $eq: ["$ulb._id", ObjectId(ulb)] },
            then: "$amount",
            else: 0,
          },
        },
      },
    };

    if (filterName) {
      if (filterName.includes("surplus")) {
        // Object.assign(groupStage, { _id: "$lineItem.headOfAccount" });
        Object.assign(groupStage, {
          amount: {
            $sum: {
              $cond: {
                if: { $eq: ["$lineItem.headOfAccount", "Revenue"] },
                then: "$amount",
                else: 0,
              },
            },
          },
        });
        Object.assign(groupStage, {
          expense: {
            $sum: {
              $cond: {
                if: { $eq: ["$lineItem.headOfAccount", "Expense"] },
                then: "$amount",
                else: 0,
              },
            },
          },
        });
      }
    }

    if (!compare) query.push({ $group: groupStage });
    else {
      query.push({
        $group: {
          _id: null,
          inStateUlbType: {
            $max: {
              $cond: {
                if: {
                  $and: [
                    { $eq: ["$ulb.state", ObjectId(state)] },
                    { $eq: ["$ulb.ulbType", ObjectId(ulbType)] },
                  ],
                },
                then: "$amount",
                else: 0,
              },
            },
          },
          inIndiaUlbType: {
            $max: {
              $cond: {
                if: { $eq: ["$ulb.ulbType", ObjectId(ulbType)] },
                then: "$amount",
                else: 0,
              },
            },
          },
          ...populationCategory,
        },
      });
    }

    if (getQuery) return Response.OK(res, query);

    let key = JSON.stringify(query) + "aboutIndicator";
    let redisData = await Redis.getDataPromise(key);
    let data;
    if (!redisData) {
      data = await UlbLedger.aggregate(query);
      Redis.set(key, JSON.stringify(data));
    } else data = JSON.parse(redisData);

    if (!compare)
      data = data.map((value) => {
        value.weightedAmount =
          (value.amount + value.totalPopulation) / value.totalPopulation;
        return value;
      });

    return Response.OK(res, filterName ? data : data[0]);
  } catch (error) {
    console.log(error);
    return Response.DbError(res, error, error.message);
  }
};

const revenueIndicator = async (req, res) => {
  try {
    const {
      headOfAccount,
      ulb,
      compareType,
      financialYear,
      isPerCapita,
      getQuery,
      filterName,
    } = req.body;
    let lineItemIds = await LineItem.find({ headOfAccount })
      .select({ _id: 1 })
      .lean();
    let matchObj = {};
    let query = [{ $match: matchObj.map((value) => ObjectId(value)) }];
    if (ulb) {
      Object.assign(matchObj, {
        ulb: Array.isArray(ulb)
          ? { $in: ulb.map((value) => ObjectId(value)) }
          : ObjectId(ulb),
      });
    }
    if (lineItemIds.length) {
      Object.assign(matchObj, {
        lineItem: { $in: lineItemIds.map((value) => value._id) },
      });
    }
    if (financialYear) {
      Object.assign(matchObj, {
        financialYear: {
          $in: Array.isArray(financialYear) ? financialYear : [financialYear],
        },
      });
    }

    query.push(
      {
        $lookup: {
          from: "ulbs",
          localField: "ulb",
          foreignField: "_id",
          as: "ulb",
        },
      },
      { $unwind: "$ulb" }
    );

    switch (filterName) {
      case "total_revenue":
        query.push(
          {
            $lookup: {
              from: "lineitems",
              localField: "lineItem",
              foreignField: "_id",
              as: "lineItem",
            },
          },
          { $unwind: "$lineItem" }
        );
        query.push(
          {
            $group: {
              _id: {
                ulb: "$ulb._id",
                financialYear: "$financialYear",
              },
              amount: isPerCapita
                ? { $sum: { $divide: ["$amount", "$ulb.population"] } }
                : { $sum: "$amount" },
              ulbName: { $first: "$ulb.name" },
            },
          },
          { $sort: { financialYear: -1 } }
        );
        break;
      case "revenue_mix":
        query.push(
          {
            $lookup: {
              from: "lineitems",
              localField: "lineItem",
              foreignField: "_id",
              as: "lineItem",
            },
          },
          { $unwind: "$lineItem" }
        );
        query.push(
          {
            $group: {
              _id: {
                financialYear: "$financialYear",
                lineItem: "$lineItem.name",
              },
              amount: { $sum: "$amount" },
              ulbName: { $first: "$ulb.name" },
            },
          },
          { $sort: { financialYear: -1 } }
        );
        break;
      default:
        break;
    }
    let compQuery = JSON.parse(JSON.stringify(query));
    if (compareType) {
      switch (compareType) {
        case "State ": 
        case 'State Average':
          compQuery.map(async (value) => {
            if (value["$match"]) {
              delete value["$match"].ulb;
              let ulbData = await Ulb.findOne({ _id: ulb })
                .select({ state: 1 })
                .lean();
              let ulbIds = await Ulb.find({ state: ulbData.state })
                .select({ _id: 1 })
                .lean();
              Object.assign(value["$match"], {
                ulb: { $in: ulbIds.map((value) => ObjectId(value._id)) },
              });
            }
            if (value["$group"]) {
              delete value["$group"]._id.ulb;
              delete value["$group"]._id.ulb;
            }
          });
          break;

        default:
          break;
      }
    }
    if (getQuery) return Response.OK(res, query);
    let data = await UlbLedger.aggregate(query);
    return Response.OK(res, data);
  } catch (error) {
    return Response.DbError(res, error, error.message);
  }
};

const peerComp = async (req, res) => {
  try {
    const { ulb, financialYear, from, isPerCapita, getQuery } = req.body;

    const {
      ulbType = ulb.ulbType,
      state = ulb.state,
      population = ulb.population,
    } = await ULB.findOne({ _id: ulb }).lean();

    let lineMatch = {};
    if (from.includes("capital")) {
      Object.assign(lineMatch, {
        code: { $in: ["410", "412"] },
      });
    } else if (from.includes("surplus")) {
      Object.assign(lineMatch, {
        headOfAccount: { $in: ["Revenue", "Expense"] },
      });
    } else if (from.includes("own") && from.includes("revenue")) {
      Object.assign(lineMatch, {
        code: { $in: ["110", "130", "140", "150", "180"] },
      });
    } else if (from.includes("revenue")) {
      Object.assign(lineMatch, { headOfAccount: "Revenue" });
    }

    const lineItemData = await LineItem.find(lineMatch).lean();
    let lineItem = lineItemData.map((value) => ObjectId(value._id));

    const inStateUlbType = UlbLedger.aggregate(
      getPeerQuery({
        from,
        isPerCapita,
        ulbType,
        state,
        financialYear,
        lineItem,
      })
    );
    const inIndiaUlbType = UlbLedger.aggregate(
      getPeerQuery({
        from,
        isPerCapita,
        ulbType,
        financialYear,
        lineItem,
      })
    );
    const inState = UlbLedger.aggregate(
      getPeerQuery({
        from,
        isPerCapita,
        population,
        state,
        financialYear,
        lineItem,
      })
    );
    const inIndia = UlbLedger.aggregate(
      getPeerQuery({
        from,
        isPerCapita,
        population,
        financialYear,
        lineItem,
      })
    );
    const totalRevenue = UlbLedger.aggregate(
      getPeerQuery({
        isPerCapita,
        from,
        financialYear,
        lineItem,
        ulb,
        getTotal: true,
      })
    );

    const query = [
      inStateUlbType,
      inIndiaUlbType,
      inState,
      inIndia,
      totalRevenue,
    ];

    if (getQuery) return Response.OK(res, query);

    const redisKey = JSON.stringify(query) + "peerComp";
    let redisData = await Redis.getDataPromise(redisKey);
    let data, newData;
    if (!redisData) {
      data = await Promise.all(query);
      if (from.includes("capital_expenditure")) {
        data = JSON.parse(JSON.stringify(data));
        data = data.map((innerData) => {
          let tempData = innerData.reduce((result, val) => {
            let key = val._id.financialYear;
            if (!result.hasOwnProperty(key)) {
              result[key] = [val];
            } else {
              result[key].push(val);
            }
            return result;
          }, {});
          return tempData[financialYear[0]]
            ?.reduce((rand, value) => {
              let lastDate = tempData[financialYear[1]] ?? [];
              let lastUlb = lastDate.find((v) => v.ulb._id == value.ulb._id);
              rand.push({
                amount: lastUlb ? getCapitalChangeAmount(lastUlb, value) : 0,
                ulb: value["ulb"],
              });
              return rand;
            }, [])
            .sort(function (a, b) {
              return b.amount - a.amount;
            })[0];
        });
      }
      newData = {
        inStateUlbType: data[0][0] ?? data[0],
        inIndiaUlbType: data[1][0] ?? data[1],
        inState: data[2][0] ?? data[2],
        inIndia: data[3][0] ?? data[3],
        totalRevenue: data[4][0] ?? data[4] ?? 0,
      };
      Redis.set(redisKey, JSON.stringify(newData));
    } else {
      newData = JSON.parse(redisData);
    }

    return Response.OK(res, newData);
  } catch (error) {
    return Response.DbError(res, error, error.message);
  }
};

function getCapitalChangeAmount(ulb1, ulb2) {
  let gross = ulb2.gross - ulb1.gross;
  let cwip = ulb2.cwip - ulb2.cwip;
  return gross + cwip;
}

function getPeerQuery(params) {
  let matchObj = {};
  let query = [
    {
      $match: {
        financialYear: {
          $in: params.from.includes("capital_expenditure")
            ? [...params.financialYear]
            : [params.financialYear],
        },
        lineItem: {
          $in: params.lineItem.map((value) => value),
        },
      },
    },
    {
      $lookup: {
        from: "ulbs",
        localField: "ulb",
        foreignField: "_id",
        as: "ulb",
      },
    },
    {
      $unwind: "$ulb",
    },
    {
      $match: matchObj,
    },
  ];

  if (params.hasOwnProperty("ulb")) {
    Object.assign(matchObj, { "ulb._id": ObjectId(params.ulb) });
  }

  if (params.hasOwnProperty("ulbType")) {
    Object.assign(matchObj, { "ulb.ulbType": ObjectId(params.ulbType) });
  }

  if (params.hasOwnProperty("state")) {
    Object.assign(matchObj, { "ulb.state": ObjectId(params.state) });
  }

  if (params.hasOwnProperty("population")) {
    if (params.population < 100000) {
      Object.assign(matchObj, { "ulb.population": { $lt: 100000 } });
    } else if (100000 < params.population < 500000) {
      Object.assign(matchObj, {
        $or: [
          { "ulb.population": { $gt: 100000 } },
          { "ulb.population": { $lt: 100000 } },
        ],
      });
    } else if (500000 < params.population < 1000000) {
      Object.assign(matchObj, {
        $or: [
          { "ulb.population": { $gt: 500000 } },
          { "ulb.population": { $lt: 1000000 } },
        ],
      });
    } else if (1000000 < params.population < 1000000) {
      Object.assign(matchObj, {
        $or: [
          { "ulb.population": { $gt: 1000000 } },
          { "ulb.population": { $lt: 1000000 } },
        ],
      });
    } else {
      Object.assign(matchObj, { "ulb.population": { $gt: 4000000 } });
    }
  }
  if (params.from.includes("surplus")) {
    query.push(
      {
        $lookup: {
          from: "lineitems",
          localField: "lineItem",
          foreignField: "_id",
          as: "lineItem",
        },
      },
      { $unwind: "$lineItem" },
      {
        $group: {
          _id: "$ulb._id",
          revenue: {
            $sum: {
              $cond: {
                if: { $eq: ["$lineItem.headOfAccount", "Revenue"] },
                then: "$amount",
                else: 0,
              },
            },
          },
          expense: {
            $sum: {
              $cond: {
                if: { $eq: ["$lineItem.headOfAccount", "Expense"] },
                then: "$amount",
                else: 0,
              },
            },
          },
          ulb: { $first: "$ulb" },
        },
      },
      { $project: { ulb: 1, amount: { $subtract: ["$revenue", "$expense"] } } }
    );
  }
  if (params.isPerCapita && !params.from.includes("capital_expenditure")) {
    query.push(
      {
        $group: {
          _id: "$ulb._id",
          amount: { $sum: "$amount" },
          ulb: { $first: "$ulb" },
        },
      },
      { $unwind: "$ulb" },
      {
        $project: {
          ulb: 1,
          amount: {
            $cond: {
              if: { $gt: ["$ulb.population", 0] },
              then: { $divide: ["$amount", "$ulb.population"] },
              else: 0,
            },
          },
        },
      }
    );
  }
  if (params.from == "revenue_mix" || params.from == "revenue_expenditure") {
    query.push(
      {
        $lookup: {
          from: "lineitems",
          localField: "lineItem",
          foreignField: "_id",
          as: "lineItem",
        },
      },
      { $unwind: "$lineItem" },
      {
        $group: {
          _id: "$ulb._id",
          ownRevenue: {
            $sum: {
              $cond: {
                if: {
                  $in: ["$lineItem.code", ["110", "130", "140", "150", "180"]],
                },
                then: "$amount",
                else: 0,
              },
            },
          },
          totalRevenue: { $sum: "$amount" },
          ulb: { $first: "$ulb" },
        },
      },
      { $unwind: "$ulb" },
      {
        $project: {
          ulb: 1,
          amount: {
            $cond: {
              if: { $gt: ["$totalRevenue", 0] },
              then: {
                $multiply: [{ $divide: ["$ownRevenue", "$totalRevenue"] }, 100],
              },
              else: 0,
            },
          },
        },
      }
    );
  }

  if (params.from.includes("capital_expenditure")) {
    query.push(
      {
        $lookup: {
          from: "lineitems",
          localField: "lineItem",
          foreignField: "_id",
          as: "lineItem",
        },
      },
      { $unwind: "$lineItem" },
      {
        $group: {
          _id: {
            ulb: "$ulb._id",
            financialYear: "$financialYear",
          },
          gross: {
            $sum: {
              $cond: {
                if: {
                  $eq: ["$lineItem.code", "410"],
                },
                then: params.isPerCapita
                  ? {
                      $cond: {
                        if: { $gt: ["$ulb.population", 0] },
                        then: { $divide: ["$amount", "$ulb.population"] },
                        else: 0,
                      },
                    }
                  : "$amount",
                else: 0,
              },
            },
          },
          cwip: {
            $sum: {
              $cond: {
                if: {
                  $eq: ["$lineItem.code", "412"],
                },
                then: params.isPerCapita
                  ? {
                      $cond: {
                        if: { $gt: ["$ulb.population", 0] },
                        then: { $divide: ["$amount", "$ulb.population"] },
                        else: 0,
                      },
                    }
                  : "$amount",
                else: 0,
              },
            },
          },
          ulb: { $first: "$ulb" },
        },
      }
    );
  }else {
    query.push(
      {
        $group: {
          _id: "$ulb._id",
          amount: { $sum: "$amount" },
          ulb: {
            $first: "$ulb",
          },
        },
      },
      { $sort: { amount: -1 } },
      { $limit: 1 },
      {
        $project: {
          ulb: 1,
          amount: 1,
        },
      }
    );
  }
  return query;
}

function getPopulationIds(population) {
  if (population < 100000) {
    return { population: { $lt: 100000 } };
  } else if (100000 < population < 500000) {
    return {
      $and: [{ population: { $gt: 100000 } }, { population: { $lt: 500000 } }],
    };
  } else if (500000 < population < 1000000) {
    return {
      $and: [{ population: { $gt: 500000 } }, { population: { $lt: 1000000 } }],
    };
  } else if (1000000 < population < 4000000) {
    return {
      $and: [
        { population: { $gt: 1000000 } },
        { population: { $lt: 4000000 } },
      ],
    };
  } else {
    return { population: { $gt: 4000000 } };
  }
}

function getPopulationQuery(population) {
  if (population < 100000) {
    return populationQuery["<100K"];
  } else if (100000 < population < 500000) {
    return populationQuery["100K-500K"];
  } else if (500000 < population < 1000000) {
    return populationQuery["500K-1M"];
  } else if (1000000 < population < 4000000) {
    return populationQuery["1M-4M"];
  } else {
    return populationQuery["4M+"];
  }
}

const populationQuery = {
  ["<100K"]: {
    inState: {
      $max: {
        $cond: {
          if: {
            $and: [{ $lt: ["$ulb.population", 100000] }],
          },
          then: "$amount",
          else: 0,
        },
      },
    },
    inIndia: {
      $max: {
        $cond: {
          if: { $lt: ["$ulb.population", 100000] },
          then: "$amount",
          else: 0,
        },
      },
    },
  },
  ["100K-500K"]: {
    inState: {
      $max: {
        $cond: {
          if: {
            $and: [
              {
                $or: [
                  { $gt: ["$ulb.population", 100000] },
                  { $lt: ["$ulb.population", 500000] },
                ],
              },
            ],
          },
          then: "$amount",
          else: 0,
        },
      },
    },
    inIndia: {
      $max: {
        $cond: {
          if: {
            $or: [
              { $gt: ["$ulb.population", 100000] },
              { $lt: ["$ulb.population", 500000] },
            ],
          },
          then: "$amount",
          else: 0,
        },
      },
    },
  },
  ["500K-1M"]: {
    inState: {
      $max: {
        $cond: {
          if: {
            $and: [
              {
                $or: [
                  { $gt: ["$ulb.population", 500000] },
                  { $lt: ["$ulb.population", 1000000] },
                ],
              },
            ],
          },
          then: "$amount",
          else: 0,
        },
      },
    },
    inIndia: {
      $max: {
        $cond: {
          if: {
            $or: [
              { $gt: ["$ulb.population", 500000] },
              { $lt: ["$ulb.population", 1000000] },
            ],
          },
          then: "$amount",
          else: 0,
        },
      },
    },
  },
  ["1M-4M"]: {
    inState: {
      $max: {
        $cond: {
          if: {
            $and: [
              {
                $or: [
                  { $gt: ["$ulb.population", 1000000] },
                  { $lt: ["$ulb.population", 4000000] },
                ],
              },
            ],
          },
          then: "$amount",
          else: 0,
        },
      },
    },
    inIndia: {
      $max: {
        $cond: {
          if: {
            $or: [
              { $gt: ["$ulb.population", 1000000] },
              { $lt: ["$ulb.population", 4000000] },
            ],
          },
          then: "$amount",
          else: 0,
        },
      },
    },
  },
  ["4M+"]: {
    inState: {
      $max: {
        $cond: {
          if: {
            $and: [{ $gt: ["$ulb.population", 400000] }],
          },
          then: "$amount",
          else: 0,
        },
      },
    },
    inIndia: {
      $max: {
        $cond: {
          if: { $gt: ["$ulb.population", 400000] },
          then: "$amount",
          else: 0,
        },
      },
    },
  },
};

module.exports = {
  indicator,
  aboutCalculation,
  peerComp,
  revenueIndicator,
};
