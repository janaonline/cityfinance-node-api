
const catchAsync = require('../../util/catchAsync')
const AnnualAccountData = require('../../models/AnnualAccounts')
const ObjectId = require('mongoose').Types.ObjectId;
const Ulb = require('../../models/Ulb')
const Year = require('../../models/Year')

module.exports.sendAnnualAccountsData = catchAsync(async (req, res, next) => {

    let user = req.decoded;
    if (!user) {
        return res.status(400).json({
            success: false,
            message: 'User Not Found',
        })
    }

    if (user.role == 'ULB') {
        let ulb = await Ulb.findOne({ _id: ObjectId(user.ulb) });
        if (!ulb) {
            return res.status(400).json({
                success: false,
                message: 'ULB Not Found',
            })
        }

        let design_year = await Year.findOne({ "year": req.body.design_year })
        if (!design_year) {
            return res.status(400).json({
                success: false,
                message: 'Design Year Not Found',
            })
        }
        req.body.design_year = ObjectId(design_year._id);

        let year = await Year.findOne({ "year": req.body.year })
        if (!year) {
            return res.status(400).json({
                success: false,
                message: 'Year Not Found',
            })
        }
        req.body.year = ObjectId(year._id);

        let annualAccountData = await AnnualAccountData.findOne({ "ulb": ObjectId(ulb._id) })
        if (annualAccountData && annualAccountData.isCompleted) {
            req.body['history'] = [...annualAccountData.history];
            annualAccountData.history = undefined;
            req.body['history'].push(annualAccountData);
            await AnnualAccountData.updateOne({}, req.body, { setDefaultsOnInsert: true })
            return res.status(200).json({
                success: true,
                message: 'Annual Accounts Data Updated for ' + user.name,
            })
        }
        else if (annualAccountData && !annualAccountData.isCompleted) {
            return res.status(400).json({
                success: false,
                message: 'Action Not Allowed. Data is in Draft Mode.',
            })
        }
        else {
            const annual_account_data = new AnnualAccountData(req.body);
            await annual_account_data.save();
            return res.status(200).json({
                success: true,
                message: 'Annual Accounts for ' + user.name + ' Successfully Submitted. ',
            })
        }
    } else {
        return res.status(400).json({
            success: false,
            message: !user.role ? 'User.Role Does Not Exist' : user.role + ' is not Authenticated to Perform this Action. Only ULB Users Allowed.',
        })
    }

})

