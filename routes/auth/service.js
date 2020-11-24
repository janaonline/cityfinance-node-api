const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const LoginHistory = require('../../models/LoginHistory');
const VisitSession = require('../../models/VisitSession');
const Config = require('../../config/app_config');
const Helper = require('../../_helper/constants');
const Constants = require('../../_helper/constants');
const Service = require('../../service');
const Response = require('../../service').response;
const ObjectId = require('mongoose').Types.ObjectId;
const request = require('request');
const Ulb = require('../../models/Ulb');

module.exports.register = async (req, res) => {
    try {
        let data = req.body;
        data.role = data.role ? data.role : Constants.USER.DEFAULT_ROLE;
        if (data.role == 'ULB') {
            data.status = 'APPROVED';
            if (data.accountantConatactNumber && data.accountantName && data.accountantEmail && data.ulb) {
                let user = await User.findOne({
                    ulb: ObjectId(data.ulb),
                    role: data.role,
                    isDeleted: false
                })
                    .lean()
                    .exec();
                if (user) {
                    if (user.status == 'REJECTED') {
                        let d = User.deleteOne({
                            ulb: ObjectId(data.ulb),
                            role: data.role,
                            isDeleted: false
                        }).exec();
                    } else {
                        return Response.BadRequest(
                            res,
                            { data },
                            `Already an user is registered with requested ulb.`
                        );
                    }
                }
            } else {
                return Response.BadRequest(
                    res,
                    { data },
                    `XV FC Nodal Officer Name/XV FC Nodal Officer Email ID/XV FC Nodal Officer Contact no and Ulb is required field.`
                );
            }
            data['isActive'] = false;
            data['email'] = data.accountantEmail;
            data['password'] = Service.getRndInteger(10000, 99999).toString();
        }

        let newUser = new User(data);
        let ud = await newUser.validate();
        newUser.password = await Service.getHash(newUser.password);
        let inValid = await Service.checkUnique.validate(
            data,
            data.role,
            ''
        );
        if (inValid && inValid.length) {
            return Response.BadRequest(res, {}, `${inValid.join('\n')}`);
        }

        newUser.save(async (err, user) => {
            if (err) {
                console.log('Err', err);
                return Response.BadRequest(
                    res,
                    err,
                    err.code == 11000
                        ? 'Email already in use.'
                        : 'Failed to register user'
                );
                //return res.json({success:false, msg: err.code == 11000 ? 'Duplicate entry.':'Failed to register user'});
            } else {
                let forgotPassword = (user.role=='USER') ? false:true; 
                let link = await Service.emailVerificationLink(
                    user._id,
                    req.currentUrl,
                    forgotPassword
                );
                if (data.role == 'ULB') {

                    let ulbObj = await Ulb.findOne({_id:ObjectId(user.ulb)}).exec();
                    let d = {
                        modifiedAt: new Date(),
                        sbCode:ulbObj.sbCode,
                        censusCode:ulbObj.censusCode
                    };
                    let u = await User.update({ _id: ObjectId(user._id)},{ $set: d });
                    // let link = await Service.emailVerificationLink(
                    //     user._id,
                    //     req.currentUrl,
                    //     forgotPassword
                    // );
                    
                    // let email = await Service.emailTemplate.sendUlbSignupStatusEmmail(
                    //     user._id,
                    //     link
                    // );
                    /*
                    let template = Service.emailTemplate.ulbSignup(
                        user.name,
                        'ULB',
                        null
                    );
                    let mailOptionsCommisioner = {
                        to: user.email,
                        subject: template.subject,
                        html: template.body
                    };
                    Service.sendEmail(mailOptionsCommisioner);

                    let state = await User.find({
                        state: ObjectId(user.state),
                        isActive: true,
                        isDeleted : false,
                        role: 'STATE'
                    }).exec();
                    let partner = await User.find({
                        isActive: true,
                        role: 'PARTNER',
                        isDeleted : false
                    }).exec();
                    
                    if (state) {
                        for (s of state) {
                            await sleep(1000);
                            let template = Service.emailTemplate.ulbSignup(
                                user.name,
                                'STATE',
                                s.name
                            );
                            let mailOptions = {
                                to: s.email,
                                subject: template.subject,
                                html: template.body
                            };
                            Service.sendEmail(mailOptions);
                        }
                    }

                    if (partner) {
                        for (p of partner) {
                            await sleep(1000);
                            let template = Service.emailTemplate.ulbSignup(
                                user.name,
                                'PARTNER',
                                p.name
                            );
                            let mailOptions = {
                                to: p.email,
                                subject: template.subject,
                                html: template.body
                            };
                            Service.sendEmail(mailOptions);
                        }
                    }

                    /*let templateAcountant = Service.emailTemplate.ulbSignupAccountant(user.accountantName);
                    let mailOptionsAccountant = {
                        to: user.accountantEmail, // list of receivers
                        subject: templateAcountant.subject,
                        html: templateAcountant.body
                    };
                    Service.sendEmail(mailOptionsAccountant);*/
                } else {
                    let template = Service.emailTemplate.userSignup(
                        user.email,
                        user.name,
                        link
                    );
                    let mailOptions = {
                        to: user.email,
                        subject: template.subject,
                        html: template.body
                    };
                    Service.sendEmail(mailOptions);
                }
                return Response.OK(res, user, `User registered`);
            }
        });
    } catch (e) {
        console.log('Exception', e);
        if (e.errors && Object.keys(e.errors).length) {
            let o = {};
            for (k in e.errors) {
                o[k] = e.errors[k].message;
            }
            return Response.DbError(res, o, 'Validation error');
        } else {
            return Response.DbError(res, e, 'Validation error');
        }
    }
};
module.exports.login = async (req, res) => {
    /**Conditional Query For CensusCode/SWATCH BHARAT Code **/
    let msg = `Invalid Swatch Bharat Code/Census Code or password`
    let ulbflagForEmail = false;
    let query = [
        {censusCode: req.sanitize(req.body.email)},
        {sbCode: req.sanitize(req.body.email)}
    ]
    if(req.body.email.includes("@")){
        ulbflagForEmail = true;
        msg= `Invalid email or password`
        query = [{email: req.sanitize(req.body.email)}]    
    }
    User.findOne({$or:query,"isDeleted":false}, async (err, user) => {
        if (err) {
            return Response.BadRequest(res, err, 'Db Error');
        } else if (!user) {
            return Response.BadRequest(res, err, 'User not found');
        } else if (user.isDeleted) {
            return Response.BadRequest(res, err, 'User is deleted.');
        } else if (user.status == 'PENDING') {
            return Response.BadRequest(
                res,
                {},
                'Waiting for admin action on request.'
            );
        } else if (user.status == 'REJECTED') {
            return Response.BadRequest(
                res,
                {},
                `Your request has been rejected. Reason: ${user.rejectReason}`
            );
        }else if (!user.isEmailVerified) {
            return Response.BadRequest(res, err, 'Email not verified yet.');
        }else if (user.role=="ULB" && ulbflagForEmail ) {
            return Response.BadRequest(res, err, 'Please use Swatch Bharat Code/Census Code for login');
        }
         else {
            try {
                if (user.isLocked) {
                    // just increment login attempts if account is already locked
                    let update = Service.incLoginAttempts(user);
                    await User.update({ email: user.email }, update).exec();
                    return Response.BadRequest(
                        res,
                        {},
                        `Your account is temporarily locked for 1 hour`
                    );
                }

                // check Password Expiry
                // if (user.passwordExpires && user.passwordExpires < Date.now()) {
                //     return Response.UnAuthorized(
                //         res,
                //         {},
                //         `Please reset your password.`,
                //         441
                //     );
                // }

                let sessionId = req.headers.sessionid;
                let isMatch = await Service.compareHash(
                    req.body.password,
                    user.password
                );
                if (isMatch) {
                    let keys = [
                        '_id',
                        'email',
                        'role',
                        'name',
                        'ulb',
                        'state',
                        'isActive'
                    ];
                    let data = {};
                    for (k in user) {
                        if (keys.indexOf(k) > -1) {
                            data[k] = user[k];
                        }
                    }

                    let inactiveTime = Date.now() + Helper.INACTIVETIME.TIME;
                    let loginHistory = new LoginHistory({
                        user: user._id,
                        loggedInAt: new Date(),
                        visitSession: ObjectId(sessionId),
                        inactiveSessionTime: inactiveTime
                    });
                    let lh = await loginHistory.save();
                    data['purpose'] = 'WEB';
                    data['lh_id'] = lh._id;
                    data['sessionId'] = sessionId;
                    data['passwordExpires'] = user.passwordExpires;
                    data['passwordHistory'] = user.passwordHistory;
                    const token = jwt.sign(data, Config.JWT.SECRET, {
                        expiresIn: Config.JWT.TOKEN_EXPIRY
                    });

                    var updates = {
                        $set: { loginAttempts: 0 }
                    };
                    if(!ulbflagForEmail){
                        user.email = user.accountantEmail 
                    }
                    await User.update({ email: user.email }, updates).exec(); // set
                    return res.status(200).json({
                        success: true,
                        token: token,
                        user: {
                            name: user.name,
                            email: user.email,
                            isActive: user.isActive,
                            role: user.role,
                            state: user.state,
                            ulb: user.ulb
                        }
                    });
                } else {
                    let update = Service.incLoginAttempts(user);
                    console.log(update);
                    if(!ulbflagForEmail){
                        user.email = user.accountantEmail 
                    }
                    await User.update({ email: user.email }, update).exec();
                    let attempt = await User.findOne({
                        email: user.email
                    }).exec();
                    return Response.BadRequest(
                        res,
                        { loginAttempts: attempt.loginAttempts },
                        msg
                    );
                }
            } catch (e) {
                console.log('Error', e.message, e);
                return Response.BadRequest(
                    res,
                    {},
                    `Erorr while comparing password.`
                );
            }
        }
    });
};
module.exports.verifyToken = (req, res, next) => {
    let token =
        req.body.token ||
        req.query.token ||
        req.params.token ||
        req.headers['x-access-token'];

    if (token) {

        let decodedPayload = jwt.decode(token);
        // verifies secret and checks exp
        jwt.verify(token, Config.JWT.SECRET, async function (err, decoded) {
            if (err) {

                let decodedPayload = jwt.decode(token);
                if(decodedPayload.forgotPassword || decodedPayload.purpose=="EMAILVERFICATION"){

                    let msg = "Link is already expired"
                    let pageRoute = decodedPayload.url
                    ? 'password/request'
                    : 'account-reactivate';
                    let user = await User.findOne({ _id:decodedPayload._id});
                    if(!user.isEmailVerified){
                        pageRoute = 'account-reactivate';
                    }
                    let queryStr = `email=${decodedPayload.email}&message=${msg}.`;
                    let url = `${process.env.HOSTNAME}/${pageRoute}?${queryStr}`;
                    return res.redirect(url)   
                }

                console.log('verify-token jwt.verify : ', err.message);
                return Response.UnAuthorized(
                    res,
                    {},
                    `Failed to authenticate token.`
                );
            } else {
                req.decoded = decoded;
                if (req.decoded.sessionId) {
                    userId = ObjectId(req.decoded._id);
                    let query = {
                        user: ObjectId(userId),
                        visitSession: ObjectId(req.decoded.sessionId)
                    };
                    let login = await LoginHistory.findOne(query)
                        .sort({ _id: -1 })
                        .exec();
                    if (login) {
                        if (Date.now() >= login.inactiveSessionTime) {
                            return Response.UnAuthorized(
                                res,
                                {},
                                `The client's session has expired and must log in again.`,
                                440
                            );
                        }
                        let inactiveTime =
                            Date.now() + Helper.INACTIVETIME.TIME;
                        let u = LoginHistory.update(
                            { _id: ObjectId(login._id) },
                            { $set: { inactiveSessionTime: inactiveTime } }
                        ).exec();
                    } else {
                        return Response.UnAuthorized(
                            res,
                            {},
                            `LoginHistory Not found`,
                            400
                        );
                    }
                } else {
                    //    return Response.UnAuthorized(res, {},`No sessionId provided`);
                }

                next();
            }
        });
    } else {
        // if there is no token
        // return an error
        return res
            .status(403)
            .send({ success: false, message: 'No token provided.' });
    }
};

