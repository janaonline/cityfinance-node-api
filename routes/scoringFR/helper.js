// Columns for top ranked ulbs data dump - topRankedUlbsDump()
const topRankedUlbsColumns = [
  { header: 'Rank', key: 'overAllRank', width: 10 },
  { header: 'State Name', key: 'stateName', width: 25 },
  { header: 'Census Code', key: 'consolidatedCode', width: 12 },
  { header: 'ULB Name', key: 'name', width: 50 },
  { header: 'Population Category', key: 'popCat', width: 18 },
  {
    header: 'Resource Mobilization Score',
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
    class: 'p-1 text-center'
  },
  {
    label: '4M+',
    key: 'bucket_1',
    class: 'p-1 '
  },
  {
    label: '1M to 4M',
    key: 'bucket_2',
    class: 'p-1 '
  },
  {
    label: '100K to 1M',
    key: 'bucket_3',
    class: 'p-1 '
  },
  {
    label: '<100K',
    key: 'bucket_4',
    class: 'p-1 '
  },
];

// Query to get top 10 ranked ulbs from each pop bucket - getBucketWiseTop10Ulbs()
async function getBucketWiseTop10UlbsQuery(limit) {
  // $sortArray is not supported by current mongo version
  // return [
  //   { $match: { 'overAll.score': { $gt: 0 } } },
  //   {
  //     $group: {
  //       _id: '$populationBucket',
  //       topScores: {
  //         $push: {
  //           score: '$overAll.score',
  //           rank: '$overAll.rank',
  //           ulbId: '$ulb',
  //           ulbName: '$name',
  //         },
  //       },
  //     },
  //   },
  //   {
  //     $project: {
  //       topScores: {
  //         $slice: [
  //           { $sortArray: { input: '$topScores', sortBy: { rank: 1 } } },
  //           limit,
  //         ],
  //       },
  //     },
  //   },
  // ];
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
    { $unwind: "$topScores" },
    { $sort: { "topScores.rank": 1 } },
    {
      $group: {
        _id: "$_id",
        topScores: { $push: "$topScores" },
      },
    },
    { $project: { topScores: { $slice: ["$topScores", limit] } } }
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


// Helper: to mapRes() - get color code for participatedState api.
colorDetails = [
  { color: '#06668F', min: 75.51, max: 100 },
  { color: '#0B8CC3', min: 50.51, max: 75.50 },
  { color: '#73BFE0', min: 25.51, max: 50.50 },
  { color: '#BCE2F2', min: 0.1, max: 25.50 },
  { color: '#E5E5E5', min: 0, max: 0 },
];

function getStateColor(percentage) {
  return this.colorDetails?.find(item => percentage >= item.min && percentage <= item.max)?.color || "#F3FAFF";
}

module.exports.topRankedUlbsDumpQuery = topRankedUlbsDumpQuery;
module.exports.topRankedUlbsColumns = topRankedUlbsColumns;
module.exports.getBucketWiseTop10UlbsQuery = getBucketWiseTop10UlbsQuery;
module.exports.getBucketWiseTop10UlbsColumns = getBucketWiseTop10UlbsColumns;
module.exports.getStateColor = getStateColor;
