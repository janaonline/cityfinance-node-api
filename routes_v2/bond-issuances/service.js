const BondIssuerItem = require('../../models/BondIssuerItem');
const ObjectId = require('mongoose').Types.ObjectId;

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