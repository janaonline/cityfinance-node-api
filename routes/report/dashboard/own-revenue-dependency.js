const moment = require('moment');
const UlbLedger = require('../../../models/Schema/UlbLedger');

module.exports = async (req, res, next) => {
  try {
    //console.log(req.body.queryArr);
    let query;
    let output = [];
    let ownRevenueCode = ['110', '130', '140'];
    let revenueExpenditureCode = [
      '210',
      '220',
      '230',
      '240',
      '250',
      '260',
      '270',
      '271',
      '272',
      '200'
    ];
    for (let q of req.body.queryArr) {
      let obj = {
        year: q.financialYear,
        data: []
      };
      for (let d of q.data) {
        let range = d.range;
        query = [
          // stage 1
          {
            $match: {
              financialYear: q.financialYear,
              ulb: d.ulb
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
              range: range,
              financialYear: 1,
              ulb: 1,
              amount: 1,
              code: '$lineitems.code'
            }
          },

          // stage 5
          {
            $group: {
              _id: {
                financialYear: '$financialYear',
                range: '$range',
                ulb: '$ulb'
              },
              ownRevenue: {
                $sum: {
                  $cond: [{ $in: ['$code', ownRevenueCode] }, '$amount', 0]
                }
              },
              revenueExpenditure: {
                $sum: {
                  $cond: [
                    { $in: ['$code', revenueExpenditureCode] },
                    '$amount',
                    0
                  ]
                }
              }
            }
          },

          // stage 6

          {
            $project: {
              financialYear: '$_id.financialYear',
              range: '$_id.range',
              ulb: '$_id.ulb',
              ownRevenue: 1,
              revenueExpenditure: 1,
              ownRevenuePercentageUlB: {
                $cond: [
                  { $ne: ['$revenueExpenditure', 0] },
                  {
                    $multiply: [
                      { $divide: ['$ownRevenue', '$revenueExpenditure'] },
                      100
                    ]
                  },
                  0
                ]
              }
            }
          },

          // stage 7

          {
            $group: {
              _id: {
                financialYear: '$_id.financialYear',
                range: '$_id.range'
              },
              minOwnRevenuePercentage: { $min: '$ownRevenuePercentageUlB' },
              maxOwnRevenuePercentage: { $max: '$ownRevenuePercentageUlB' },
              ownRevenue: { $sum: '$ownRevenue' },
              revenueExpenditure: { $sum: '$revenueExpenditure' },
              noOfUlb: { $sum: 1 }
            }
          },

          // stage 8

          {
            $project: {
              _id: 0,
              populationCategory: '$_id.range',
              numOfUlb: '$noOfUlb',
              ownRevenue: '$ownRevenue',
              revenueExpenditure: '$revenueExpenditure',
              ownRevenuePercentage: {
                $multiply: [
                  { $divide: ['$ownRevenue', '$revenueExpenditure'] },
                  100
                ]
              },
              minOwnRevenuePercentage: '$minOwnRevenuePercentage',
              maxOwnRevenuePercentage: '$maxOwnRevenuePercentage'
            }
          }
        ];

        let data = await UlbLedger.aggregate(query);

        obj['data'].push(data[0]);
      }
      output.push(obj);
    }
    console.log(output);
    return res.status(200).json({
      timestamp: moment().unix(),
      success: true,
      message: '',
      data: getData()
    });
    // return res.status(200).json({
    //     timestamp: moment().unix(),
    //     success: true,
    //     message: "",
    //     data: getData()
    // })
  } catch (error) {}
};
const getData = ()=>{
  return [
    {
      year: "2016-17",
      data: [
        {
          populationCategory: "> 10 Lakhs",
          numOfUlb: 100,
          ownRevenue: 1000,
          revenueExpenditure: 10000,
          ownRevenuePercentage: 10,
          minOwnRevenuePercentage: 8,
          maxOwnRevenuePercentage: 20
        },
        {
          populationCategory: "1Lakh to 10Lakhs",
          numOfUlb: 100,
          ownRevenue: 1000,
          revenueExpenditure: 10000,
          ownRevenuePercentage: 10,
          minOwnRevenuePercentage: 8,
          maxOwnRevenuePercentage: 20
        },
        {
          populationCategory: "< 1 Lakh",
          numOfUlb: 100,
          ownRevenue: 1000,
          revenueExpenditure: 10000,
          ownRevenuePercentage: 10,
          minOwnRevenuePercentage: 8,
          maxOwnRevenuePercentage: 20
        }
      ]
    },
    {
      year: "2017-18",
      data: [
        {
          populationCategory: "> 10 Lakhs",
          numOfUlb: 100,
          ownRevenue: 1000,
          revenueExpenditure: 10000,
          ownRevenuePercentage: 10,
          minOwnRevenuePercentage: 8,
          maxOwnRevenuePercentage: 20
        },
        {
          populationCategory: "1Lakh to 10Lakhs",
          numOfUlb: 100,
          ownRevenue: 1000,
          revenueExpenditure: 10000,
          ownRevenuePercentage: 10,
          minOwnRevenuePercentage: 8,
          maxOwnRevenuePercentage: 20
        },
        {
          populationCategory: "< 1 Lakh",
          numOfUlb: 100,
          ownRevenue: 1000,
          revenueExpenditure: 10000,
          ownRevenuePercentage: 10,
          minOwnRevenuePercentage: 8,
          maxOwnRevenuePercentage: 20
        }
      ]
    }
  ].map(d => {
    return {
      year: d.year,
      data: d.data.map(m => {
        m["ulbName"] = 'C';
        return m;
      })
    }
  });
}