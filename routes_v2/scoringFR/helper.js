// Columns for top ranked ulbs data dump - topRankedUlbsDump()
const topRankedUlbsColumns = [
  { header: 'Rank', key: 'overAllRank', width: 10 },
  { header: 'State Name', key: 'stateName', width: 25 },
  { header: 'State Sub-Category', key: 'stateCat', width: 25 },
  { header: 'Census Code', key: 'consolidatedCode', width: 12 },
  { header: 'ULB Name', key: 'name', width: 50 },
  { header: 'Population Category', key: 'popCat', width: 18 },
  {
    header: 'Resource Mobilization Score',
    key: 'resourceMobilizationScore',
    style: { numFmt: '0.00' },
    width: 18,
  },
  // {
  //   header: 'Resource Mobilization Rank',
  //   key: 'resourceMobilizationRank',
  //   width: 18,
  // },
  {
    header: 'Expenditure Performance Score',
    key: 'expenditurePerformanceScore',
    style: { numFmt: '0.00' },
    width: 18,
  },
  // {
  //   header: 'Expenditure Performance Rank',
  //   key: 'expenditurePerformanceRank',
  //   width: 18,
  // },
  {
    header: 'Fiscal Governance Score',
    key: 'fiscalGovernanceScore',
    style: { numFmt: '0.00' },
    width: 18,
  },
  // {
  //   header: 'Fiscal Governance Rank',
  //   key: 'fiscalGovernanceRank',
  //   width: 18,
  // },
  {
    header: 'Total Score',
    key: 'overAllScore',
    style: { numFmt: '0.00' },
    width: 18,
  },
];

// Query to download data dump for top ranked ulbs - topRankedUlbsDump()
const topRankedUlbsDumpQuery = [
  { $match: { currentFormStatus: 11 } },
  {
    $lookup: {
      from: 'states',
      let: { stateId: '$state' },
      pipeline: [
        { $match: { $expr: { $eq: ['$_id', '$$stateId'] } } },
        { $project: { name: 1 } },
      ],
      as: 'stateData',
    },
  },
  {
    $addFields: {
      censusCode: convertToNumber('censusCode', 'int'),
      sbCode: convertToNumber('sbCode', 'int'),
      consolidatedCode: {
        $cond: [
          { $ne: ['$censusCode', null] },
          convertToNumber('censusCode', 'int'),
          convertToNumber('sbCode', 'int'),
        ],
      },
      popCat: {
        $switch: {
          branches: [
            { case: { $eq: ['$populationBucket', 1] }, then: '4M+' },
            { case: { $eq: ['$populationBucket', 2] }, then: '1M-4M' },
            { case: { $eq: ['$populationBucket', 3] }, then: '100K-1M' },
            { case: { $eq: ['$populationBucket', 4] }, then: '<100K' },
          ],
          default: 'Unknown',
        },
      },
      stateCat: {
        $switch: {
          branches: [
            { case: { $eq: ['$stateParticipationCategory', 'high'] }, then: 'High Participation' },
            { case: { $eq: ['$stateParticipationCategory', 'low'] }, then: 'Low Participation' },
            { case: { $eq: ['$stateParticipationCategory', 'hilly'] }, then: 'Hilly/ North Eastern States' }
          ],
          default: 'Unknown',
        }
      }
    },
  },
  {
    $project: {
      popCat: 1,
      censusCode: 1,
      sbCode: 1,
      consolidatedCode: 1,
      name: 1,
      stateName: { $arrayElemAt: ['$stateData.name', 0] },
      stateCat: 1,
      overAllRank: '$overAll.rank',
      overAllScore: '$overAll.score',
      resourceMobilizationScore: '$resourceMobilization.score',
      expenditurePerformanceScore: '$expenditurePerformance.score',
      fiscalGovernanceScore: '$fiscalGovernance.score',
      resourceMobilizationRank: '$resourceMobilization.rank',
      expenditurePerformanceRank: '$expenditurePerformance.rank',
      fiscalGovernanceRank: '$fiscalGovernance.rank',
    },
  },
  { $sort: { overAllScore: -1 } },
];

// Columns for top 10 ranked ulbs from each pop bucket - getBucketWiseTop10Ulbs()
const getBucketWiseTopUlbsColumns = [
  {
    label: 'Population Category',
    key: 'popCat',
    class: 'p-1 text-center'
  },
  {
    label: `Category 1 States (High Participation)`,
    key: 'cat_high',
    class: 'p-1 '
  },
  {
    label: `Category 2 States (Low Participation)`,
    key: 'cat_low',
    class: 'p-1 '
  },
  {
    label: `Category 3 States (Hilly/ North-Eastern States)`,
    key: 'cat_hilly',
    class: 'p-1 '
  }
];

// Query to get top 10 ranked ulbs from each pop bucket - getBucketWiseTop10Ulbs()
async function getBucketWiseTopUlbsQuery(limit) {
  return [
    { $match: { "overAll.rank": { $gt: 0, $lte: limit } } },
    {
      $group: {
        _id: {
          stateParticipationCategory: "$stateParticipationCategory",
          popBucket: "$populationBucket"
        },
        topScores: {
          $push: {
            rank: "$overAll.rank",
            ulbId: "$ulb",
            ulbName: "$name",
          }
        }
      }
    }
  ];
}

// Helper: to convert string to number - mongo query.
function convertToNumber(key, dataType) {
  return {
    $convert: {
      input: `$${key}`,
      to: dataType,
      onError: null,
      onNull: null,
    },
  };
}

