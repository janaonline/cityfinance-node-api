const BondIssuerItem = require('../../models/BondIssuerItem');
const ObjectId = require('mongoose').Types.ObjectId;
const ExcelJS = require('exceljs');
const fs = require('fs');
const DATE_KEYS = ['dateOfIssue', 'repayment'];
const OBJECT_ID_KEYS = ['state', 'ulbId'];
const BOOLEAN_KEYS = ['isActive'];

module.exports.getBondIssuances = async (req, res) => {
	try {
		const stateId = req.params._stateId;
		const matchCondition = { isActive: true };

		// Validate stateId
		if (stateId) matchCondition['state'] = ObjectId(stateId);

		const query = this.getBondsAmountQuery(matchCondition)
		const result = await BondIssuerItem.aggregate(query).exec();

		// Return default values if no documents match
		if (!result || result.length === 0) {
			return res.json({
				bondIssueAmount: 0,
				totalMunicipalBonds: 0,
			});
		}

		res.json(result[0]);
	} catch (error) {
		console.error('Error fetching bond issuances:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
};

// Helper method to create query - Get bonds amount and count.
module.exports.getBondsAmountQuery = (matchCondition) => {
	return [
		{ $match: matchCondition },
		{
			$group: {
				_id: null,
				totalMunicipalBonds: { $sum: 1 },
				bondIssueAmount: {
					$sum: {
						$convert: {
							input: '$issueSizeAmount',
							to: 'double',
							onError: 0,
							onNull: 0,
						},
					},
				},
			},
		},
		{
			$project: {
				_id: 0,
				bondIssueAmount: { $round: ["$bondIssueAmount", 0] },
				totalMunicipalBonds: 1,
			},
		},
	];
}

// Add bonds data to collection.
module.exports.uploadBondsData = async (req, res) => {
	try {
		if (req.decoded.role !== 'ADMIN')
			throw new Error('Only an ADMIN is authorized to perform this action.')

		// console.log(req.file)
		const filePath = req.file.path;
		const result = await processExcelAndUpdateDB(filePath);
		if (result?.length > 0) {
			const uploadedRes = await BondIssuerItem.insertMany(result);
			res.json({ message: 'Data Uploaded successfully!', uploadedRes, data: result });
		} else {
			res.json({ message: 'No Data to update!', data: result });
		}
	} catch (error) {
		console.error('Error uploading bonds data:', error);
		res.status(500).json({ error: 'Failed to upload bonds data.' });
	}
}

// Helper: To upload file.
async function processExcelAndUpdateDB(filePath) {
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.readFile(filePath);
	const worksheet = workbook.worksheets[0];

	const headers = [];
	const rowsData = [];

	worksheet.eachRow((row, rowNumber) => {
		// Remove first empty index
		const values = row.values.slice(1);
		// console.log(`------------------------------------------------------------`)

		if (rowNumber === 1) {
			// Store headers
			// console.log(values)
			values.forEach((header) => headers.push(header?.toString().trim()));
		} else {
			const rowObject = {};
			headers.forEach((key, index) => {
				let cellValue = values[index];

				if (OBJECT_ID_KEYS.includes(key))
					rowObject[key] = new ObjectId(cellValue.trim());
				else if (DATE_KEYS.includes(key)) {
					const dateString = formatDateToDDMMYYYY(cellValue);
					rowObject[key] = dateString;
				}
				else if (BOOLEAN_KEYS.includes(key))
					rowObject[key] = cellValue;
				else
					rowObject[key] = cellValue?.toString().trim();

				// console.log(`${key} --->${rowObject[key]} ---> ${typeof rowObject[key]}`)
			});
			rowsData.push(rowObject);
		}
	});

	// Cleanup
	fs.unlinkSync(filePath);

	return rowsData;
}

function formatDateToDDMMYYYY(dateInput) {
	if (!dateInput) return undefined;
	const date = new Date(dateInput);

	const day = String(date.getDate()).padStart(2, '0');
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const year = date.getFullYear();

	return `${day}-${month}-${year}`;
}
