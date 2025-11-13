const Ulb = require('../../../models/Ulb');
const LedgerLog = require('../../../models/LedgerLog');
const ObjectId = require('mongoose').Types.ObjectId;
const {
	getPopulationCategory,
	formatNumberWithCommas,
	getLastModifiedDateHelper,
} = require('../../common/common');

module.exports.cityDetails = async (req, res) => {
	try {
		// Validated req.query.
		const { citySlugName, cityId } = req.query;

		if (!citySlugName && !cityId) {
			return res.status(400).json({ error: 'Invalid or missing slug name or ulbId' });
		}

		const findQuery = {};
		if (citySlugName) findQuery['slug'] = citySlugName;
		else if (cityId) findQuery['_id'] = ObjectId(cityId);

		const ulbData = await Ulb.findOne(
			findQuery,
			{ name: 1, population: 1, area: 1, wards: 1, isUA: 1, UA: 1, state: 1, slug: 1, ulbType: 1 },
		)
			.populate('UA', 'name')
			.populate('state', 'name code slug')
			.populate('ulbType', 'name')
			.lean();
		if (!ulbData) return res.status(404).json({ error: 'ULB not found' });

		// Fetch data from DB - Ulb, ledgerLogs collections.
		const [financialYears, lastModifiedAt] = await getDataFromDb(ulbData._id);

		// Prepare structured data for response.
		const gridDetails = buildUlbMetrics(ulbData, financialYears);

		return res.status(200).json({
			ulbName: ulbData.name,
			state: ulbData.state,
			ulbId: ulbData._id,
			ulbType: ulbData.ulbType.name,
			popCat: getPopulationCategory(+ulbData.population),
			gridDetails,
			lastModifiedAt: lastModifiedAt?.[0]?.lastModifiedAt || null,
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
	const [financialYears, lastModifiedAt] = await Promise.all([
		// Ulb.findOne(
		// 	{ _id: new ObjectId(ulbId) },
		// 	{ name: 1, population: 1, area: 1, wards: 1, isUA: 1, UA: 1, state: 1 }
		// )
		// 	.populate('UA', 'name')
		// 	.populate('state', 'name code')
		// 	.lean(),

		LedgerLog.distinct('year', { ulb_id: new ObjectId(ulbId), isStandardizable: { $ne: 'No' } }),

		getLastModifiedDateHelper({ ulb_id: new ObjectId(ulbId) }),
	]);

	return [financialYears, lastModifiedAt];
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
	const uaValue = `${ulbData.isUA || 'No'}${ulbData.UA?.name ? ` (${ulbData.UA.name})` : ''
		}`;
	const areaValue = area ? `${formatNumberWithCommas(area)} Sq km` : 'NA';

	return [
		{
			sequence: 1,
			value: formatNumberWithCommas(population),
			label: 'Population',
			info: '',
		},
		{ sequence: 2, value: areaValue, label: 'Area', info: '' },
		{
			sequence: 3,
			value: popDensity,
			label: 'Population Density',
			info: '',
		},
		{ sequence: 4, value: wards, label: 'Wards', info: '' },
		{
			sequence: 5,
			value: yearsCount,
			label: 'Years of financial data',
			info: '',
		},
		{ sequence: 6, value: uaValue, label: 'Part of UA', info: '' },
	];
}
