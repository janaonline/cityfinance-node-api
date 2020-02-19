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
            establishmentExpense: 20,
            administrativeExpense: 11,
            operationalAndMaintananceExpense: 10,
            interestAndFinanceExpense: 8,
            other: 20
          },
          {
            populationCategory: '1Lakh to 10Lakhs',
            numOfUlb: 100,
            establishmentExpense: 30,
            administrativeExpense: 30,
            operationalAndMaintananceExpense: 10,
            interestAndFinanceExpense: 8,
            other: 20
          },
          {
            populationCategory: '< 1 Lakh',
            numOfUlb: 100,
            establishmentExpense: 20,
            administrativeExpense: 40,
            operationalAndMaintananceExpense: 10,
            interestAndFinanceExpense: 8,
            other: 20
          }
        ]
      },
      {
        year: '2017-18',
        data: [
          {
            populationCategory: '> 10 Lakhs',
            numOfUlb: 100,
            establishmentExpense: 10,
            administrativeExpense: 10,
            operationalAndMaintananceExpense: 10,
            interestAndFinanceExpense: 8,
            other: 20
          },
          {
            populationCategory: '1Lakh to 10Lakhs',
            numOfUlb: 100,
            establishmentExpense: 10,
            administrativeExpense: 10,
            operationalAndMaintananceExpense: 10,
            interestAndFinanceExpense: 8,
            other: 20
          },
          {
            populationCategory: '< 1 Lakh',
            numOfUlb: 100,
            establishmentExpense: 10,
            administrativeExpense: 10,
            operationalAndMaintananceExpense: 10,
            interestAndFinanceExpense: 8,
            other: 20
          }
        ]
      }
    ].map(d => {
      return {
        year: d.year,
        data: d.data.map(m => {
          m['ulbName'] = 'A';
          return m;
        })
      };
    })
  });
};

const getQuery = (year, ulb, range, numOfUlb,totalUlb) => {
  console.log(year,ulb,range,numOfUlb,totalUlb)
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
          from : "ulbs",
          localField:"ulb",
          foreignField:"_id",
          as : "ulb"
      }
  },
  { $unwind : "$ulb"},
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
              establishmentExpense: {
                $sum: { $cond: [{ $eq: ['$code', '210'] }, '$amount', 0] }
              },
              administrativeExpense: {
                $sum: { $cond: [{ $eq: ['$code', '220'] }, '$amount', 0] }
              },
              operationalAndMaintananceExpense: {
                $sum: { $cond: [{ $eq: ['$code', '230'] }, '$amount', 0] }
              },
              interestAndFinanceExpense: {
                $sum: { $cond: [{ $eq: ['$code', '240'] }, '$amount', 0] }
              },
              revenueGrants: {
                $sum: { $cond: [{ $eq: ['$code', '260'] }, '$amount', 0] }
              },
              other: {
                $sum: {
                  $cond: [
                    {
                      $in: [
                        '$code',
                        ['250', '270', '271', '272', '280', '290', '200']
                      ]
                    },
                    '$amount',
                    0
                  ]
                }
              },
              totalIncome: {
                $sum: {
                  $cond: [
                    {
                      $in: [
                        '$code',
                        [
                          '210',
                          '220',
                          '230',
                          '240',
                          '250',
                          '260',
                          '270',
                          '271',
                          '272',
                          '280',
                          '290',
                          '200'
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
        establishmentExpense: {
          $sum: { $cond: [{ $eq: ['$code', '210'] }, '$amount', 0] }
        },
        administrativeExpense: {
          $sum: { $cond: [{ $eq: ['$code', '220'] }, '$amount', 0] }
        },
        operationalAndMaintananceExpense: {
          $sum: { $cond: [{ $eq: ['$code', '230'] }, '$amount', 0] }
        },
        interestAndFinanceExpense: {
          $sum: { $cond: [{ $eq: ['$code', '240'] }, '$amount', 0] }
        },
        revenueGrants: {
          $sum: { $cond: [{ $eq: ['$code', '260'] }, '$amount', 0] }
        },
        other: {
          $sum: {
            $cond: [
              {
                $in: [
                  '$code',
                  ['250', '270', '271', '272', '280', '290', '200']
                ]
              },
              '$amount',
              0
            ]
          }
        },
        totalIncome: {
          $sum: {
            $cond: [
              {
                $in: [
                  '$code',
                  [
                    '210',
                    '220',
                    '230',
                    '240',
                    '250',
                    '260',
                    '270',
                    '271',
                    '272',
                    '280',
                    '290',
                    '200'
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

    //stage 6

    {
      $project: {
        _id: 0,
        populationCategory: '$_id.range',
        numOfUlb: '$numOfUlb',
        establishmentExpense: {
          $multiply: [
            { $divide: ['$establishmentExpense', '$totalIncome'] },
            100
          ]
        },
        administrativeExpense: {
          $multiply: [
            { $divide: ['$administrativeExpense', '$totalIncome'] },
            100
          ]
        },
        operationalAndMaintananceExpense: {
          $multiply: [
            { $divide: ['$operationalAndMaintananceExpense', '$totalIncome'] },
            100
          ]
        },
        interestAndFinanceExpense: {
          $multiply: [
            { $divide: ['$interestAndFinanceExpense', '$totalIncome'] },
            100
          ]
        },
        revenueGrants: {
          $multiply: [{ $divide: ['$revenueGrants', '$totalIncome'] }, 100]
        },
        other: {
          $multiply: [{ $divide: ['$other', '$totalIncome'] }, 100]
        }
      }
    },
    {$addFields: { totalUlb : totalUlb} }
  ];
};

const convertToPercent = obj => {
  console.log(obj)
  for (let k in obj) {
    if (k == 'populationCategory' || k == 'numOfUlb' || k=='ulbs') {
      continue;
    } else {
      obj[k] = obj[k].toFixed(2);
    }
  }
  return obj;
};
