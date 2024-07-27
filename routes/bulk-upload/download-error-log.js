const ExcelJS = require('exceljs');

// Validate input data
const validateInput = (fileProcessingTracker, filesToUpload) => {
    if (typeof fileProcessingTracker !== 'object' || !Array.isArray(filesToUpload)) {
        throw new Error('Invalid input data');
    } else if (Object.keys(fileProcessingTracker).length != filesToUpload.length) {
        throw new Error('Incomplete data received');
    }
};

module.exports = async function (req, res) {
    try {
        const fileProcessingTracker = req.body.fileProcessingTracker;
        const filesToUpload = req.body.filesToUpload;

        // Validate the input data
        validateInput(fileProcessingTracker, filesToUpload);

        const ErrorLog = filesToUpload.map((file, index) => ({
            name: file,
            status: fileProcessingTracker[index]?.status || 'Unknown',
            message: fileProcessingTracker[index]?.message || 'No message'
        }));

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
        console.error(e.message);
        return res.status(500).send(`Error encountered: ${e.message}`);
    }

}
