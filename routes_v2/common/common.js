const AnnualAccountData = require('../../models/AnnualAccounts')
const Year = require('../../models/Year');

// Returns latest audited/ unAudited year with data.
module.exports.getLatestAfsYear = async (req, res) => {
    try {
        const auditType = req.query.auditType;
        const key = `${auditType}.year`;
        const afsDistinctYearKeys = await AnnualAccountData.distinct(key);
        const yearsObj = await getYearsList();

        // reduce() is performing lexicographical comparison (works correctly only if values have the same format and length)
        const latestAfsYear = afsDistinctYearKeys
            .map((id) => yearsObj[id])
            .reduce((max, year) => (year > max ? year : max));

        res.status(200).json({
            success: true,
            latestAfsYear,
        });

    } catch (error) {
        console.error('Error in getLatestAfsYear(): ', error);
        res.status(500).json({ success: false, message: `Error in getLatestAfsYear(): ${error.message}` });
    }
};

// eg: {606aadac4dff55e6c075c507: '2020-21', 606aaf854dff55e6c075d219: '2021-22', ...}
async function getYearsList() {
    try {
        const yearsObj = await Year.aggregate([
            {
                $group: {
                    _id: null,
                    keyValuePairs: {
                        $push: {
                            k: { $toString: "$_id" },
                            v: "$year"
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    result: { $arrayToObject: "$keyValuePairs" }
                }
            }
        ]);

        return yearsObj[0].result || {};
    } catch (error) {
        console.error('Error in getYearsList(): ', error);
        return error.message;
    }
};