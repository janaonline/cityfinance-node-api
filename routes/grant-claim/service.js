const catchAsync = require("../../util/catchAsync");
const Ulb = require("../../models/Ulb");
const State = require("../../models/State");
const Year = require("../../models/Year")
const GrantsClaimed = require('../../models/GrantsClaimed')
const Masterform = require("../../models/MasterForm")
const GTCertificate = require('../../models/StateGTCertificate')
const ObjectId = require("mongoose").Types.ObjectId;
const Service = require("../../service");
const UA = require("../../models/UA");
const moment = require("moment");
const util = require("util");



module.exports.get = catchAsync(async (req, res) => {
    let expectedValues = {
        annualAccounts: 25,
        utilReport: 100,
        slb: 100
    }
    const conditions_nmpc = [
        {
            installment: "1",
            statements: [{
                achieved: null,
                text: "Submit Grant Transfer Certificate for 2nd installment of FY 2020-21"
            }]
        }, {
            installment: "2",
            statements: [
                {
                    achieved: null,
                    text: `${expectedValues.annualAccounts}% of ULBs have submitted Audited and Provisional Financial Statements and the State Nodal Officer has approved the same.`
                },
                {
                    achieved: null,
                    text: `${expectedValues.utilReport}% of the Million Plus Cities have uploaded the detailed utilization reports and the State Nodal Officer has approved the same.`
                }, {
                    achieved: null,
                    text: `${expectedValues.slb}% of the MPCs submitted the service level benchmark details and the State Nodal Officer has approved the same.`

                }, {
                    tied: null,
                    untied: null,
                    text: `Grant transfer certificate for FY 2021-22 has been uploaded on the Cityfinance website.`
                }
            ]
        }]
    const conditions_mpc = {
        statements: [{
            achieved: null,
            text: `${expectedValues.annualAccounts}% of ULBs have submitted Audited and Provisional Financial Statements and the State Nodal Officer has approved the same.`
        },
        {
            achieved: null,
            text: `${expectedValues.utilReport}% of the Million Plus Cities have uploaded the detailed utilization reports and the State Nodal Officer has approved the same.`
        },
        {
            achieved: null,
            text: `${expectedValues.slb}% of the MPCs submitted the service level benchmark details and the State Nodal Officer has approved the same.`
        }, {
            achieved: null,
            text: `Grant transfer certificate for FY 2021-22 has been uploaded on the Cityfinance website.`

        }, {
            achieved: null,
            text: `Projects selected for rejuvenation of water bodies, recycling and reuse of waste water and water supply for each Million Plus City/ UA`

        },
        {
            achieved: null,
            text: `Year-wise action plan for projects to be undertaken by each Million Plus City/ UA from 15th FC grants completed`
        }

        ]
    }

    const { financialYear, stateId } = req.query
    const eligiblityData = await calculateEligibility(financialYear, stateId, expectedValues)
    console.log(eligiblityData)
    const claimsData = await GrantsClaimed.findOne({ state: ObjectId(stateId), financialYear: ObjectId(financialYear) })
    if (eligiblityData) {
        conditions_nmpc[1].statements[0].achieved = eligiblityData.annualAccountsActual
        conditions_nmpc[1].statements[1].achieved = eligiblityData.utilReportActual
        conditions_nmpc[1].statements[2].achieved = eligiblityData.slbActual
        conditions_nmpc[1].statements[3].tied = eligiblityData.nmpc_tied
        conditions_nmpc[1].statements[3].untied = eligiblityData.nmpc_untied
        conditions_mpc.statements[0].achieved = eligiblityData.annualAccountsActual
        conditions_mpc.statements[1].achieved = eligiblityData.utilReportActual
        conditions_mpc.statements[2].achieved = eligiblityData.slbActual
        conditions_mpc.statements[3].achieved = eligiblityData.mpc
        eligiblityData['conditions_nmpc'] = conditions_nmpc
        eligiblityData['conditions_mpc'] = conditions_mpc
        eligiblityData['claimsData'] = claimsData
        return res.status(200).json({
            success: true,
            data: eligiblityData
        })
    } else {
        return res.status(400).json({
            success: false,
            message: "Failed to get Response"
        })
    }

})
module.exports.CreateorUpdate = catchAsync(async (req, res) => {


})

module.exports.readCSV = catchAsync(async (req, res) => {
    const jsonArray = req.body.jsonArray;
    const installment = req.body.installment
    const financialYear = req.body.financialYear
    let yearData = await Year.findOne({ year: financialYear })
    if (yearData) {
        let data = []

        if (jsonArray) {
            for (el of jsonArray) {
                let obj = {
                    financialYear: ObjectId(yearData._id),
                    state: null,
                    nmpc_tied: [{
                        installment: "1",
                        amount: null
                    },
                    {
                        installment: "2",
                        amount: null
                    }],
                    nmpc_untied: [
                        {
                            installment: "1",
                            amount: null
                        }, {
                            installment: "2",
                            amount: null
                        }],
                    mpc: '',
                }
                let state = await State.findOne({ name: el.State })
                let grantData = await GrantsClaimed.findOne({
                    state: ObjectId(state._id),
                    financialYear: ObjectId(yearData._id)
                }).lean()
                obj.state = ObjectId(state._id);
                if (installment == "1") {
                    obj.nmpc_tied[0].amount = el["NMPC-Tied"]
                    obj.nmpc_untied[0].amount = el["NMPC-Untied"]
                } else if (installment == "2") {
                    obj.nmpc_tied[1].amount = el["NMPC-Tied"]
                    obj.nmpc_untied[1].amount = el["NMPC-Untied"]
                }
                obj.mpc = el["MPC"];
                if (!grantData) {
                    await GrantsClaimed.create(obj)
                } else {
                    if (installment == "1") {
                        grantData.nmpc_tied[0].amount = el["NMPC-Tied"]
                        grantData.nmpc_untied[0].amount = el["NMPC-Untied"]
                    } else if (installment == "2") {
                        grantData.nmpc_tied[1].amount = el["NMPC-Tied"]
                        grantData.nmpc_untied[1].amount = el["NMPC-Untied"]
                    }

                    await GrantsClaimed.findOneAndUpdate({
                        state: ObjectId(state._id),
                        financialYear: ObjectId(yearData._id)
                    }, grantData)
                }




            }
            //   await GrantsClaimed.insertMany(data, function (err) {
            // console.log(err)
            // })
            res.json({
                success: true
            })
        }
    }


})

