// Columns for top ranked ulbs data dump - topRankedUlbsDump()
const topRankedUlbsColumns = [
  { header: 'Rank', key: 'overAllRank', width: 10 },
  { header: 'State Name', key: 'stateName', width: 25 },
  { header: 'Census Code', key: 'consolidatedCode', width: 12 },
  { header: 'ULB Name', key: 'name', width: 50 },
  { header: 'Population Category', key: 'popCat', width: 18 },
  {
    header: 'Resource Mobilisation Score',
    key: 'resourceMobilizationScore',
    style: { numFmt: '0.00' },
    width: 18,
  },
  {
    header: 'Expenditure Performance Score',
    key: 'expenditurePerformanceScore',
    style: { numFmt: '0.00' },
    width: 18,
  },
  {
    header: 'Fiscal Governance Score',
    key: 'fiscalGovernanceScore',
    style: { numFmt: '0.00' },
    width: 18,
  },
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
      overAllRank: '$overAll.rank',
      overAllScore: '$overAll.score',
      resourceMobilizationScore: '$resourceMobilization.score',
      expenditurePerformanceScore: '$expenditurePerformance.score',
      fiscalGovernanceScore: '$fiscalGovernance.score',
    },
  },
  { $sort: { overAllScore: -1 } },
];

// Columns for top 10 ranked ulbs from each pop bucket - getBucketWiseTop10Ulbs()
const getBucketWiseTop10UlbsColumns = [
  {
    label: 'S.No',
    key: 'sNo',
  },
  {
    label: '4M+',
    key: 'bucket_1',
  },
  {
    label: '1M to 4M',
    key: 'bucket_2',
  },
  {
    label: '100K to 1M',
    key: 'bucket_3',
  },
  {
    label: '<100K',
    key: 'bucket_4',
  },
];

// Query to get top 10 ranked ulbs from each pop bucket - getBucketWiseTop10Ulbs()
async function getBucketWiseTop10UlbsQuery(limit) {
  return [
    { $match: { 'overAll.score': { $gt: 0 } } },
    {
      $group: {
        _id: '$populationBucket',
        topScores: {
          $push: {
            score: '$overAll.score',
            rank: '$overAll.rank',
            ulbId: '$ulb',
            ulbName: '$name',
          },
        },
      },
    },
    {
      $project: {
        topScores: {
          $slice: [
            { $sortArray: { input: '$topScores', sortBy: { rank: 1 } } },
            limit,
          ],
        },
      },
    },
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

module.exports.topRankedUlbsDumpQuery = topRankedUlbsDumpQuery;
module.exports.topRankedUlbsColumns = topRankedUlbsColumns;
module.exports.getBucketWiseTop10UlbsQuery = getBucketWiseTop10UlbsQuery;
module.exports.getBucketWiseTop10UlbsColumns = getBucketWiseTop10UlbsColumns;