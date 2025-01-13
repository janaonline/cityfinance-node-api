const ExcelJS = require('exceljs');
const fs = require('fs');

module.exports.downloadExcel = async (
    data,
    columnHeaderKeys,
    sheetName = 'Data'
) => {

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // Add Image.
    const imageId = workbook.addImage({
        buffer: fs.readFileSync("uploads/logos/Group 1.jpeg"),
        extension: "png",
    });

    worksheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        br: { col: 4, row: 2 },
        hyperlinks: {
            hyperlink: process.env.HOSTNAME,
            tooltip: process.env.HOSTNAME
        }
    });

    // Columns
    worksheet.columns = data.columnHeaders
        .map((ele) => {
            return {
                key: 'key' in columnHeaderKeys ? ele[columnHeaderKeys.key] : ele['key'],
                header: 'header' in columnHeaderKeys ? ele[columnHeaderKeys.header] : ele['header'],
                width: 'width' in columnHeaderKeys ? columnHeaderKeys.width : ele['width'],
            }
        });

    // Insert rows to bring header below image.
    worksheet.insertRow(1, {});
    worksheet.insertRow(1, {});
    worksheet.insertRow(1, {});

    // TODO: Remove extra rows between header and data.

    // Rows
    data.rowData.forEach((row) => worksheet.addRow(row));

    // Add row at the end.
    worksheet.addRow([]);
    worksheet.addRow([`Can't find what you are looking for? Reach out to us at contact@${process.env.PROD_HOST}`]);

    // Return buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
};