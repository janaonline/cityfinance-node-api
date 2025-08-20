const ObjectId = require('mongoose').Types.ObjectId;
const Ulb = require('../../../models/Ulb');
const { getStructure, getQuery } = require('./helper');

module.exports.bsIs = async (req, res) => {
	try {
		// Validated ulbId.
		const { ulbIds: ulbIdsRaw, btnKey, years: yearsRaw, selectedUlb } = req.query;

		// Make use ulbIds and years are array.
		const ulbIds = Array.isArray(ulbIdsRaw) ? ulbIdsRaw : [ulbIdsRaw];
		const years = Array.isArray(yearsRaw) ? yearsRaw : [yearsRaw];

		if (!ulbIds.length)
			throw new Error('Invalid or missing ulbId');

		ulbIds.forEach(ulbId => {
			if (!ObjectId.isValid(ulbId))
				throw new Error('Invalid ulbId', ulbId);
		});

		if (!years.length)
			throw new Error('Missing years');

		if (!btnKey) throw new Error('btnKey is required');

		// Fetch data from ledgerLogs.
		const ledgerData = await Ulb.aggregate(getQuery(ulbIds, years)).exec();

		// Create response.
		const { responseStructure, ulbsData } = createResponseStructure(ledgerData, btnKey, selectedUlb);

		return res.status(200).json({
			success: true,
			data: responseStructure,
			population: Number(ledgerData?.[0]?.population),
			ulbsData,
		});
	} catch (err) {
		console.error('[ULB Fetch Error]', err);
		return res
			.status(500)
			.json({ error: `Internal server error: ${err.message}.` });
	}
};

// Based on key selected update the numbers from db to the response.
function createResponseStructure(ledgerData, btnKey, selectedUlbId) {
	// Segregate ULB data in an object.
	const ulbWiseData = {};
	const ulbsData = {};

	ledgerData.forEach((curr) => {
		const ulbId = curr._id;
		const year = curr.ledgerLogData.year.replace('-', '');
		const key = `${year}_${ulbId}`;

		ulbWiseData[key] = curr;

		// Store pop, stateName, name in diff obj.
		if (!(ulbId in ulbsData)) {
			ulbsData[ulbId] = {
				_id: ulbId,
				name: curr.name,
				stateName: curr.stateName,
				population: curr.population,
			};
		}
	});


	// Array of ulbIds.
	const ulbIds = [...new Set(ledgerData.map(e => e._id.toString()))];

	// Selected ULB data.
	const selectedUlbData = ledgerData.filter(e => e._id == selectedUlbId);

	const STRUCTURE = getStructure(btnKey);

	// Deep clone BS or IS STRUCTURE to avoid mutating shared reference
	const responseStructure = JSON.parse(JSON.stringify(STRUCTURE));

	for (const yearEntry of selectedUlbData) {
		const ledgerLog = yearEntry.ledgerLogData;
		if (!ledgerLog || !ledgerLog.year || !ledgerLog.lineItems) continue;

		const year = ledgerLog.year.replace('-', '');

		for (const item of responseStructure) {
			for (const ulbId of ulbIds) {
				const key = `${year}_${ulbId}`;
				const lineItemCode = item.code;
				const lineItemsObj = ulbWiseData[key]?.ledgerLogData?.lineItems;

				// Add state name only while ULB compare.
				if (item.isState && ulbIds.length > 1) {
					item[key] = ulbWiseData[key]?.name;
				}
				// If calculation is true, it represents a group of line items.
				else if (item.calculation) {
					let result = 0;

					for (const [operation, lineItems] of Object.entries(item.formula)) {
						for (const lineItem of lineItems) {
							const value =
								lineItemsObj ? Number(lineItemsObj[lineItem]) : 0;

							if (operation === 'add') result += value;
							else if (operation === 'sub') result -= value;
						}
					}

					item[key] = result;
				} else if (
					lineItemCode &&
					lineItemsObj &&
					lineItemCode in lineItemsObj &&
					lineItemsObj[lineItemCode] !== null
				) {
					item[key] = lineItemsObj[lineItemCode];
				}
			}
		}
	}

	// console.log(JSON.stringify(responseStructure, null, 2))

	return { responseStructure, ulbsData };
}
