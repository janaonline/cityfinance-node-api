const jwt = require('jsonwebtoken');
const ObjectId = require('mongoose').Types.ObjectId;
const User = require('../../models/User');
const Ulb = require('../../models/Ulb');
const XVFcForms = require('../../models/XVFinanceComissionReForms');
const ULBFinancialSchema = require('../../models/UlbFinancialData');
const Config = require('../../config/app_config');
const Constants = require('../../_helper/constants');
const Service = require('../../service');
const Response = require('../../service').response;
const moment = require('moment');
const util = require('util');
const ULB = require('../../models/Ulb');
const STATE = require('../../models/State');

const MODEL_CONSTANT = {
    ULB: ULB,
    STATE: STATE,
    USER: User,

}

const USER_ROLE = {
    ULB: 'ulb',
    STATE: 'state'
}
module.exports.get = async (req, res) => {
    let user = req.decoded;
    (role = req.body.role), (filter = req.body.filter), (sort = req.body.sort);
    let skip = req.query.skip ? parseInt(req.query.skip) : 0;
    let limit = req.query.limit ? parseInt(req.query.limit) : 50;
    let actionAllowed = ['ADMIN', 'MoHUA', 'PARTNER', 'STATE'];
    let access = Constants.USER.LEVEL_ACCESS;
    if (!role) {
        Response.BadRequest(res, req.body, 'Role is required field.');
    } else if (!(access[user.role] && access[user.role].indexOf(role) > -1)) {
        Response.BadRequest(
            res,
            req.body,
            `Action not allowed for the role:${role} by the role:${user.role}`
        );
    } else {
        try {
            let query = { role: role, isDeleted: false };
            let f = await Service.mapFilter(filter);
            Object.assign(query, f);
            let total = undefined;
            if (user.role == 'STATE') {
                let ulbs = await Ulb.distinct('_id', {
                    state: ObjectId(user.state)
                }).exec();
                console.log(ulbs, ObjectId(user.state));
                if (ulbs) {
                    query['ulb'] = { $in: ulbs };
                }
            }
            if (!skip) {
                total = await User.count(query);
            }
            let users = await User.find(query)
                .sort(sort ? sort : { modifiedAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate([
                    {
                        path: 'ulb',
                        select: '_id name code state',
                        populate: {
                            path: 'state',
                            select: '_id name code'
                        }
                    },
                    {
                        path: 'state',
                        select: '_id name code'
                    },
                    {
                        path: 'createdBy',
                        select: '_id name email role'
                    }
                ])
                .exec();
            return res.status(200).json({
                timestamp: moment().unix(),
                success: true,
                message: 'User list',
                data: users,
                total: total
            });
        } catch (e) {
            Response.DbError(res, e, e.message);
        }
    }
};
module.exports.getAll = async (req, res) => {
    try {
        let user = req.decoded,
            filter = req.query.filter
                ? JSON.parse(req.query.filter)
                : req.body.filter
                    ? req.body.filter
                    : {},
            sort = req.query.sort
                ? JSON.parse(req.query.sort)
                : req.body.sort
                    ? req.body.sort
                    : {},
            skip = req.query.skip ? parseInt(req.query.skip) : 0,
            limit = req.query.limit ? parseInt(req.query.limit) : 50,
            csv = req.query.csv == 'true',
            role = req.query.role
                ? req.query.role
                : req.body.role
                    ? req.body.role
                    : 'USER';
        actionAllowed = ['ADMIN', 'MoHUA', 'PARTNER', 'STATE'];
        if (filter["sbCode"]) {
            let code = filter["sbCode"];
            const dataWithCensusCodeQuery =  Ulb.findOne(
                {
                    censusCode: {$regex: `^${code}`, $options: 'i' }
                },{censusCode:1}).lean();
            // let dataWithSbCodeQuery = User.findOne({sbCode: code},{sbCode:1}).lean();
            const [dataWithCensusCode] = await Promise.all([dataWithCensusCodeQuery]);
            if(dataWithCensusCode){
                filter['censusCode'] = code
                delete filter["sbCode"];
            }
            // var digit = code.toString()[0];
            // if (digit == "8") {
            //   delete filter["sbCode"];
            //   filter["censusCode"] = code;
            // }
          }
        let access = Constants.USER.LEVEL_ACCESS;

        if (!role) {
            Response.BadRequest(res, req.body, 'Role is required field.');
        } else if (
            !(access[user.role] && access[user.role].indexOf(role) > -1)
        ) {
            Response.BadRequest(
                res,
                req.body,
                `Action not allowed for the role:${role} by the role:${user.role}`
            );
        } else {
            try {
                let query = { role: role };
                let roleQuery = [{
                    $match: {
                        "role": role
                    }
                },
                { $count: "total" }
                ]

                let countQuery = [
                    { $count: "total" }
                ]
                let q = [
                    {

                        $lookup: {
                            from: "users",
                            localField: "_id",
                            foreignField: "ulb",
                            as: "user"
                        }
                    },
                    {

                        $lookup: {
                            from: "ulbType",
                            localField: "ulbType",
                            foreignField: "_id",
                            as: "ulbType"
                        }
                    },
                    {

                        $lookup: {
                            from: "states",
                            localField: "state",
                            foreignField: "_id",
                            as: "state"
                        }
                    },
                    {
                        $unwind: {
                            path: "$user",
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $unwind: {
                            path: "$state",
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $match: {
                            "state.accessToXVFC": true
                        }
                    },
                    {
                        $unwind: {
                            path: "$ulbType",
                            preserveNullAndEmptyArrays: true
                        }
                    },

                    {
                        $addFields: {
                            priority: {
                                $cond: {
                                    if: { $eq: ['$user.status', 'PENDING'] },
                                    then: 2,
                                    else: 1
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            _id: "$user._id",
                            role: "$user.role",
                            name: "$name",
                            email: "$user.email",
                            priority: 1,
                            designation: "$user.designation",
                            organization: "$user.organization",
                            departmentName: "$user.departmentName",
                            departmentContactNumber: "$user.departmentContactNumber",
                            departmentEmail: "$user.departmentEmail",
                            address: "$user.address",
                            state: "$state._id",
                            stateName: "$state.name",
                            stateCode: "$state.code",
                            stateIsActive: "$state.isActive",
                            ulb: "$_id",
                            ulbName: "$name",
                            ulbCode: "$code",
                            sbCode: "$sbCode",
                            censusCode: "$censusCode",
                            ulbType: "$ulbType.name",
                            status: {
                                $cond: [
                                    { $ifNull: ["$user.status", false] },
                                    "$user.status",
                                    "NA"
                                ]
                            },
                            rejectReason: "$user.rejectReason",
                            modifiedAt: "$user.modifiedAt",
                            createdAt: "$user.createdAt",
                            isActive: "$user.isActive",
                            ulbIsActive: "$isActive",
                            accountantConatactNumber: "$user.accountantConatactNumber",
                            accountantEmail: "$user.accountantEmail",
                            accountantName: "$user.accountantName",
                            user: { $ifNull: ["$user._id", false] },
                            isDeleted: "$user.isDeleted"
                        }
                    },
  
                ];
                let q2 = [
                    { $match: query },

                    {
                        $lookup: {
                            from: 'ulbs',
                            localField: 'ulb',
                            foreignField: '_id',
                            as: 'ulb'
                        }
                    },
                    {
                        $lookup: {
                            from: 'ulbtypes',
                            localField: 'ulbType',
                            foreignField: '_id',
                            as: 'ulbType'
                        }
                    },
                    {
                        $lookup: {
                            from: 'states',
                            localField: 'ulb.state',
                            foreignField: '_id',
                            as: 'stateUlb'
                        }
                    },
                    {
                        $lookup: {
                            from: 'states',
                            localField: 'state',
                            foreignField: '_id',
                            as: 'state'
                        }
                    },
                    {
                        $unwind: {
                            path: '$ulb',
                            preserveNullAndEmptyArrays: true
                        }
                    },

                    {
                        $unwind: {
                            path: '$ulbType',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $unwind: {
                            path: '$state',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $unwind: {
                            path: '$stateUpdate',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $addFields: {
                            priority: {
                                $cond: {
                                    if: { $eq: ['$status', 'PENDING'] },
                                    then: 2,
                                    else: 1
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            role: 1,
                            name: 1,
                            email: 1,
                            priority: 1,
                            designation: 1,
                            organization: 1,
                            departmentName: 1,
                            departmentContactNumber: 1,
                            departmentEmail: 1,
                            address: 1,
                            isActive:1,
                            state: {
                                $cond: [
                                    { $eq: ['$state._id', ''] },
                                    '$stateUlb._id',
                                    '$state._id'
                                ]
                            },
                            stateName: {
                                $cond: [
                                    { $eq: ['$state.name', ''] },
                                    '$stateUlb.name',
                                    '$state.name'
                                ]
                            },
                            stateCode: {
                                $cond: [
                                    { $eq: ['$state.code', ''] },
                                    '$stateUlb.code',
                                    '$state.code'
                                ]
                            },
                            stateIsActive: "$state.isActive",
                            ulb: '$ulb._id',
                            ulbName: '$ulb.name',
                            ulbCode: '$ulb.code',
                            sbCode: '$ulb.sbCode',
                            censusCode: '$ulb.censusCode',
                            ulbType: '$ulbType.name',
                            status: {
                                $cond: [
                                    { $ifNull: ['$status', false] },
                                    '$status',
                                    'NA'
                                ]
                            },
                            rejectReason: 1,
                            modifiedAt: 1,
                            createdAt: 1,
                            accountantConatactNumber: 1,
                            accountantEmail: 1,
                            accountantName: 1,
                            mobile: 1,
                            isDeleted:1
                        }
                    },

                ]

                let newFilter = await Service.mapFilter(filter);

                if (newFilter['user']) newFilter['user'] = JSON.parse(newFilter['user'])

                let total = undefined;
                if (user.role == 'STATE') {
                    let ulbs = await Ulb.distinct('_id', {
                        state: ObjectId(user.state)
                    }).exec();
                    if (ulbs) {
                        newFilter['ulb'] = { $in: ulbs };
                    }
                }
                if (newFilter && Object.keys(newFilter).length) {
                    q.push({ $match: newFilter });
                }
                if (csv) {
                    let arr;
                    if(role ===  "ULB"){
                     arr = await Ulb.aggregate(q).exec();
                    } else {
                        arr = await User.aggregate(q2).exec();
                    }
                    let field = {};
                    if(role === "ULB"){
                        Object.assign(field, {
                          ulbName: "ULB Name"
                        });
                    }
                    if (['STATE'].indexOf(role) > -1) {
                        Object.assign(field, {
                            stateName: 'State'
                        });
                    }
                    Object.assign(field, {
                        name: `${role} Nodal Officer Name`,
                        email: `${role} Nodal Officer Email ID`,
                        mobile: `${role} Nodal Officer Phone Number`
                    });
                    if (
                        ['MoHUA', 'PARTNER', 'STATE', 'USER'].indexOf(role) > -1
                    ) {
                        Object.assign(field, {
                            designation: 'Designation'
                        });
                    }
                    if (['PARTNER', 'STATE'].indexOf(role) > -1) {
                        Object.assign(field, {
                            departmentName: 'Department'
                        });
                    }
                    if (['ULB'].indexOf(role) > -1) {
                        field = {
                            stateName: 'State',
                            ulbName: 'ULB Name',
                            ulbCode: 'ULB Code',
                            sbCode: 'Swatch Bharat Code',
                            censusCode: 'Census Code',
                            isActive: 'Status',
                            accountantName: 'ULB Nodal Officer Name',
                            accountantEmail: 'ULB Nodal Officer Email ID',
                            accountantConatactNumber: 'ULB Nodal Officer Phone Number'
                        };
                    }
                    if (['USER'].indexOf(role) > -1) {
                        Object.assign(field, {
                            organization: 'Organisation'
                        });
                    }
                    let xlsData = await Service.dataFormating(arr, field);
                    return res.xls('user.xlsx', xlsData);
                } else {

                    q.push({ $skip: skip });
                    let q_copy = [];
                    q_copy = q.slice()
                    q.push({ $limit: limit });
                    let totalUsers;
                    if (!skip) {

                        let nQ = Object.assign({}, query);
                        // Object.assign(nQ, newFilter);
                        total = await User.count(nQ);


                    }

                    // totalUsers = await User.aggregate({ role: "ULB" })
                    let users;
                    if (role == 'ULB') {
                        if (!skip) {
                            // if (Object.entries(newFilter).length > 0 && newFilter.constructor === Object) {
                            //     q_copy.push({ $match: newFilter })
                            // }
                            q_copy.push(...countQuery)
                        }


                        console.log(util.inspect(q_copy, { showHidden: false, depth: null }))
                        totalUsers = await Ulb.aggregate(q_copy);
                        // totalUsers = await Ulb.aggregate(countQuery)
                        users = await Ulb.aggregate(q)
                            .collation({ locale: 'en' })
                            .exec();

                    } else {
                        if (newFilter && Object.keys(newFilter).length) {
                            roleQuery.unshift({ $match: newFilter });
                            q2.push({ $match: newFilter });
                        }
                        totalUsers = await User.aggregate(roleQuery)
                        users = await User.aggregate(q2)
                            .collation({ locale: 'en' })
                            .exec();
                    }
                    console.log(totalUsers)
                    // console.log(util.inspect(q, { showHidden: false, depth: null }))
                    // return res.json({
                    //     q2,
                    //     roleQuery
                    // })
                    return res.status(200).json({
                        timestamp: moment().unix(),
                        success: true,
                        message: 'User list',
                        data: users,
                        count: users.length,
                        total: totalUsers.length > 0  ? totalUsers[0]['total'] : null 
                    });
                }
            } catch (e) {
                console.log(e);
                return Response.DbError(res, e, e.message);
            }
        }
    } catch (e) {
        console.log('Eaception', e);
        return Response.BadRequest(res, e, e.message);
    }
};
module.exports.update = async (req, res) => {
    try {
        let inValid = await Service.checkUnique.validate(data, data.role);
        if (inValid && inValid.length) {
            return Response.BadRequest(res, {}, `${inValid.join('\n')}`);
        }
        let du = await User.updateOne({ _id: req.body._id }, req.body);
        return Response.OK(res, du, `Successfully updated.`);
    } catch (e) {
        return Response.DbError(res, e, e.message);
    }
};
module.exports.profileUpdate = async (req, res) => {
    let obj = {};
    let body = req.body;
    let user = req.decoded;
    // ["mobile", "designation", "organization", "isActive", "isDeleted", "_id", "role", "email", "password", "name", "accountantConatactNumber", "accountantEmail", "accountantName", "commissionerConatactNumber", "commissionerEmail", "commissionerName", "ulb", "createdAt", "updatedAt", "__v"]
    let keyObj = {
        USER: ['name', 'mobile', 'designation', 'organization'],
        ULB: [
            'name',
            'accountantConatactNumber',
            'accountantEmail',
            'accountantName',
            'commissionerConatactNumber',
            'commissionerName'
        ],
        STATE: [
            'name',
            'mobile',
            'designation',
            'address',
            'departmentName',
            'departmentEmail',
            'departmentContactNumber'
        ],
        PARTNER: [
            'name',
            'mobile',
            'designation',
            'address',
            'departmentName',
            'departmentEmail',
            'departmentContactNumber'
        ],
        MoHUA: [
            'name',
            'mobile',
            'designation',
            'address',
            'departmentName',
            'departmentEmail',
            'departmentContactNumber'
        ]
    };
    try {
        let _id = req.params._id ? req.params._id : user._id;
        let userInfo = await User.findOne(
            { _id: ObjectId(_id) },
            '_id role name email accountantEmail departmentEmail state ulb'
        )
            .lean()
            .exec();
        if (userInfo) {
            let inValid = await Service.checkUnique.validate(
                body,
                userInfo.role,
                userInfo._id
            );
            if (inValid && inValid.length) {
                return Response.BadRequest(res, {}, `${inValid.join('\n')}`);
            }
            for (key in body) {
                if (body[key]) {
                    obj[key] = body[key];
                }
                // if(body.hasOwnProperty('isActive')){
                //     obj[key] = body[key]
                // }
            }
            if (
                userInfo.role == 'ULB' &&
                obj.commissionerEmail &&
                obj.commissionerEmail != userInfo.email
            ) {
                obj['email'] = obj.commissionerEmail;
            }
            if (obj.email != userInfo.email) {
                let emailExists = await User.findOne({
                    email: obj.email
                }).exec();
                if (emailExists) {
                    return Response.BadRequest(
                        res,
                        obj,
                        `Email: '${obj.email}' already in use`
                    );
                }
            }
            if (
                (Constants.USER.LEVEL_ACCESS[user.role] &&
                    Constants.USER.LEVEL_ACCESS[user.role].indexOf(
                        userInfo.role
                    ) > -1) ||
                (user.role == userInfo.role &&
                    userInfo._id.toString() == user._id)
            ) {
                try {
                    obj['isVerified2223'] = true;
                    let out = await User.updateOne(
                        { _id: userInfo._id },
                        { $set: obj }
                    );
                    if(body.hasOwnProperty('isActive') && out && userInfo.role == 'ULB'){
                        const model = MODEL_CONSTANT[userInfo.role];
                        const userId = userInfo[USER_ROLE[userInfo.role]]
                        //setitng isActive true or false based on body provided
                        const updatedUser = await model.findOneAndUpdate({
                            _id: userId
                        },
                        {
                            $set:{
                                isActive: body.isActive
                            }
                        }).lean()
                        // console.log("updatedUser",updatedUser)
                    }
                    let mail = await Service.emailTemplate.sendProfileUpdateStatusEmail(
                        userInfo,
                        req.currentUrl
                    );
                    return Response.OK(res, out, `Successfully updated.`);
                } catch (e) {
                    console.log('Exception', e);
                    return Response.DbError(res, e, `Something went wrong.`);
                }
            } else {
                return Response.BadRequest(
                    res,
                    userInfo,
                    `Unauthorized to create user of role:${userInfo.role}.`
                );
            }
        } else {
            return Response.BadRequest(res, {}, `User not found.`);
        }
    } catch (e) {
        console.log('Exception', e);
        return Response.DbError(res, e, `Something went wrong.`);
    }
};
module.exports.profileGet = async (req, res) => {
    let obj = {};
    let _id = req.query._id;
    let user = req.decoded;
    let keyObj = {
        USER: {
            select: '-password'
        },
        ULB: {
            select: '-password',
            populate: {
                path: 'ulb',
                select: '-password',
                populate: [
                    {
                        path: 'state',
                        select: '_id code name'
                    },
                    {
                        path: 'ulbType',
                        select: '_id name'
                    }
                ]
            }
        },
        STATE: {
            select: '-password',
            populate: {
                path: 'state',
                select: '_id name'
            }
        }
    };
    let role = req.query.role ? req.query.role : user.role;
    let select = keyObj[role] ? keyObj[role].select : '-password';
    let _condition = { _id: _id ? ObjectId(_id) : ObjectId(user._id) };
    let uModel = User.findOne(_condition, select);
    if (keyObj[role] && keyObj[role].populate) {
        uModel.populate(keyObj[role].populate);
    }
    uModel.exec((err, out) => {
        if (err) {
            return Response.DbError(res, err, `Something went wrong.`);
        } else {
            return Response.OK(res, out, `Success updated.`);
        }
    });
};
module.exports.create = async (req, res) => {
    let user = req.decoded;
    let data = req.body;
    if (Constants.USER.LEVEL_ACCESS[user.role].indexOf(data.role) > -1) {
        try {
            let inValid = await Service.checkUnique.validate(data, data.role);
            if (inValid && inValid.length) {
                return Response.BadRequest(res, {}, `${inValid.join('\n')}`);
            }
            let newUser = new User(data);
            let password = Service.getRndInteger(10000, 99999).toString(); // dummy password for user creation.
            newUser.password = await Service.getHash(password);
            let ud = await newUser.validate();
            newUser.isActive = true;
            newUser.commissionerEmail
                ? (newUser.email = newUser.commissionerEmail)
                : '';
            newUser.createdBy = user._id;
            newUser.isEmailVerified = true;
            let u = await User.findOne({ email: data['email'], role: { $in: ['MoHUA', 'USER', 'PARTNER', 'STATE'] } }).exec()
            if (u) {
                return Response.BadRequest(
                    res,
                    {},
                    `Email ID already exists.`
                );
            }

            newUser.save(async (err, user) => {
                if (err) {
                    console.log('Err', err);
                    return Response.DbError(
                        res,
                        {},
                        err.code == 11000
                            ? 'Email ID already exists.'
                            : 'Failed to register user.'
                    );
                } else {
                    let link = await Service.emailVerificationLink(
                        user._id,
                        req.currentUrl,
                        true
                    );
                    let template = Service.emailTemplate.userCreation(
                        user.email,
                        user.name,
                        link
                    );
                    // let mailOptions = {
                    //     to: user.email,
                    //     subject: template.subject,
                    //     html: template.body
                    // };
                    let    mailOptions =     {
                        Destination: {
                          /* required */
                          ToAddresses: [user.email]
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
                    Service.sendEmail(mailOptions);
                    return Response.OK(res, user, 'User registered');
                }
            });
        } catch (e) {
            console.log('Exception', e);
            if (e.errors && Object.keys(e.errors).length) {
                let o = {};
                for (k in e.errors) {
                    o[k] = e.errors[k].message;
                }
                return Response.DbError(res, o, `Validation error.`);
            } else {
                return Response.DbError(res, e, `Validation error.`);
            }
        }
    } else {
        return Response.BadRequest(
            res,
            {},
            `Unauthorized to create user of role:${data.role}.`
        );
    }
};
module.exports.delete = async (req, res) => {
    let user = req.decoded;
    let access = Constants.USER.LEVEL_ACCESS;
    try {
        let condition = { _id: ObjectId(req.params._id) };
        let userData = await User.findOne(condition).lean();
        if (!userData) return Response.BadRequest(res, {}, `User not found.`);
        if (!access[user.role] || access[user.role].indexOf(userData.role) < 0)
            return Response.BadRequest(
                res,
                req.body,
                `Action not allowed for the role:${userData.role} by the role:${user.role}`
            );
        try {
            if (userData.role == 'STATE') {
                let stateForm = await XVFcForms.findOne({
                    state: ObjectId(userData.state)
                }).exec();
                if (stateForm) {
                    return Response.BadRequest(
                        res,
                        req.body,
                        `Action not allowed because state has Questionnaire data`
                    );
                }
            } else if (userData.role === 'ULB') {
                let ulbForm = await XVFcForms.findOne({
                    ulb: ObjectId(userData.ulb)
                }).exec();
                if (ulbForm) {
                    return Response.BadRequest(
                        res,
                        req.body,
                        'Action not allowed because ULB has Questionnaire data'
                    );
                }

                const ulbFinancialData = await ULBFinancialSchema.findOne({
                    ulb: ObjectId(userData.ulb)
                }).exec();
                if (ulbFinancialData) {
                    return Response.BadRequest(
                        res,
                        {},
                        'Action not allowed because ULB has data in Financial Statement.'
                    );
                }
            }

            let newEmail = `${userData.email}.deleted.${moment().unix()}`;
            let u = await User.update(condition, {
                $set: { isDeleted: true, email: newEmail }
            });
            Response.OK(res, u, `deleted successfully.`);
        } catch (e) {
            console.error(e);
            Response.DbError(res, e, `Something went wrong.`);
        }
    } catch (e) {
        console.error(e);
        Response.BadRequest(res, e, `Something went wrong.`);
    }
};
module.exports.ulbSignupAction = async (req, res) => {
    let user = req.decoded,
        data = req.body;
    let access = Constants.USER.LEVEL_ACCESS;
    try {
        let condition = { _id: ObjectId(req.params._id) };
        let userData = await User.findOne(condition)
            .populate('ulb', 'state')
            .lean();

        if (userData) {
            if (access[user.role].indexOf(userData.role) > -1) {
                try {

                    if (userData.status != 'PENDING') {
                        return Response.BadRequest(
                            res,
                            req.body,
                            `Action is already taken (${userData.status})`
                        );
                    }

                    let d = {
                        modifiedAt: new Date(),
                        status: data.status,
                        rejectReason: data.rejectReason
                    };
                    let forgotPassword = userData.role == "ULB" ? true : false;
                    let u = await User.update(condition, { $set: d });
                    let link = await Service.emailVerificationLink(
                        userData._id,
                        req.currentUrl,
                        forgotPassword
                    );
                    let email = await Service.emailTemplate.sendUlbSignupStatusEmmail(
                        userData._id,
                        link
                    );
                    Response.OK(res, u, `${data.status} successfully.`);
                } catch (e) {
                    Response.DbError(res, e, `Something went wrong.`);
                }
            } else {
                Response.BadRequest(
                    res,
                    req.body,
                    `Action not allowed for the role:${userData.role} by the role:${user.role}`
                );
            }
        } else {
            Response.BadRequest(res, {}, `User not found.`);
        }
    } catch (e) {
        console.log(e);
        Response.BadRequest(res, e, `Something went wrong.`);
    }
};

module.exports.userVerification2223 = async(req,res)=> {
    let user = req.body.user;
    await User.findOneAndUpdate({_id: ObjectId(user)}, {isVerified2223: true})
return res.json({
    success: true,
    message:"User Verified"
})
}

module.exports.getNodalOfficers = async (req, res) => {

    try {
        if (!req.params._id) {
            return res.status(400).json({
                success: false,
                message: 'State ID Not Found'
            })
        }
        let user = await User.findOne({ "state": ObjectId(req.params._id), isNodalOfficer: true, isDeleted: false, role: "STATE" })
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'User Not Found in DB'
            })
        } else {
            return res.status(200).json({
                success: true,
                message: 'User Found Successfully',
                name: user.name,
                email: user.email,
                mobile: user.mobile
            })
        }

    } catch (e) {
        console.log(e)
        res.json({
            message: 'Exception Caught -' + e.message
        })
    }
}
