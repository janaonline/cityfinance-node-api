const User = require('../models/User');
const UlbFinancialData = require('../models/UlbFinancialData');
const Email = require('./email');
const emailVericationLink = require('./email-verification-link');
const ObjectId = require('mongoose').Types.ObjectId;
const userSignup = (userName,name, link) => {
    return {
        subject: `Registration Successful for City Finance`,
        body: `Dear ${name},<br>
                    <p>Welcome to City Finance Portal!</p> 
                    <br>
                    <p>
                        Your account has been successfully created. Please follow this link to activate your account- <a href="${link}" target="_blank">link</a>.<br>
                        Your Username is ${userName}
                    </p>
                    <br>
                    <p>    
                        After activation, please visit <a href="http://www.cityfinance.in" target="_blank">http://www.cityfinance.in</a> to login using your registered email id.
                    </p>
                    <br>
                    <br>Regards,<br>
                    City Finance Team`
    };
};
const userCreation = (userName,name, link) => {
    return {
        subject: `Registration Successful for City Finance`,
        body: `Dear ${name},<br>
                    <p>Welcome to City Finance Portal!</p> 
                    <br>
                    <p>
                        Your account has been successfully created. Please follow this link to set your password - <a href="${link}" target="_blank">link</a>.<br>
                        Your Username is ${userName}

                    </p>
                    <br>
                    <p>
                        After setting up your password, please visit <a href="http://www.cityfinance.in" target="_blank">http://www.cityfinance.in</a> to login using your registered email id.
                    </p>
                    <br>
                    <br>Regards,<br>
                    City Finance Team`
    };
};
const userForgotPassword = (name, link) => {
    return {
        subject: `City Finance Account Password Reset`,
        body: `Dear ${name},<br>
                        <p>Please use the following link to reset your password - <a href="${link}" target="_blank">link</a></p> 
                        <br>
                        <p>
                            After resetting your password, please visit <a href="http://www.cityfinance.in" target="_blank">http://www.cityfinance.in</a> to login using your registered email id.
                        </p>
                        <br>
                        <br>Regards,<br>
                        City Finance Team`
    };
};
const userProfileEdit = (name) => {
    return {
        subject: `Profile Update Successful for City Finance`,
        body: `Dear ${name},<br>
                    <br>
                    <p>
                        Your account has been successfully updated. <br>
                        Please visit <a href="http://www.cityfinance.in" target="_blank">http://www.cityfinance.in</a> to login using your registered email id.
                    </p>
                    <br>
                <br>Regards,<br>
                City Finance Team`
    };
};
const userProfileRequestAction = (name, status,actionTakenBy) => {
    let str = status=="REJECTED" ? `Your profile update request has been ${status.toLowerCase()} by ${actionTakenBy.toLowerCase()}`: `
Your profile update request has been successfully cancelled`;
    return {
        subject: `${status}: Profile Update Request for City Finance`,
        body: `Dear ${name},<br>
                        <br>
                        <p>
                            ${str} <br>
                            Please visit <a href="http://www.cityfinance.in" target="_blank">http://www.cityfinance.in</a> to login using your registered email id.
                        </p>
                        <br>
                    <br>Regards,<br>
                    City Finance Team`
    };
};
const userEmailEdit = (name, link) => {
    return {
        subject: `Profile Update Successful for City Finance`,
        body: `Dear ${name},<br>
                <br>
                <p>    
                    Your email id has been successfully updated. Please follow this link to set your password - <a href="${link}" target="_blank">link</a>. <br>
                    After setting up your password, please visit <a href="http://www.cityfinance.in" target="_blank">http://www.cityfinance.in</a> to login using your registered email id.
                </p>
                <br>
            <br>Regards,<br>
            City Finance Team`
    };
};
const ulbSignup = (name, type, stateName) => {
    if (type == 'ULB') {
        return {
            subject: `Signup Request Successfully Submitted`,
            body: `Dear ${name},<br>
                        <p>
                            Your signup request has been successfully submitted. You will receive a confirmation for signup on admin approval.
                        </p>
                        <br>
                    <br>Regards,<br>
                    City Finance Team`
        };
    } else {
        return {
            subject: `Signup Request - ${name}`,
            body: `Dear ${stateName},<br>
                        <p>
                           A signup request has been submitted by ${name}. Kindly review the same.
                        </p>
                        <br>
                    <br>Regards,<br>
                    City Finance Team`
        };
    }
};

