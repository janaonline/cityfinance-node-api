const User = require("../models/User");
const UlbFinancialData = require("../models/UlbFinancialData");
const XVFCGrantULBData = require("../models/XVFcGrantForm");
const sendEmail = require("./email");
const Service = require('../service');
const emailVericationLink = require("./email-verification-link");
const ObjectId = require("mongoose").Types.ObjectId;
const {CollectionNames} = require('../util/15thFCstatus')
const StatusList = require("../util/newStatusList");
const { Not_Started } = require("../util/newStatusList");
const { MASTER_FORM_STATUS } = require("../util/FormNames");


const CfrFormRejected = (ulbName)=>{
  try{
    return {
      subject:`Correction Required: CityFinance Rankings 2022 – Form Returned`,
      body:`Dear ${ulbName} <br>
      <p>Refer – data submission for City Finance Ranking 2022. </p>
      <p>Discrepancies have been noted in the entered data vis-à-vis uploaded documents. Entries have been revised based on uploaded documents as indicated in remarks section of your form in the portal. Please use the following steps to access our suggested value and remarks and complete the resubmission for rankings:</p>

    <ol>
        <li>Data points with discrepancies have been marked as returned.</li>
        <li>Please click on the “i” button next to the entries.</li>
        <li>
            <p>This information button will have:</p>
            <ol type = "a">
                <li>Remarks for discrepancy</li>
                <li>PMU Suggested value</li>
                <li>Option to accept or reject the PMU value</li>
                <li>Please review the remarks and PMU Values.</li>
                <li>In case of agreement with PMU suggest value, please click on “Accept PMU value” and click on submit to close the discrepancy request.</li>
                <li>In case of disagreement, please click on “Reject PMU value”. It is mandatory to provide reasons for rejection in remarks section. Any supporting documents can be uploaded in the any other information field in the documents section.</li>
        </li>
        
        <li>Steps mentioned in point (3) need to be completed for each data point that has been marked as returned.</li>
        <li>Upon completion of all acceptance/rejection of discrepancy request, ULB is required to resubmit the form for PMU review.</li>
    </ol>

    <p><b>Please complete this process within the next 10 days. In the event of no response by the end of the stipulated period, entries as revised would be treated as final for ranking purposes.</b></p>

    <p>For queries contact at <a href="mailto:rankings@${process.env.PROD_HOST}">rankings@${process.env.PROD_HOST}</a>.</p>

    <p>PMU Team<br>City Finance Rankings</p>`
    };
  }
  catch(err){
    console.log("error in CfrFormRejected ::: ",err.message)
  }
  return {
    "subject":"",
    "body":""
  }
}
const CfrFormApproved = (ulbName)=>{
  try{
    return {
      subject:`Fiscal Ranking Form Approved by PMU`,
      body:`Dear ${ulbName} <br>
      <p>Thanks for participating in the CityFinance.in Rankings 2022. Your submission has been acknowledged by PMU. </p>
      <p>PMU Team<br>City Finance Rankings</p>  `
    }
  }
  catch(err){
    console.log("error in CfrFormApproved ::: ",err.message)
  }

}

