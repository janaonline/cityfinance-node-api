const Ulb = require('../../../models/Ulb');
const LedgerLog = require('../../../models/LedgerLog');
const { ulbTypeQuery, populationCategoryQuery, dataAvailabilityColumnHeader, createResponseStructure } = require('./nationalDashboardService');
const { totalUlbsAsPerUlbTypeQuery, totalUlbsAsPerPopulationCategoryQuery } = require('../../utils/queryTemplates');
const { downloadExcel } = require('../../utils/downloadService');

exports.dataAvailability = async (req, res) => {
    try {
        const { financialYear, stateId, ulbType, csv } = req.query;
        const key = ulbType ? 'ulbType' : 'populationCategory';
        const data = {};
        let ulbData = {};

        if (!financialYear) throw new Error('Financial Year is required: dataAvailability()');

        if (ulbType) {
            const totalUlbsAsPerUlbType = await Ulb.aggregate(totalUlbsAsPerUlbTypeQuery(stateId));
            const UlbTypeLedgerData = await LedgerLog.aggregate(ulbTypeQuery(stateId, financialYear));
            ulbData = createResponseStructure(key, totalUlbsAsPerUlbType, UlbTypeLedgerData);
        } else {
            const totalUlbsAsPerPopulationCategory = await Ulb.aggregate(totalUlbsAsPerPopulationCategoryQuery(stateId));
            const populationTypeLedgerData = await LedgerLog.aggregate(populationCategoryQuery(stateId, financialYear));
            ulbData = createResponseStructure(key, totalUlbsAsPerPopulationCategory, populationTypeLedgerData);
        }

        data['columns'] = dataAvailabilityColumnHeader(key);
        data['rows'] = Object.values(ulbData.dataAvailabilitySplit);

        if (csv) {
            // Stream the workbook to the response
            const buffer = await downloadExcel(
                { columnHeaders: data['columns'], rowData: data['rows'] },
                { header: 'display_name', width: 20 }
            );

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=National-Data.xlsx');
            res.status(200).send(buffer);
            res.end();
            return;
        }

        res.status(200).json({
            success: true,
            data,
            dataAvailability: ulbData.dataAvailability,
        });
    } catch (error) {
        console.error('Error in data availability: ', error);
        res.status(500).json({ success: false, message: `Error in data availability: ${error.message}` });
    }
};