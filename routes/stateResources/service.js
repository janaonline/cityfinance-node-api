
const { loadExcelByUrl } = require('../../util/worksheet')

const handleDatabaseUpload = async (req, res, next) => {
    // next();

    console.log(req.body.file);
    const remoteUrl = req.body.file.url;

    loadExcelByUrl(remoteUrl).then(workbook => {
        const worksheet = workbook.getWorksheet(1);
        worksheet.eachRow((row, rowNumber) => {
            // Process each row of the worksheet
            console.log(`Row ${rowNumber}: ${row.values}`);
        });
        
    })
}






module.exports = {
    handleDatabaseUpload
}