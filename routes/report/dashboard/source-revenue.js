const moment = require('moment');
const UlbLedger = require('../../../models/Schema/UlbLedger');

module.exports = async (req, res, next) => {
  try {
    let output = [];
    let query;
    //console.log(req.body.queryArr);
    for (let q of req.body.queryArr) {
      let obj = {
        year: q.financialYear,
        data: []
      };

      for (let d of q.data) {
        let range = d.range;
        let numOfUlb = Number(d.ulb['$in'].length);
        query = getQuery(q.financialYear, d.ulb, range, numOfUlb,d.totalUlb);
        let data = await UlbLedger.aggregate(query);
        data[0]['numOfUlb'] = numOfUlb;
        let dataObj = convertToPercent(data[0]);
        obj['data'].push(dataObj);
      }
      output.push(obj);
    }
    return res.status(200).json({
      timestamp: moment().unix(),
      success: true,
      message: '',
      data: output
    });
  } catch (e) {
    console.log('Exception:', e);
    return res.status(400).json({
      timestamp: moment().unix(),
      success: false,
      message: 'Caught Exception!',
      errorMessage: e.message,
      query: req.query.years
    });
  }
  return res.status(200).json({
    timestamp: moment().unix(),
    success: true,
    message: '',
    data: [
      {
        year: '2016-17',
        data: [
          {
            populationCategory: '> 10 Lakhs',
            numOfUlb: 100,
            taxRevenue: 1000,
            rentalIncome: 10000,
            feesAndUserCharges: 10,
            ownRevenues: 8,
            saleAndHireCharges: 20,
            assignedRevenue: 20,
            grants: 20,
            interestIncome: 20,
            otherIncome: 20
          },
          {
            populationCategory: '1Lakh to 10Lakhs',
            numOfUlb: 100,
            taxRevenue: 1000,
            rentalIncome: 10000,
            feesAndUserCharges: 10,
            ownRevenues: 8,
            saleAndHireCharges: 20,
            assignedRevenue: 20,
            grants: 20,
            interestIncome: 20,
            otherIncome: 20
          },
          {
            populationCategory: '< 1 Lakh',
            numOfUlb: 100,
            taxRevenue: 1000,
            rentalIncome: 10000,
            feesAndUserCharges: 10,
            ownRevenues: 8,
            saleAndHireCharges: 20,
            assignedRevenue: 20,
            grants: 20,
            interestIncome: 20,
            otherIncome: 20
          }
        ]
      },
      {
        year: '2017-18',
        data: [
          {
            populationCategory: '> 10 Lakhs',
            numOfUlb: 100,
            taxRevenue: 1000,
            rentalIncome: 10000,
            feesAndUserCharges: 10,
            ownRevenues: 8,
            saleAndHireCharges: 20,
            assignedRevenue: 20,
            grants: 20,
            interestIncome: 20,
            otherIncome: 20
          },
          {
            populationCategory: '1Lakh to 10Lakhs',
            numOfUlb: 100,
            taxRevenue: 1000,
            rentalIncome: 10000,
            feesAndUserCharges: 10,
            ownRevenues: 8,
            saleAndHireCharges: 20,
            assignedRevenue: 20,
            grants: 20,
            interestIncome: 20,
            otherIncome: 20
          },
          {
            populationCategory: '< 1 Lakh',
            numOfUlb: 100,
            taxRevenue: 1000,
            rentalIncome: 10000,
            feesAndUserCharges: 10,
            ownRevenues: 8,
            saleAndHireCharges: 20,
            assignedRevenue: 20,
            grants: 20,
            interestIncome: 20,
            otherIncome: 20
          }
        ]
      }
    ].map(d => {
      return {
        year: d.year,
        data: d.data.map(m => {
          m['ulbName'] = 'F';
          return m;
        })
      };
    })
  });
};