function calculateEligibility(financialYear, stateId, expectedValues) {
    return new Promise(async (rslv, rjct) => {
        try {
            let eligibility = {
                nmpc_tied: [{
                    installment: 1,
                    eligible: false
                },
                {
                    installment: 2,
                    eligible: false
                }
                ],
                nmpc_untied: [{
                    installment: 1,
                    eligible: false
                },
                {
                    installment: 2,
                    eligible: false
                }
                ],
                mpc: false
            }
            let query_totalULBs = [
                {
                    $match: {
                        state: ObjectId(stateId)
                    }
                },
                {
                    $count: "totalULBsInState"
                }
            ]
            let query_AnnualAccounts = [
                {
                    $match: {
                        state: ObjectId(stateId),
                        design_year: ObjectId(financialYear),
                        "steps.annualAccounts.status": "APPROVED"
                    }
                },
                {
                    $count: "approved"
                }
            ]
            let query_slb = [
                {
                    $match: {
                        state: ObjectId(stateId),
                        design_year: ObjectId(financialYear),
                        "steps.slbForWaterSupplyAndSanitation.status": "APPROVED"
                    }
                },
                {
                    $count: "approved"
                }
            ]
            let query_UtilReport = [
                {
                    $match: {
                        state: ObjectId(stateId),
                        design_year: ObjectId(financialYear),
                        "steps.utilReport.status": "APPROVED"
                    }
                },
                {
                    $count: "approved"
                }
            ]


            const totalUlbs = await Ulb.aggregate(query_totalULBs)
            const annualAccountData = await Masterform.aggregate(query_AnnualAccounts)
            const utilReportData = await Masterform.aggregate(query_UtilReport)
            const slbData = await Masterform.aggregate(query_slb)

            const annualAccountsPercent = calculatePercentage(...annualAccountData, ...totalUlbs)
            const utilReportPercent = calculatePercentage(...utilReportData, ...totalUlbs)
            const slbPercent = calculatePercentage(...slbData, ...totalUlbs)
            let millionTied = false;
            let nonMillionUntied = false;
            let nonMillionTied = false;


            const gtCertificate = await GTCertificate.find({ state: ObjectId(stateId), design_year: ObjectId(financialYear) })
            if (gtCertificate) {
                if (gtCertificate?.million_tied != null || gtCertificate?.million_tied != '') {
                    millionTied = true;
                }
                if (gtCertificate?.nonmillion_tied != null || gtCertificate?.nonmillion_tied != '') {
                    nonMillionTied = true;
                }
                if (gtCertificate?.nonmillion_untied != null || gtCertificate?.nonmillion_untied != '') {
                    nonMillionUntied = true;
                }
            }
            //eligiblity for non Million Tied
            if (annualAccountsPercent >= expectedValues.annualAccounts &&
                utilReportPercent >= expectedValues.utilReport &&
                slbPercent >= expectedValues.slb &&
                nonMillionTied
            ) {
                eligibility.nmpc_tied[1].eligible = true
            }
            //eligiblity for non Million Untied
            if (annualAccountsPercent >= expectedValues.annualAccounts &&
                utilReportPercent >= expectedValues.utilReport &&
                slbPercent >= expectedValues.slb &&
                nonMillionUntied
            ) {
                eligibility.nmpc_untied[1].eligible = true
            }
            //eligiblity for Service Level Becnhmarks
            if (annualAccountsPercent >= expectedValues.annualAccounts &&
                utilReportPercent >= expectedValues.utilReport &&
                slbPercent >= expectedValues.slb
            ) {
                eligibility.mpc = true
            }
            const data = {
                eligibility: eligibility,
                annualAccountsActual: annualAccountsPercent,
                annualAccountsExpected: expectedValues.annualAccounts,
                utilReportActual: utilReportPercent,
                utilReportExpected: expectedValues.utilReport,
                slbActual: slbPercent,
                slbExpected: expectedValues.slb,
                nmpc_untied: nonMillionUntied,
                nmpc_tied: nonMillionTied,
                mpc: millionTied
            }
            // console.log(data)
            rslv(data)
        } catch (err) {
            console.log(err.message)
        }
    })

}

function calculatePercentage(a, b) {
    return Number(((a?.approved / b?.totalULBsInState) * 100).toFixed(2))
}