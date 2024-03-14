require('./dbConnect');
const BondIssuerItemSchema = new Schema(
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
    issueSizeAmount: { type: String, default: '' },
    bidsReceived: { type: String, default: '' },
    amountAccepted: { type: String, default: '' },
    greenShoeOption: { type: String, default: '' },
    greenShowOptionAmount: { type: String, default: '' },
    guaranteedByStateGovernment: { type: String, default: '' },
    guaranteeMechanism: { type: String, default: '' },
    CRISIL: { type: String, default: '' },
    CARE: { type: String, default: '' },
    ICRA: { type: String, default: '' },
    Brickwork: { type: String, default: '' },
    'Auicte / SMERA': { type: String, default: '' },
    'India Ratings & Research': { type: String, default: '' },
    'Other Rating Agencies': {
      type: String,
      default: ''
    },
    'Links to reports': { type: String, default: '' },
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
    isActive: { type: Boolean, default: 1 },
    state: {type:Schema.Types.ObjectId,ref:"State",required:true}
  },
  { timestamp: { createdAt: 'createdAt', updatedAt: 'modifiedAt' } }
);
BondIssuerItemSchema.index({ ulb: 1, dateOfIssue: 1 }, { unique: true });
BondIssuerItemSchema.index({ ulb: 1, issueSize: 1 }, { unique: true });
BondIssuerItemSchema.index({ dateOfIssue: 1, issueSize: 1 }, { unique: true });
module.exports = mongoose.model('BondIssuerItem',BondIssuerItemSchema);

