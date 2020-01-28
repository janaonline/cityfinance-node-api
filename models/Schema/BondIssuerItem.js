require('./dbConnect');
const service = require('../../service');
const mongoose = require('mongoose');
const bondIssuerjson = require('./bondIssuer.json');

var BondIssuerItemSchema = new Schema(
  {
    ulb: { type: String, required: true },
    yearOfBondIssued: { type: String, default: '' },
    // --------------------------- //
    // details of instrument

    typeOfInstruments: { type: String, default: '' },
    term: { type: String, default: '' },
    couponRate: { type: String, default: '' },
    interestPayment: { type: String, default: '' },
    taxTreatment: { type: String, default: '' },
    repayment: { type: String, default: '' },

    // details of issue

    dateOfIssue: { type: String, default: null },
    maturityDate: { type: String, default: '' },
    platform: { type: String, default: '' },
    type: { type: String, default: '' },
    issueSize: { type: String, default: '' },
    bidsReceived: { type: String, default: '' },
    amountAccepted: { type: String, default: '' },
    greenShoeOption: { type: String, default: '' },
    greenShowOptionAmount: { type: String, default: '' },
    guaranteedByStateGovernment: { type: String, default: '' },
    guaranteeMechanism: { type: String, default: '' },

    // rating

    crisil: { type: String, default: '' },
    care: { type: String, default: '' },
    icra: { type: String, default: '' },
    brickwork: { type: String, default: '' },
    'auicte/Smera': { type: String, default: '' },
    'indiaRatings&Research': { type: String, default: '' },
    linksToReports: { type: String, default: '' },
    otherRatingAgencies: { type: String, default: '' },

    // objective of issue

    objectOfIssue: { type: String, default: '' },

    // subscriber

    whoCanInvest: { type: String, default: '' },
    detailsOfSubscribers: { type: String, default: '' },

    // Advisors

    transactionAdvisors: { type: String, default: '' },
    trusteeForTheBond: { type: String, default: '' },
    registrarOfTheIssue: { type: String, default: '' },
    auditorOfIssue: { type: String, default: '' },
    legalCounsel: { type: String, default: '' },
    escrowBanker: { type: String, default: '' },
    arranger: { type: String, default: '' },

    // documents available

    draftInformationMemorandum: { type: String, default: '' },
    noticesFromPlatforms: { type: String, default: '' },
    others: { type: String, default: '' },

    // ---------------------------- //

    modifiedAt: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
    isActive: { type: Boolean, default: 1 }
  },
  { timestamp: { createdAt: 'createdAt', updatedAt: 'modifiedAt' } }
);

const BondIssuerItem = (module.exports = mongoose.model(
  'BondIssuerItem',
  BondIssuerItemSchema
));
BondIssuerItemSchema.index({ ulb: 1, dateOfIssue: 1 }, { unique: true });
BondIssuerItemSchema.index({ ulb: 1, issueSize: 1 }, { unique: true });
BondIssuerItemSchema.index({ dateOfIssue: 1, issueSize: 1 }, { unique: true });

module.exports.get = async function(req, res) {
  let query = { isActive: true };
  // if(req.query.ulb){
  //   query['ulb'] = req.query.ulb
  // }
  // if (req.method == 'GET') {
  //   query['isActive'] = true;
  //   // Get any line item based on code or overall
  //   // BondIssuerItem is model name
  //   if (req.params && req.params.ulb) {
  //     query['ulb'] = req.params.ulb;
  //   }
  // }
  if (req.method == 'POST') {
    query = {
      $or: [
        { ulb: { $in: req.body['ulb'] } },
        { yearOfBondIssued: { $in: req.body['year'] } }
      ]
    };
  }
  service.find(query, BondIssuerItem, function(response, value) {
    return res.status(response ? 200 : 400).send(value);
  });
};
module.exports.put = async function(req, res) {
  req.body['modifiedAt'] = new Date();
  // Edit any Line item
  // BondIssuerItem is model name
  let condition = {
    _id: req.params._id
  };
  service.put(condition, req.body, BondIssuerItem, function(response, value) {
    return res.status(response ? 200 : 400).send(value);
  });
};
module.exports.post = async function(req, res) {
  // Create any financial parameter
  // BondIssuerItem is model name

  let reqBody = {
    ...req.body,
    yearOfBondIssued: getYear(req.body.dateOfIssue)
  };
  console.log(reqBody.yearOfBondIssued);
  service.post(BondIssuerItem, reqBody, function(response, value) {
    return res.status(response ? 200 : 400).send(value);
  });
};
module.exports.delete = async function(req, res) {
  // Delete any line item based on uniqueId
  // BondIssuerItem is model name
  let condition = {
      _id: req.params._id
    },
    update = {
      isActive: false
    };
  service.put(condition, update, BondIssuerItem, function(response, value) {
    return res.status(response ? 200 : 400).send(value);
  });
};

module.exports.getJson = async function(req, res) {
  if (!bondIssuerjson) {
    return res.status(404).send();
  }
  res.send(bondIssuerjson);
};

module.exports.BondUlbs = function(req, res) {
  let arr = [
    {
      $group: {
        _id: '$ulb',
        years: { $addToSet: '$yearOfBondIssued' }
      }
    },
    {
      $project: {
        _id: 0,
        name: '$_id',
        years: '$years'
      }
    }
  ];
  service.aggregate(arr, BondIssuerItem, function(response, value) {
    return res.status(response ? 200 : 400).send(value);
  });
};

function getYear(str) {
  if (str.includes('-')) return str.split('-').slice(-1)[0];
  return str;
}
