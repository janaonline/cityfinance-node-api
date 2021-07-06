const StateMasterForm = require('../models/StateMasterForm')
const ObjectId = require("mongoose").Types.ObjectId;
const catchAsync = require('../util/catchAsync')
const time = () => {
    var dt = new Date();
    dt.setHours(dt.getHours() + 5);
    dt.setMinutes(dt.getMinutes() + 30);
    return dt;
};
exports.UpdateStateMasterForm = catchAsync(async (req, formName) => {
    let user = req.decoded;
    let data = req.body;

    if (user.role != 'ULB') {
        if (user.role === 'STATE') {
            let query = {
                state: ObjectId(user.state),
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
                    state: ObjectId(user.state),
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
                    rejectReason: null
                }
                existingData.modifiedAt = time();
                existingData.status = 'PENDING'
                await existingData.save();
            }
        } else {
            //MoHUA, Admin etc
        }


    } else {

    }

})