module.exports.resendAccountVerificationLink = async (req, res) => {
    try {
        let ulbflagForEmail = false;
        let query = [
            {censusCode: req.sanitize(req.body.email)},
            {sbCode: req.sanitize(req.body.email)}
        ]
        if(req.body.email.includes("@")){
            ulbflagForEmail = true;
            query = [{email: req.sanitize(req.body.email),isDeleted: false}]    
        }
        let keys = [
            '_id',
            'email',
            'role',
            'name',
            'isEmailVerified',
            'isLocked',
            'accountantEmail'
        ];
        let user = await User.findOne(
            {$or:query},
            keys.join(' ')
        ).exec();
        if (!user) return Response.BadRequest(res, req.body, `Email not Found`);
        if (user.isEmailVerified)
            return Response.BadRequest(
                res,
                req.body,
                'Account is already activated.'
            );
        if (user.isLocked)
            return Response.BadRequest(
                res,
                req.body,
                'Activation link cannot be send since account is locked. Kindly wait until account is unlocked, then try again.'
            );
        const validUserTypes = ['USER', 'ULB', 'STATE', 'PARTNER', 'MoHUA'];
        if (!validUserTypes.includes(user.role))
            return Response.BadRequest(
                res,
                req.body,
                `Account Reactivation feature is not available for role: ${user.role}.`
            );
        /**
         * @description In case of USER role, the password is already set during registeration process. But for others, the password need to be set after account is verified.
         */
        if(!ulbflagForEmail){
            user.email = user.accountantEmail 
        } 
        const data = {
            _id: user['_id'],
            email: user['email'],
            role: user['role'],
            name: user['name'],
            forgotPassword: user.role !== 'USER'
        };
    
        let link = await Service.emailVerificationLink(
            user._id,
            req.currentUrl,
            true
        );
        const template = Service.emailTemplate.sendAccountReActivationEmail(
            user,
            link
        );
        let mailOptions = {
            to: user.email,
            subject: template.subject,
            html: template.body
        };
        Service.sendEmail(mailOptions);
        return Response.OK(
            res,
            {},
            `Account verification link sent to ${user.email}.`
        );
    } catch (e) {
        console.error(e);
        return Response.BadRequest(res, req.body, `Exception occurred.`);
    }
};

