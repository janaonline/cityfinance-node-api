const ObjectId = require('mongoose').Types.ObjectId;
const Ulb = require('../../../models/Ulb');
const { getStructure, getQuery } = require('./helper');

module.exports.bsIs = async (req, res) => {
	try {
		// Validated ulbId.
		const { ulbId, btnKey } = req.query;
		if (!ulbId || !ObjectId.isValid(ulbId))
			throw new Error('Invalid or missing ulbId');

		if (!btnKey) throw new Error('btnKey is required');

		// Fetch data from ledgerLogs.
		const ledgerData = await Ulb.aggregate(getQuery(ulbId)).exec();

		// Create response.
		const response = createResponseStructure(ledgerData, btnKey);

		return res.status(200).json({
			success: true,
			data: response,
			population: Number(ledgerData?.[0]?.population),
		});
	} catch (err) {
		console.error('[ULB Fetch Error]', err);
		return res
			.status(500)
			.json({ error: `Internal server error: ${err.message}.` });
	}
};

// Based on key selected update the numbers from db to the response.
function createResponseStructure(ledgerData, btnKey) {
	// Segregate ULB data in an object.
	const ulbWiseData = ledgerData.reduce((acc, curr) => {
		const ulbId = curr._id;
		const year = curr.ledgerLogData.year.replace('-', '');
		const key = `${year}_${ulbId}`;

		if (!(key in acc)) acc[key] = {};

		acc[key] = curr;
		return acc
	}, {})

	// Array of ulbIds.
	const ulbIds = [...new Set(ledgerData.map(e => e._id.toString()))];

	// Selected ULB data.
	const selectedUlbData = ledgerData.filter(e => e._id == '5eb5844f76a3b61f40ba069a');

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

				// If calculation is true, it represents a group of line items.
				if (item.calculation) {
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
	return responseStructure;
}