const ulbProfileEdit = (name, stateName) => {
    return {
        subject: `Profile Update Request - ${name}`,
        body: `Dear ${stateName},<br>
                    <p>
                        A profile edit request has been submitted by ${name}. Kindly review the same.
                    </p>
                    <br>
                <br>Regards,<br>
                City Finance Team`
    };
};

const ulbBulkUpload = (name, partner) => {
    return {
        subject: `Data Upload Request - ${name}`,
        body: `Dear ${partner},<br>
                    <p>
                        A data upload form has been submitted by ${name}. Kindly review the same.
                    </p>
                    <br>
                <br>Regards,<br>
                City Finance Team`
    };
};

const sendAccountReActivationEmail = (user, link) => {
    return {
        subject: `Account Activation Link for City Finance`,
        body: `Dear  ${user.name},<br>
                    <p>Please follow this link to activate your account ${
                        user.role !== 'USER' ? 'and set your password' : ''
                    }  - <a href="${link}">Link</a>.</p> 
                    <br>
                    <p> After setting your password, please visit <a href="http://www.cityfinance.in ">http://www.cityfinance.in </a> to login using your registered email id.</p>
                    
                    <br>Regards,<br>
                    City Finance Team`
    };
};

const ulbSignupAccountant = (name) => {
    return {
        subject: `Signup Request Successfully Submitted`,
        body: `Dear ${name},<br>
                        <p>
                            Your signup request has been successfully submitted. You will receive a confirmation for signup on admin approval.
                        </p>
                        <br>
                    <br>Regards,<br>
                    City Finance Team`
    };
};

/*
const ulbSignupApproval = (name, link, edit = false) => {
    return {
        subject: `Signup Request Successfully Approved`,
        body: `Dear ${name},<br>
                        <p>
                            Your signup request has been successfully ${
                                edit ? 'updated' : 'approved'
                            }. Please follow this link to set your password - <a href="${link}" target="_blank">link</a>.
                        </p>
                        <br>
                        <p>
                            After setting your password, please visit <a href="http://www.cityfinance.in" target="_blank">http://www.cityfinance.in</a> to login using your registered email id.
                        </p>
                        <br>
                    <br>Regards,<br>
                    City Finance Team`
    };
};
*/

const ulbSignupApproval = (sbCode,censusCode,name, link, edit = false) => {

    let code = sbCode ? sbCode : censusCode;
    return {
        subject: `Signup Successfully`,
        body: `Dear ${name},<br>
                        <p>
                            Welcome to City Finance Portal! <br>
                            Your account has been successfully created. Please follow this link to set your password - <a href="${link}" target="_blank">link</a>.<br>
                            Your Username is ${sbCode} or ${censusCode}

                        </p>
                        <p>
                            After setting your password, please visit <a href="http://www.cityfinance.in" target="_blank">http://www.cityfinance.in</a> to login using your registered email id.
                        </p>
                        <br>
                    <br>Regards,<br>
                    City Finance Team`
    };
};
const ulbSignupRejection = (name, reason) => {
    return {
        subject: `Signup Request Rejected`,
        body: `Dear ${name},<br>
                        <p>
                            Your signup request has been rejected because of the following reason.
                        </p>
                        <br>
                        <p>
                            Rejection Reason - ${reason}
                        </p>
                        <br>
                        <p>    
                            Please fill the signup form again to register for City Finance Portal.
                        </p>
                   <br>Regards,<br>
                    City Finance Team`
    };
};
const fdUploadUlb = (name) => {
    return {
        subject: `XV FC Form Successfully Submitted`,
        body: `Dear ${name},<br xmlns="http://www.w3.org/1999/html">
                        <p>
                            Your XV FC form has been successfully submitted.<br>
                        </p>
                        <p>
                            You will receive a confirmation on approval from State and MoHUA.
                        </p>
                        <br>
                    <br>Regards,<br>
                    City Finance Team`
    };
};

