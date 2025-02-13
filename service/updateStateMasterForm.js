const StateMasterForm = require('../models/StateMasterForm')
const ObjectId = require("mongoose").Types.ObjectId;
const catchAsync = require('../util/catchAsync')
const GTCertificate = require('../models/StateGTCertificate')
const ActionPlan = require('../models/ActionPlans')
const WaterRejuvenation = require('../models/WaterRejenuvation&Recycling')
const LinkingPFMS = require('../models/LinkPfmsState')
const GrantAllocation = require('../models/GrantDistribution')
const time = () => {
    var dt = new Date();
    dt.setHours(dt.getHours() + 5);
    dt.setMinutes(dt.getMinutes() + 30);
    return dt;
};
exports.UpdateStateMasterForm = catchAsync(async (req, formName) => {
    let user = req.decoded;
    let data = req.body;
    let state_id = req.body['state']
    let state = user.state ?? state_id
    if (user.role != 'ULB') {
        if (user.role === 'STATE') {
            let query = {
                state: ObjectId(state),
                design_year: ObjectId(data.design_year)
            }
            let existingData = await StateMasterForm.findOne(query)

            if (!existingData) {
                //create new state master form
                console.log('if')
                let createData = {
                    steps: {
                        [formName]: {
                            isSubmit: !data['isDraft'],
                            status: 'PENDING',
                            rejectReason: null
                        }
                    },
                    actionTakenByRole: user.role,
                    actionTakenBy: user._id,
                    design_year: data.design_year,
                    modifiedAt: time(),
                    state: ObjectId(state),
                    status: 'PENDING'
                }
                await StateMasterForm.create(createData, (err, result) => {
                    if (err) {
                        console.log(err)
                    }
                });
            } else {
                console.log('else')
                //update the form
                existingData.steps[formName] = {
                    isSubmit: !data['isDraft'],
                    status: 'PENDING',
                    rejectReason: null,

                }
                existingData.modifiedAt = time();
                existingData.status = 'PENDING',
                    existingData.actionTakenByRole = user.role,
                    existingData.actionTakenBy = user._id,
                    existingData.isSubmit = false,
                    await existingData.save();
            }
        } else {

            let query = {
                state: ObjectId(state),
                design_year: ObjectId(data.design_year)
            }

            let existingData = await StateMasterForm.findOne(query)
            let formData = {};
            if (formName === 'GTCertificate') {
                formData = await GTCertificate.findOne(query)
            } else if (formName === 'actionPlans') {
                formData = await ActionPlan.findOne(query)
            } else if (formName === 'grantAllocation') {
                formData = await GrantAllocation.findOne(query)
            } else if (formName === 'linkPFMS') {
                formData = await LinkingPFMS.findOne(query)
            } else if (formName === 'waterRejuventation') {
                formData = await WaterRejuvenation.findOne(query)
            }

            existingData.steps[formName] = {
                isSubmit: !formData['isDraft'],
                status: formData['status'],
            }
            existingData.modifiedAt = time();
            existingData.isSubmit = false
            existingData.actionTakenByRole = user.role,
                existingData.actionTakenBy = user._id,
                await existingData.save();

            //MoHUA, Admin etc
        }


    } else {

    }

})