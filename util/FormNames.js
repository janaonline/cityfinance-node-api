module.exports.FormNames = {
    gfc: "Garbage Free City (GFC)",
    odf: "Open Defecation Free (ODF)",
    gtc: "Grant Transfer Certificate",
    dur: "Detailed Utilisation Report",
    pfms: "Linking of PFMS Account",
    annualAcc: "Annual Accounts",
    propTaxOp: "Property Tax Operationalisation",
    slb28: "28 SLBs",
    indicatorForm: "Indicators for Water Supply and Sanitation",
    slbScoring: "Submit Claims for 15th FC Grants",
    detailPTaxOp : "Details of Property Tax and User Charges"
}

module.exports.FormURL = {
    "23_24":{
        "GTC_STATE": "/gtCertificate"
    }
}
// values: ["Grant Transfer Certificate", "Detailed Utilisation Report",
// "Annual Accounts", "Linking of PFMS Account", "Property Tax Operationalisation",
// "SLBs for Water Supply and Sanitation", "Open Defecation Free (ODF)", 
// "Garbage Free City (GFC)", "Scoring"],

module.exports.YEAR_CONSTANTS = {
    "20_21": "606aadac4dff55e6c075c507",
    "21_22": "606aaf854dff55e6c075d219",
    "22_23": "606aafb14dff55e6c075d3ae",
    "23_24": "606aafc14dff55e6c075d3ec",
    "24_25": "606aafcf4dff55e6c075d424"
}
module.exports.YEAR_CONSTANTS_IDS = {
    "63735a4bd44534713673bfbf": "2017-18",
    "63735a5bd44534713673c1ca": "2018-19",
    "607697074dff55e6c0be33ba": "2019-20",
    "606aadac4dff55e6c075c507": "2020-21",
    "606aaf854dff55e6c075d219": "2021-22",
    "606aafb14dff55e6c075d3ae": "2022-23",
    "606aafc14dff55e6c075d3ec": "2023-24",
    "606aafcf4dff55e6c075d424": "2024-25"
}

module.exports.ULB_ACCESSIBLE_YEARS = {
    "2021-22": "access_2122",
    "2022-23": "access_2223",
    "2023-24": "access_2324",
    "2024-25": "access_2425"
}

module.exports.MASTER_STATUS = {
    "No Status": -1,
    "Not Started": 1,
    "In Progress": 2,
    "Under Review By State": 3,
    "Under Review By MoHUA": 4,
    "Returned By State": 5,
    "Submission Acknowledged By MoHUA": 6,
    "Returned By MoHUA": 7,
    "Verification Not Started": 8,
    "Verification In Progress": 9,
    "Returned by PMU": 10,
    "Submission Acknowledged by PMU": 11,
}

module.exports.MASTER_FORM_STATUS = {
    NO_STATUS: -1,
    NOT_STARTED: 1,
    IN_PROGRESS: 2,
    UNDER_REVIEW_BY_STATE: 3,
    UNDER_REVIEW_BY_MoHUA: 4,
    RETURNED_BY_STATE: 5,
    SUBMISSION_ACKNOWLEDGED_BY_MoHUA: 6,
    RETURNED_BY_MoHUA: 7,
    VERIFICATION_NOT_STARTED: 8,
    VERIFICATION_IN_PROGRESS: 9,
    RETURNED_BY_PMU: 10,
    SUBMISSION_ACKNOWLEDGED_BY_PMU: 11,
}
module.exports.FORM_STATUS_CODES = {
    NO_STATUS: -1,
    NOT_STARTED: 1,
    IN_PROGRESS: 2,
    UNDER_REVIEW_BY_STATE: 3,
    UNDER_REVIEW_BY_MOHUA: 4,
    RETURNED_BY_STATE: 5,
    SUBMISSION_ACKNOWLEDGED_BY_MOHUA: 6,
    RETURNED_BY_MOHUA: 7,
    VERIFICATION_NOT_STARTED: 8,
    VERIFICATION_IN_PROGRESS: 9,
    RETURNED_BY_PMU: 10,
    SUBMISSION_ACKNOWLEDGED_BY_PMU: 11,
}
module.exports.PREV_MASTER_FORM_STATUS = {
    NO_STATUS: -1,
    NOT_STARTED: 1,
    IN_PROGRESS: 2,
    UNDER_REVIEW_BY_STATE: 3,
    UNDER_REVIEW_BY_MOHUA: 4,
    RETURNED_BY_STATE: 5,
    APPROVED_BY_MOHUA: 6,
    RETURNED_BY_MOHUA: 7,
    VERIFICATION_NOT_STARTED: 8,
    VERIFICATION_IN_PROGRESS: 9,
    RETURNED_BY_PMU: 10,
    SUBMISSION_ACKNOWLEDGED_BY_PMU: 11,
}