/*
const fdUploadUlb = (name, refCode, fy, audited) => {
    return {
        subject: `Data Upload Form Successfully Submitted`,
        body: `Dear ${name},<br xmlns="http://www.w3.org/1999/html">
                        <p>
                            Your data upload form has been successfully submitted with the following details.
                        </p>
                        <br>
                        <p>
                            
                            Reference Number - ${refCode} <br>
                            Year - ${fy} <br>
                            Audit Status - ${
                                audited ? 'Audited' : 'Unaudited'
                            }<br>
                        </p>
                        <br>
                        <p>
                            You will receive a confirmation for data upload on admin approval.
                        </p>
                        <br>
                    <br>Regards,<br>
                    City Finance Team`
    };
};
*/

const fdUploadPartner = (partner,ulb,refCode, fy, audited) => {
    return {
        subject: `Data Upload Request ${ulb}`,
        body: `Dear ${partner},<br xmlns="http://www.w3.org/1999/html">
                        <p>
                            The data for the ${ulb} has been successfully submitted with the following details.
                        </p>
                        <br>
                        <p>
                            Reference Number - ${refCode} <br>
                            Year - ${fy} <br>
                            Audit Status - ${
                                audited ? 'Audited' : 'Unaudited'
                            }<br>
                        </p>
                        <br>
                        <p>
                            Kindly review the same.
                        </p>
                        <br>
                    <br>Regards,<br>
                    City Finance Team`
    };
};

const fdUploadState = (name, ulbName, refCode, fy, audited) => {
    return {
        subject: `XV FC Form Successfully Submitted - ${ulbName}`,
        body: `Dear ${name},<br>
                        <p>
                            The XV FC form data for the ${ulbName} has been successfully submitted.
                            Kindly review the same.                        
                        </p>
                        <br>                
                    <br>Regards,<br>
                    City Finance Team`
    };
};

/*
const fdUploadState = (name, ulbName, refCode, fy, audited) => {
    return {
        subject: `Data Upload Form Successfully Submitted - ${ulbName}`,
        body: `Dear ${name},<br>
                        <p>
                            The data for the ${ulbName} has been successfully submitted with the following details.
                        </p>
                        <br>
                        <p>
                            Reference Number - ${refCode}<br>
                            Year - ${fy}<br>
                            Audit Status - ${
                                audited ? 'Audited' : 'Unaudited'
                            }<br>
                        </p>
                        <br>
                        <p>    
                            You will receive a confirmation for data upload on admin approval.
                        </p>
                        <br>
                    <br>Regards,<br>
                    City Finance Team`
    };
};
*/
const fdUploadApprovalUlb = (name, refCode, fy, audited) => {
    return {
        subject: `Data Upload Form Successfully Approved`,
        body: `Dear ${name},<br>
                        <p>
                            Your data upload form has been approved by admin and data has been successfully uploaded on the City Finance Portal with the following details.
                        </p>
                        <br>
                        <p>
                            Reference Number - ${refCode}<br>
                            Year - ${fy}<br>
                            Audit Status - ${
                                audited ? 'Audited' : 'Unaudited'
                            }<br>
                        </p>
                        <br>
                    <br>Regards,<br>
                    City Finance Team`
    };
};
const fdUploadApprovalState = (name, ulbName, refCode, fy, audited) => {
    return {
        subject: `Data Upload Form Successfully Approved - ${ulbName}`,
        body: `Dear ${name},<br>
                        <p>
                            The data upload form for the ${ulbName} has been approved by admin and data has been successfully uploaded on the City Finance Portal with the following details.
                        </p>
                        <br>
                        <p>
                            Reference Number - ${refCode}<br>
                            Year - ${fy} <br>
                            Audit Status - ${
                                audited ? 'Audited' : 'Unaudited'
                            }<br>
                        </p>
                        <br>
                    <br>Regards,<br>
                    City Finance Team`
    };
};

const xvUploadApprovalMoHUA = (name) => {
    return {
        subject: `XV FC Form Successfully Approved by MoHUA`,
        body: `Dear ${name},<br>
                <p>
                    Your XV FC form has been approved by MoHUA.
                </p>
                <br>
                <br>Regards,<br>
                City Finance Team`
    };
};

const xvUploadApprovalByMoHUAtoState = (ulbName,stateName) => {
    return {
        subject: `XV FC Form Successfully Approved by MoHUA- ${ulbName}`,
        body: `Dear ${stateName},<br>
                <p>
                    The XV FC form for the ${ulbName} has been approved by MoHUA.
                </p>
                <br>
                <br>Regards,<br>
                City Finance Team`
    };
};

