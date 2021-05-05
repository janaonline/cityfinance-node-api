const catchAsync = require('../../util/catchAsync')
const MasterFormData = require('../../models/MasterForm')
const ObjectId = require('mongoose').Types.ObjectId;


module.exports.get = catchAsync(async (req, res) => {
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
    let masterFormData = await MasterFormData.findOne({
        "ulb": ObjectId(user.ulb),
        "design_year": ObjectId(design_year)
    },
        '-history')
    if (!masterFormData) {
        return res.status(500).json({
            success: false,
            message: 'Master Data Not Found for ' + user.name
        })
    } else {
        return res.status(200).json({
            success: true,
            message: 'Data Found Successfully!',
            response: masterFormData
        })
    }
})