const userSignup = (userName, name, link) => {
  return {
    subject: `Registration Successful for City Finance`,
    body: `Dear ${name},<br>
                    <p>Welcome to City Finance Portal!</p> 
                    <br>
                    <p>
                        Your account has been successfully created. Please follow this link to activate your account- <a href="${link}" target="_blank">${link}</a>.<br>
                        Your Username is <strong>${userName}</strong>
                    </p>
                    <br>
                    <p>    
                        After activation, please visit <a href="https://www.${process.env.PROD_HOST}" target="_blank">https://www.${process.env.PROD_HOST}</a> to login using your registered email id.
                    </p>
                    <br>
                    <br>Regards,<br>
                    City Finance Team`,
  };
};
const userCreation = (userName, name, link) => {
  return {
    subject: `Registration Successful for City Finance`,
    body: `Dear ${name},<br>
                    <p>Welcome to City Finance Portal!</p> 
                    <br>
                    <p>
                        Your account has been successfully created. Please follow this link to set your password - <a href="${link}" target="_blank">${link}</a>.<br>
                        Your Username is <strong>${userName}</strong>

                    </p>
                    <br>
                    <p>
                        After setting up your password, please visit <a href="https://www.${process.env.PROD_HOST}" target="_blank">https://www.${process.env.PROD_HOST}</a> to login using your registered email id.
                    </p>
                    <br>
                    <br>Regards,<br>
                    City Finance Team`,
  };
};
const userForgotPassword = (name, link, ulbflagForEmail = true) => {
  let text = ulbflagForEmail ? "registered email id" : "Ulb Code/Census Code";
  return {
    subject: `City Finance Account Password Reset`,
    body: `Dear ${name},<br>
                        <p>Please use the following link to reset your password - <a href="${link}" target="_blank">${link}</a></p> 
                        <br>
                        <p>
                            After resetting your password, please visit <a href="https://www.${process.env.PROD_HOST}" target="_blank">https://www.${process.env.PROD_HOST}</a> to login using your ${text}.
                        </p>
                        <br>
                        <br>Regards,<br>
                        City Finance Team`,
  };
};
const userProfileEdit = (name, verified = false) => {
  return {
    subject: `Profile ${verified ? 'Update': 'Verification'} Successful for City Finance`,
    body: `Dear ${name},<br>
                    <br>
                    <p>
                        Your account has been ${verified ? 'updated': 'verified'} successfully. <br>
                        Please visit <a href="https://www.${process.env.PROD_HOST}" target="_blank">https://www.${process.env.PROD_HOST}</a> to login using your Ulb Code/Census Code.
                    </p>
                    <br>
                <br>Regards,<br>
                City Finance Team`,
  };
};
const userProfileRequestAction = (name, status, actionTakenBy) => {
  let str =
    status == "REJECTED"
      ? `Your profile update request has been ${status.toLowerCase()} by ${actionTakenBy.toLowerCase()}`
      : `
Your profile update request has been successfully cancelled`;
  return {
    subject: `${status}: Profile Update Request for City Finance`,
    body: `Dear ${name},<br>
                        <br>
                        <p>
                            ${str} <br>
                            Please visit <a href="https://www.${process.env.PROD_HOST}" target="_blank">https://www.${process.env.PROD_HOST}</a> to login using your registered email id.
                        </p>
                        <br>
                    <br>Regards,<br>
                    City Finance Team`,
  };
};
const userEmailEdit = (name, link) => {
  return {
    subject: `Profile Update Successful for City Finance`,
    body: `Dear ${name},<br>
                <br>
                <p>    
                    Your email id has been successfully updated. Please follow this link to set your password - <a href="${link}" target="_blank">${link}</a>. <br>
                    After setting up your password, please visit <a href="https://www.${process.env.PROD_HOST}" target="_blank">https://www.${process.env.PROD_HOST}</a> to login using your Ulb Code/Census Code.
                </p>
                <br>
            <br>Regards,<br>
            City Finance Team`,
  };
};
const ulbSignup = (name, type, stateName) => {
  if (type == "ULB") {
    return {
      subject: `Signup Request Successfully Submitted`,
      body: `Dear ${name},<br>
                        <p>
                            Your signup request has been successfully submitted. You will receive a confirmation for signup on admin approval.
                        </p>
                        <br>
                    <br>Regards,<br>
                    City Finance Team`,
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
                    City Finance Team`,
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
                City Finance Team`,
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
                City Finance Team`,
  };
};

const sendAccountReActivationEmail = (user, link, ulbflagForEmail = true) => {
  let text = ulbflagForEmail ? "registered email id" : "Ulb Code/Census Code";

  return {
    subject: `Account Activation Link for City Finance`,
    body: `Dear  ${user.name},<br>
                    <p>Please follow this link to activate your account ${user.role !== "USER" ? "and set your password" : ""
      }  - <a href="${link}">${link}</a>.</p> 
                    <br>
                    <p> After setting your password, please visit <a href="https://www.${process.env.PROD_HOST} ">https://www.${process.env.PROD_HOST} </a> to login using your ${text}.</p>
                    
                    <br>Regards,<br>
                    City Finance Team`,
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
                    City Finance Team`,
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
                            After setting your password, please visit <a href="https://www.${process.env.PROD_HOST}" target="_blank">https://www.${process.env.PROD_HOST}</a> to login using your registered email id.
                        </p>
                        <br>
                    <br>Regards,<br>
                    City Finance Team`
    };
};
*/

const ulbSignupApproval = (sbCode, censusCode, name, link, edit = false) => {
  let code = sbCode ? sbCode : censusCode;
  return {
    subject: `Signup Successfully`,
    body: `Dear ${name},<br>
                        <p>
                            Welcome to City Finance Portal! <br>
                            Your account has been successfully created. Please follow this link to set your password - <a href="${link}" target="_blank">${link}</a>.<br>
                            Your Username is <strong>${sbCode}</strong> or <strong>${censusCode}</strong>

                        </p>
                        <p>
                            After setting your password, please visit <a href="https://www.${process.env.PROD_HOST}" target="_blank">https://www.${process.env.PROD_HOST}</a> to login using your registered email id.
                        </p>
                        <br>
                    <br>Regards,<br>
                    City Finance Team`,
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
                    City Finance Team`,
  };
};
const fdUploadUlb = (name) => {
  return {
    subject: `15th FC Grant Form Successfully Submitted`,
    body: `Dear ${name},<br xmlns="http://www.w3.org/1999/html">
                        <p>
                            Your 15<sup>th</sup> FC Grant form has been successfully submitted.<br>
                        </p>
                        <p>
                            You will receive a confirmation on approval from State and MoHUA.
                        </p>
                        <br>
                    <br>Regards,<br>
                    City Finance Team`,
  };
};

const fdDataUploadUlb = (name, refCode, fy, audited) => {
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
                            Audit Status - ${audited ? 'Audited' : 'Unaudited'
      }<br>
                        </p>
                        <br>
                        <p>
                            You will receive a confirmation for data upload on admin approval.
                        </p>
                        <br>
                    <br>Regards,<br>
                    City Finance Team`,
  };
};

const fdUploadPartner = (partner, ulb, refCode, fy, audited) => {
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
                            Audit Status - ${audited ? "Audited" : "Unaudited"
      }<br>
                        </p>
                        <br>
                        <p>
                            Kindly review the same.
                        </p>
                        <br>
                    <br>Regards,<br>
                    City Finance Team`,
  };
};

const fdUploadState = (name, ulbName, refCode, fy, audited) => {
  return {
    subject: `15th FC Grant Form Successfully Submitted - ${ulbName}`,
    body: `Dear ${name},<br>
                        <p>
                            The 15<sup>th</sup> FC Grant form data for the ${ulbName} has been successfully submitted.<br>
                            Kindly review the same.                        
                        </p>
                        <br>                
                    <br>Regards,<br>
                    City Finance Team`,
  };
};

