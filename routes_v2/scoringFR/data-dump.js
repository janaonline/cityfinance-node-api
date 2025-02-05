const ExcelJS = require('exceljs');
const moment = require('moment');
const { topRankedUlbsDumpQuery, topRankedUlbsColumns } = require('./helper.js');
const ScoringFiscalRanking = require('../../models/ScoringFiscalRanking');
const { rankedUlbPdfHelper, getPopulationCategory } = require('./helper.js');

// Download data of top ranked ulbs.
module.exports.topRankedUlbsDump = async (req, res) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Rank');

  // Headers for the dump.
  worksheet.columns = topRankedUlbsColumns;

  // Fetch Data from DB.
  let ulbScoringDataCursor = await ScoringFiscalRanking.aggregate(topRankedUlbsDumpQuery).cursor().exec();

  // Add data to excel.
  for (let doc = await ulbScoringDataCursor.next(); doc != null; doc = await ulbScoringDataCursor.next()) {
    worksheet.addRow(doc);
  }

  // Style header.
  worksheet.getRow(1).alignment = {
    vertical: 'middle',
    horizontal: 'center',
    wrapText: true,
  };
  worksheet.views = [{ state: 'normal', zoomScale: 90 }];

  // Stream the workbook to the response
  const buffer = await workbook.xlsx.writeBuffer();
  let filename = `CFR_Top_Ranked_Ulbs_${moment().format('DD-MMM-YY_HH-mm-ss')}`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
  res.send(buffer);
  res.end();
};

// Helper: Function to change response structure - getUlbDetails()
function rankedUlbPdf(data) {
  try {
    // Defaults.
    const cfPrimary = 'hsla(30, 83%, 49%, 1)';
    const cfSecondary = 'hsla(220, 62%, 25%, 1)';
    const cfPrimaryLight = 'hsl(27, 79%, 92%)';

    // Cards data.
    const parameterDetails = {
      resourceMobilization: {
        key: 'RM',
        label: 'Resource Mobilisation',
        desc: "This parameter evaluates the current size and growth trend of a ulb's diverse revenue sources, including revenue generation and property tax collection.",
        maxScore: '600',
      },
      expenditurePerformance: {
        key: 'EP',
        label: 'Expenditure Performance',
        desc: "This parameter assesses the amount and effectiveness of a ULB's spending on infrastructure and services that benefit residents.",
        maxScore: '300',
      },
      fiscalGovernance: {
        key: 'FG',
        label: 'Fiscal Governance',
        desc: "This parameter assesses the strength of a ULB's financial management systems, including transparency, efficiency, and effectiveness in revenue collection and budgeting.",
        maxScore: '300',
      },
    }
    const parameters = ['resourceMobilization', 'expenditurePerformance', 'fiscalGovernance'];
    const section2RemainingCards = [];

    // Charts data.
    const ulbScores = [];
    const maxScores = [];
    const ulbRanks = [];
    const keys = [];
    const n = 14; // total indicators (0-indexed)
    const chart3DataSet = new Array(n);

    // Update variables.
    for (const ele of parameters) {
      // Update cards.
      section2RemainingCards.push({
        key: parameterDetails[ele]['key'],
        label: parameterDetails[ele]['label'],
        scoreNumerator: data['ulb'][ele]['score'],
        scoreDenominator: parameterDetails[ele]['maxScore'],
        rankNumerator: data['ulb'][ele]['rank'],
        rankDenominator: data['populationBucketUlbCount'],
        avgNumerator: data['ulb'][ele]['nationalAvg'],
        avgDenominator: parameterDetails[ele]['maxScore'],
        desc: parameterDetails[ele]['desc'],
      });

      // Update chart 1, 2.
      ulbScores.push(data['ulb'][ele]['score']);
      maxScores.push(parameterDetails[ele]['maxScore'] - data['ulb'][ele]['score']);
      ulbRanks.push(data['ulb'][ele]['rank']);
      keys.push(parameterDetails[ele]['key'])

      // Update chart 3.
      let indic10 = 0;
      let indic11 = 0;
      for (const indiData of data['assessmentParameter'][ele]['data']) {
        const i = Number(indiData['sNo']);
        const ulbScore = Number(indiData['ulbScore']);

        if (indiData['sNo'] === '10a' || indiData['sNo'] === '10b') {
          indic10 += ulbScore;
          chart3DataSet[n - 10 + 1] = indic10;
        } else if (indiData['sNo'] === '11a' || indiData['sNo'] === '11b') {
          indic11 += ulbScore;
          chart3DataSet[n - 11 + 1] = indic11;
        } else {
          chart3DataSet[n - i + 1] = ulbScore;
        }
      }

    };

    // Cart Data.
    const chart1Data = {
      labels: keys,
      datasets: [
        {
          label: 'ULB Score',
          data: ulbScores,
          backgroundColor: cfPrimary,
          barPercentage: 0.4
        },
        {
          label: 'Parameter Score',
          data: maxScores,
          backgroundColor: cfSecondary,
          barPercentage: 0.4
        },
      ],
    };
    const chart2Data = {
      labels: keys,
      datasets: [
        {
          label: 'Ranks',
          data: ulbRanks,
          backgroundColor: cfSecondary,
          borderColor: cfSecondary,
          borderWidth: 1,
        },
      ],
    };
    const chart3Data = {
      labels: [
        '15. Properties under tax collection net',
        '14. Digital own rev collection to tot own rev collection',
        '13. Own revenue receivables outstanding',
        '12. Budget vs Actual (variance) for total receipts',
        '11. P.Tax & accounting linked to it-based system',
        '10. Timely audit & publication of annual accounts',
        '9. O&M to total rev exp(3-Y Avg)',
        '8. Growth in capex per capita',
        '7. Capex per capita (3-Y Avg)',
        '6. Property tax per capita (3-Y CAGR)',
        '5. Own revenue per capita (3-Y CAGR)',
        '4. Total budget size per capita',
        '3. Property tax per capita',
        '2. Own revenue per capita',
        '1. Total budget size per capita'
      ],
      datasets: [
        {
          label: '',
          data: chart3DataSet,
          backgroundColor: cfPrimaryLight,
          borderColor: cfPrimary,
          borderWidth: 1,
        },
      ],
    };

    const modifiedData = {
      ulbData: { ulbName: data.ulb.name, censusCode: data.ulb.censusCode, sbCode: data.ulb.sbCode },
      section2: {
        card1: [
          { title: data.ulb.population, subtitle: 'Population (2011 Census)' },
          { title: getPopulationCategory(data.ulb.populationBucket), subtitle: `Population Category<br>${data.ulb.statePartCat}` },
          { title: `${data.ulb.overAll.rank}/ ${data.populationBucketUlbCount}`, subtitle: 'National Rank' }
        ],
        remainingCards: section2RemainingCards
      },
      section3: rankedUlbPdfHelper.section3,
      overAllScore: data['ulb']['overAll']['score'],
      chart1Data,
      chart2Data,
      chart3Data
    };

    return modifiedData;
  } catch (error) {
    console.error('Error in rankedUlbPdf(): ', error.message);
    return error.message;
  }
}

module.exports.rankedUlbPdf = rankedUlbPdf;