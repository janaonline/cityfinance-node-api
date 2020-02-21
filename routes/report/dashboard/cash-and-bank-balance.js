const moment = require('moment');
const UlbLedger = require('../../../models/Schema/UlbLedger');

module.exports = async (req, res, next)=>{
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
        return res.json(query);
        let data = await UlbLedger.aggregate(query);
        data[0]['numOfUlb'] = numOfUlb;
        let dataObj = convertToCrores(data[0]);
        obj['data'].push(dataObj);
        //console.log(data[0]);
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
}

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
    {$match:{"lineitems.code" : "450"}},
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
          "$addToSet": {
              "_id": "$ulb._id",
              "name": "$ulb.name",
              "population": "$ulb.population",
              cashAndBankBalance: {
                $sum: { $cond: [{ $eq: ['$code', '450'] }, '$amount', 0] }
              }
          }
      },
        cashAndBankBalance: {
          $sum: { $cond: [{ $eq: ['$code', '450'] }, '$amount', 0] }
        }
      }
    },

    //stage 6

    {
      $project: {
        _id: 0,
        populationCategory: '$_id.range',
        ulbs: 1,
        numOfUlb: '$numOfUlb',
        cashAndBankBalance: '$cashAndBankBalance'
      }
    },

    {$addFields : {  totalUlb : totalUlb } }
  ];
};

const convertToCrores = (obj) => {
    obj['cashAndBankBalance'] = obj['cashAndBankBalance'];
    return obj;
}

const outputFormat = () => {
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
            cashAndBankBalance: 1000
          },
          {
            populationCategory: '1Lakh to 10Lakhs',
            numOfUlb: 100,
            cashAndBankBalance: 1000
          },
          {
            populationCategory: '< 1 Lakh',
            numOfUlb: 100,
            cashAndBankBalance: 1000
          }
        ]
      },
      {
        year: '2017-18',
        data: [
          {
            populationCategory: '> 10 Lakhs',
            numOfUlb: 100,
            cashAndBankBalance: 1000
          },
          {
            populationCategory: '1Lakh to 10Lakhs',
            numOfUlb: 100,
            cashAndBankBalance: 1000
          },
          {
            populationCategory: '< 1 Lakh',
            numOfUlb: 100,
            cashAndBankBalance: 1000
          }
        ]
      }
    ].map(d => {
      return {
        year: d.year,
        data: d.data.map(m => {
          m['ulbName'] = 'B';
          return m;
        })
      };
    })
  });
};