module.exports.MASTER_FORM_QUESTION_STATUS = {
    4: "APPROVED",
    5: "REJECTED",
    6: "APPROVED",
    7: "REJECTED",
    10: "REJECTED",
    11: "APPROVED",
    "": ""
}
module.exports.MASTER_FORM_QUESTION_STATUS_STATE = {
    4: "PENDING",
    5: "REJECTED",
    6: "Submission Acknowledged By MoHUA",
    7: "REJECTED",
    10: "REJECTED",
    11: "APPROVED",
    "": ""
}
module.exports.MASTER_STATUS_ID = {
    "-1": "No Status",
    1: "Not Started",
    2: "In Progress",
    3: "Under Review By State",
    4: "Under Review By MoHUA",
    5: "Returned By State",
    6: "Submission Acknowledged By MoHUA",
    7: "Returned By MoHUA",
    8: "Verification Not Started",
    9: "Verification In Progress",
    10: "Returned by PMU",
    11: "Submission Acknowledged by PMU"
};
module.exports.FORMIDs = {
    "ODF": 1,
    "GFC": 2,
    "PTO": 3,
    "AnnualAccount": 5,
    'dur': 4,
    "twentyEightSlb": 6,
    "fiscalRanking": 9,
    "GTC_STATE": 7,
    "PFMS": 8,
    "GTC_TABLE_STRUCTURE": 11.1,
    "GTC_ULB": 11,
    "waterRej": 12,
    "actionPlan": 13,
    "indicatorForm": 14,
    "GrantAllocation": 11.2,
    "SFC": 15,
    "SubmitClaim": 16,
    "PTOFloorRate": 17
}
module.exports.FORM_LEVEL_SHORTKEY = {
    form: "form_level",
    tab: "tab_level",
    question: "question_level"
}
module.exports.FORM_LEVEL = {
    "form": 1,
    "tab": 2,
    "question": 3
}


module.exports.MODEL_PATH = {
    1: "OdfFormCollection",
    2: "GfcFormCollection",
    3: "PropertyTaxOp",
    5: "AnnualAccounts",
    6: "TwentyEightSlbsForm",
    7: "GrantTransferCertificate",
    11.2: "GrantDistribution",
    4: "UtilizationReport",
    12: "WaterRejenuvation&Recycling",
    13: 'ActionPlans',
    8: "LinkPFMS"

}

module.exports.POPULATION_TYPE = {
    1: "4M+",
    2: "1M to 4M",
    3: "100K to 1M",
    4: "<100K"
}
module.exports.USER_ROLE = {
    "MoHUA": "MoHUA",
    "STATE": "STATE",
    "ULB": "ULB"
}
module.exports.FORM_TYPE_SUBMIT_CLAIM = {  // submit grant claim 
    1:"1_nmpc_tied", // combination of installment and form Type
    2:"2_nmpc_tied",
    3:"1_nmpc_untied",
    4:"2_nmpc_untied", 
    5:"1_mpc_tied"
 };

 module.exports.FORM_TYPE_NAME = {  // submit grant claim 
    "nmpc_tied" : "Claim Non-Million Plus Cities Tied Grants", 
    "nmpc_untied" : "Claim Non-Million Plus Cities Untied Grants" ,
    "mpc_tied" : "Claim Million Plus Cities Tied Grants"
 };
module.exports.INSTALLMENT_TYPE = { //Submit Grant Claim
 "mpc":"mpc_tied",
 "nmpcTied":"nmpc_tied",
 "nmpcUntied": "nmpc_untied"
}
 module.exports.INSTALLMENT_NAME = {  // submit grant claim 
    1 : "1st Installment", 
    2 : "2nd Installment" ,
 };

 module.exports.GSDP_OPT = {
    ELIGIBLE: 'Eligible',
    NOT_ELIGIBLE: 'Not Eligible'
}

module.exports.DULY_ELECTED_OPT= {
    DULY_ELECTED: 'Duly Elected',
    NOT_ELECTED: 'Not Elected'
}

module.exports.TEST_EMAIL= {
    test1 : "testingdhwani@gmail.com",
    test2: "mohamma.zuhaib@janaagraha.org",
    test3:"hariprasad.v@janaagraha.org",
    test4:"navinder.singh@janaagraha.org",
    // test5: "niyaz.ahmad@dhwaniris.com"
}




module.exports.ENV = {
    prod: "production",
    stg: "staging",
    demo: "demo"
}

// IMPORTANT :: if need any change please inform frotend.
module.exports.APPROVAL_TYPES = {
    'ulbEnteredPmuAccept': 1,
    'ulbEnteredPmuReject': 2,
    'enteredPmuAcceptUlb': 3,
    'enteredPmuRejectUlb': 4,
    'enteredUlbAcceptPmu': 5,
    'enteredPmuAcceptPmu': 6,
    'enteredPmuSecondAcceptPmu': 7,
    'enteredPmuAcceptPmuAuto': 8,
}