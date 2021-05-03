

const catchAsync = require('../../util/catchAsync')
const AnnualAccountData = require('../../models/AnnualAccounts')
const ObjectId = require('mongoose').Types.ObjectId;
const Ulb = require('../../models/Ulb')
const Year = require('../../models/Year')
const User = require('../../models/User')
const Response = require('../../service').response
const State = require('../../models/State');


const mappingKeys = {
    bal_sheet: 'bal_sheet',
    bal_sheet_schedules: 'bal_sheet_schedules',
    inc_exp: 'inc_exp',
    inc_exp_schedules: 'inc_exp_schedules',
    cash_flow: 'cash_flow',
    auditor_report: 'auditor_report'
};

const provisional_dataKeys = [
    'bal_sheet',
    'bal_sheet_schedules',
    'inc_exp',
    'inc_exp_schedules',
    'cash_flow',
    'auditor_report'

];
const time = () => {
    var dt = new Date();
    dt.setHours(dt.getHours() + 5);
    dt.setMinutes(dt.getMinutes() + 30);
    return dt;
};

module.exports.get = catchAsync(async (req, res) => {
    let user = req.decoded;
    let design_year = req.query.design_year;
    let year = req.query.year;
    if (!design_year) {
        return res.status(400).json({
            success: false,
            message: 'Design Year Not Found'
        })
    }
    let annualAccountData = await AnnualAccountData.findOne(
        {
            "ulb": ObjectId(user.ulb),
            "design_year": ObjectId(design_year)
        },
        '-history'
    )
    if (!annualAccountData) {
        return res.status(400).json({
            success: false,
            message: 'No Annual Account Data Found for ' + user.name
        })
    } else {
        return res.status(200).json({
            success: true,
            message: 'Annual Account Found Successfully!',
            data: annualAccountData
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
    if (user.role === 'ULB') {
        let ulb = await Ulb.findOne({ _id: ObjectId(user.ulb) });
        if (!ulb) {
            return res.status(400).json({
                success: false,
                message: 'ULB Not Found',
            })
        }
        data['createdAt'] = time();
        data['modifiedAt'] = time();
        data['actionTakenBy'] = ObjectId(user._id);
        data['ulb'] = ObjectId(ulb._id);
        // if (!data.submit_annual_accounts.answer || !data.submit_standardized_data.answer) {
        //     return res.status(400).json({
        //         success: false,
        //         message: 'Must Answer the Question before Submit',
        //     })
        // }
        let design_year = await Year.findOne({ _id: ObjectId(data.design_year) })
        if (!design_year) {
            return res.status(400).json({
                success: false,
                message: 'Design Year Not Found',
            })
        }
        let year = await Year.findOne({ _id: ObjectId(data.year) })
        if (!year) {
            return res.status(400).json({
                success: false,
                message: 'Year Not Found',
            })
        }
        // if (year.year === '2019-20' && data.submit_annual_accounts.answer.toLowerCase() === 'yes' && (!data.provisional_data.auditor_report.pdfUrl || data.provisional_data.auditor_report.pdfUrl == "")) {
        //     return res.status(400).json({
        //         success: false,
        //         message: 'Must Submit Auditor Report (PDF Format)',
        //     })
        // }
        if (year.year != '2019-20' && data.provisional_data?.auditor_report?.pdfUrl) {
            delete data.provisional_data.auditor_report;
        }

        if (data.submit_annual_accounts.answer.toLowerCase() === 'no' && data.submit_standardized_data.answer.toLowerCase() === 'no') {
            delete data.provisional_data;
            delete data.standardized_data;
        }
        else if (data.submit_annual_accounts.answer.toLowerCase() === 'yes' && data.submit_standardized_data.answer.toLowerCase() === 'no') {
            delete data.standardized_data;
        }
        else if (data.submit_annual_accounts.answer.toLowerCase() === 'no' && data.submit_standardized_data.answer.toLowerCase() === 'yes') {
            delete data.provisional_data;
        }
        let query = {
            "ulb": ObjectId(ulb._id),
            "year": ObjectId(data.year),
            "design_year": ObjectId(data.design_year)
        }
        let annualAccountData = await AnnualAccountData.findOne(query);
        if (annualAccountData && annualAccountData.status === 'PENDING') {
            await AnnualAccountData.updateOne(query, data, { runValidators: true, setDefaultsOnInsert: true })
                .then((response) => {
                    return res.status(200).json({
                        success: true,
                        message: 'Annual Accounts Data Updated for ' + user.name,
                        response: response
                    })
                })
                .catch(e => {
                    console.log(`Error - ${e}`);
                    return res.status(400).json({
                        success: false,
                        message: 'Failed to Update Annual Accounts Data for ' + user.name,
                        error: e.message
                    })
                })
        } else if (annualAccountData && annualAccountData.status != 'PENDING') {
            req.body['history'] = [...annualAccountData.history];
            annualAccountData.history = undefined;
            req.body['history'].push(annualAccountData);
            data['status'] = 'PENDING';
            await AnnualAccountData.updateOne(query, data, { runValidators: true, setDefaultsOnInsert: true })
                .then((response) => {
                    return res.status(200).json({
                        success: true,
                        message: 'Annual Accounts Data Updated for ' + user.name,
                        response: response
                    })
                })
                .catch(e => {
                    console.log(`Error - ${e}`);
                    return res.status(400).json({
                        success: false,
                        message: 'Failed to Update Annual Accounts Data for ' + user.name,
                        error: e.message
                    })
                })

        }
        // else if (annualAccountData && !annualAccountData.isCompleted) {
        //     return res.status(400).json({
        //         success: false,
        //         message: 'Action Not Allowed. Data is in Draft Mode.',
        //     })
        // }
        else {
            data['status'] = 'PENDING';
            const annual_account_data = new AnnualAccountData(data);
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

module.exports.action = catchAsync(async (req, res, next) => {

    let user = req.decoded;
    (data = req.body), (_id = ObjectId(req.params._id));

    let prevState = await AnnualAccountData.findOne(
        { _id: _id },
        '-history'
    ).lean();
    let accountYear = await Year.findOne({ _id: ObjectId(prevState.year) })

    if (accountYear.year != '2019-20') {
        delete data.provisional_data.auditor_report;
    }

    let prevUser = await User.findOne({
        _id: ObjectId(prevState.actionTakenBy),
    }).exec();

    if (prevState.status == 'APPROVED' && prevUser.role == 'MoHUA') {
        return Response.BadRequest(
            res,
            {},
            'Already approved By MoHUA User.'
        );
    }
    if (prevState.status == 'REJECTED' && prevUser.role == 'MoHUA') {
        return Response.BadRequest(
            res,
            {},
            'Already Rejected By MoHUA User.'
        );
    }
    if (
        prevState.status == 'APPROVED' &&
        user.role == 'STATE' &&
        prevUser.role == 'STATE'
    ) {
        return Response.BadRequest(
            res,
            {},
            'Already approved By STATE User.'
        );
    }
    if (
        prevState.status == 'REJECTED' &&
        user.role == 'STATE' &&
        prevUser.role == 'STATE'
    ) {
        return Response.BadRequest(
            res,
            {},
            'Already Rejected By State User.'
        );
    }
    let flag = overAllStatus(data);

    flag.then(
        async (value) => {
            data['status'] = value.status ? 'REJECTED' : 'APPROVED';
            if (!data['isCompleted']) {
                data['status'] = 'PENDING';
            }
            let actionAllowed = ['MoHUA', 'STATE'];
            if (actionAllowed.indexOf(user.role) > -1) {
                if (user.role == 'STATE') {
                    let ulb = await Ulb.findOne({
                        _id: ObjectId(data.ulb),
                    }).exec();

                    if (
                        !(
                            ulb &&
                            ulb.state &&
                            ulb.state.toString() == user.state
                        )
                    ) {
                        let message = !ulb
                            ? 'Ulb not found.'
                            : 'State is not matching.';
                        return Response.BadRequest(res, {}, message);
                    }
                }
                let history = Object.assign({}, prevState);
                if (!prevState) {
                    return Response.BadRequest(
                        res,
                        {},
                        'Requested record not found.'
                    );
                }
                data['actionTakenBy'] = user._id;
                data['ulb'] = prevState.ulb;
                data['modifiedAt'] = time();
                let du = await AnnualAccountData.updateOne(
                    { _id: ObjectId(prevState._id) },
                    { $set: data, $push: { history: history } }
                );

                let annualAccountDataobj = await AnnualAccountData.findOne({
                    _id: ObjectId(prevState._id),
                }).exec();
                let ulbUser = await User.findOne({
                    ulb: ObjectId(annualAccountDataobj.ulb),
                    isDeleted: false,
                    role: 'ULB',
                })
                    .populate([
                        {
                            path: 'state',
                            model: State,
                            select: '_id name',
                        },
                    ])
                    .exec();


                //send Mail
                return Response.OK(res, annualAccountDataobj, ``);
            } else {
                return Response.BadRequest(
                    res,
                    {},
                    `This action is only allowed by ${actionAllowed.join()}`
                );
            }
        },
        (rejectError) => {
            return Response.BadRequest(res, {}, rejectError);
        }
    ).catch((caughtError) => {
        console.log('final caughtError', caughtError);
    });

})

function overAllStatus(data) {


    return new Promise((resolve, reject) => {
        let rejected = false;
        let rejectReason = [];
        let rejectDataSet = [];

        for (key in data) {
            if (typeof data[key] === 'object' && data[key] !== null) {
                if (key == 'provisional_data') {
                    for (let objKey of provisional_dataKeys) {
                        if (
                            data[key][objKey] &&
                            data[key][objKey]['status'] == 'REJECTED'
                        ) {
                            if (
                                !data[key][objKey]['rejectReason'] &&
                                data['isCompleted']
                            ) {
                                reject('reject reason is missing');
                            }
                            rejected = true;
                            let tab =
                                'Service Level Indicators:' +
                                mappingKeys[objKey];
                            let reason = {
                                [tab]: data[key][objKey]['rejectReason'],
                            };
                            rejectReason.push(reason);
                        }
                    }
                    // for(let d of data[key]["documents"]["wasteWaterPlan"]){
                    //     if(d.status=='REJECTED'){
                    //         rejected=true;
                    //         let tab = "Water Supply & Waste-Water Management:Upload Documents"
                    //         if(!d.rejectReason){
                    //             reject('reject reason is missing')
                    //         }
                    //         let reason = {
                    //             [tab]:d.rejectReason
                    //         }
                    //         rejectReason.push(reason)
                    //     }
                    // }
                }
            } else {
                if (data['status'] == 'REJECTED') {
                    rejected = true;
                }
            }
        }
        /** Concat reject reason string */

        if (rejectReason.length > 0) {
            let finalString = rejectReason.map((obj) => {
                let service = Object.keys(obj)[0];
                let reason = obj[service];
                let s = service.split(':');
                let arr = [...s, reason];
                return arr;
                // service = `<strong>` + service + `</strong>`;
                //return `<p> ${service + ` :` + reason} </p>`;
            });
            let x = `<table border='1'>
            <tr>
                <th>Tab Name</th>
                <th>Field Name</th>
                <th>Reason for Rejection</th>
            </tr>
            `;
            for (i of finalString) {
                x += `<tr>`;
                for (t of i) {
                    x += `<td>${t}</td>`;
                }
                x += `</tr>`;
            }
            x += `</table>`;
            resolve({ status: rejected, reason: x });
        }
        resolve({ status: rejected, reason: '' });
    });
}