const xvUploadApprovalState = (mohuaName,ulbName,stateName) => {
    return {
        subject: `XV FC Form Successfully Submitted- ${ulbName}`,
        body: `Dear ${mohuaName},<br>
                <p>
                    The XV FC form data for the ${ulbName} of ${stateName} has been successfully submitted and approved by State.
                    Kindly review the same.
                </p>
                <br>
                <br>Regards,<br>
                City Finance Team`
    };
};

const xvUploadRejectUlb = (ulbName,rejectReason,role) => {

    return {
        subject: `XV FC Form Rejected by ${role}`,
        body: `Dear ${ulbName},<br>
                <p>
                    Your XV FC form has been rejected by ${role} with the following details.<br>
                    Rejected Data:
                    ${rejectReason}
                </p>
                <p>Please login to City Finance Portal to submit the corrected form.</p>
                <br>Regards,<br>
                City Finance Team`
    };
};

const xvUploadRejectState = (ulbName,stateName,rejectReason) => {
    return {
        subject: `XV FC Form Rejected by MoHUA-${ulbName}`,
        body: `Dear ${stateName},<br>
                <p>
                    The XV FC form for the ${ulbName} has been rejected by MoHUA with the following details.<br>
                    Rejected Data:
                    ${rejectReason}
                </p>
                <p>Please login to City Finance Portal to submit the corrected form.</p>
                <br>
                <br>Regards,<br>
                City Finance Team`
    };
};

const fdUploadRejectionUlb = (name, refCode, fy, audited, reports) => {
    return {
        subject: `Data Upload Form Rejected`,
        body: `Dear ${name},<br>
                        <p>
                            Your data upload form has been rejected by the admin with the following details.
                        </p>
                        <br>
                        <p>
                            Reference Number - ${refCode}<br>
                            Year - ${fy}<br>
                            Audit Status - ${
                                audited ? 'Audited' : 'Unaudited'
                            }<br>
                            Rejected Reports:   <br>
                            ${reports}
                            <br>
                            Please login to City Finance Portal to submit the corrected form.
                        </p>
                        <br>
                    <br>Regards,<br>
                    City Finance Team`
    };
};
const fdUploadRejectionState = (
    name,
    ulbName,
    refCode,
    fy,
    audited,
    reports
) => {
    return {
        subject: `Data Upload Form Rejected - ${ulbName}`,
        body: `Dear ${name},<br>
                        <p>
                            The data upload form for the ${ulbName} has been rejected by the admin with the following details.
                        </p>
                        <br>
                        <p>
                            Reference Number - ${refCode}<br>
                            Year - ${fy}<br>
                            Audit Status - ${
                                audited ? 'Audited' : 'Unaudited'
                            }<br>
                            Rejected Reports:   <br>
                            ${reports}
                        </p>
                        <br>
                    <br>Regards,<br>
                    City Finance Team`
    };
};

const stateFormSubmission = (name, stateName, type) => {
    if (type == 'STATE') {
        return {
            subject: `Property Tax and User Charges Form Successfully Submitted`,
            body: `Dear ${name},<br>
                    <p>
                        Your Property Tax and User Charges Form has been successfully submitted. You can view your response <br>
                        by logging in to http://www.cityfinance.in.
                    </p>
                    <br>
                <br>Regards,<br>
                City Finance Team`
        };
    } else {
        return {
            subject: `Property Tax and User Charges Form Successfully Submitted - ${stateName}`,
            body: `Dear ${name},<br>
                    <p>
                        The Property Tax and User Charges Form for ${stateName} has been successfully submitted. You can view <br>
                        your response by logging in to http://www.cityfinance.in.
                    </p>
                    <br>
                <br>Regards,<br>
                City Finance Team`
        };
    }
};

