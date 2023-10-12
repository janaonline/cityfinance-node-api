
const User = require('../../../models/User');
const Service = require('../../../service');
const ObjectId = require('mongoose').Types.ObjectId;



module.exports.getUSer = (reqBody) => {
    return new Promise(async (resolve, reject) => {
        let cond = {}
        let msg = `Invalid ULB Code/Census Code or password`;
        let emailFlag = false;
        let query = [
            { censusCode: (reqBody.email) },
            { sbCode: (reqBody.email) },
        ];
        if (reqBody.email.includes('@')) {
            emailFlag = true;
            msg = `Invalid email or password`;
            query = [{ email: (reqBody.email) }];
        }
        cond = { $or: query, isDeleted: false, isActive: true }
        if (emailFlag) {
            cond = { $or: query, isDeleted: false, role: { $ne: 'ULB' }, isActive: true }
        }

        User.findOne(cond, async (err, user) => {
            if (err) {
                reject(`Db Error`);
            } else if (!user) {
                reject(`User not found`);
            } else if (user.isDeleted) {
                reject(`User is deleted.`);
            } else if (user.status == 'PENDING') {
                reject(`Waiting for admin action on request.`);
            } else if (user.status == 'REJECTED') {
                reject(`Your request has been rejected. Reason: ${user.rejectReason}`);
            } else if (!user.isEmailVerified) {
                let url = `${process.env.HOSTNAME}/account-reactivate`;
                reject(`Email not verified yet. Please <a href='${url}'>click here</a> to send the activation link on your registered email`);
            }
            else if ((user.role != 'ADMIN' && user.role != 'USER' && user.role != 'STATE' && user.role != 'PARTNER' && user.role != 'MoHUA' && user?.role != "PMU" && user?.role != "AAINA") && emailFlag) {
                if (user.role == 'ULB' && emailFlag) {
                    reject(`Please use ULB Code/Census Code for login`)
                }
            } else {
                try {
                    if (user.isLocked) {
                        // just increment login attempts if account is already locked
                        let update = Service.incLoginAttempts(user);
                        await User.update({ _id: ObjectId(user._id) }, update).exec();
                        let up = await User.findOne({ _id: ObjectId(user._id)}).lean();
                        if (up.isLocked) {
                            reject(`Your account is temporarily locked for 1 hour`)
                        }
                    }
                    user.emailFlag = emailFlag;
                    resolve(user);
                    // check Password Expiry
                    // if (user.passwordExpires && user.passwordExpires < Date.now()) {
                    //     return Response.UnAuthorized(
                    //         res,
                    //         {},
                    //         `Please reset your password.`,
                    //         441
                    //     );
                    // }
                } catch (e) {
                    console.error('Error', e.message, e);
                    reject({ message: `Error while comparing password.` });
                }
            }
        });

    });
}