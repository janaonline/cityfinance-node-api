const catchAsync = require('../../util/catchAsync')
const PFMSAccountData = require('../../models/LinkPFMS')
const ObjectId = require('mongoose').Types.ObjectId;
const Year = require('../../models/Year')
const User = require('../../models/User')
const { UpdateMasterSubmitForm } = require('../../service/updateMasterForm')
module.exports.get = catchAsync(async (req, res, next) => {
    let user = req.decoded

    let { design_year } = req.params;
    if (!design_year) {
        return res.status(400).json({
            success: false,
            message: 'Design Year Not Found'
        })
    }
    if (!user) {
        return res.status(400).json({
            success: false,
            message: 'User Not Found'
        })
    }
    let pfmsData = await PFMSAccountData.findOne({
        "ulb": ObjectId(user.ulb),
        "design_year": ObjectId(design_year)
    },
        '-history')
    if (!pfmsData) {
        return res.status(500).json({
            success: false,
            message: 'No PFMS ACCOUNT Data Found for ' + user.name
        })
    } else {
        return res.status(200).json({
            success: true,
            message: 'Data Found Successfully!',
            response: pfmsData
        })
    }
})

module.exports.createOrUpdate = catchAsync(async (req, res, next) => {
    let user = req.decoded;
    let data = req.body
    if (!user) {
        return res.status(400).json({
            success: false,
            message: 'User Not Found',
        })
    }
    // let design_year = await Year.findOne({ "year": data.design_year })
    if (user.role === 'ULB') {
        data['ulb'] = ObjectId(user.ulb)
        // data['design_year'] = ObjectId(design_year._id)
        let query = { ulb: ObjectId(user.ulb), design_year: ObjectId(data.design_year) };
        let pfmsAccountData = await PFMSAccountData.findOne(query)
        if (pfmsAccountData) {
            req.body['history'] = [...pfmsAccountData.history];
            pfmsAccountData.history = undefined;
            req.body['history'].push(pfmsAccountData);
            let updatedData = await PFMSAccountData.findOneAndUpdate(query, data, { new: true, runValidators: true, setDefaultsOnInsert: true })
            if (updatedData) {
                return res.status(200).json({
                    success: true,
                    message: 'PFMS Accounts Data Updated for ' + user.name,
                    isCompleted: !updatedData.isDraft
                })
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Failed to Update PFMS Account Data for ' + user.name,
                })
            }


        } else {
            const pfms_account_data = new PFMSAccountData(data);
            let savedData = await pfms_account_data.save();

            if (savedData) {

                await UpdateMasterSubmitForm(req, "pfmsAccount");

                return res.status(200).json({
                    success: true,
                    message: 'Report for ' + user.name + ' Successfully Submitted.',
                    isCompleted: !savedData.isDraft
                })
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Failed to Submit PFMS Account Data for ' + user.name,
                })
            }

        }


    }
    else {
        return res.status(400).json({
            success: false,
            message: user.role + ' Not Authenticated to Perform this Action'
        })
    }

})