const LedgerLog = require('../../models/LedgerLog');
const LineItem = require('../../models/LineItem');
const UlbLedger = require('../../models/UlbLedger');
const ObjectId = require('mongoose').Types.ObjectId;
const BSON = require('bson');

// Returns size.
function getBsonSize(doc) {
	const bson = new BSON();
	const serialized = bson.serialize(doc);
	return serialized.length;
}

// Get "code" from lineItems collection.
async function getLineItemsCode() {
	const lineItemsData = await LineItem.find({}).lean();

	return lineItemsData.reduce((acc, item) => {
		acc[item._id.toString()] = item.code;
		return acc;
	}, {});
}

// Migrates `ulbLedgers` data (input sheet) to the `ledgerLogs` collection.
// Each document in `ledgerLogs` represents a unique combination of ULB and financial year. (One ULB + One Year = One Document)
module.exports.transferUlbLedgersToLedgerLogs = async (req, res) => {
	try {
		if (req.decoded?.role !== 'ADMIN')
			throw new Error(
				'Access denied. Please log in with an Admin account.'
			);

		// Do not update if `ledgerLogs` already has lineItems, unless forceUpdate is set to true.
		const forceUpdate = req.query.forceUpdate || 'false';

		// Parallelizing Async Operations.
		const [lineItemsObj, years] = await Promise.all([
			getLineItemsCode(),
			UlbLedger.distinct('financialYear').lean(),
		]);

		const result = {};

		// Bulk write to ulbLedgers year wise.
		for (const year of years) {
			const ulbLedgers = await UlbLedger.find({
				financialYear: year,
			}).lean();
			const ulbWiseLineItems = {};

			for (const lineItem of ulbLedgers) {
				const ulbId = lineItem.ulb.toString();
				const code = lineItemsObj[lineItem.lineItem.toString()];

				if (!ulbWiseLineItems[ulbId])
					ulbWiseLineItems[ulbId] = { lineItems: new Map() };
				ulbWiseLineItems[ulbId]['lineItems'].set(
					code,
					lineItem.amount ? +lineItem.amount : null
				);
			}

			const filterCondition =
				forceUpdate.toString() == 'false'
					? {
							$or: [
								{ lineItems: { $exists: false } },
								{ lineItems: {} },
							],
					  }
					: {};
			const query = [];
			for (const [key, value] of Object.entries(ulbWiseLineItems)) {
				query.push({
					updateOne: {
						filter: {
							ulb_id: ObjectId(key),
							year: year,
							...filterCondition,
						},
						update: {
							$set: {
								lineItems: Object.fromEntries(
									value['lineItems']
								),
							},
						},
					},
				});
			}

			const size = getBsonSize(query);
			const start = performance.now();
			const BATCH_SIZE = 1000;
			let modifiedCount = 0;

			for (let i = 0; i < query.length; i += BATCH_SIZE) {
				const batch = query.slice(i, i + BATCH_SIZE);
				const ledgerLogStatus = await LedgerLog.bulkWrite(batch);
				modifiedCount += ledgerLogStatus.nModified;
			}

			const end = performance.now();

			result[year] = {
				ulbLedgersCount: ulbLedgers.length,
				timeTaken: Math.round((end - start) / 1000) + 's',
				approxSize: (size / 1000000).toFixed(2) + 'MB',
				modifiedCount,
			};
		}
		res.status(200).json({
			status: true,
			message: 'Data transferd successfully',
			result,
		});
	} catch (error) {
		console.error('Error in transfering ulbLedgers: ', error);
		res.status(500).json({
			status: false,
			message: error.message,
		});
	}
};
