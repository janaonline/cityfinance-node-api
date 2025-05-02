const Ulb = require('../../../models/Ulb');
const LedgerLog = require('../../../models/LedgerLog');
const ObjectId = require('mongoose').Types.ObjectId;
const { getPopulationCategory, formatNumberWithCommas } = require('../../common/common');

module.exports.cityDetails = async (req, res) => {
    try {
        // Validated req.query.
        const { ulbId } = req.query;
        if (!ulbId || !ObjectId.isValid(ulbId))
            return res.status(400).json({ error: 'Invalid or missing ulbId' });

        // Fetch data from DB - Ulb, ledgerLogs collections.
        const [ulbData, financialYears] = await getDataFromDb(ulbId);
        if (!ulbData) return res.status(404).json({ error: 'ULB not found' });

        // Prepare structured data for response.
        const gridDetails = buildUlbMetrics(ulbData, financialYears);

        return res
            .status(200)
            .json({
                ulbName: ulbData.name,
                popCat: getPopulationCategory(+ulbData.population),
                ulbId,
                gridDetails,
            });
    } catch (err) {
        console.error('[ULB Fetch Error]', err);
        return res
            .status(500)
            .json({ error: `Internal server error: ${err.message}.` });
    }
};

// Fetch data from ulbs, ledgerlogs collection.
async function getDataFromDb(ulbId) {
    // Parallel fetch of ULB and financial years
    const [ulbData, financialYears] = await Promise.all([
        Ulb.findOne(
            { _id: new ObjectId(ulbId) },
            { name: 1, population: 1, area: 1, wards: 1, isUA: 1, UA: 1 }
        )
            .populate('UA', 'name')
            .lean(),

        LedgerLog.distinct('year', { ulb_id: new ObjectId(ulbId) }),
    ]);

    return [ulbData, financialYears];
}

// Contruct grid details.
function buildUlbMetrics(ulbData, financialYears = []) {
    const population = Number(ulbData.population) || 0;
    const area = Number(ulbData.area) || 0;
    const wards = ulbData.wards || 'NA';
    const yearsCount = financialYears.length;
    const popDensity =
        area > 0
            ? `${formatNumberWithCommas((population / area).toFixed(2))}/ Sq km`
            : 'NA';
    const uaValue = `${ulbData.isUA || 'No'}${ulbData.UA?.name ? ` (${ulbData.UA.name})` : ''}`;
    const areaValue = area ? `${formatNumberWithCommas(area)} Sq km` : 'NA';

    return [
        {
            value: formatNumberWithCommas(population),
            desc: 'Population',
            info: '',
        },
        { value: wards, desc: 'Wards', info: '' },
        { value: areaValue, desc: 'Area', info: '' },
        { value: yearsCount, desc: 'Years of financial data', info: '' },
        { value: popDensity, desc: 'Population Density', info: '' },
        { value: uaValue, desc: 'Part of UA', info: '' },
    ];
}
