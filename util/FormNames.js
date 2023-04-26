module.exports.FormNames = {
    gfc: "Garbage Free City (GFC)",
    odf: "Open Defecation Free (ODF)",
    gtc: "Grant Transfer Certificate",
    dur: "Detailed Utilisation Report",
    pfms: "Linking of PFMS Account",
    annualAcc: "Annual Accounts",
    propTaxOp: "Property Tax Operationalisation",
    slb28: "28 SLBs",

}

// values: ["Grant Transfer Certificate", "Detailed Utilisation Report",
// "Annual Accounts", "Linking of PFMS Account", "Property Tax Operationalisation",
// "SLBs for Water Supply and Sanitation", "Open Defecation Free (ODF)", 
// "Garbage Free City (GFC)", "Scoring"],

module.exports.YEAR_CONSTANTS = {
    "20_21": "606aadac4dff55e6c075c507",
    "21_22":"606aaf854dff55e6c075d219",
    "22_23":"606aafb14dff55e6c075d3ae",
    "23_24": "606aafc14dff55e6c075d3ec"
}


module.exports.ULB_ACCESSIBLE_YEARS = {
    "2021-22":"access_2122",
    "2022-23":"access_2223",
    "2023-24":"access_2324"
}


module.exports.MASTER_STATUS = {
    "No Status": -1,
    "Not Started": 1,
    "In Progress": 2,
    "Under Review By State": 3,
    "Under Review By MoHUA": 4,
    "Returned By State": 5,
    "Submission Acknowledged By MoHUA": 6,
    "Returned By MoHUA":7
}

module.exports.MASTER_STATUS_ID = {
  "-1" : "No Status",
  1: "Not Started",
  2: "In Progress",
  3: "Under Review By State",
  4: "Under Review By MoHUA",
  5: "Returned By State",
  6: "Submission Acknowledged By MoHUA",
  7: "Returned By MoHUA",
};

module.exports.FORMIDs = {
    "ODF": 1,
    "GFC":2,
    "PTO":3,
    "AnnualAccount": 5,
    'dur':4,
    "twentyEightSlb": 6,
    "fiscalRanking":9
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
    4: "UtilizationReport"
}