// Helper for setUlbParticipatedData(): return (high || low ||  hilly).
function getSateParticipationCategory(participatedUlbsPercentage = 0, isHilly = false) {
  let type = 'low';
  if (isHilly) type = 'hilly';
  else if (participatedUlbsPercentage >= 75) type = 'high';

  return type;
}

// Helper: to mapRes() - get color code for participatedState api.
// const colorDetails = [
//   { color: { 'high': '#06668F', 'low': '#40916c', 'hilly': '#b07d62' }, min: 75.51, max: 100 },
//   { color: { 'high': '#0B8CC3', 'low': '#52b788', 'hilly': '#cd9777' }, min: 50.51, max: 75.50 },
//   { color: { 'high': '#73BFE0', 'low': '#95d5b2', 'hilly': '#deab90' }, min: 25.51, max: 50.50 },
//   { color: { 'high': '#BCE2F2', 'low': '#d8f3dc', 'hilly': '#edc4b3' }, min: 0.1, max: 25.50 },
//   { color: { 'high': '#E5E5E5', 'low': '#E5E5E5', 'hilly': '#E5E5E5' }, min: 0, max: 0 },
// ];
const colorDetails = [
  { color: { 'high': '#0B8CC3', 'low': '#52b788', 'hilly': '#d69f7e' }, min: 75.51, max: 100 },
  { color: { 'high': '#0B8CC3', 'low': '#52b788', 'hilly': '#d69f7e' }, min: 50.51, max: 75.50 },
  { color: { 'high': '#0B8CC3', 'low': '#52b788', 'hilly': '#d69f7e' }, min: 25.51, max: 50.50 },
  { color: { 'high': '#0B8CC3', 'low': '#52b788', 'hilly': '#d69f7e' }, min: 0.1, max: 25.50 },
  { color: { 'high': '#E5E5E5', 'low': '#E5E5E5', 'hilly': '#E5E5E5' }, min: 0, max: 0 },
];

const columnColor = { 'high': '#BCE2F2', 'low': '#d8f3dc', 'hilly': '#edc4b3' };

function getStateColor(percentage, type, isColumnColor = false) {
  if (isColumnColor) return columnColor[type];
  return colorDetails?.find(item => percentage >= item.min && percentage <= item.max)?.color[type] || "#E5E5E5";
}

// Get population category.
function getPopulationCategory(populationBucket) {
  let populationCategory = '4M+';
  
  switch (Number(populationBucket)) {
    case 1: populationCategory = '4M+'; break;
    case 2: populationCategory = '1M-4M'; break;
    case 3: populationCategory = '100K-1M'; break;
    case 4: populationCategory = '<100K'; break;
  }

  return populationCategory;
}

// Helper: template/ static data for rankedUlbPdf()
const rankedUlbPdfHelper = {
  section2: {
    card1: { title: '', subtitle: '' },
    remainingCards: {
      key: '',
      label: '',
      scoreNumerator: 0,
      scoreDenominator: 0,
      rankNumerator: 0,
      rankDenominator: 0,
      avgNumerator: 0,
      avgDenominator: 0,
      desc: ''
    }
  },
  section3: {
    card1: {
      header: 'Parameter wise Scores',
      desc: 'This section presents the city’s scores for the 3 pillars of sound financial management: resource mobilisation, expenditure performance, and fiscal governance. A high score in resource mobilisation indicates strong revenue generation, while a high score in expenditure performance reflects efficient use of fund',
      note: {
        header: 'Note: Subcategory - % of ULB participation for rankings from each state.',
        desc: [
          'High Participation(> 75 % Participation)',
          'Low Participation(<75% Participated)',
          'Hilly / North Eastern states',
        ]
      }
    },
    card2a: {
      header: 'Overall Score',
      desc: 'This section shows the city’s overall score (out of 1200) based on its performance across 15 key indicators of financial health. The city’s rank among all participating cities is also provided.'
    },
    card2b: {
      header: 'Parameter wise rank',
      desc: 'This section presents the city’s rank for each parameter resource mobilisation, expenditure performance, and fiscal governance compared to other cities in its population category. Higher ranks indicate better performance than peer cities in revenue generation, efficient spending, and financial transparency.'
    },
    card3a: {
      header: 'Indicator-wise Score',
      desc: 'This section provides a detailed breakdown of the city’s performance on the 15indicators used to calculate the overall score. These indicators cover various aspectsof resource mobilisation, expenditure performance, and fiscal governance, providing agranular view of the city’s financial health. Each indicator is scored out of 100.'
    },
    card3b: {
      header: 'About City Finance Rankings',
      desc: "The CityFinance Rankings, an initiative of the Ministry of Housing and Urban Affairs in collaboration with Janaagraha, evaluates the financial health of India's cities(Urban Local Bodies ULBs) based on their financial performance across various parameters.By promoting fiscal accountability and transparency among ULBs, the rankings ultimately aim to improve the quality of life for residents across India's urban landscape."
    }
  }
};

module.exports.topRankedUlbsDumpQuery = topRankedUlbsDumpQuery;
module.exports.topRankedUlbsColumns = topRankedUlbsColumns;
module.exports.getBucketWiseTopUlbsQuery = getBucketWiseTopUlbsQuery;
module.exports.getBucketWiseTopUlbsColumns = getBucketWiseTopUlbsColumns;
module.exports.getStateColor = getStateColor;
module.exports.getSateParticipationCategory = getSateParticipationCategory;
module.exports.rankedUlbPdfHelper = rankedUlbPdfHelper;
module.exports.getPopulationCategory = getPopulationCategory;