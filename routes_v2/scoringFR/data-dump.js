const ExcelJS = require('exceljs');
const moment = require('moment');
const { topRankedUlbsDumpQuery, topRankedUlbsColumns } = require('./helper.js');
const ScoringFiscalRanking = require('../../models/ScoringFiscalRanking');

// Download data of top ranked ulbs.
module.exports.topRankedUlbsDump = async (req, res) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Rank');

  // Headers for the dump.
  worksheet.columns = topRankedUlbsColumns;

  // Fetch Data from DB.
  let ulbScoringDataCursor = await ScoringFiscalRanking.aggregate(topRankedUlbsDumpQuery).cursor().exec();

  // Add data to excel.
  for (let doc = await ulbScoringDataCursor.next(); doc != null;doc = await ulbScoringDataCursor.next()) {
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
  res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
  res.send(buffer);
  res.end();
};