module.exports.emailVerification = async (req, res) => {
    try {

        let msg = req.decoded.forgotPassword ? "":"Email verified"   
        let ud = {isEmailVerified:true}
        if (req.decoded.role == 'USER') {
            if(req.decoded.forgotPassword){
                ud["isEmailVerified"] = false
            }
            ud.isActive = true;
        }
        let keys = ['_id','accountantEmail','email', 'role', 'name', 'ulb', 'state','isEmailVerified','isPasswordResetInProgress'];
        let query = { _id: ObjectId(req.decoded._id) };
        let user = await User.findOne(query, keys.join(' ')).exec();
        if(user.role!="USER" ){
            ud.isEmailVerified = user.isEmailVerified
        }
        if(user.role=='ULB'){
            user.email = user.accountantEmail
        }
        let du = await User.update(query, { $set: ud });
        let data = {};
        for (k in user) {
            if (keys.indexOf(k) > -1) {
                data[k] = user[k];
            }
        }
        data['purpose'] = 'WEB';
        const token = jwt.sign(data, Config.JWT.SECRET, {
            expiresIn: Config.JWT.TOKEN_EXPIRY
        });
        // if(user.isEmailVerified==false){
        //     req.decoded.forgotPassword = user.role=="USER" ? false : true;
        // }
        if(user.isPasswordResetInProgress && req.decoded.forgotPassword){
            req.decoded.forgotPassword=false;   
            msg = "Password is already reset"
        }
        let pageRoute = req.decoded.forgotPassword
            ? 'password/request'
            : 'login';

        let queryStr = `token=${token}&name=${user.name}&email=${user.email}&role=${user.role}&message=${msg}`;
        let url = `${process.env.HOSTNAME}/${pageRoute}?${queryStr}`;
        return res.redirect(url);
    } catch (e) {
        return res.send(`<h1>Error Occurred:</h1><p>${e.message}</p>`);
    }
};
module.exports.forgotPassword = async (req, res) => {

    let msg = `Requested Swatch Bharat Code/Census Code:${req.body.email} is not registered.`
    let verify_msg = `Requested Swatch Bharat Code/Census Code:${req.body.email} is not verified.`
    let ulbflagForEmail = false;
    let query = [
        {censusCode: req.sanitize(req.body.email)},
        {sbCode: req.sanitize(req.body.email)}
    ]
    if(req.body.email.includes("@")){
        ulbflagForEmail = true;
        msg = `Requested email:${req.body.email} is not registered.`
        verify_msg = `Requested email:${req.body.email} is not verified.`
        query = [{email: req.sanitize(req.body.email)}]    
    }

    try {
        let user = await User.findOne({$or:query}).exec();
        if (user) {
            if (user.isDeleted) {
                return Response.BadRequest(
                    res,
                    {},
                    msg
                );
            }else if (!user.isEmailVerified) {
                return Response.BadRequest(
                    res,
                    {},
                    verify_msg
                );
            }
            else if (user.isLocked) {
                return Response.BadRequest(
                    res,
                    {},
                    `Your account is temporarily locked for 1 hour`
                );
            }
            else {
                let newPassword = Service.getRndInteger(
                    10000,
                    99999
                ).toString();
                let passwordHash = await Service.getHash(newPassword);
                let passwordExpires =
                    Date.now() + Helper.PASSWORDEXPIRETIME.TIME; // 1 hour
                let passwordHistory = setPasswordHistory(user, passwordHash);
                if(!ulbflagForEmail){
                    user.email = user.accountantEmail 
                } 
                try {
                    //let du = await User.update({_id:user._id},{$set:{passwordHistory:passwordHistory,password:passwordHash,passwordExpires:passwordExpires}});
                    let du = await User.update({_id:user._id},{$set:{isPasswordResetInProgress:false}})
                    let keys = ['_id', 'email', 'role', 'name'];
                    let data = {};
                    for (k in user) {
                        if (keys.indexOf(k) > -1) {
                            data[k] = user[k];
                        }
                    }
                    data['purpose'] = 'EMAILVERFICATION';
                    data['forgotPassword'] = true;
                    let link = await Service.emailVerificationLink(
                        user._id,
                        req.currentUrl,
                        true
                    );
                    let template = Service.emailTemplate.userForgotPassword(
                        user.name,
                        link
                    );
                    let mailOptions = {
                        to: user.email,
                        subject: template.subject,
                        html: template.body
                    };
                    Service.sendEmail(mailOptions);
                    return Response.OK(
                        res,
                        {},
                        `Link sent to email ${user.email}`
                    );
                } catch (e) {
                    return Response.BadRequest(
                        res,
                        {},
                        `Exception: ${e.message}.`
                    );
                }
            }
        } else {
            return Response.BadRequest(
                res,
                {},
                `Requested email:${req.body.email} is not registered.`
            );
        }
    } catch (e) {
        return Response.BadRequest(res, {}, `Exception:${e.message}`);
    }
};
module.exports.resetPassword = async (req, res) => {
    try {
        if (req.body.password) {
            if (req.body.password.length < 8) {
                return Response.BadRequest(
                    res,
                    '',
                    `password contain at least 8 characters`
                );
            }
            if (!checkPassword(req.body.password)) {
                return Response.BadRequest(
                    res,
                    '',
                    `Password should be alphanumeric with at least one Uppercase/Lowercase and special character`
                );
            }

            let user = await User.findOne({
                _id: ObjectId(req.decoded._id)
            }).exec();

            if (user) {
                let passwordHash = await Service.getHash(req.body.password);
                if(user.passwordHistory.length >0){
                    for(password of user.passwordHistory ){
                        let isMatch = await Service.compareHash(
                            req.body.password,
                            password
                        );
                        if(isMatch){
                            return Response.BadRequest(
                                res,
                                '',
                                `You cannot set last 3 used password`
                            );
                        }
                    }                    
                }

                let passwordExpires = Date.now() + Helper.PASSWORDEXPIRETIME.TIME; // 1 hour
                let passwordHistory = setPasswordHistory(user, passwordHash);
                let update = {
                    $set: {
                        passwordHistory: passwordHistory,
                        password: passwordHash,
                        passwordExpires: passwordExpires,
                        isEmailVerified: true,
                        isPasswordResetInProgress: true
                    }
                };
                let du = await User.update({ _id: ObjectId(user._id) }, update);
                return Response.OK(res, {}, 'Password reset');
            } else {
                return Response.BadRequest(res, {}, `user not found.`);
            }
        } else {
            return Response.BadRequest(res, {}, `Password is required field.`);
        }
    } catch (e) {
        return Response.BadRequest(res, {}, `Exception:${e.message}`);
    }
};

