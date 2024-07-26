const ExcelJS = require('exceljs');

module.exports = async function (req, res) {
    try {
        let fileProcessingTracker = req.body.fileProcessingTracker;
        let filesToUpload = req.body.filesToUpload;
        let ErrorLog = [];

        for (let index = 0; index < filesToUpload.length; index++) {
            let obj = {};
            obj["name"] = filesToUpload[index];
            obj["status"] = fileProcessingTracker[index].status;
            obj["message"] = fileProcessingTracker[index].message;

            ErrorLog.push(obj);
        }
        // Create a new workbook and add a worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet_1 = workbook.addWorksheet("Error Log");

        // Define the columns
        worksheet_1.columns = [
            { header: '#', key: 'rowSlNo', width: 7 },
            { header: 'File Name', key: 'name', width: 20 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Message', key: 'message', width: 25 },
        ];

        // Add rows to the worksheet
        let rowSlNo = 1;
        ErrorLog.forEach(item => {
            item["rowSlNo"] = rowSlNo++;
            worksheet_1.addRow(item);
        });

        // Create a buffer to store the Excel file
        const buffer = await workbook.xlsx.writeBuffer();

        // Set file name.
        const now = new Date();
        const dateString = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
        const timeString = `${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}-${now.getSeconds().toString().padStart(2, '0')}`;
        const filename = `Bulk-Upload-Error-Log_${dateString}_${timeString}.xlsx`;

        // Set the response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        // Send the buffer as the response
        return res.send(buffer);
    } catch (e) {
        return;
    }

}
