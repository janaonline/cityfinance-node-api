const catchAsync = require('../../../util/catchAsync')
const StateGTCertificate = require('../../../models/StateGTCertificate')
const ObjectId = require('mongoose').Types.ObjectId;
const { UpdateStateMasterForm } = require('../../../service/updateStateMasterForm')

module.exports.get = catchAsync(async (req, res) => {
    let user = req.decoded;
    let { design_year } = req.params;
    if (!design_year) {
        return res.status(400).json({
            success: false,
            message: 'Design Year Not Found'
        })
    }
    let query = {
        "design_year": ObjectId(design_year),
        "state": ObjectId(user.state)
    }
    let fetchedData = await StateGTCertificate.findOne(
        query,
        '-history'
    );
    if (fetchedData) {
        return res.status(200).json({
            success: true,
            message: 'Data Found Successfully',
            data: fetchedData
        })
    } else {
        return res.status(404).json({
            success: false,
            message: 'Not Data Found'
        })
    }
})

module.exports.create = catchAsync(async (req, res) => {
    let user = req.decoded;
    let data = req.body;
    let design_year = data?.design_year;
    data['actionTakenBy'] = user._id;
    data['state'] = user.state;
    if (user.role === 'STATE') {
        let query = {
            "state": ObjectId(user.state),
            "design_year": ObjectId(design_year)
        }
        let existingData = await StateGTCertificate.findOne(query);
        if (existingData) {
            data['history'] = [...existingData.history];
            existingData.history = undefined;
            data['history'].push(existingData);

        }

        let updatedData = await StateGTCertificate.findOneAndUpdate(
            query,
            data,
            { new: true, upsert: true, setDefaultsOnInsert: true })
        if (updatedData) {
            await UpdateStateMasterForm(req, 'GTCertificate')
            return res.status(200).json({
                success: true,
                message: 'Data Updated Successfully!',
                data: updatedData
            })
        } else {
            return res.status(404).json({
                success: false,
                message: 'Failed to Submit Data'
            })

        }
    } else {
        return res.status(403).json({
            success: false,
            message: user.role + ' is Not Authenticated to Perform this Action'
        })
    }
})