module.exports.captcha = (req, res) => {
    const secretKey = Config.CAPTCHA.SECRETKEY;
    let token = req.body.recaptcha;
    if (token === null || token === undefined) {
        res.status(201).send({
            success: false,
            message: 'Token is empty or invalid'
        });
        return console.log('token empty');
    }
    const url =
        'https://www.google.com/recaptcha/api/siteverify?secret=' +
        secretKey +
        '&response=' +
        token +
        '&remoteip=' +
        req.connection.remoteAddress;
    request(url, function (err, response, body) {
        body = JSON.parse(body);
        //check if the validation failed
        if (body.success !== undefined && !body.success) {
            res.send({ success: false, message: 'recaptcha failed' });
            return console.log('failed');
        }
        //if passed response success message to client
        res.send({ success: true, message: 'recaptcha passed' });
    });
};

module.exports.totalVisit = (req, res) => {
    VisitSession.count((err, count) => {
        if (err) {
            return Response.DbError(res, err);
        } else {
            return Response.OK(res, count);
        }
    });
};

module.exports.startSession = (req, res) => {
    let visitSession = new VisitSession();
    visitSession.save((err, data) => {
        if (err) {
            return Response.DbError(res, err);
        } else {
            return Response.OK(res, { _id: data._id });
        }
    });
};
module.exports.endSession = async (req, res) => {
    try {
        let visitSession = await VisitSession.update(
            { _id: ObjectId(req.params._id) },
            { $set: { isActive: false } }
        );
        return Response.OK(res, visitSession);
    } catch (e) {
        return Response.DbError(res, e);
    }
};

function checkPassword(str) {
    var re = /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
    return re.test(str);
}

function setPasswordHistory(user, passwordHash) {
    if (
        Array.isArray(user.passwordHistory) &&
        user.passwordHistory.length < 3
    ) {
        user.passwordHistory.push(passwordHash);
    } else {
        user.passwordHistory.shift();
        user.passwordHistory.push(passwordHash);
    }
    return user.passwordHistory;
}


async function sleep(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
}