const Ulb = require('../../models/Ulb');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const Config = require('../../config/app_config');
const UlbUpdateRequest = require('../../models/UlbUpdateRequest');
const Service = require('../../service');
const Response = require('../../service').response;
const SendEmail = require('../../service').sendEmail;
const moment = require('moment');
const ObjectId = require('mongoose').Types.ObjectId;
module.exports.create = async (req, res) => {
    let user = req.decoded;
    let data = req.body;
    let actionAllowed = ['ADMIN', 'MoHUA', 'PARTNER', 'STATE', 'ULB'];
    console.log('this is it');

    // let inValid = await Service.checkUnique.validate(data, "ULB");
    // if(inValid && inValid.length){
    //     return Response.BadRequest(res, {},`${inValid.join("\n")}`);
    // }
    let ulb = user.role == 'ULB' ? user.ulb : data.ulb;
    if (actionAllowed.indexOf(user.role) > -1) {
        //delete data.ulb;
        //data.ulb = user.ulb;
        data.actionTakenBy = user._id;
        let ulbUpdateRequest = new UlbUpdateRequest(data);
        ulbUpdateRequest.ulb = ulb;
        ulbUpdateRequest['status'] = 'APPROVED';
        ulbUpdateRequest.actionTakenBy = user._id;
        /**let getPrevStatus = await UlbUpdateRequest.findOne({ulb:ulbUpdateRequest.ulb, status:"PENDING"}).lean().exec();
        if(getPrevStatus){
            Object.assign(getPrevStatus,data);
            try{
                let du = await UlbUpdateRequest.update({_id:getPrevStatus._id},{$set:getPrevStatus,createdAt:new Date()});
                if(du.n){

                    let state = await User.find({"state":ObjectId(user.state),isActive:true,isDeleted:false,"role" : "STATE"}).exec();
                    let partner = await User.find({isActive:true,isDeleted:false,"role" : "PARTNER"}).exec();
                    emailNotificationToStateANDPartner(user,state,partner);

                    return  Response.OK(res,du,'Request for change has been sent to admin to approval');
                }else{
                    return Response.BadRequest(res,getPrevStatus, 'Row not found! Something wrong in code.');
                }
            }catch (e) {
                return Response.DbError(res,e, e.message);
            }
        }else{ */

        let updateData = { status: 'APPROVED', modifiedAt: new Date() };
        let s = await ulbUpdateRequest.save();
        let prevState = await UlbUpdateRequest.findOne(
            { _id: ObjectId(s._id) },
            '-history'
        );
        let oldState = await UlbQuery(prevState.ulb); // Fetch all prevState value of a ULB
        let oldStateObj = Object.assign(
            {},
            oldState,
            { actionTakenBy: prevState.actionTakenBy },
            { status: prevState.status }
        );
        let uur = await UlbUpdateRequest.update(
            { _id: ObjectId(prevState._id) },
            { $set: updateData, $push: { history: oldStateObj } }
        );
        /**ulbUpdateRequest.save(async(err, dt)=>{
                if(err){
                    return Response.DbError(res,err, err.message)
                }else {
                    let state = await User.find({"state":ObjectId(user.state),isDeleted:false,isActive:true,"role" : "STATE"}).exec();
                    let partner = await User.find({isActive:true,isDeleted:false,"role":"PARTNER"}).exec(); 
                    emailNotificationToStateANDPartner(user,state,partner);

                    return Response.OK(res,dt, 'Request for change has been sent to admin to approval');
                } 
            })*/
        /*}*/
    }

    if (actionAllowed.indexOf(user.role) > -1) {
        let keys = [
            'name',
            'regionalName',
            'code',
            'censusCode',
            'sbCode',
            'state',
            'ulbType',
            'natureOfUlb',
            'wards',
            'area',
            'population',
            'location',
            'amrut',
            'isActive'
        ];
        let obj = {};
        for (key of keys) {
            if (data[key] || data[key] == '') {
                obj[key] = data[key];
            }
        }
        let profileKeys = [
            'name',
            'censusCode',
            'sbCode',
            'accountantConatactNumber',
            'accountantEmail',
            'accountantName',
            'commissionerConatactNumber',
            'commissionerEmail',
            'commissionerName',
        ];
        let pObj = {};
        for (key of profileKeys) {
            if (data[key] !== undefined && data[key] !== null) {
                pObj[key] = data[key];
            }
        }
        let userData = await User.findOne(
            { isDeleted: false, ulb: ObjectId(ulb), role: 'ULB' },
            '_id email role name isVerified2223'
        ).lean();
        let mailOptions

        if (obj['censusCode']) {
            obj['censusCode'] = obj['censusCode'].trim();
        }
        if (obj['sbCode']) {
            obj['sbCode'] = obj['sbCode'].trim();
        }
        if (obj['censusCode'] && obj['sbCode']) {
            if (obj['censusCode'] == obj['sbCode']) {
                return Response.BadRequest(
                    res,
                    {},
                    'Census Code and ULB code cant be same'
                );
            }
        }

        if (obj['censusCode']) {
            let ulbRecord = await Ulb.findOne({
                $or: [
                    { censusCode: obj['censusCode'] },
                    { sbCode: obj['censusCode'] },
                ],
            });
            if (ulbRecord) {
                if (ulbRecord.censusCode && ulbRecord._id.toString() != ulb) {
                    if (ulbRecord.censusCode == obj['censusCode']) {
                        return Response.BadRequest(
                            res,
                            {},
                            'Census Code already exist for other Ulb'
                        );
                    }
                }

                if (ulbRecord.sbCode && ulbRecord._id.toString() != ulb) {
                    if (ulbRecord.sbCode == obj['censusCode']) {
                        return Response.BadRequest(
                            res,
                            {},
                            'Census Code already exist for other Ulb'
                        );
                    }
                }

                if (ulbRecord.sbCode && ulbRecord._id.toString() == ulb) {
                    if (
                        ulbRecord.sbCode == obj['censusCode'] &&
                        obj['sbCode'] == ''
                    ) {
                    } else if (ulbRecord.sbCode == obj['censusCode']) {
                        return Response.BadRequest(
                            res,
                            {},
                            'Census Code and Ulb Code cannot be same'
                        );
                    }
                }
                if (ulbRecord.censusCode && ulbRecord._id.toString() == ulb) {
                    if (ulbRecord.censusCode == obj['censusCode']) {
                        return Response.BadRequest(
                            res,
                            {},
                            'Census Code already exist for other Ulb'
                        );
                    }
                }

                if (ulbRecord.censusCode && ulbRecord._id.toString() == ulb) {
                    if (ulbRecord.censusCode == obj['censusCode']) {
                    }
                }
                // else{
                //     let ulbRecord = await Ulb.findOne({$or:[{censusCode:obj['censusCode']},{sbCode:obj['censusCode']}]})
                //     if(ulbRecord){
                //         return Response.BadRequest(
                //             res,
                //             {},
                //             'Census Code already exist for other UlbS'
                //         );
                //     }
                // }
                // if(ulbRecord._id.toString()!=ulb || ulbRecord.sbCode==obj['censusCode']){
                //     return Response.BadRequest(
                //         res,
                //         {},
                //         'Census Code already exist for other UlbS'
                //     );
                // }
            }
        }
        if (obj['sbCode']) {
            let ulbRecord = await Ulb.findOne({
                $or: [{ censusCode: obj['sbCode'] }, { sbCode: obj['sbCode'] }],
            });

            if (ulbRecord) {
                if (ulbRecord.sbCode && ulbRecord._id.toString() != ulb) {
                    if (ulbRecord.sbCode == obj['sbCode']) {
                        return Response.BadRequest(
                            res,
                            {},
                            'ULB Code already exist for other Ulb'
                        );
                    }
                }
                if (ulbRecord.censusCode && ulbRecord._id.toString() != ulb) {
                    if (ulbRecord.censusCode == obj['sbCode']) {
                        return Response.BadRequest(
                            res,
                            {},
                            'ULB Code already exist for other Ulb'
                        );
                    }
                }

                if (ulbRecord.censusCode && ulbRecord._id.toString() == ulb) {
                    if (
                        ulbRecord.censusCode == obj['sbCode'] &&
                        obj['censusCode'] == ''
                    ) {
                    } else if (ulbRecord.censusCode == obj['sbCode']) {
                        return Response.BadRequest(
                            res,
                            {},
                            'ULB Code already exist for other Ulb'
                        );
                    }
                }

                if (ulbRecord.sbCode && ulbRecord._id.toString() == ulb) {
                    if (ulbRecord.sbCode == obj['sbCode']) {
                        return Response.BadRequest(
                            res,
                            {},
                            'ULB Code already exist for other Ulb'
                        );
                    }
                }

                if (ulbRecord.sbCode && ulbRecord._id.toString() == ulb) {
                    if (ulbRecord.sbCode == obj['sbCode']) {
                    }
                }
                // else{
                //     let ulbRecord = await Ulb.findOne({$or:[{censusCode:obj['sbCode']},{sbCode:obj['sbCode']}]})
                //     if(ulbRecord){
                //         return Response.BadRequest(
                //             res,
                //             {},
                //             'ULB Code already exist for other Ulb'
                //         );
                //     }
                // }
            }
        }
        if (pObj['accountantEmail']) {
            // let emailCheck = await User.findOne({email:pObj.commissionerEmail},"email commissionerEmail ulb role").lean().exec();
            // if(emailCheck){
            //     if(emailCheck.ulb.toString() != user.ulb.toString()){
            //         return Response.BadRequest(res,{}, `Email:${emailCheck.email} already used by a ${emailCheck.role} user.`)
            //     }
            // }

            /**
             * For ULB, accountat email id is primary and mandatory.
             */
            pObj['email'] = pObj['accountantEmail'];
            pObj['isEmailVerified'] = true;
            if (pObj.email != userData.email) {
                let link = await Service.emailVerificationLink(
                    userData._id,
                    req.currentUrl,
                    true
                );
                let template = Service.emailTemplate.userEmailEdit(
                    userData.name,
                    link
                );
                // mailOptions.to = pObj.email;
                // mailOptions.subject = template.subject;
                // mailOptions.html = template.body;
               mailOptions =     {
                    Destination: {
                      /* required */
                      ToAddresses: [pObj.email]
                    },
                    Message: {
                      /* required */
                      Body: {
                        /* required */
                        Html: {
                          Charset: "UTF-8",
                          Data:  template.body
                        },
                      },
                      Subject: {
                        Charset: 'UTF-8',
                        Data:template.subject
                      }
                    },
                    Source: process.env.EMAIL,
                    /* required */
                    ReplyToAddresses: [process.env.EMAIL],
                  }
                
            } else {
                let template = Service.emailTemplate.userProfileEdit(
                    userData.name,
                    userData?.isVerified2223
                );
                mailOptions =     {
                    Destination: {
                      /* required */
                      ToAddresses: [pObj.email]
                    },
                    Message: {
                      /* required */
                      Body: {
                        /* required */
                        Html: {
                          Charset: "UTF-8",
                          Data:  template.body
                        },
                      },
                      Subject: {
                        Charset: 'UTF-8',
                        Data:template.subject
                      }
                    },
                    Source: process.env.EMAIL,
                    /* required */
                    ReplyToAddresses: [process.env.EMAIL],
                  }
            }
            
            SendEmail(mailOptions);
        }
        try {
            let dulb, du;
            pObj['isRegistered'] = true;
            pObj['isVerified2223'] = true;
            if (data.hasOwnProperty('isActive')) pObj['isActive'] = data?.isActive
            if (Object.keys(obj).length) {
                dulb = await Ulb.update({ _id: ObjectId(ulb) }, { $set: obj });
            }
            if (Object.keys(pObj).length) {
                console.log(`pObj\n`, pObj);
                du = await User.update(
                    { ulb: ObjectId(ulb), role: 'ULB' },
                    { $set: pObj }
                );
            }
            let template = Service.emailTemplate.userProfileEdit(userData.name, userData?.isVerified2223);
            mailOptions =     {
                Destination: {
                  /* required */
                  ToAddresses: [userData.email]
                },
                Message: {
                  /* required */
                  Body: {
                    /* required */
                    Html: {
                      Charset: "UTF-8",
                      Data:  template.body
                    },
                  },
                  Subject: {
                    Charset: 'UTF-8',
                    Data:template.subject
                  }
                },
                Source: process.env.EMAIL,
                /* required */
                ReplyToAddresses: [process.env.EMAIL],
              }
            // mailOptions.subject = template.subject;
            // mailOptions.html = template.body;
            if (!pObj['accountantEmail']) SendEmail(mailOptions);
            return Response.OK(
                res,
                { Ulb: dulb, user: du, data },
                `Profile Updated Successfully.`
            );
        } catch (e) {
            console.log('Exception', e);
            return Response.DbError(res, e);
        }
    } else {
        return Response.BadRequest(
            res,
            {},
            'This action is only allowed by ULB'
        );
    }
};
module.exports.get = async (req, res) => {
    let user = req.decoded,
        filter = req.body.filter,
        sort = req.body.sort,
        skip = req.query.skip ? parseInt(req.query.skip) : 0,
        limit = req.query.limit ? parseInt(req.query.limit) : 50,
        actionAllowed = ['ADMIN', 'MoHUA', 'PARTNER', 'STATE', 'ULB'];
    if (actionAllowed.indexOf(user.role) > -1) {
        let query = {};
        if (filter) {
            let f = await Service.mapFilter(filter);
            Object.assign(query, f);
        }
        if (req.params._id) {
            try {
                query['_id'] = ObjectId(req.params._id);
                if (user.role == 'ULB') {
                    query['ulb'] = ObjectId(user.ulb);
                }
                let data = await UlbUpdateRequest.findOne(query)
                    .sort(sort ? sort : { modifiedAt: -1 })
                    .populate('actionTakenBy', '_id name email role')
                    .populate({
                        path: 'history.actionTakenBy',
                        model: User,
                        select: '_id name email role',
                    })
                    .lean()
                    .exec();
                return Response.OK(res, data, 'Request fetched.');
            } catch (e) {
                return Response.DbError(res, e, e.message);
            }
        } else {
            let ulbs;
            if (user.role == 'STATE') {
                try {
                    let stateId = ObjectId(user.state);
                    ulbs = await Ulb.distinct('_id', { state: stateId });
                } catch (e) {
                    return Response.DbError(res, e, e.message);
                }
            } else if (user.role == 'ULB') {
                ulbs = [ObjectId(user.ulb)];
            }
            try {
                let total = undefined;
                if (ulbs) {
                    query['ulb'] = { $in: ulbs };
                }
                if (!skip) {
                    total = await UlbUpdateRequest.count(query);
                }
                let data = await UlbUpdateRequest.find(query)
                    .sort(sort ? sort : { modifiedAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .populate([
                        {
                            path: 'ulb',
                            select: '_id name code state',
                            populate: {
                                path: 'state',
                                select: '_id name code',
                            },
                        },
                        {
                            path: 'actionTakenBy',
                            select: '_id name email role',
                        },
                    ])
                    .populate([
                        {
                            path: 'history.actionTakenBy',
                            model: User,
                            select: '_id name email role',
                        },
                        {
                            path: 'history.ulb',
                            select: '_id name code state',
                            populate: {
                                path: 'state',
                                select: '_id name code',
                            },
                        },
                    ])
                    .lean()
                    .exec();
                return res.status(200).json({
                    timestamp: moment().unix(),
                    success: true,
                    message: 'request list',
                    data: data,
                    total: total,
                });
            } catch (e) {
                return Response.DbError(res, e, e.message);
            }
        }
    } else {
        return Response.BadRequest(res, {}, 'Action not allowed.');
    }
};
module.exports.getAll = async (req, res) => {
    try {
        let user = req.decoded,
            filter =
                req.query.filter && !req.query.filter != 'null'
                    ? JSON.parse(req.query.filter)
                    : req.body.filter
                        ? req.body.filter
                        : {},
            sort =
                req.query.sort && !req.query.sort != 'null'
                    ? JSON.parse(req.query.sort)
                    : req.body.sort
                        ? req.body.sort
                        : {},
            skip = req.query.skip ? parseInt(req.query.skip) : 0,
            limit = req.query.limit ? parseInt(req.query.limit) : 50,
            csv = req.query.csv,
            actionAllowed = ['ADMIN', 'MoHUA', 'PARTNER', 'STATE', 'ULB'];
        if (actionAllowed.indexOf(user.role) > -1) {
            let q = [
                {
                    $lookup: {
                        from: 'ulbs',
                        localField: 'ulb',
                        foreignField: '_id',
                        as: 'ulb',
                    },
                },
                {
                    $lookup: {
                        from: 'ulbtypes',
                        localField: 'ulb.ulbType',
                        foreignField: '_id',
                        as: 'ulbType',
                    },
                },
                {
                    $lookup: {
                        from: 'states',
                        localField: 'ulb.state',
                        foreignField: '_id',
                        as: 'state',
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'actionTakenBy',
                        foreignField: '_id',
                        as: 'actionTakenBy',
                    },
                },
                { $unwind: '$ulb' },
                { $unwind: '$ulbType' },
                { $unwind: '$state' },
                {
                    $unwind: {
                        path: '$actionTakenBy',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $project: {
                        _id: 1,
                        ulbType: '$ulbType.name',
                        ulb: '$ulb._id',
                        ulbName: '$ulb.name',
                        ulbCode: '$ulb.code',
                        state: '$state._id',
                        stateName: '$state.name',
                        stateCode: '$state.code',
                        createdAt: 1,
                        status: 1,
                    },
                },
                {
                    $addFields: {
                        priority: {
                            $cond: {
                                if: { $eq: ['$status', 'PENDING'] },
                                then: 2,
                                else: 1,
                            },
                        },
                    },
                },
            ];
            let newFilter = await Service.mapFilter(filter);
            let total = undefined;
            if (user.role == 'STATE') {
                newFilter['state'] = ObjectId(user.state);
            }
            if (user.role == 'ULB') {
                newFilter['ulb'] = ObjectId(user.ulb);
            }
            if (newFilter && Object.keys(newFilter).length) {
                q.push({ $match: newFilter });
            }
            if (Object.keys(sort).length) {
                q.push({ $sort: sort });
            } else {
                q.push({ $sort: { createdAt: -1 } });
            }
            q.push({ $sort: { priority: -1 } });

            if (csv) {
                let field =
                    user.role == 'ULB'
                        ? {
                            createdAt: 'Request Created On',
                            status: 'Status',
                        }
                        : {
                            stateName: 'State',
                            ulbName: 'ULB Name',
                            ulbCode: 'ULB Code',
                            status: 'Status',
                        };
                let arr = await UlbUpdateRequest.aggregate(q).exec();
                let xlsData = await Service.dataFormating(arr, field);
                return res.xls('ulb-update-request.xlsx', xlsData);
            } else {
                if (!skip) {
                    let qrr = [...q, { $count: 'count' }];
                    let d = await UlbUpdateRequest.aggregate(qrr);
                    total = d.length ? d[0].count : 0;
                }
                q.push({ $skip: skip });
                q.push({ $limit: limit });
                let arr = await UlbUpdateRequest.aggregate(q).exec();
                return res.status(200).json({
                    timestamp: moment().unix(),
                    success: true,
                    message: 'Ulb update request list',
                    data: arr,
                    total: total,
                });
            }
        } else {
            return Response.BadRequest(res, {}, 'Action not allowed.');
        }
    } catch (e) {
        console.log('Exception', e);
        return Response.BadRequest(res, e, e.message);
    }
};
module.exports.getById = async (req, res) => {
    let user = req.decoded,
        _id = req.params._id;
    let actionAllowed = ['ADMIN', 'MoHUA', 'PARTNER', 'STATE', 'ULB'];
    if (actionAllowed.indexOf('ULB') > -1) {
        if (_id && ObjectId.isValid(_id)) {
            try {
                let condition = { _id: ObjectId(_id) };
                let data = await UlbUpdateRequest.findOne(condition)
                    .populate([
                        {
                            path: 'state',
                            select: '_id name code',
                        },
                        {
                            path: 'ulb',
                            select: '_id name code ulbType state',
                            populate: [
                                {
                                    path: 'ulbType',
                                    select: '_id name',
                                },
                                {
                                    path: 'state',
                                    select: '_id name code',
                                },
                            ],
                        },
                        {
                            path: 'ulbType',
                            select: '_id name',
                        },
                    ])
                    .lean()
                    .exec();
                if (data) {
                    if (data.history.length) {
                        data['old'] = data.history[0];
                    } else {
                        data['old'] = await UlbQuery(data.ulb);
                    }
                    return Response.OK(res, data, 'Request fetched.');
                } else {
                    return Response.BadRequest(
                        res,
                        {},
                        `Not a valid request Id.`
                    );
                }
            } catch (e) {
                return Response.DbError(res, e, e.message);
            }
        } else {
            return Response.BadRequest(res, {}, `Not a valid request Id.`);
        }
    } else {
        return Response.BadRequest(res, {}, 'Action not allowed.');
    }
};
module.exports.action = async (req, res) => {
    console.log(req.params._id);
    let user = req.decoded,
        data = req.body,
        _id = ObjectId(req.params._id);
    let actionAllowed = ['ADMIN', 'MoHUA', 'PARTNER', 'STATE', 'ULB'];
    if (actionAllowed.indexOf(user.role) > -1) {
        try {
            let prevState = await UlbUpdateRequest.findOne(
                { _id: _id },
                '-history'
            );
            let ulb = prevState
                ? await Ulb.findOne(
                    { _id: prevState.ulb },
                    '_id name code state'
                ).populate({
                    path: 'state',
                    select: '_id name code',
                })
                : null;
            let oldState = await UlbQuery(prevState.ulb); // Fetch all prevState value of a ULB
            if (user.role == 'STATE') {
                if (
                    !(
                        ulb &&
                        ulb.state &&
                        ulb.state._id.toString() == user.state
                    )
                ) {
                    let message = !ulb
                        ? 'Ulb not found.'
                        : 'State is not matching.';
                    return Response.BadRequest(res, {}, message);
                }
            } else if (user.role == 'ULB') {
                if (!(ulb && ulb._id.toString() == user.ulb)) {
                    let message = !ulb
                        ? 'Ulb not found.'
                        : 'Ulb is not matching.';
                    return Response.BadRequest(res, {}, message);
                } else if (data.status != 'CANCELLED') {
                    return Response.BadRequest(
                        res,
                        {},
                        `Requested status(${data.status}) is not allowed.`
                    );
                }
            }
            try {
                let updateData = {
                    status: data.status,
                    modifiedAt: new Date(),
                };
                if (!prevState) {
                    return Response.BadRequest(
                        res,
                        {},
                        'Requested record not found.'
                    );
                } else if (prevState.status == 'APPROVED') {
                    return Response.BadRequest(
                        res,
                        {},
                        'The record is already approved.'
                    );
                } else if (prevState.status == 'CANCELLED') {
                    return Response.BadRequest(
                        res,
                        {},
                        'The record is already cancelled.'
                    );
                } else {
                    let userData = await User.findOne(
                        { ulb: prevState.ulb, role: 'ULB' },
                        '_id email role name'
                    ).lean();
                    let mailOptions
                    if (updateData.status == 'APPROVED') {
                        updateData.isActive = false;
                        let keys = [
                            'name',
                            'regionalName',
                            'code',
                            'state',
                            'ulbType',
                            'natureOfUlb',
                            'wards',
                            'area',
                            'population',
                            'location',
                            'amrut',
                        ];
                        let obj = {};
                        for (key of keys) {
                            if (prevState[key]) {
                                obj[key] = prevState[key];
                            }
                        }
                        let profileKeys = [
                            'name',
                            'accountantConatactNumber',
                            'accountantEmail',
                            'accountantName',
                            'commissionerConatactNumber',
                            'commissionerEmail',
                            'commissionerName',
                        ];
                        let pObj = {};
                        for (key of profileKeys) {
                            if (prevState[key]) {
                                pObj[key] = prevState[key];
                            }
                        }

                        if (pObj['commissionerEmail']) {
                            let emailCheck = await User.findOne(
                                { email: pObj.commissionerEmail },
                                'email commissionerEmail ulb role'
                            )
                                .lean()
                                .exec();
                            if (emailCheck) {
                                if (
                                    emailCheck.ulb.toString() !=
                                    updateData.ulb.toString()
                                ) {
                                    return Response.BadRequest(
                                        res,
                                        {},
                                        `Email:${emailCheck.email} already used by ${emailCheck.role} user.`
                                    );
                                }
                            }
                            pObj['email'] = pObj['commissionerEmail'];
                            pObj['isEmailVerified'] = true;
                            if (pObj.email != userData.email) {
                                let du = await User.update(
                                    {
                                        ulb: prevState.ulb,
                                        role: 'ULB',
                                        isDeleted: false,
                                    },
                                    { $set: pObj }
                                );
                                let link = await Service.emailVerificationLink(
                                    userData._id,
                                    req.currentUrl,
                                    true
                                );
                                let template = Service.emailTemplate.userEmailEdit(
                                    userData.name,
                                    link
                                );
                                // mailOptions.to = pObj['email'];
                                // mailOptions.subject = template.subject;
                                // mailOptions.html = template.body;
                                mailOptions =     {
                                    Destination: {
                                      /* required */
                                      ToAddresses: [pObj.email]
                                    },
                                    Message: {
                                      /* required */
                                      Body: {
                                        /* required */
                                        Html: {
                                          Charset: "UTF-8",
                                          Data:  template.body
                                        },
                                      },
                                      Subject: {
                                        Charset: 'UTF-8',
                                        Data:template.subject
                                      }
                                    },
                                    Source: process.env.EMAIL,
                                    /* required */
                                    ReplyToAddresses: [process.env.EMAIL],
                                  }
                                SendEmail(mailOptions);
                            } else {
                                // let template = Service.emailTemplate.userProfileEdit(userData.name)
                                // mailOptions.subject=  template.subject;
                                // mailOptions.html=  template.body;
                            }
                        } else {
                            let dulb = await Ulb.update(
                                { _id: prevState.ulb },
                                { $set: obj }
                            );
                            let du = await User.update(
                                {
                                    ulb: prevState.ulb,
                                    role: 'ULB',
                                    isDeleted: false,
                                },
                                { $set: pObj }
                            );
                            let template = Service.emailTemplate.userProfileEdit(
                                userData.name
                            );
                            mailOptions =     {
                                Destination: {
                                  /* required */
                                  ToAddresses: [pObj.email]
                                },
                                Message: {
                                  /* required */
                                  Body: {
                                    /* required */
                                    Html: {
                                      Charset: "UTF-8",
                                      Data:  template.body
                                    },
                                  },
                                  Subject: {
                                    Charset: 'UTF-8',
                                    Data:template.subject
                                  }
                                },
                                Source: process.env.EMAIL,
                                /* required */
                                ReplyToAddresses: [process.env.EMAIL],
                              }
                            // mailOptions.subject = template.subject;
                            // mailOptions.html = template.body;
                            SendEmail(mailOptions);
                        }
                    } else {
                        let template = Service.emailTemplate.userProfileRequestAction(
                            userData.name,
                            updateData.status,
                            user.role
                        );
                        mailOptions =     {
                            Destination: {
                              /* required */
                              ToAddresses: [pObj.email]
                            },
                            Message: {
                              /* required */
                              Body: {
                                /* required */
                                Html: {
                                  Charset: "UTF-8",
                                  Data:  template.body
                                },
                              },
                              Subject: {
                                Charset: 'UTF-8',
                                Data:template.subject
                              }
                            },
                            Source: process.env.EMAIL,
                            /* required */
                            ReplyToAddresses: [process.env.EMAIL],
                          }
                        // mailOptions.subject = template.subject;
                        // mailOptions.html = template.body;
                        SendEmail(mailOptions);
                    }
                    let oldStateObj = Object.assign(
                        {},
                        oldState,
                        { actionTakenBy: prevState.actionTakenBy },
                        { status: prevState.status }
                    );
                    let uur = await UlbUpdateRequest.update(
                        { _id: _id },
                        { $set: updateData, $push: { history: oldStateObj } }
                    );
                    if (uur.n) {
                        return Response.OK(res, uur, 'Action updated.');
                    } else {
                        return Response.BadRequest(
                            res,
                            uur,
                            'Requested record not found.'
                        );
                    }
                }
            } catch (e) {
                return Response.DbError(res, e, e.message);
            }
        } catch (e) {
            return Response.DbError(
                res,
                e.message,
                'Caught Database Exception'
            );
        }
    } else {
        return Response.BadRequest(
            res,
            {},
            'This action is only allowed by ULB'
        );
    }
};

async function emailNotificationToStateANDPartner(user, state, partner) {
    if (state) {
        for (s of state) {
            await sleep(1000);
            let template = Service.emailTemplate.ulbProfileEdit(
                user.name,
                s.name
            );
            // let mailOptions = {
            //     to: s.email,
            //     subject: template.subject,
            //     html: template.body,
            // };
         let    mailOptions =     {
                Destination: {
                  /* required */
                  ToAddresses: [s.email]
                },
                Message: {
                  /* required */
                  Body: {
                    /* required */
                    Html: {
                      Charset: "UTF-8",
                      Data:  template.body
                    },
                  },
                  Subject: {
                    Charset: 'UTF-8',
                    Data:template.subject
                  }
                },
                Source: process.env.EMAIL,
                /* required */
                ReplyToAddresses: [process.env.EMAIL],
              }
            SendEmail(mailOptions);
        }
    }
    if (partner) {
        for (p of partner) {
            await sleep(1000);
            let template = Service.emailTemplate.ulbProfileEdit(
                user.name,
                p.name
            );
            let mailOptions =  {
                Destination: {
                  /* required */
                  ToAddresses: [p.email]
                },
                Message: {
                  /* required */
                  Body: {
                    /* required */
                    Html: {
                      Charset: "UTF-8",
                      Data:  template.body
                    },
                  },
                  Subject: {
                    Charset: 'UTF-8',
                    Data:template.subject
                  }
                },
                Source: process.env.EMAIL,
                /* required */
                ReplyToAddresses: [process.env.EMAIL],
              }
            
            SendEmail(mailOptions);
        }
    }
    return;
}

async function sleep(millis) {
    return new Promise((resolve) => setTimeout(resolve, millis));
}

async function UlbQuery(ulb) {
    let ulbuserkeys = [
        'commissionerName',
        'commissionerEmail',
        'commissionerConatactNumber',
        'accountantName',
        'accountantEmail',
        'accountantConatactNumber',
    ];
    let ulbkeys = [
        '_id',
        'name',
        'ulbType',
        'natureOfUlb',
        'name',
        'code',
        'state',
        'wards',
        'area',
        'population',
        'location',
        'amrut',
    ];
    let user = await User.findOne(
        { isDeleted: false, role: 'ULB', ulb: ulb },
        ulbuserkeys.join(' ')
    )
        .populate({
            path: 'ulb',
            select: ulbkeys.join(' '),
            populate: [
                {
                    path: 'ulbType',
                    select: '_id name',
                },
                {
                    path: 'state',
                    select: '_id name code',
                },
            ],
        })
        .lean()
        .exec();
    return user;
}
