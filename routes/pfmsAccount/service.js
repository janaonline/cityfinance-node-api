const catchAsync = require('../../util/catchAsync')
const PFMSAccountData = require('../../models/LinkPFMS')
const ObjectId = require('mongoose').Types.ObjectId;
const Year = require('../../models/Year')
const User = require('../../models/User')

module.exports.createOrUpdate = catchAsync(async (req, res, next) => {
    let user = req.decoded;
    let data = req.body
    if (!user) {
        return res.status(400).json({
            success: false,
            message: 'User Not Found',
        })
    }
    let design_year = await Year.findOne({ "year": data.design_year })
    if (user.role === 'ULB') {
        data['ulb'] = ObjectId(user.ulb)
        data['design_year'] = ObjectId(design_year._id)
        let query = { ulb: ObjectId(user.ulb), design_year: ObjectId(design_year._id) };
        let pfmsAccountData = await PFMSAccountData.findOne(query)
        if (data.account == 'yes' && data.linked == 'yes') {
            if (!data.report || data.report == "") {
                return res.status(400).json({
                    success: false,
                    message: 'Must Submit Report (Pdf Format)'
                })
            } else if (pfmsAccountData) {
                req.body['history'] = [...pfmsAccountData.history];
                pfmsAccountData.history = undefined;
                req.body['history'].push(pfmsAccountData);

                await PFMSAccountData.updateOne(query, data, { runValidators: true, setDefaultsOnInsert: true })
                    .then(response => {
                        return res.status(200).json({
                            success: true,
                            message: 'PFMS Accounts Data Updated for ' + user.name,
                            response: response
                        })
                    })
            } else {
                const pfms_account_data = new PFMSAccountData(data);
                await pfms_account_data.save();
                return res.status(200).json({
                    success: true,
                    message: 'Report for ' + user.name + ' Successfully Submitted.',
                })
            }

        } else {
            return res.status(400).json({
                success: false,
                message: 'No Form Submitted by ' + user.name
            })
        }
    }
    else {
        return res.status(400).json({
            success: false,
            message: user.role + ' Not Authenticated to Perform this Action'
        })
    }

})