const sendFinancialDataStatusEmail = (_id, type = 'UPLOAD') => {
    return new Promise(async (resolve, reject) => {
        let query = [
            { $match: { _id: ObjectId(_id) } },
            {
                $lookup: {
                    from: 'ulbs',
                    localField: 'ulb',
                    foreignField: '_id',
                    as: 'ulb'
                }
            },
            { $unwind: '$ulb' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'ulb._id',
                    foreignField: 'ulb',
                    as: 'ulbUser'
                }
            },
            { $unwind: '$ulbUser' },
            {$match:{"ulbUser.isDeleted":false,"ulbUser.role":"ULB"}},
            {
                $lookup: {
                    from: 'users',
                    let: { state: '$ulb.state' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$role', 'STATE'] },
                                        { $eq: ['$state', '$$state'] },
                                        { $eq: ['$isDeleted', false] }
                                    ]
                                }
                            }
                        },
                        {
                            $project: {
                                name: 1,
                                email: 1,
                                departmentEmail: 1
                            }
                        }
                    ],
                    as: 'stateUser'
                }
            },
            {
                $project: {
                    status: 1,
                    referenceCode: 1,
                    audited: 1,
                    financialYear: 1,
                    reports: [
                        {
                            name: 'Balance Sheet',
                            message: '$balanceSheet.message'
                        },
                        {
                            name: 'Schedules To Balance Sheet',
                            message: '$schedulesToBalanceSheet.message'
                        },
                        {
                            name: 'Income And Expenditure',
                            message: '$incomeAndExpenditure.message'
                        },
                        {
                            name: 'Schedules To Income And Expenditure',
                            message: '$schedulesToIncomeAndExpenditure.message'
                        },
                        {
                            name: 'Trial Balance',
                            message: '$trialBalance.message'
                        },
                        {
                            name: 'Audit Report',
                            message: '$auditReport.message'
                        }
                    ],
                    //ulbUser: { $arrayElemAt: ['$ulbUser', 0] },
                    ulbUser:1,
                    //stateUser: { $arrayElemAt: ['$stateUser', 0] }
                    stateUser:1  
                }
            },
            {
                $project: {
                    status: 1,
                    referenceCode: 1,
                    audited: 1,
                    financialYear: 1,
                    reports: 1,
                    ulbUser: {
                        name: '$ulbUser.name',
                        commissionerName: '$ulbUser.commissionerName',
                        commissionerEmail: '$ulbUser.commissionerEmail',
                        accountantName: '$ulbUser.accountantName',
                        accountantEmail: '$ulbUser.accountantEmail'
                    },
                    // stateUser: {
                    //     name: '$stateUser.name',
                    //     email: '$stateUser.email',
                    //     departmentEmail: '$stateUser.departmentEmail'
                    // }
                    stateUser:1
                }
            }
        ];

        try {
            let ufd = await UlbFinancialData.aggregate(query).exec();
            let data = ufd && ufd.length ? ufd[0] : null;
            let ulbEmails = [];
            data.ulbUser.commissionerEmail
                ? ulbEmails.push(data.ulbUser.commissionerEmail)
                : '';
            data.ulbUser.accountantEmail
                ? ulbEmails.push(data.ulbUser.accountantEmail)
                : '';
            let stateEmails = [];
            //data.stateUser.email ? stateEmails.push(data.stateUser.email) : '';
            //data.stateUser.departmentEmail ? stateEmails.push(data.stateUser.departmentEmail): '';

            let mailOptionUlb = {
                to: ulbEmails.join(),
                subject: '',
                html: ''
            };
            let mailOptionState = {
                to: '',
                subject: '',
                html: ''
            };


            if (data && (type == 'UPLOAD' || type == 'ACTION')) {
                if (type == 'UPLOAD') {
                    let templateUlb = fdUploadUlb(
                        data.ulbUser.name,
                        data.referenceCode,
                        data.financialYear,
                        data.audited
                    );
                    mailOptionUlb.subject = templateUlb.subject;
                    mailOptionUlb.html = templateUlb.body;
                    Email(mailOptionUlb);
                    /*    
                    let partner = await User.find({
                        isActive: true,
                        role: 'PARTNER',
                        isDeleted : false
                    }).exec();

                    if (partner.length >0) {
                        for (p of partner) {
                            await sleep(1000);     
                            let template = fdUploadPartner(
                                p.name,
                                data.ulbUser.name,
                                data.referenceCode,
                                data.financialYear,
                                data.audited
                            );    

                            let mailOptions = {
                                to: p.email,
                                subject: template.subject,
                                html: template.body
                            };
                            Email(mailOptions);
                        }
                    }
                    */

                    for(let d of data.stateUser){
                        //data.stateUser.email ? stateEmails.push(data.stateUser.email) : '';
                        //data.stateUser.departmentEmail ? stateEmails.push(data.stateUser.departmentEmail): '';
                        d.email ? stateEmails.push(d.email) : '';
                        d.departmentEmail ? stateEmails.push(d.departmentEmail): '';

                        let templateState = fdUploadState(
                            d.name,
                            data.ulbUser.name,
                            data.referenceCode,
                            data.financialYear,
                            data.audited
                        );

                        mailOptionState.to = stateEmails.join();
                        mailOptionState.subject = templateState.subject;
                        mailOptionState.html = templateState.body;
                        Email(mailOptionState);
                    }
                } else if (type == 'ACTION') {
                    if (data.status == 'APPROVED') {
                        let templateUlb = fdUploadApprovalUlb(
                            data.ulbUser.name,
                            data.referenceCode,
                            data.financialYear,
                            data.audited
                        );
                        mailOptionUlb.subject = templateUlb.subject;
                        mailOptionUlb.html = templateUlb.body;
                        Email(mailOptionUlb);

                        for(let d of data.stateUser){

                            d.email ? stateEmails.push(d.email) : '';
                            d.departmentEmail ? stateEmails.push(d.departmentEmail): '';

                            let templateState = fdUploadApprovalState(
                                d.name,
                                data.ulbUser.name,
                                data.referenceCode,
                                data.financialYear,
                                data.audited
                            );
                            mailOptionState.to = stateEmails.join();
                            mailOptionState.subject = templateState.subject;
                            mailOptionState.html = templateState.body;
                            Email(mailOptionState);
                        }
                    } else if (data.status == 'REJECTED') {
                        let reportsStr = ``;
                        for (let m of data.reports) {
                            if (m.message) {
                                reportsStr += `${m.name} : ${m.message} <br>`;
                            }
                        }
                        // data.reports.map(m=>{ return m.message ? `${m.name} : ${m.message} <br>` : '' });
                        let templateUlb = fdUploadRejectionUlb(
                            data.ulbUser.name,
                            data.referenceCode,
                            data.financialYear,
                            data.audited,
                            reportsStr
                        );
                        mailOptionUlb.subject = templateUlb.subject;
                        mailOptionUlb.html = templateUlb.body;
                        Email(mailOptionUlb);

                        for(let d of data.stateUser){
                            d.email ? stateEmails.push(d.email) : '';
                            d.departmentEmail ? stateEmails.push(d.departmentEmail): '';
                            let templateState = fdUploadRejectionState(
                                d.name,
                                data.ulbUser.name,
                                data.referenceCode,
                                data.financialYear,
                                data.audited,
                                reportsStr
                            );
                            mailOptionState.to = stateEmails.join();
                            mailOptionState.subject = templateState.subject;
                            mailOptionState.html = templateState.body;
                            Email(mailOptionState);
                        }

                    }
                }
                //Email(mailOptionUlb);
                //Email(mailOptionState);
                resolve('send');
            } else {
                reject(`Record not found.`);
            }
        } catch (e) {
            console.log('Exception', e);
            reject(e);
        }
    });
};
const sendUlbSignupStatusEmmail = (_id, link, edit = false) => {
    return new Promise(async (resolve, reject) => {
        try {
            let query = [
                { $match: { _id: ObjectId(_id) } },
                {
                    $lookup: {
                        from: 'ulbs',
                        localField: 'ulb',
                        foreignField: '_id',
                        as: 'ulb'
                    }
                },
                { $unwind: '$ulb' },
                {
                    $lookup: {
                        from: 'users',
                        let: { state: '$ulb.state' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ['$role', 'STATE'] },
                                            { $eq: ['$state', '$$state'] },
                                            { $eq: ['$isDeleted', false] }
                                        ]
                                    }
                                }
                            },
                            {
                                $project: {
                                    name: 1,
                                    email: 1,
                                    departmentEmail: 1
                                }
                            }
                        ],
                        as: 'stateUser'
                    }
                },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        email: 1,
                        sbCode:"$ulb.sbCode",
                        censusCode:"$ulb.censusCode",
                        status: 1,
                        rejectReason: 1,
                        commissionerName: 1,
                        commissionerEmail: 1,
                        accountantName: 1,
                        accountantEmail: 1,
                        stateUser: { $arrayElemAt: ['$stateUser', 0] }
                    }
                },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        sbCode:1,
                        censusCode:1,
                        email: 1,
                        status: 1,
                        rejectReason: 1,
                        commissionerName: 1,
                        commissionerEmail: 1,
                        accountantName: 1,
                        accountantEmail: 1,
                        stateUser: {
                            name: '$stateUser.name',
                            email: '$stateUser.email',
                            departmentEmail: '$stateUser.departmentEmail'
                        }
                    }
                }
            ];
            let user = await User.aggregate(query).exec();
            let data = user && user.length ? user[0] : null;
            if (data) {
                let mailOptionUlb = {
                    to: data.commissionerEmail,
                    subject: '',
                    html: ''
                };
                if (data.status == 'APPROVED') {
                    let templateUlb = ulbSignupApproval(data.sbCode,data.censusCode,data.name, link, edit);
                    mailOptionUlb.subject = templateUlb.subject;
                    mailOptionUlb.html = templateUlb.body;
                } 
                /*else if (data.status == 'REJECTED') {
                    let templateUlb = ulbSignupRejection(
                        data.name,
                        data.rejectReason
                    );
                    mailOptionUlb.subject = templateUlb.subject;
                    mailOptionUlb.html = templateUlb.body;
                }*/
                Email(mailOptionUlb);
                resolve('email sent.');
            } else {
                reject('user not found.');
            }
        } catch (e) {
            reject(e);
        }
    });
};
const sendProfileUpdateStatusEmail = (userOldInfo, currentUrl) => {
    return new Promise(async (resolve, reject) => {
        try {
            let emails = [];
            let userInfo = await User.findOne({ _id: userOldInfo._id }).exec();
            if (userOldInfo.email && userOldInfo.email != userInfo.email) {
                let up = await User.update({ _id: userOldInfo._id },{$set:{isEmailVerified:false}})
                let link = await emailVericationLink(userInfo._id, currentUrl,true);
                let template = userEmailEdit(userInfo.name, link);
                let mailOptions = {
                    to: userInfo.email,
                    subject: template.subject,
                    html: template.body
                };
                Email(mailOptions);
            } else {
                emails.push(userInfo.email);
            }
            /*
               if((userOldInfo.accountantEmail && userOldInfo.accountantEmail != userInfo.accountantEmail) || (userInfo.accountantEmail && !userOldInfo.accountantEmail)){
                   emails.push(userInfo.accountantEmail);
               }else if((userOldInfo.departmentEmail && userOldInfo.departmentEmail != userInfo.departmentEmail)||(userInfo.departmentEmail && userOldInfo.departmentEmail)){
                   emails.push(userInfo.departmentEmail);
               }
               */
            if (emails.length) {
                let template = userProfileEdit(userInfo.name);
                let mailOptions = {
                    to: emails.join(),
                    subject: template.subject,
                    html: template.body
                };
                Email(mailOptions);
            }
            resolve('done');
        } catch (e) {
            reject(e);
        }
    });
};

