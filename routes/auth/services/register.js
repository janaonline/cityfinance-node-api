const User = require('../../../models/User');
const Service = require('../../../service');
const Response = require('../../../service').response;
const ObjectId = require('mongoose').Types.ObjectId;
const Constants = require('../../../_helper/constants')
const Ulb = require('../../../models/Ulb')
module.exports.register = async (req, res) => {
    try {
        let data = req.body;
        data.role = data.role ? data.role : Constants.USER.DEFAULT_ROLE;
        if (data.role == 'ULB') {
            data.status = 'APPROVED';
            if (
                data.accountantConatactNumber &&
                data.accountantName &&
                data.accountantEmail &&
                data.ulb
            ) {
                let user = await User.findOne({
                    ulb: ObjectId(data.ulb),
                    role: data.role,
                    isDeleted: false,
                })
                    .lean()
                    .exec();
                if (user) {
                    if (user.status == 'REJECTED') {
                        let d = User.deleteOne({
                            ulb: ObjectId(data.ulb),
                            role: data.role,
                            isDeleted: false,
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
        let inValid = await Service.checkUnique.validate(data, data.role, '');
        if (inValid && inValid.length) {
            return Response.BadRequest(res, {}, `${inValid.join('\n')}`);
        }
        newUser.save(async (err, user) => {
            if (err) {
                console.error('Err', err);
                return Response.BadRequest(
                    res,
                    err,
                    err.code == 11000
                        ? 'Email already in use.'
                        : 'Failed to register user'
                );
                //return res.json({success:false, msg: err.code == 11000 ? 'Duplicate entry.':'Failed to register user'});
            } else {
                let forgotPassword = user.role == 'USER' ? false : true;
                let link = await Service.emailVerificationLink(
                    user._id,
                    req.currentUrl,
                    forgotPassword
                );
                if (data.role == 'ULB') {
                    let ulbObj = await Ulb.findOne({
                        _id: ObjectId(user.ulb),
                    }).exec();
                    let d = {
                        modifiedAt: new Date(),
                        sbCode: ulbObj.sbCode,
                        censusCode: ulbObj.censusCode,
                    };
                    let u = await User.update(
                        { _id: ObjectId(user._id) },
                        { $set: d }
                    );
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
                    // let mailOptions = {
                    //     to: user.email,
                    //     subject: template.subject,
                    //     html: template.body,
                    // };
                    let mailOptions =     {
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
                }
                return Response.OK(res, user, `User registered`);
            }
        });
    } catch (e) {
        console.error('Exception========>', e);
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