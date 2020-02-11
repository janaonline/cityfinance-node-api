const moment = require('moment');
const UlbLedger = require('../../../models/Schema/UlbLedger');

module.exports = async (req, res, next) => {
  try {
    let output = [];
    let query;

    for (let q of req.body.queryArr) {
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
              _id: { financialYear: '$financialYear', range: '$range' },
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
          }
        ];

        let data = await UlbLedger.aggregate(query);
        console.log(data);
      }
    }
    return res.status(200).json({
      timestamp: moment().unix(),
      success: true,
      message: '',
      data: []
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