const getQuery = (year, ulb, range, numOfUlb,totalUlb) => {
  return [
    // stage 1
    {
      $match: {
        financialYear: year,
        ulb: ulb
      }
    },
    // stage 2
    {
      $lookup: {
        from: 'lineitems',
        as: 'lineitems',
        foreignField: '_id',
        localField: 'lineItem'
      }
    },
    // stage 3
    { $unwind: '$lineitems' },
    // stage 4
    {
      $project: {
        numOfUlb: numOfUlb,
        range: range,
        financialYear: 1,
        ulb: 1,
        amount: 1,
        code: '$lineitems.code'
      }
    },
    {
        $lookup:{
            from: "ulbs",
            localField: "ulb",
            foreignField: "_id",
            as: "ulb"
        }
    },
    {$unwind:"$ulb"},
    // stage 5
    {
      $group: {
        _id: { financialYear: '$financialYear', range: '$range' },
        numOfUlb: { $first: '$numOfUlb' },
        "ulbs": {
            "$push": {
                "_id": "$ulb._id",
                "name": "$ulb.name",
                "population": "$ulb.population",
                "ownRevenue": "$ownRevenue",
                "revenueExpenditure": "$revenueExpenditure",
                taxRevenue: { $cond: [{ $eq: ['$code', '110'] }, '$amount', 0] },
                rentalIncome: {
                  $cond: [{ $eq: ['$code', '130'] }, '$amount', 0] 
                },
                feesAndUserCharges: {
                   $cond: [{ $eq: ['$code', '140'] }, '$amount', 0] 
                },
                saleAndHireCharges: {
                  $cond: [{ $eq: ['$code', '150'] }, '$amount', 0] 
                },
                assignedRevenue: {
                  $cond: [{ $eq: ['$code', '120'] }, '$amount', 0] 
                },
                grants: {
                  $cond: [{ $eq: ['$code', '160'] }, '$amount', 0] 
                },
                interestIncome: {
                 
                    $cond: [{ $in: ['$code', ['170', '171']] }, '$amount', 0]
              
                },
                otherIncome: {
                    $cond: [{ $in: ['$code', ['180', '100']] }, '$amount', 0]
                },
                totalIncome: {
                  $sum: {
                    $cond: [
                      {
                        $in: [
                          '$code',
                          [
                            '110',
                            '120',
                            '130',
                            '140',
                            '150',
                            '160',
                            '180',
                            '100',
                            '170',
                            '171'
                          ]
                        ]
                      },
                      '$amount',
                      0
                    ]
                  }
                }
            }
        },
        taxRevenue: {
          $sum: { $cond: [{ $eq: ['$code', '110'] }, '$amount', 0] }
        },
        rentalIncome: {
          $sum: { $cond: [{ $eq: ['$code', '130'] }, '$amount', 0] }
        },
        feesAndUserCharges: {
          $sum: { $cond: [{ $eq: ['$code', '140'] }, '$amount', 0] }
        },
        saleAndHireCharges: {
          $sum: { $cond: [{ $eq: ['$code', '150'] }, '$amount', 0] }
        },
        assignedRevenue: {
          $sum: { $cond: [{ $eq: ['$code', '120'] }, '$amount', 0] }
        },
        grants: {
          $sum: { $cond: [{ $eq: ['$code', '160'] }, '$amount', 0] }
        },
        interestIncome: {
          $sum: {
            $cond: [{ $in: ['$code', ['170', '171']] }, '$amount', 0]
          }
        },
        otherIncome: {
          $sum: {
            $cond: [{ $in: ['$code', ['180', '100']] }, '$amount', 0]
          }
        },
        totalIncome: {
          $sum: {
            $cond: [
              {
                $in: [
                  '$code',
                  [
                    '110',
                    '120',
                    '130',
                    '140',
                    '150',
                    '160',
                    '180',
                    '100',
                    '170',
                    '171'
                  ]
                ]
              },
              '$amount',
              0
            ]
          }
        }
      }
    },

    //stage

    {
      $project: {
        _id: 0,
        populationCategory: '$_id.range',
        numOfUlb: '$numOfUlb',
        ulbs:1,
        taxRevenue: {
          $multiply: [{ $divide: ['$taxRevenue', '$totalIncome'] }, 100]
        },
        rentalIncome: {
          $multiply: [{ $divide: ['$rentalIncome', '$totalIncome'] }, 100]
        },
        feesAndUserCharges: {
          $multiply: [{ $divide: ['$feesAndUserCharges', '$totalIncome'] }, 100]
        },
        ownRevenues: {
          $sum: ['$taxRevenue', '$rentalIncome', '$feesAndUserCharges']
        },
        saleAndHireCharges: {
          $multiply: [{ $divide: ['$saleAndHireCharges', '$totalIncome'] }, 100]
        },
        assignedRevenue: {
          $multiply: [{ $divide: ['$assignedRevenue', '$totalIncome'] }, 100]
        },
        grants: {
          $multiply: [{ $divide: ['$grants', '$totalIncome'] }, 100]
        },
        interestIncome: {
          $multiply: [{ $divide: ['$interestIncome', '$totalIncome'] }, 100]
        },
        otherIncome: {
          $multiply: [{ $divide: ['$otherIncome', '$totalIncome'] }, 100]
        }
      }
    },

    // stage

    {
      $project: {
        populationCategory: '$populationCategory',
        numOfUlb: '$numOfUlb',
        taxRevenue: '$taxRevenue',
        ulbs:1,
        rentalIncome: '$rentalIncome',
        feesAndUserCharges: '$feesAndUserCharges',
        ownRevenues: {
          $sum: ['$taxRevenue', '$rentalIncome', '$feesAndUserCharges']
        },
        saleAndHireCharges: '$saleAndHireCharges',
        assignedRevenue: '$assignedRevenue',
        grants: '$grants',
        interestIncome: '$interestIncome',
        otherIncome: '$otherIncome'
      }
    },
    {$addFields : {  totalUlb : totalUlb } }
  ];
};

const convertToPercent = obj => {
  for (let k in obj) {
    if (k == 'populationCategory' || k == 'numOfUlb' || k =="ulbs") {
      continue;
    } else {
      obj[k] = obj[k].toFixed(2);
    }
  }
  return obj;
};