const fdULBDataUploadState = (name, ulbName, refCode, fy, audited) => {
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
                            Audit Status - ${audited ? 'Audited' : 'Unaudited'
      }<br>
                        </p>
                        <br>
                        <p>    
                            You will receive a confirmation for data upload on admin approval.
                        </p>
                        <br>
                    <br>Regards,<br>
                    City Finance Team`,
  };
};

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
                            Audit Status - ${audited ? "Audited" : "Unaudited"
      }<br>
                        </p>
                        <br>
                    <br>Regards,<br>
                    City Finance Team`,
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
                            Audit Status - ${audited ? "Audited" : "Unaudited"
      }<br>
                        </p>
                        <br>
                    <br>Regards,<br>
                    City Finance Team`,
  };
};

const xvUploadApprovalMoHUA = (name) => {
  return {
    subject: `15th FC Grant Form Successfully Approved by MoHUA`,
    body: `Dear ${name},<br>
                <p>
                    Your 15<sup>th</sup> FC Grant form has been approved by MoHUA.
                </p>
                <br>
                <br>Regards,<br>
                City Finance Team`,
  };
};

const xvUploadApprovalByMoHUAtoState = (ulbName, stateName) => {
  return {
    subject: `15th FC Grant Form Successfully Approved by MoHUA- ${ulbName}`,
    body: `Dear ${stateName},<br>
                <p>
                    The 15<sup>th</sup> FC Grant form for the ${ulbName} has been approved by MoHUA.
                </p>
                <br>
                <br>Regards,<br>
                City Finance Team`,
  };
};

const xvUploadApprovalState = (mohuaName, ulbName, stateName) => {
  return {
    subject: `15th FC Grant Form Successfully Approved by State- ${ulbName}`,
    body: `Dear ${mohuaName},<br>
                <p>
                    The 15<sup>th</sup> FC Grant form data for the ${ulbName} of ${stateName} has been successfully submitted and approved by State.<br>
                    Kindly review the same.
                </p>
                <br>
                <br>Regards,<br>
                City Finance Team`,
  };
};

const xvUploadApprovalByStateToUlb = (ulbName) => {
  return {
    subject: `15th FC Grant Form Successfully Approved by State`,
    body: `Dear ${ulbName},<br>
                <p>
                    The 15<sup>th</sup> FC Grant form data has been approved by state and is due for approval by MoHUA.
                    You will receive a confirmation on approval by MoHUA.
                </p>
                <br>
                <br>Regards,<br>
                City Finance Team`,
  };
};

const xvUploadApprovalForState = (ulbName, stateName) => {
  return {
    subject: `15th FC Grant Form Successfully Approved by State-${ulbName}`,
    body: `Dear ${stateName},<br>
                <p>
                    The 15<sup>th</sup> FC Grant form for the ${ulbName} has been approved by state and is due for approval by MoHUA.
                    You will receive a confirmation on approval by MoHUA.
                </p>
                <br>
                <br>Regards,<br>
                City Finance Team`,
  };
};

const xvUploadRejectUlb = (ulbName, rejectReason, role) => {
  return {
    subject: `15th FC Grant Form Rejected by ${role}`,
    body: `Dear ${ulbName},<br>
                <p>
                    Your 15<sup>th</sup> FC Grant form has been rejected by ${role} with the following details.<br>
                    <strong>Rejected Data:</strong>
                    ${rejectReason}
                </p>
                <p>Please login to City Finance Portal to submit the corrected form.</p>
                <br>Regards,<br>
                City Finance Team`,
  };
};

const xvUploadRejectState = (ulbName, stateName, rejectReason) => {
  return {
    subject: `15th FC Grant Form Rejected by MoHUA-${ulbName}`,
    body: `Dear ${stateName},<br>
                <p>
                    The 15<sup>th</sup> FC Grant form for the ${ulbName} has been rejected by MoHUA with the following details.<br>
                    <strong>Rejected Data:</strong>
                    ${rejectReason}
                </p>
                <p>Please login to City Finance Portal to submit the corrected form.</p>
                <br>
                <br>Regards,<br>
                City Finance Team`,
  };
};

const xvUploadRejectByStateTrigger = (ulbName, stateName, rejectReason) => {
  return {
    subject: `15th FC Grant Form Rejected by State-${ulbName}`,
    body: `Dear ${stateName},<br>
                <p>
                    The 15<sup>th</sup> FC Grant form for the ${ulbName} has been rejected by MoHUA with the following details.<br>
                    <strong>Rejected Data:</strong>
                    ${rejectReason}
                </p>
                <p>Please login to City Finance Portal to submit the corrected form.</p>
                <br>
                <br>Regards,<br>
                City Finance Team`,
  };
};

const xvUploadMultiRejectUlb = (ulbName, rejectReason, role) => {
  return {
    subject: `15th FC Grant Form Rejected by ${role}`,
    body: `Dear ${ulbName},<br>
                <p>
                    Your 15<sup>th</sup> FC Grant form has been rejected by ${role} with the following details.<br>
                   
                    ${rejectReason}
                </p>
                <p>Please login to City Finance Portal to submit the corrected form.</p>
                <br>Regards,<br>
                City Finance Team`,
  };
};

const xvUploadMultiRejectState = (ulbName, stateName, rejectReason) => {
  return {
    subject: `15th FC Grant Form Rejected by MoHUA-${ulbName}`,
    body: `Dear ${stateName},<br>
                <p>
                    The 15<sup>th</sup> FC Grant form for the ${ulbName} has been rejected by MoHUA with the following details.<br>
                   
                    ${rejectReason}
                </p>
                <p>Please login to City Finance Portal to submit the corrected form.</p>
                <br>
                <br>Regards,<br>
                City Finance Team`,
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
                            Audit Status - ${audited ? "Audited" : "Unaudited"
      }<br>
                            Rejected Reports:   <br>
                            ${reports}
                            <br>
                            Please login to City Finance Portal to submit the corrected form.
                        </p>
                        <br>
                    <br>Regards,<br>
                    City Finance Team`,
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
                            Audit Status - ${audited ? "Audited" : "Unaudited"
      }<br>
                            Rejected Reports:   <br>
                            ${reports}
                        </p>
                        <br>
                    <br>Regards,<br>
                    City Finance Team`,
  };
};

const stateFormSubmission = (name, stateName, type) => {
  if (type == "STATE") {
    return {
      subject: `Property Tax and User Charges Form Successfully Submitted`,
      body: `Dear ${name},<br>
                    <p>
                        Your Property Tax and User Charges Form has been successfully submitted. You can view your response <br>
                        by logging in to https://www.${process.env.PROD_HOST}.
                    </p>
                    <br>
                <br>Regards,<br>
                City Finance Team`,
    };
  } else {
    return {
      subject: `Property Tax and User Charges Form Successfully Submitted - ${stateName}`,
      body: `Dear ${name},<br>
                    <p>
                        The Property Tax and User Charges Form for ${stateName} has been successfully submitted. You can view <br>
                        your response by logging in to https://www.${process.env.PROD_HOST}.
                    </p>
                    <br>
                <br>Regards,<br>
                City Finance Team`,
    };
  }
};

const sendFinancialDataStatusEmail = (_id, type = "UPLOAD") => {
  return new Promise(async (resolve, reject) => {
    let query = [
      { $match: { _id: ObjectId(_id) } },
      {
        $lookup: {
          from: "ulbs",
          localField: "ulb",
          foreignField: "_id",
          as: "ulb",
        },
      },
      { $unwind: "$ulb" },
      {
        $lookup: {
          from: "users",
          localField: "ulb._id",
          foreignField: "ulb",
          as: "ulbUser",
        },
      },
      { $unwind: "$ulbUser" },
      { $match: { "ulbUser.isDeleted": false, "ulbUser.role": "ULB" } },
      {
        $lookup: {
          from: "users",
          let: { state: "$ulb.state" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$role", "STATE"] },
                    { $eq: ["$state", "$$state"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
            {
              $project: {
                name: 1,
                email: 1,
                departmentEmail: 1,
              },
            },
          ],
          as: "stateUser",
        },
      },
      {
        $project: {
          status: 1,
          referenceCode: 1,
          audited: 1,
          financialYear: 1,
          reports: [
            {
              name: "Balance Sheet",
              message: "$balanceSheet.message",
            },
            {
              name: "Schedules To Balance Sheet",
              message: "$schedulesToBalanceSheet.message",
            },
            {
              name: "Income And Expenditure",
              message: "$incomeAndExpenditure.message",
            },
            {
              name: "Schedules To Income And Expenditure",
              message: "$schedulesToIncomeAndExpenditure.message",
            },
            {
              name: "Trial Balance",
              message: "$trialBalance.message",
            },
            {
              name: "Audit Report",
              message: "$auditReport.message",
            },
          ],
          //ulbUser: { $arrayElemAt: ['$ulbUser', 0] },
          ulbUser: 1,
          //stateUser: { $arrayElemAt: ['$stateUser', 0] }
          stateUser: 1,
        },
      },
      {
        $project: {
          status: 1,
          referenceCode: 1,
          audited: 1,
          financialYear: 1,
          reports: 1,
          ulbUser: {
            name: "$ulbUser.name",
            commissionerName: "$ulbUser.commissionerName",
            commissionerEmail: "$ulbUser.commissionerEmail",
            accountantName: "$ulbUser.accountantName",
            accountantEmail: "$ulbUser.accountantEmail",
          },
          // stateUser: {
          //     name: '$stateUser.name',
          //     email: '$stateUser.email',
          //     departmentEmail: '$stateUser.departmentEmail'
          // }
          stateUser: 1,
        },
      },
    ];

    try {
      let ufd = await XVFCGrantULBData.aggregate(query).exec();
      let data = ufd && ufd.length ? ufd[0] : null;
      let ulbEmails = [];
      data.ulbUser.commissionerEmail
        ? ulbEmails.push(data.ulbUser.commissionerEmail)
        : "";
      data.ulbUser.accountantEmail
        ? ulbEmails.push(data.ulbUser.accountantEmail)
        : "";
      let stateEmails = [];
      //data.stateUser.email ? stateEmails.push(data.stateUser.email) : '';
      //data.stateUser.departmentEmail ? stateEmails.push(data.stateUser.departmentEmail): '';

      let mailOptionUlb = {
        to: ulbEmails.join(),
        subject: "",
        html: "",
      };
      let mailOptionState = {
        to: "",
        subject: "",
        html: "",
      };

      if (data && (type == 'UPLOAD' || type == 'ACTION')) {
        if (type == 'UPLOAD') {
          let templateUlb = fdUploadUlb(data.ulbUser.name);
          mailOptionUlb.subject = templateUlb.subject;
          mailOptionUlb.html = templateUlb.body;
          sendEmail(mailOptionUlb);
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
                  sendEmail(mailOptions);
              }
          }
          */

          for (let d of data.stateUser) {
            //data.stateUser.email ? stateEmails.push(data.stateUser.email) : '';
            //data.stateUser.departmentEmail ? stateEmails.push(data.stateUser.departmentEmail): '';
            d.email ? stateEmails.push(d.email) : "";
            d.departmentEmail ? stateEmails.push(d.departmentEmail) : "";

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
            sendEmail(mailOptionState);
          }
        } else if (type == "ACTION") {
          if (data.status == "APPROVED") {
            let templateUlb = fdUploadApprovalUlb(
              data.ulbUser.name,
              data.referenceCode,
              data.financialYear,
              data.audited
            );
            mailOptionUlb.subject = templateUlb.subject;
            mailOptionUlb.html = templateUlb.body;
            sendEmail(mailOptionUlb);

            for (let d of data.stateUser) {
              d.email ? stateEmails.push(d.email) : "";
              d.departmentEmail ? stateEmails.push(d.departmentEmail) : "";

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
              sendEmail(mailOptionState);
            }
          } else if (data.status == 'REJECTED') {
            let reportsStr = ``;
            for (let m of data.reports) {
              if (m.message) {
                reportsStr += `${m.name} : ${m.message} <br>`;
              }
            }
            let templateUlb = fdUploadRejectionUlb(
              data.ulbUser.name,
              data.referenceCode,
              data.financialYear,
              data.audited,
              reportsStr
            );
            mailOptionUlb.subject = templateUlb.subject;
            mailOptionUlb.html = templateUlb.body;
            sendEmail(mailOptionUlb);

            for (let d of data.stateUser) {
              d.email ? stateEmails.push(d.email) : '';
              d.departmentEmail
                ? stateEmails.push(d.departmentEmail)
                : '';
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
              sendEmail(mailOptionState);
            }
          }
        }
        resolve('send');
      } else {
        reject(`Record not found.`);
      }
    } catch (e) {
      console.error('Exception', e);
      reject(e);
    }
  });
};

/**
 *
 * @description Send emails for Module - ULB Data Upload.
 *
 *
 * @param {*} _id
 * @param {'UPLOAD' | 'ACTION'} type
 * @returns {Promise<string>}
 */
const sendULBFinancialDataStatusEmail = (_id, type = 'UPLOAD') => {
  return new Promise(async (resolve, reject) => {
    let query = [
      { $match: { _id: ObjectId(_id) } },
      {
        $lookup: {
          from: 'ulbs',
          localField: 'ulb',
          foreignField: '_id',
          as: 'ulb',
        },
      },
      { $unwind: '$ulb' },
      {
        $lookup: {
          from: 'users',
          localField: 'ulb._id',
          foreignField: 'ulb',
          as: 'ulbUser',
        },
      },
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
                    { $eq: ['$isDeleted', false] },
                  ],
                },
              },
            },
            {
              $project: {
                name: 1,
                email: 1,
                departmentEmail: 1,
              },
            },
          ],
          as: 'stateUser',
        },
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
              message: '$balanceSheet.message',
            },
            {
              name: 'Schedules To Balance Sheet',
              message: '$schedulesToBalanceSheet.message',
            },
            {
              name: 'Income And Expenditure',
              message: '$incomeAndExpenditure.message',
            },
            {
              name: 'Schedules To Income And Expenditure',
              message: '$schedulesToIncomeAndExpenditure.message',
            },
            {
              name: 'Trial Balance',
              message: '$trialBalance.message',
            },
            {
              name: 'Audit Report',
              message: '$auditReport.message',
            },
          ],
          ulbUser: { $arrayElemAt: ['$ulbUser', 0] },
          //stateUser: { $arrayElemAt: ['$stateUser', 0] }
          stateUser: 1,
        },
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
            accountantEmail: '$ulbUser.accountantEmail',
          },
          // stateUser: {
          //     name: '$stateUser.name',
          //     email: '$stateUser.email',
          //     departmentEmail: '$stateUser.departmentEmail'
          // }
          stateUser: 1,
        },
      },
    ];

    try {
      let ufd = await UlbFinancialData.aggregate(query).exec();
      let data = ufd && ufd.length ? ufd[0] : null;

      let ulbEmails = [];
      if (data.ulbUser.commissionerEmail) {
        ulbEmails.push(data.ulbUser.commissionerEmail);
      }
      if (data.ulbUser.accountantEmail) {
        ulbEmails.push(data.ulbUser.accountantEmail);
      }

      let stateEmails = [];

      let mailOptionUlb = {
        to: ulbEmails.join(),
        subject: '',
        html: '',
      };
      let mailOptionState = {
        to: '',
        subject: '',
        html: '',
      };

      if (data && (type == 'UPLOAD' || type == 'ACTION')) {
        if (type == 'UPLOAD') {
          let templateUlb = fdDataUploadUlb(
            data.ulbUser.name,
            data.referenceCode,
            data.financialYear,
            data.audited
          );
          // console.log(`email to`, mailOptionUlb.to);
          mailOptionUlb.subject = templateUlb.subject;
          mailOptionUlb.html = templateUlb.body;
          sendEmail(mailOptionUlb);

          let partner = await User.find({
            isActive: true,
            role: 'PARTNER',
            isDeleted: false,
          }).exec();

          if (partner.length > 0) {
            for (let p of partner) {
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
                html: template.body,
              };
              // console.log(`email to`, mailOptions.to);

              sendEmail(mailOptions);
            }
          }

          for (let d of data.stateUser) {
            if (d.email) {
              stateEmails.push(d.email);
            }
            if (d.departmentEmail) {
              stateEmails.push(d.departmentEmail);
            }

            let templateState = fdULBDataUploadState(
              d.name,
              data.ulbUser.name,
              data.referenceCode,
              data.financialYear,
              data.audited
            );

            mailOptionState.to = stateEmails.join();
            mailOptionState.subject = templateState.subject;
            mailOptionState.html = templateState.body;
            // console.log(`email to`, mailOptionState.to);

            sendEmail(mailOptionState);
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
            sendEmail(mailOptionUlb);

            for (let d of data.stateUser) {
              d.email ? stateEmails.push(d.email) : '';
              d.departmentEmail
                ? stateEmails.push(d.departmentEmail)
                : '';

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
              sendEmail(mailOptionState);
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
            sendEmail(mailOptionUlb);

            for (let d of data.stateUser) {
              d.email ? stateEmails.push(d.email) : "";
              d.departmentEmail ? stateEmails.push(d.departmentEmail) : "";
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
              sendEmail(mailOptionState);
            }
          }
        }
        //sendEmail(mailOptionUlb);
        //sendEmail(mailOptionState);
        resolve("send");
      } else {
        reject(`Record not found.`);
      }
    } catch (e) {
      console.log("Exception", e);
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
            from: "ulbs",
            localField: "ulb",
            foreignField: "_id",
            as: "ulb",
          },
        },
        { $unwind: "$ulb" },
        {
          $lookup: {
            from: "users",
            let: { state: "$ulb.state" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$role", "STATE"] },
                      { $eq: ["$state", "$$state"] },
                      { $eq: ["$isDeleted", false] },
                    ],
                  },
                },
              },
              {
                $project: {
                  name: 1,
                  email: 1,
                  departmentEmail: 1,
                },
              },
            ],
            as: "stateUser",
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            email: 1,
            sbCode: "$ulb.sbCode",
            censusCode: "$ulb.censusCode",
            status: 1,
            rejectReason: 1,
            commissionerName: 1,
            commissionerEmail: 1,
            accountantName: 1,
            accountantEmail: 1,
            stateUser: { $arrayElemAt: ["$stateUser", 0] },
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            sbCode: 1,
            censusCode: 1,
            email: 1,
            status: 1,
            rejectReason: 1,
            commissionerName: 1,
            commissionerEmail: 1,
            accountantName: 1,
            accountantEmail: 1,
            stateUser: {
              name: "$stateUser.name",
              email: "$stateUser.email",
              departmentEmail: "$stateUser.departmentEmail",
            },
          },
        },
      ];
      let user = await User.aggregate(query).exec();
      let data = user && user.length ? user[0] : null;
      if (data) {
        let mailOptionUlb = {
          to: data.commissionerEmail,
          subject: "",
          html: "",
        };
        if (data.status == "APPROVED") {
          let templateUlb = ulbSignupApproval(
            data.sbCode,
            data.censusCode,
            data.name,
            link,
            edit
          );
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
        sendEmail(mailOptionUlb);
        resolve("email sent.");
      } else {
        reject("user not found.");
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
        let up = await User.update(
          { _id: userOldInfo._id },
          { $set: { isEmailVerified: true } }
        );
        let link = await emailVericationLink(userInfo._id, currentUrl, true);
        let template = userEmailEdit(userInfo.name, link);
        let mailOptions = {
          to: userInfo.email,
          subject: template.subject,
          html: template.body,
        };
        sendEmail(mailOptions);
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
          html: template.body,
        };
        // sendEmail(mailOptions);
      }
      resolve("done");
    } catch (e) {
      reject(e);
    }
  });
};

const utilizationRequestAction = (name, status, actionTakenBy) => {
  let str =
    status == "REJECTED"
      ? `Your profile update request has been ${status.toLowerCase()} by ${actionTakenBy.toLowerCase()}`
      : `
Your profile update request has been successfully cancelled`;
  return {
    subject: `${status}: Profile Update Request for City Finance`,
    body: `Dear ${name},<br>
                        <br>
                        <p>
                            ${str} <br>
                            Please visit <a href="https://www.${process.env.PROD_HOST}" target="_blank">https://www.${process.env.PROD_HOST}</a> to login using your registered email id.
                        </p>
                        <br>
                    <br>Regards,<br>
                    City Finance Team`,
  };
};

const grantClaimAcknowledgement = (type, installment, state, financialYear,name, amountClaimed) =>{
  let inst = type == 'mpc' ? '' : `, Installment - ${installment}, `
  return {
    subject: `Grant Claim Request Created Successfully`,
    body: `Dear ${name},<br>
                        <br>
                        <p>
                        A ${type.toUpperCase()} Grant Claim request for amount Rs.${amountClaimed} Cr. ${inst} FY-${financialYear} has been generated successfully.   
                        </p>
                        <br>
                    <br>Regards,<br>
                    City Finance Team`,
  };
}

const gtcSubmission = (state, financialYear, name, installment) =>{
  return {
    subject: `Grant Transfer Certificate Submitted Successfully`,
    body: `Dear ${name},
                        <p>
                        This mail is to inform you that ${state} Government has successfully Submitted the Grant Transfer Certificate(s) for Installment No. - ${installment} of the Financial Year: ${financialYear}.
                        </p>
                        <br>
                    <br>Regards,<br>
                    City Finance Team`,
  };
}


const ulbFormSubmitted = (ulbName, formName) => {
  return {
    subject: `${formName} Form Successfully Submitted`,
    body: `
              <p>Dear ${ulbName}</p> 
              <p>
              Your <strong>${formName}</strong> Form has been successfully submitted.<br>
              You will receive a confirmation on approval from State and MoHUA.
              </p>
              <br>
              
              <br>Regards,<br>
              City Finance Team`,
  };
};

const stateUlbFormTrigger = (stateName,stateData) => {
  const CollectionNamesArray = Object.keys(stateData[stateName]);
  
const dur =  stateData[stateName][CollectionNames.dur];
const aa_Audited =  stateData[stateName]["AnnualAccount_Audited"];
const aa_UnAudited =  stateData[stateName]["AnnualAccount_UnAudited"];
const gfc =  stateData[stateName][CollectionNames.gfc];
const odf =  stateData[stateName][CollectionNames.odf];
const propTaxOp =  stateData[stateName][CollectionNames.propTaxOp];
const twentyEightSlbs =  stateData[stateName][CollectionNames.twentyEightSlbs];
const pfms = stateData[stateName][CollectionNames.linkPFMS]

let total = {
  [StatusList.Not_Started]:0,
  [StatusList.In_Progress]:0,
  [StatusList.Under_Review_By_State]:0,
  [StatusList.Rejected_By_State]:0,
  [StatusList.Under_Review_By_MoHUA]:0,
  [StatusList.Rejected_By_MoHUA]:0,
  [StatusList.Approved_By_MoHUA]:0,
}

  let formArray = [dur, aa_Audited, aa_UnAudited, gfc, odf , propTaxOp, twentyEightSlbs, pfms];

  total = calculateTotalStatus(total, formArray);
  return {
    subject: `Weekly status summary`,
    body: `<table width="100%">
                        
    <tr>
        <td  font-size: 16px">
            <p>Dear ${stateName} Team,</p>

            <p>Attached is a weekly status summary on the form submission by ULBs. Kindly review the ULB forms and approve upon completion.</p>

            <div style="overflow-x: auto;">
                <table cellpadding="8" cellspacing="0" border="1" style="border: 1px solid #efefef; border-collapse: collapse;">
                    <tbody>
                        <tr>
                            <th>S.No.</th>
                            <th>Form Name</th>
                            <th>Not Started</th>
                            <th>In Progress</th>
                            <th>Under Review by State</th>
                            <th>Returned by State</th>
                            <th>Under Review by MoHUA</th>
                            <th>Returned by MoHUA</th>
                            <th>Approved by MoHUA</th>
                        </tr>
                        <tr>
                            <td>1</td>
                            <td>DUR</td>
                            <td>${dur[StatusList.Not_Started]}</td>
                            <td>${dur[StatusList.In_Progress]}</td>
                            <td>${dur[StatusList.Under_Review_By_State]}</td>
                            <td>${dur[StatusList.Rejected_By_State]}</td>
                            <td>${dur[StatusList.Under_Review_By_MoHUA]}</td>
                            <td>${dur[StatusList.Rejected_By_MoHUA]}</td>
                            <td>${dur[StatusList.Approved_By_MoHUA]}</td>
                        </tr>
                        <tr>
                            <td>2</td>
                            <td>AFS Audited</td>
                            <td>${aa_Audited[StatusList.Not_Started]}</td>
                            <td>${aa_Audited[StatusList.In_Progress]}</td>
                            <td>${aa_Audited[StatusList.Under_Review_By_State]}</td>
                            <td>${aa_Audited[StatusList.Rejected_By_State]}</td>
                            <td>${aa_Audited[StatusList.Under_Review_By_MoHUA]}</td>
                            <td>${aa_Audited[StatusList.Rejected_By_MoHUA]}</td>
                            <td>${aa_Audited[StatusList.Approved_By_MoHUA]}</td>
                        </tr>
                        <tr>
                            <td>3</td>
                            <td>AFS Provisional</td>
                            <td>${aa_UnAudited[StatusList.Not_Started]}</td>
                            <td>${aa_UnAudited[StatusList.In_Progress]}</td>
                            <td>${aa_UnAudited[StatusList.Under_Review_By_State]}</td>
                            <td>${aa_UnAudited[StatusList.Rejected_By_State]}</td>
                            <td>${aa_UnAudited[StatusList.Under_Review_By_MoHUA]}</td>
                            <td>${aa_UnAudited[StatusList.Rejected_By_MoHUA]}</td>
                            <td>${aa_UnAudited[StatusList.Approved_By_MoHUA]}</td>
                        </tr>
                        <tr>
                            <td>4</td>
                            <td>PFMS Linkage</td>
                            <td>${pfms[StatusList.Not_Started]}</td>
                            <td>${pfms[StatusList.In_Progress]}</td>
                            <td>${pfms[StatusList.Under_Review_By_State]}</td>
                            <td>${pfms[StatusList.Rejected_By_State]}</td>
                            <td>${pfms[StatusList.Under_Review_By_MoHUA]}</td>
                            <td>${pfms[StatusList.Rejected_By_MoHUA]}</td>
                            <td>${pfms[StatusList.Approved_By_MoHUA]}</td>
                        </tr>
                        <tr>
                            <td>5</td>
                            <td>Property Tax Operationalization</td>
                            <td>${propTaxOp[StatusList.Not_Started]}</td>
                            <td>${propTaxOp[StatusList.In_Progress]}</td>
                            <td>${propTaxOp[StatusList.Under_Review_By_State]}</td>
                            <td>${propTaxOp[StatusList.Rejected_By_State]}</td>
                            <td>${propTaxOp[StatusList.Under_Review_By_MoHUA]}</td>
                            <td>${propTaxOp[StatusList.Rejected_By_MoHUA]}</td>
                            <td>${propTaxOp[StatusList.Approved_By_MoHUA]}</td>
                        </tr>
                        <tr>
                            <td>6</td>
                            <td>28 SLB</td>
                            <td>${twentyEightSlbs[StatusList.Not_Started]}</td>
                            <td>${twentyEightSlbs[StatusList.In_Progress]}</td>
                            <td>${twentyEightSlbs[StatusList.Under_Review_By_State]}</td>
                            <td>${twentyEightSlbs[StatusList.Rejected_By_State]}</td>
                            <td>${twentyEightSlbs[StatusList.Under_Review_By_MoHUA]}</td>
                            <td>${twentyEightSlbs[StatusList.Rejected_By_MoHUA]}</td>
                            <td>${twentyEightSlbs[StatusList.Approved_By_MoHUA]}</td>
                        </tr>
                        <tr>
                            <td>7</td>
                            <td>ODF</td>
                            <td>${odf[StatusList.Not_Started]}</td>
                            <td>${odf[StatusList.In_Progress]}</td>
                            <td>${odf[StatusList.Under_Review_By_State]}</td>
                            <td>${odf[StatusList.Rejected_By_State]}</td>
                            <td>${odf[StatusList.Under_Review_By_MoHUA]}</td>
                            <td>${odf[StatusList.Rejected_By_MoHUA]}</td>
                            <td>${odf[StatusList.Approved_By_MoHUA]}</td>
                        </tr>
                        <tr>
                            <td>8</td>
                            <td>GFC</td>
                            <td>${gfc[StatusList.Not_Started]}</td>
                            <td>${gfc[StatusList.In_Progress]}</td>
                            <td>${gfc[StatusList.Under_Review_By_State]}</td>
                            <td>${gfc[StatusList.Rejected_By_State]}</td>
                            <td>${gfc[StatusList.Under_Review_By_MoHUA]}</td>
                            <td>${gfc[StatusList.Rejected_By_MoHUA]}</td>
                            <td>${gfc[StatusList.Approved_By_MoHUA]}</td>
                        </tr>
                        <tr>
                            <td>9</td>
                            <td>Total</td>
                            <td>${total[StatusList.Not_Started]}</td>
                            <td>${total[StatusList.In_Progress]}</td>
                            <td>${total[StatusList.Under_Review_By_State]}</td>
                            <td>${total[StatusList.Rejected_By_State]}</td>
                            <td>${total[StatusList.Under_Review_By_MoHUA]}</td>
                            <td>${total[StatusList.Rejected_By_MoHUA]}</td>
                            <td>${total[StatusList.Approved_By_MoHUA]}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p>Regards, <br> City Finance Team</p>
        </td>
    </tr>
</table>`,
  };
};

const alertStateToClaimGrants = (payload) => {
  return {
    subject: `To claim XVFC grants for the FY 23-24`,
    body: `Dear sir/ma’am,<br>
                    <p>
                    This is to bring to your kind attention that your state has completed all the stipulated conditions concerning the <strong>${payload.installment}
                    instalment</strong> of <strong>${payload.tiedStatus ? "Tied" : "Untied"}</strong> Grant FY 23-24 allocated to <strong>${payload.title}</strong> 
                    under the 15thFC. Kindly submit the necessary claims in order to release the grant.
                    </p>
                    <br>Regards,<br>
                    PMU- XVFC,<br>
                    MoHUA`,
  };
};

const alertStateWithMohuaAction = (payload) => {
  return {
    subject: `${payload.formName} Form ${payload.status}`,
    body: `Dear <strong>${payload.stateName}</strong> User,<br><br>
    ${payload.isApproved
        ? `Your ${payload.formName} form submission for FY 2023-24 has been successfully Acknowledged By MoHUA.<br><br>No further action is needed for this form.`
        : `Your ${payload.formName} form submission for FY 2023-24 has been Returned By MoHUA.${typeof payload.hasApproved === 'boolean' ? "" : `<br>Reason for Rejection :- ${payload.reasonForRejection}`}<br>
           <br>Please visit <a href="http://www.${process.env.PROD_HOST}">http://www.${process.env.PROD_HOST}</a> to submit the correct data.`}<br><br>
    Regards,<br>XVFC PMU,<br>MoHUA`,
  };
};


const calculateTotalStatus = (totalObj, formArray)=>{
  for(let key in totalObj){
    let sum =0;
     formArray.forEach((el)=>{
      sum  = el[key]+sum;
    })
    totalObj[key] = sum;
  }
  return totalObj;
}
async function sleep(millis) {
  return new Promise((resolve) => setTimeout(resolve, millis));
}
module.exports = {
  sendFinancialDataStatusEmail: sendFinancialDataStatusEmail,
  sendUlbSignupStatusEmmail: sendUlbSignupStatusEmmail,
  sendProfileUpdateStatusEmail: sendProfileUpdateStatusEmail,
  xvUploadApprovalMoHUA: xvUploadApprovalMoHUA,
  xvUploadApprovalByMoHUAtoState: xvUploadApprovalByMoHUAtoState,
  xvUploadApprovalState: xvUploadApprovalState,
  xvUploadRejectUlb: xvUploadRejectUlb,
  xvUploadRejectState: xvUploadRejectState,
  xvUploadMultiRejectState,
  xvUploadMultiRejectUlb,
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
  sendAccountReActivationEmail,
  utilizationRequestAction,
  grantClaimAcknowledgement,
  gtcSubmission,
  ulbFormSubmitted,
  CfrFormRejected,
  CfrFormApproved,
  alertStateToClaimGrants,
  stateUlbFormTrigger,
  alertStateWithMohuaAction,
  xvUploadApprovalByStateToUlb,
  xvUploadApprovalForState

};
