const User = require('../models/User');
const UlbFinancialData = require('../models/UlbFinancialData');
const Email = require("./email");
const emailVericationLink = require('./email-verification-link')
const ObjectId = require('mongoose').Types.ObjectId;
    const userSignup = (name, link)=>{
            return {
                subject:`Registration Successful for City Finance`,
                body:`Dear ${name},<br>
                    <p>Welcome to City Finance Portal!</p> 
                    <p>
                        Your account has been successfully created. Please follow this link to activate your account- <a href="${link}" target="_blank">link</a>.
                    </p>
                    <p>    
                        After activation, please visit <a href="http://www.cityfinance.in" target="_blank">http://www.cityfinance.in</a> to login using your registered email id.
                    </p>
                    <br>Regards,<br>
                    City Finance Team`
            }
    }
    const userCreation = (name, link)=>{
        return {
            subject:`Registration Successful for City Finance`,
            body:`Dear ${name},<br>
                    <p>Welcome to City Finance Portal!</p> 
                    <p>
                        Your account has been successfully created. Please follow this link to set your password - <a href="${link}" target="_blank">link</a>.
                    </p>
                    <p>
                        After setting up your password, please visit <a href="http://www.cityfinance.in" target="_blank">http://www.cityfinance.in</a> to login using your registered email id.
                    </p>
                    <br>Regards,<br>
                    City Finance Team`
        }
    }
    const userForgotPassword = (name, link)=>{
            return {
                subject:`City Finance Account Password Reset`,
                body:`Dear ${name},<br>
                        <p>Please use the following link to reset your password - <a href="${link}" target="_blank">link</a></p> 
                        <p>
                            After resetting your password, please visit <a href="http://www.cityfinance.in" target="_blank">http://www.cityfinance.in</a> to login using your registered email id.
                        </p>
                        <br>Regards,<br>
                        City Finance Team`
            }
            }
    const userProfileEdit = (name)=>{
        return {
            subject:`Profile Update Successful for City Finance`,
            body:`Dear ${name},<br>
                    <br>
                        Your account has been successfully updated. <br>
                        Please visit <a href="http://www.cityfinance.in" target="_blank">http://www.cityfinance.in</a> to login using your registered email id.
                    </p>
                <br>Regards,<br>
                City Finance Team`
        }
    }
    const userEmailEdit = (name,link)=>{
        return {
            subject:`Profile Update Successful for City Finance`,
            body:`Dear ${name},<br>
                <br>
                    Your email id has been successfully updated. Please follow this link to set your password - <a href="${link}" target="_blank">link</a>. <br>
                    After setting up your password, please visit <a href="http://www.cityfinance.in" target="_blank">http://www.cityfinance.in</a> to login using your registered email id.
                </p>
            <br>Regards,<br>
            City Finance Team`
        }
    }
    const ulbSignup = (name)=>{
            return {
                subject:`Signup Request Successfully Submitted`,
                body:`Dear ${name},<br>
                        <p>
                            Your signup request has been successfully submitted. You will receive a confirmation for signup on admin approval.
                        </p>
                    <br>Regards,<br>
                    City Finance Team`
            }
        }
    const ulbSignupAccountant = (name)=>{
            return {
                subject:`Signup Request Successfully Submitted`,
                body:`Dear ${name},<br>
                        <p>
                            Your signup request has been successfully submitted. You will receive a confirmation for signup on admin approval.
                        </p>
                    <br>Regards,<br>
                    City Finance Team`
            }
        }
    const ulbSignupApproval = (name, link, edit=false)=>{
            return {
                subject:`Signup Request Successfully Approved`,
                body:`Dear ${name},<br>
                        <p>
                            Your signup request has been successfully ${edit?"updated":"approved"}. Please follow this link to set your password - <a href="${link}" target="_blank">link</a>.
                        </p>
                        <p>
                            After setting your password, please visit <a href="http://www.cityfinance.in" target="_blank">http://www.cityfinance.in</a> to login using your registered email id.
                        </p>
                    <br>Regards,<br>
                    City Finance Team`
            }
        }
    const ulbSignupRejection = (name,reason)=>{
            return {
                subject:`Signup Request Rejected`,
                body:`Dear ${name},<br>
                        <p>
                            Your signup request has been rejected because of the following reason.
                        </p>
                        <p>
                            Rejection Reason - ${reason}
                        </p>
                        <p>    
                            Please fill the signup form again to register for City Finance Portal.
                        </p>
                   <br>Regards,<br>
                    City Finance Team`
            }
        }
    const fdUploadUlb = (name,refCode,fy,audited)=>{
            return {
                subject:`Data Upload Form Successfully Submitted`,
                body:`Dear ${name},<br xmlns="http://www.w3.org/1999/html">
                        <p>
                            Your data upload form has been successfully submitted with the following details.
                        </p>
                        <p>
                            
                            Reference Number - ${refCode} </br>
                            Year - ${fy}</br>
                            Audit Status - ${audited ? "Audited" : "Unaudited"}</br>
                        </p>
                        <p>
                           
                            You will receive a confirmation for data upload on admin approval.
                        </p>
                    <br>Regards,<br>
                    City Finance Team`
            }
        }
    const fdUploadState = (name,ulbName,refCode,fy,audited)=>{
            return {
                subject:`Data Upload Form Successfully Submitted - ${ulbName}`,
                body:`Dear ${name},<br>
                        <p>
                            The data for the ${ulbName} has been successfully submitted with the following details.
                        </p>
                        <p>
                            Reference Number - ${refCode}</br>
                            Year - ${fy}</br>
                            Audit Status - ${audited ? "Audited" : "Unaudited"}</br>
                        </p>
                        <p>    
                            You will receive a confirmation for data upload on admin approval.
                        </p>
                    <br>Regards,<br>
                    City Finance Team`
            }
        }
    const fdUploadApprovalUlb = (name,refCode,fy,audited)=>{
            return {
                subject:`Data Upload Form Successfully Approved`,
                body:`Dear ${name},<br>
                        <p>
                            Your data upload form has been approved by admin and data has been successfully uploaded on the City Finance Portal with the following details.
                        </p>
                        <p>
                            Reference Number - ${refCode}</br>
                            Year - ${fy}</br>
                            Audit Status - ${audited ? "Audited" : "Unaudited"}</br>
                        </p>
                    <br>Regards,<br>
                    City Finance Team`
            }
        }
    const fdUploadApprovalState = (name,ulbName,refCode,fy,audited)=>{
            return {
                subject:`Data Upload Form Successfully Approved - ${ulbName}`,
                body:`Dear ${name},<br>
                        <p>
                            The data upload form for the ${ulbName} has been approved by admin and data has been successfully uploaded on the City Finance Portal with the following details.
                        </p>
                        <p>
                            Reference Number - ${refCode}</br>
                            Year - ${fy}</br>
                            Audit Status - ${audited ? "Audited" : "Unaudited"}</br>
                        </p>
                    <br>Regards,<br>
                    City Finance Team`
            }
        }
    const fdUploadRejectionUlb = (name,refCode,fy,audited, reports)=>{
            return {
                subject:`Data Upload Form Rejected - ${ulbName}`,
                body:`Dear ${name},<br>
                        <p>
                            The data upload form for the ${ulbName} has been rejected by the admin with the following details.
                        </p>
                        <p>
                            Reference Number - ${refCode}</br>
                            Year - ${fy}</br>
                            Audit Status - ${audited ? "Audited" : "Unaudited"}</br>
                            Rejected Reports:   </br>
                            ${reports}
                            Please login to City Finance Portal to submit the corrected form.
                        </p>
                    <br>Regards,<br>
                    City Finance Team`
            }
        }
    const fdUploadRejectionState = (name,ulbName,refCode,fy,audited,reports)=>{
            return {
                subject:`Data Upload Form Successfully Approved - ${ulbName}`,
                body:`Dear ${name},<br>
                        <p>
                            The data upload form for the ${ulbName} has been rejected by the admin with the following details.
                        </p>
                        <p>
                            Reference Number - ${refCode}</br>
                            Year - ${fy}</br>
                            Audit Status - ${audited ? "Audited" : "Unaudited"}</br>
                            Rejected Reports:   </br>
                            ${reports}
                        </p>
                    <br>Regards,<br>
                    City Finance Team`
            }
        }
    const sendFinancialDataStatusEmail = (_id, type="UPLOAD")=>{
        return new Promise(async (resolve, reject)=>{
        let query = [
            {$match:{_id:ObjectId(_id)}},
            {
                $lookup:{
                    from:"ulbs",
                    localField:"ulb",
                    foreignField:"_id",
                    as :"ulb"
                }
            },
            {$unwind:"$ulb"},
            {
                $lookup:{
                    from:"users",
                    localField:"ulb._id",
                    foreignField:"ulb",
                    as :"ulbUser"
                }
            },
            {
                $lookup:{
                    from:"users",
                    let :{state:"$ulb.state"},
                    pipeline:[
                        { $match:{ $expr:{$and:[{$eq:["$role","STATE"]},{$eq:["$state","$$state"]},{$eq:["$isDeleted",false]}]}}},
                        {
                            $project:{
                                name:1,
                                email:1,
                                departmentEmail:1
                            }
                        }
                    ],
                    as :"stateUser"
                }
            },
            {
                $project:{
                    status:1,
                    referenceCode:1,
                    audited:1,
                    financialYear:1,
                    reports:[
                        {
                            name:"Balance Sheet",
                            message:"$balanceSheet.message"
                        },
                        {
                            name:"Schedules To Balance Sheet",
                            message:"$schedulesToBalanceSheet.message"
                        },
                        {
                            name:"Income And Expenditure",
                            message:"$incomeAndExpenditure.message"
                        },
                        {
                            name:"Schedules To Income And Expenditure",
                            message:"$schedulesToIncomeAndExpenditure.message"
                        },
                        {
                            name:"Trial Balance",
                            message:"$trialBalance.message"
                        },
                        {
                            name:"Audit Report",
                            message:"$auditReport.message"
                        }
                    ],
                    ulbUser:{$arrayElemAt:["$ulbUser",0]},
                    stateUser:{$arrayElemAt:["$stateUser",0]}
                }
            },
            {
                $project:{
                    status:1,
                    referenceCode:1,
                    audited:1,
                    financialYear:1,
                    reports:1,
                    ulbUser:{
                        name:"$ulbUser.name",
                        commissionerName:"$ulbUser.commissionerName",
                        commissionerEmail:"$ulbUser.commissionerEmail",
                        accountantName:"$ulbUser.accountantName",
                        accountantEmail:"$ulbUser.accountantEmail"
                    },
                    stateUser:{
                        name:"$stateUser.name",
                        email:"$stateUser.email",
                        departmentEmail:"$stateUser.departmentEmail"
                    }
                }
            }
        ];
        try{
            let ufd = await UlbFinancialData.aggregate(query).exec();
            let data = ufd && ufd.length ? ufd[0] : null;
            let ulbEmails = [];
            data.ulbUser.commissionerEmail ? ulbEmails.push(data.ulbUser.commissionerEmail) : '';
            data.ulbUser.accountantEmail ? ulbEmails.push(data.ulbUser.accountantEmail) : '';
            let stateEmails = [];
            data.stateUser.email ? stateEmails.push(data.stateUser.email) : '';
            data.stateUser.departmentEmail ? stateEmails.push(data.stateUser.departmentEmail) : '';
            let mailOptionUlb = {
                to:ulbEmails.join(),
                subject:'',
                html:''
            }
            let mailOptionState = {
                to:stateEmails.join(),
                subject:'',
                html:''
            }
            if(data && (type == "UPLOAD" || type == "ACTION")){
                if(type == "UPLOAD"){
                    let templateUlb = fdUploadUlb(data.ulbUser.name, data.referenceCode, data.audited);
                    mailOptionUlb.subject = templateUlb.subject;
                    mailOptionUlb.html = templateUlb.body;

                    let templateState = fdUploadState(data.stateUser.name, data.ulbUser.name, data.referenceCode, data.audited);
                    mailOptionState.subject = templateState.subject;
                    mailOptionState.html = templateState.body;

                }else if(type == "ACTION"){
                    if(data.status == "APPROVED"){
                        let templateUlb = fdUploadApprovalUlb(data.ulbUser.name, data.referenceCode, data.financialYear,data.audited);
                        mailOptionUlb.subject = templateUlb.subject;
                        mailOptionUlb.html = templateUlb.body;

                        let templateState = fdUploadApprovalState(data.stateUser.name,data.ulbUser.name, data.referenceCode, data.financialYear,data.audited);
                        mailOptionState.subject = templateState.subject;
                        mailOptionState.html = templateState.body;

                    }else if(data.status == "REJECTED"){
                        let reports = ``;
                        for(let m of data.reports){
                            if(m.message){
                                reportsStr+`${m.name} : ${m.message} <br>`
                            }
                        }
                        // data.reports.map(m=>{ return m.message ? `${m.name} : ${m.message} <br>` : '' });
                        let templateUlb = fdUploadRejectionUlb(data.ulbUser.name, data.referenceCode, data.financialYear,data.audited,reports);
                        mailOptionUlb.subject = templateUlb.subject;
                        mailOptionUlb.html = templateUlb.body;

                        let templateState = fdUploadRejectionState(data.stateUser.name,data.ulbUser.name, data.referenceCode, data.financialYear,data.audited,reports);
                        mailOptionState.subject = templateState.subject;
                        mailOptionState.html = templateState.body;
                    }
                }
                Email(mailOptionUlb);
                Email(mailOptionState);
                resolve('send');
            }else {
                reject(`Record not found.`);
            }
        }catch (e) {
            reject(e);
        }
    });
    }
    const sendUlbSignupStatusEmmail =(_id, link, edit=false)=>{
        return new Promise(async (resolve, reject)=>{
        try{
            let query = [
                {$match:{_id:ObjectId(_id)}},
                {
                    $lookup:{
                        from:"ulbs",
                        localField:"ulb",
                        foreignField:"_id",
                        as :"ulb"
                    }
                },
                {$unwind:"$ulb"},
                {
                    $lookup:{
                        from:"users",
                        localField:"ulb.state",
                        foreignField:"state",
                        as :"stateUser"
                    }
                },
                {
                    $project:{
                        _id:1,
                        name:1,
                        email:1,
                        status:1,
                        message:1,
                        commissionerName:1,
                        commissionerEmail:1,
                        accountantName:1,
                        accountantEmail:1,
                        stateUser:{$arrayElemAt:["$stateUser",0]}
                    }
                },
                {
                    $project:{
                        _id:1,
                        name:1,
                        email:1,
                        status:1,
                        message:1,
                        commissionerName:1,
                        commissionerEmail:1,
                        accountantName:1,
                        accountantEmail:1,
                        stateUser:{
                            name:"$stateUser.name",
                            email:"$stateUser.email",
                            departmentEmail:"$stateUser.departmentEmail"
                        }
                    }
                }
            ];
            let user = await User.aggregate(query).exec();
            let data = user && user.length ? user[0] : null;
            if(data){
                let mailOptionUlb = {
                    to:data.commissionerEmail,
                    subject:'',
                    html:''
                }
                if(data.status == "APPROVED"){
                    let templateUlb = ulbSignupApproval(data.name, link, edit);
                    mailOptionUlb.subject = templateUlb.subject;
                    mailOptionUlb.html = templateUlb.body;
                }else if(data.status == "REJECTED"){
                    let templateUlb = ulbSignupRejection(data.name, data.message);
                    mailOptionUlb.subject = templateUlb.subject;
                    mailOptionUlb.html = templateUlb.body;
                }
                Email(mailOptionUlb);
                resolve('email sent.');
            }else {
                reject('user not found.');
            }
        }catch (e) {
            reject(e);
        }
    });
    }
    const sendProfileUpdateStatusEmail = (userOldInfo, currentUrl)=>{
        return new Promise(async (resolve, reject)=>{
           try {
               let userInfo = await User.findOne({_id:userOldInfo._id}).exec();
               if(userOldInfo.email && userOldInfo.email != userInfo.email){
                   let link = await emailVericationLink(userInfo._id,currentUrl);
                   let template = userEmailEdit(userInfo.name,link);
                   let mailOptions = {
                       to: userInfo.email,
                       subject: template.subject,
                       html: template.body
                   };
                   Email(mailOptions);
               }
               let otherEmail;
               if((userOldInfo.accountantEmail && userOldInfo.accountantEmail != userInfo.accountantEmail) || (userInfo.accountantEmail && !userOldInfo.accountantEmail)){
                   otherEmail = userInfo.accountantEmail;
               }else if((userOldInfo.departmentEmail && userOldInfo.departmentEmail != userInfo.departmentEmail)||(userInfo.departmentEmail && userOldInfo.departmentEmail)){
                   otherEmail = userInfo.departmentEmail;
               }
               if(otherEmail){
                   let template = userProfileEdit(userInfo.name);
                   let mailOptions = {
                       to: otherEmail,
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
    }
module.exports = {
    sendFinancialDataStatusEmail: sendFinancialDataStatusEmail,
    sendUlbSignupStatusEmmail:sendUlbSignupStatusEmmail,
    sendProfileUpdateStatusEmail:sendProfileUpdateStatusEmail,
    userSignup:userSignup,
    userCreation:userCreation,
    userForgotPassword:userForgotPassword,
    userProfileEdit:userProfileEdit,
    userEmailEdit:userEmailEdit,
    ulbSignup:ulbSignup,
    ulbSignupAccountant:ulbSignupAccountant,
    ulbSignupApproval:ulbSignupApproval,
    ulbSignupRejection:ulbSignupRejection,
    fdUploadUlb:fdUploadUlb,
    fdUploadState:fdUploadState,
    fdUploadApprovalUlb:fdUploadApprovalUlb,
    fdUploadApprovalState:fdUploadApprovalState,
    fdUploadRejectionUlb:fdUploadRejectionUlb,
    fdUploadRejectionState:fdUploadRejectionState
}