async function sleep(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
}
module.exports = {
    sendFinancialDataStatusEmail: sendFinancialDataStatusEmail,
    sendUlbSignupStatusEmmail: sendUlbSignupStatusEmmail,
    sendProfileUpdateStatusEmail: sendProfileUpdateStatusEmail,
    xvUploadApprovalMoHUA:xvUploadApprovalMoHUA,
    xvUploadApprovalByMoHUAtoState :xvUploadApprovalByMoHUAtoState,
    xvUploadApprovalState:xvUploadApprovalState,
    xvUploadRejectUlb:xvUploadRejectUlb, 
    xvUploadRejectState:xvUploadRejectState,
    userSignup: userSignup,
    userCreation: userCreation,
    userForgotPassword: userForgotPassword,
    userProfileEdit: userProfileEdit,
    userProfileRequestAction: userProfileRequestAction,
    userEmailEdit: userEmailEdit,
    ulbSignup: ulbSignup,
    ulbSignupAccountant: ulbSignupAccountant,
    ulbSignupApproval: ulbSignupApproval,
    ulbSignupRejection: ulbSignupRejection,
    fdUploadUlb: fdUploadUlb,
    fdUploadState: fdUploadState,
    fdUploadApprovalUlb: fdUploadApprovalUlb,
    fdUploadApprovalState: fdUploadApprovalState,
    fdUploadRejectionUlb: fdUploadRejectionUlb,
    fdUploadRejectionState: fdUploadRejectionState,
    ulbBulkUpload: ulbBulkUpload,
    ulbProfileEdit: ulbProfileEdit,
    stateFormSubmission,
    sendAccountReActivationEmail
};
