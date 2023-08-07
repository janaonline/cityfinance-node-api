const ExcelJS = require('exceljs');
const axios = require('axios');

const loadExcelByUrl = url => {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            const buffer = response.data;
            console.log('buffer', buffer)
            // Read the Excel file from the buffer using ExcelJS
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);
            resolve(workbook);
    
        } catch (err) {
            reject(err);
        }
    })
}

module.exports = {
    loadExcelByUrl
};