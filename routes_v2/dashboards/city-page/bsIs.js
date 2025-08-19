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
function createResponseStructure(yearWiseLedgerData, btnKey) {
	const STRUCTURE = getStructure(btnKey);

	// Deep clone BS or IS STRUCTURE to avoid mutating shared reference
	const responseStructure = JSON.parse(JSON.stringify(STRUCTURE));

	for (const yearEntry of yearWiseLedgerData) {
		const ledgerLog = yearEntry.ledgerLogData;
		const ulbId = yearEntry._id;

		if (!ledgerLog || !ledgerLog.year || !ledgerLog.lineItems) continue;

		let yearKey = ledgerLog.year.replace('-', '');
		yearKey = `${yearKey}_${ulbId}`;

		for (const item of responseStructure) {
			const lineItemCode = item.code;

			// If calculation is true, it represents a group of line items.
			if (item.calculation) {
				let result = 0;

				for (const [operation, lineItems] of Object.entries(
					item.formula
				)) {
					for (const lineItem of lineItems) {
						const value =
							Number(ledgerLog.lineItems[lineItem]) || 0;

						if (operation === 'add') result += value;
						else if (operation === 'sub') result -= value;
					}
				}

				item[yearKey] = result;
			} else if (
				lineItemCode &&
				ledgerLog.lineItems[lineItemCode] !== null
			) {
				item[yearKey] = ledgerLog.lineItems[lineItemCode];
			}
		}
	}

	console.log(JSON.stringify(responseStructure, null, 2))

	return responseStructure;
}
