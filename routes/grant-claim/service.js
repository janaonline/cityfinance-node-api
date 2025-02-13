const catchAsync = require("../../util/catchAsync");
const Ulb = require("../../models/Ulb");
const State = require("../../models/State");
const Year = require("../../models/Year")
const GrantsClaimed = require('../../models/GrantsClaimed')
const Masterform = require("../../models/MasterForm")
const GTCertificate = require('../../models/StateGTCertificate')
const GrantClaim = require('../../models/GrantClaim')
const GTCModel = require('../../models/StateGTCertificate')
const GrantClaimed = require('../../models/GrantsClaimed')
const ObjectId = require("mongoose").Types.ObjectId;
const Service = require("../../service");
const UA = require("../../models/UA");
const moment = require("moment");
const util = require("util");
const axios = require('axios');
const express = require('express');
const putDataService = require("../file-upload/service").putData;
const { findOneAndUpdate } = require("../../models/StateGTCertificate");
var http = require('http');
const https = require('https');

var fs = require('fs');
const time = () => {
    var dt = new Date();
    dt.setHours(dt.getHours() + 5);
    dt.setMinutes(dt.getMinutes() + 30);
    return dt;
};

module.exports.get = catchAsync(async (req, res) => {
    let expectedValues = {
        annualAccounts: 25,
        utilReport: 100,
        slb: 100
    }
    let claimsInformation = {
        npmc_tied: null,
        nmpc_untied: null,
        mpc: null
    }
    const conditions_nmpc_untied_1st = [
        { "1": "Grant Transfer Certificate for 2nd installment of FY 2020-21 uploaded and approved by MoHUA." }
    ]
    const conditions_nmpc_untied_2nd = [
        { "1": `${expectedValues.annualAccounts}% of ULBs have submitted Audited and Provisional Financial Statements and the State Nodal Officer has approved the same.` },
        { "2": `Grant Transfer Certificate for 1st Installment of FY 2021-22 uploaded and approved by MoHUA.` }
    ]
    const conditions_nmpc_tied_1st = [
        { "1": "Grant Transfer Certificate for 2nd installment of FY 2020-21 uploaded and approved by MoHUA." }
    ]
    const conditions_nmpc_tied_2nd = [
        { "1": `${expectedValues.annualAccounts}% of ULBs have submitted Audited and Provisional Financial Statements and the State Nodal Officer has approved the same.` },
        { "2": `${expectedValues.utilReport}% of the Non-Million Plus Cities have uploaded the detailed utilization reports and the State Nodal Officer has approved the same.` },
        { "3": `Grant Transfer Certificate for 1st Installment of FY 2021-22 uploaded and approved by MoHUA.` }
    ]
    const conditions_mpc = [
        { "1": `${expectedValues.annualAccounts}% of ULBs have submitted Audited and Provisional Financial Statements and the State Nodal Officer has approved the same.` },
        { "2": `${expectedValues.utilReport}% of the Million Plus Cities have uploaded the detailed utilization reports and the State Nodal Officer has approved the same.` },
        { "3": `${expectedValues.slb}% of the Million Plus Cities submitted the service level benchmark details and the State Nodal Officer has approved the same.` },
        { "4": `Grant Transfer Certificate for FY 2021-22 uploaded and approved by MoHUA.` },
        { "5": `Projects selected for rejuvenation of water bodies, recycling and reuse of waste water and water supply for each Million Plus City/ UA` },
        { "6": `Year-wise action plan for projects to be undertaken by each Million Plus City/ UA from 15th FC grants completed` }
    ]
    const { financialYear, stateId } = req.query
    const claimsData = await GrantsClaimed.findOne({ state: ObjectId(stateId), financialYear: ObjectId(financialYear) }).lean()
    if (claimsData) {

        let claim_mpc = 0,
            claim_nmpc_tied_1stInst = 0,
            claim_nmpc_tied_2ndInst = 0,
            claim_nmpc_untied_1stInst = 0,
            claim_nmpc_untied_2ndInst = 0,
            gtcData_1stInst = {},
            gtcData_2ndInst = {},
            gtc_nmpc_untied_1stUrl = "",
            gtc_nmpc_untied_1st = false,
            gtc_nmpc_tied_1stUrl = "",
            gtc_nmpc_tied_1st = false,
            gtc_nmpc_untied_2ndUrl = "",
            gtc_nmpc_untied_2nd = false,
            gtc_nmpc_tied_2ndUrl = "",
            gtc_nmpc_tied_2nd = false,
            gtc_mpcUrl = ""
        gtc_mpc = false,
            claimed_nmpc_untied_1st = false,
            claimed_nmpc_untied_2nd = false,
            claimed_nmpc_tied_1st = false,
            claimed_nmpc_tied_2nd = false,
            claimed_mpc = false,
            claimedData_nmpc_untied_1st = {},
            claimedData_nmpc_untied_2nd = {},
            claimedData_nmpc_tied_1st = {},
            claimedData_nmpc_tied_2nd = {},
            claimedData_mpc = {},



            claim_mpc = claimsData['mpc'];
        claimsData['nmpc_untied'].forEach(el => {
            if (el['installment'] == "1") {
                claim_nmpc_untied_1stInst = el?.amount
            } else if (el['installment'] == "2") {
                claim_nmpc_untied_2ndInst = el?.amount
            }
        })
        claimsData['nmpc_tied'].forEach(el => {
            if (el['installment'] == "1") {
                claim_nmpc_tied_1stInst = el?.amount
            } else if (el['installment'] == "2") {
                claim_nmpc_tied_2ndInst = el?.amount
            }
        })
        gtcData_1stInst = await GTCModel.findOne({ state: ObjectId(stateId), installment: "1", design_year: ObjectId(financialYear) }).lean()
        gtcData_2ndInst = await GTCModel.findOne({ state: ObjectId(stateId), installment: "2", design_year: ObjectId(financialYear) }).lean()

        if (gtcData_1stInst) {
            if (gtcData_1stInst.hasOwnProperty('nonmillion_untied')) {
                if (gtcData_1stInst['nonmillion_untied']['pdfUrl'] != null && gtcData_1stInst['nonmillion_untied']['pdfUrl'] != "") {
                    gtc_nmpc_untied_1st = true;
                    gtc_nmpc_untied_1stUrl = gtcData_1stInst['nonmillion_untied']['pdfUrl']
                }

            }
            if (gtcData_1stInst.hasOwnProperty('nonmillion_tied')) {
                if (gtcData_1stInst['nonmillion_tied']['pdfUrl'] != null && gtcData_1stInst['nonmillion_tied']['pdfUrl'] != "") {
                    gtc_nmpc_tied_1st = true;
                    gtc_nmpc_tied_1stUrl = gtcData_1stInst['nonmillion_tied']['pdfUrl']
                }
            }
            if (gtcData_1stInst.hasOwnProperty('million_tied')) {
                if (gtcData_1stInst['million_tied']['pdfUrl'] != null && gtcData_1stInst['million_tied']['pdfUrl'] != "") {
                    gtc_mpcUrl = true;
                    gtc_mpcUrl = gtcData_1stInst['million_tied']['pdfUrl']
                }
            }
        }
        if (gtcData_2ndInst) {
            if (gtcData_2ndInst.hasOwnProperty('nonmillion_untied')) {
                if (gtcData_2ndInst['nonmillion_untied']['pdfUrl'] != null || gtcData_2ndInst['nonmillion_untied']['pdfUrl'] != "") {
                    gtc_nmpc_untied_2nd = true;
                    gtc_nmpc_untied_2ndUrl = gtcData_1stInst['nonmillion_untied']['pdfUrl'];
                }

            }
            if (gtcData_2ndInst.hasOwnProperty('nonmillion_tied')) {
                if (gtcData_2ndInst['nonmillion_tied']['pdfUrl'] != null || gtcData_2ndInst['nonmillion_tied']['pdfUrl'] != "") {
                    gtc_nmpc_tied_2nd = true;
                    gtc_nmpc_tied_2ndUrl = gtcData_2ndInst['nonmillion_tied']['pdfUrl'];
                }
            }
            if (gtcData_2ndInst.hasOwnProperty('million_tied')) {
                if (gtcData_2ndInst['million_tied']['pdfUrl'] != null || gtcData_2ndInst['million_tied']['pdfUrl'] != "") {
                    if (!gtc_mpcUrl) {
                        gtc_mpcUrl = true;
                        gtc_mpcUrl = gtcData_2ndInst['million_tied']['pdfUrl'];
                    }

                }
            }
        }


        const grantClaimsData = await GrantClaim.findOne({ state: ObjectId(stateId), financialYear: ObjectId(financialYear) }).lean()

        if (grantClaimsData) {
            if (grantClaimsData.hasOwnProperty('nmpc_untied')) {
                grantClaimsData['nmpc_untied'].forEach(el => {
                    if (el?.installment == "1") {
                        claimedData_nmpc_untied_1st = el
                    }
                    if (el?.installment == "2") {
                        claimedData_nmpc_untied_2nd = el
                    }
                })
            }
            if (grantClaimsData.hasOwnProperty('nmpc_tied')) {
                grantClaimsData['nmpc_tied'].forEach(el => {
                    if (el?.installment == "1") {
                        claimedData_nmpc_tied_1st = el
                    }
                    if (el?.installment == "2") {
                        claimedData_nmpc_tied_2nd = el
                    }
                })
            }
            if (grantClaimsData.hasOwnProperty('mpc')) {
                claimedData_mpc = grantClaimsData['mpc'][0]
            }
        }

        if (!claimed_nmpc_untied_1st) {
            if (!(claimedData_nmpc_untied_1st && Object.keys(claimedData_nmpc_untied_1st).length === 0 && Object.getPrototypeOf(claimedData_nmpc_untied_1st) === Object.prototype)) {
                if (claimedData_nmpc_untied_1st?.dates?.approvedOn != null || claimedData_nmpc_untied_1st?.dates?.approvedOn != "") {
                    claimed_nmpc_untied_1st = true;
                }
            }
        }
        if (!claimed_nmpc_untied_2nd) {
            if (!(claimedData_nmpc_untied_2nd && Object.keys(claimedData_nmpc_untied_2nd).length === 0 && Object.getPrototypeOf(claimedData_nmpc_untied_2nd) === Object.prototype)) {
                if (claimedData_nmpc_untied_2nd?.dates?.approvedOn != null || claimedData_nmpc_untied_2nd?.dates?.approvedOn != "") {
                    claimed_nmpc_untied_2nd = true;
                }
            }
        }
        if (!claimed_nmpc_tied_1st) {
            if (!(claimedData_nmpc_tied_1st && Object.keys(claimedData_nmpc_tied_1st).length === 0 && Object.getPrototypeOf(claimedData_nmpc_tied_1st) === Object.prototype)) {
                if (claimedData_nmpc_tied_1st?.dates?.approvedOn != null && claimedData_nmpc_tied_1st?.dates?.approvedOn != "") {
                    claimed_nmpc_tied_1st = true;
                }
            }
        }
        if (!claimed_nmpc_tied_2nd) {
            if (!(claimedData_nmpc_tied_2nd && Object.keys(claimedData_nmpc_tied_2nd).length === 0 && Object.getPrototypeOf(claimedData_nmpc_tied_2nd) === Object.prototype)) {
                if (claimedData_nmpc_tied_2nd?.dates?.approvedOn != null && claimedData_nmpc_tied_2nd?.dates?.approvedOn != "") {
                    claimed_nmpc_tied_2nd = true;
                }
            }
        }
        if (!claimed_mpc) {
            if (!(claimedData_mpc && Object.keys(claimedData_mpc).length === 0 && Object.getPrototypeOf(claimedData_mpc) === Object.prototype)) {
                if (claimedData_mpc?.dates?.approvedOn != null && claimedData_mpc?.dates?.approvedOn != "") {
                    claimed_mpc = true
                }
            }
        }




        return res.status(200).json({
            success: true,
            nmpc_untied: {
                firstInstallment: {
                    conditions: conditions_nmpc_untied_1st,
                    claimAmount: claim_nmpc_untied_1stInst,
                    grantClaimed: claimed_nmpc_untied_1st,
                    claimData: claimedData_nmpc_untied_1st,
                    gtcUrl: gtc_nmpc_untied_1stUrl,
                    gtcAvailable: gtc_nmpc_untied_1st

                },
                secondInstallment: {
                    conditions: conditions_nmpc_untied_2nd,
                    claimAmount: claim_nmpc_untied_2ndInst,
                    grantClaimed: claimed_nmpc_untied_2nd,
                    claimData: claimedData_nmpc_untied_2nd,
                    gtcUrl: gtc_nmpc_untied_2ndUrl,
                    gtcAvailable: gtc_nmpc_untied_2nd
                }
            },
            nmpc_tied: {
                firstInstallment: {
                    conditions: conditions_nmpc_tied_1st,
                    claimAmount: claim_nmpc_tied_1stInst,
                    grantClaimed: claimed_nmpc_tied_1st,
                    claimData: claimedData_nmpc_tied_1st,
                    gtcUrl: gtc_nmpc_tied_1stUrl,
                    gtcAvailable: gtc_nmpc_tied_1st
                },
                secondInstallment: {
                    conditions: conditions_nmpc_tied_2nd,
                    claimAmount: claim_nmpc_tied_2ndInst,
                    grantClaimed: claimed_nmpc_tied_2nd,
                    claimData: claimedData_nmpc_tied_2nd,
                    gtcUrl: gtc_nmpc_tied_2ndUrl,
                    gtcAvailable: gtc_nmpc_tied_2nd

                }
            },
            mpc: {
                conditions: conditions_mpc,
                claimAmount: claim_mpc,
                grantClaimed: claimed_mpc,
                claimData: claimedData_mpc,
                gtcUrl: gtc_mpcUrl,
                gtcAvailable: gtc_mpc

            }

        })

    } else {
        return res.status(404).json({
            success: false,
            message: "Claim Amount Not FOUND"
        })
    }



})
module.exports.CreateorUpdate = catchAsync(async (req, res) => {
    const user = req.decoded
    const financialYear = req.body?.financialYear;
    const state = req.body?.state;
    const installment = req.body?.installment
    const amountClaimed = req.body?.amountClaimed
    const type = req.body?.type
    const releaseStatus = false
    let obj = {
        financialYear: null,
        state: null,
        modifiedAt: null,
        nmpc_tied: [{
            installment: null,
            submitStatus: null,
            actionTakenBy: null,
            applicationStatus: null,
            amountClaimed: null,
            dates: {
                submittedOn: null
            }
        }],
        nmpc_untied: [{
            installment: null,
            submitStatus: null,
            actionTakenBy: null,
            applicationStatus: null,
            amountClaimed: null,
            dates: {
                submittedOn: null
            }
        }]
        ,
        mpc: [{
            installment: null,
            submitStatus: null,
            actionTakenBy: null,
            applicationStatus: null,
            amountClaimed: null,
            dates: {
                submittedOn: null
            }
        }]


    };
    if (!financialYear || !state || !amountClaimed || !type) {
        return res.status(400).json({
            success: false,
            message: "Data Missing, please check the keys: financialYear, state, amountClaimed, type"
        })
    }
    if (type == 'nmpc_tied') {
        delete obj.mpc;
        delete obj.nmpc_untied;
    } else if (type == 'nmpc_untied') {
        delete obj.mpc;
        delete obj.nmpc_tied;
    } else if (type == 'mpc') {
        delete obj.nmpc_untied;
        delete obj.nmpc_tied;
    }

    if (user.role == 'STATE') {
        obj['financialYear'] = ObjectId(financialYear);
        obj['state'] = ObjectId(state);
        obj['modifiedAt'] = time();
        obj[type][0]['installment'] = type != 'mpc' ? installment : null;
        obj[type][0]['submitStatus'] = true;
        obj[type][0]['releaseStatus'] = releaseStatus;
        obj[type][0]['actionTakenBy'] = 'STATE';
        obj[type][0]['applicationStatus'] = 'PENDING';
        obj[type][0]['amountClaimed'] = amountClaimed;
        obj[type][0]['dates']['submittedOn'] = time();

        let stateData = await State.findOne({ _id: ObjectId(state) }).lean()
        console.log(util.inspect(obj, { showHidden: false, depth: null }))
        let grantClaimData = await GrantClaim.findOne({
            financialYear: ObjectId(financialYear),
            state: ObjectId(state)
        }).lean()

        //email trigger
        if (req.header.host == `${process.env.PROD_HOST}`) {
            let template = Service.emailTemplate.grantClaimAcknowledgement(
                type,
                installment,
                stateData.name,
                '2021-22',
                user?.name ?? 'User',
                amountClaimed
            )
            // let mailOptions = {
            //     to: [user.email, "ansh.mittal@janaagraha.org", "pankaj.mittal@janaagraha.org"] ,
            //     subject: template.subject,
            //     html: template.body,
            // };
            let mailOptions = {
                Destination: {
                    /* required */
                    ToAddresses: [user.email, "ansh.mittal@janaagraha.org", "pankaj.mittal@janaagraha.org"]
                },
                Message: {
                    /* required */
                    Body: {
                        /* required */
                        Html: {
                            Charset: "UTF-8",
                            Data: template.body
                        },
                    },
                    Subject: {
                        Charset: 'UTF-8',
                        Data: template.subject
                    }
                },
                Source: process.env.EMAIL,
                /* required */
                ReplyToAddresses: [process.env.EMAIL],
            }
            Service.sendEmail(mailOptions);
        }




        if (!grantClaimData) {
            await GrantClaim.create(obj)
            return res.status(200).json({
                success: true,
                message: "Form Submitted Successfully. The grant application is now under MoHUA for review"
            })
        } else {
            // console.log(util.inspect(grantClaimData, { showHidden: false, depth: null }))

            if (type != 'mpc') {
                if (grantClaimData.hasOwnProperty(type)) {
                    if (grantClaimData[type].length == 1) {
                        if (grantClaimData[type][0]?.installment == String(installment)) {
                            grantClaimData[type][0] = obj[type][0]
                        } else {
                            grantClaimData[type].push(obj[type][0])
                        }
                    } else if (grantClaimData[type].length == 2) {
                        let c = 0
                        for (el of grantClaimData[type]) {

                            if (el.installment == String(installment)) {
                                // el = null;
                                grantClaimData[type][c] = obj[type][0]
                                console.log('check this', obj[type][0])
                            }
                            c++;
                        }
                        console.log(util.inspect(grantClaimData, { showHidden: false, depth: null }))

                    } else {

                        grantClaimData[type] = obj[type];
                    }
                } else {
                    grantClaimData[type] = obj[type];
                }
            } else if (type == 'mpc') {
                grantClaimData[type] = obj[type]
            }

            // console.log(util.inspect(grantClaimData, { showHidden: false, depth: null }))
            // res.send(grantClaimData)
            // return

            await GrantClaim.findOneAndUpdate({
                financialYear: ObjectId(financialYear),
                state: ObjectId(state)
            }, grantClaimData)
            return res.status(200).json({
                success: true,
                message: "Form Updated Successfully. The grant application is now under MoHUA for review"
            })
        }

    } else {
        return res.status(403).json({
            success: false,
            messsage: "Forbidden"
        })

    }

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

module.exports.uploadGrantData = catchAsync(async (req, res) => {
    const jsonArray = req.body.jsonArray;
    let x = 0;
    let year = await Year.findOne({ year: jsonArray[0]['Year'] }).lean()
    jsonArray.map(async (el) => {
        let state = await State.findOne({ name: el['State'] }).lean()
        if (!state) {
            console.log('*****NOT FOUND****', el['State'])
            return res.json({
                message: `State not found ${el['State']}`
            })
        }
        let type = el['Type'].includes('-') ? el['Type'].replace('-', '_') : el['Type']
        let installment = el['Installment']
        let pushData = {

            isDraft: false,
            million_tied: {
                pdfUrl: "",
                pdfName: "",
                status: "APPROVED",
                rejectReason: "",
            },
            nonmillion_tied: {
                pdfUrl: "",
                pdfName: "",
                status: "APPROVED",
                rejectReason: "",
            },
            nonmillion_untied: {
                pdfUrl: "",
                pdfName: "",
                status: "APPROVED",
                rejectReason: "",
            },
            status: "APPROVED",

        }
        if (type == 'MPC') {
            delete pushData['nonmillion_tied']
            delete pushData['nonmillion_untied']
            pushData['million_tied']['pdfUrl'] = el['Link'];
        } else if (type == 'NMPC_Untied') {
            delete pushData['nonmillion_tied']
            delete pushData['million_tied']
            pushData['nonmillion_untied']['pdfUrl'] = el['Link'];

        } else if (type == 'NMPC_Tied') {
            delete pushData['nonmillion_untied']
            delete pushData['million_tied']
            pushData['nonmillion_tied']['pdfUrl'] = el['Link'];
        }

        await GTCModel.findOneAndUpdate({ state: ObjectId(state._id), design_year: ObjectId(year._id), installment: installment }, pushData, { upsert: true })



    })

    return res.json({
        success: true,
        message: "Updated"
    })




})

module.exports.grantStatusCSV = catchAsync(async (req, res) => {
    const jsonArray = req.body.jsonArray;
    for (let el of jsonArray) {

        let inst = el.installment ?? null;
        let year = el.year;
        let type = el.type;
        let state = el.state;
        let amount = el.amount;
        let date = el.date;
        let status = el.status;

        let obj = {
            financialYear: null,
            state: null,
            modifiedAt: null,
            nmpc_tied: [{
                installment: null,
                submitStatus: null,
                actionTakenBy: null,
                applicationStatus: null,
                amountClaimed: null,
                dates: {
                    submittedOn: null
                }
            }],
            nmpc_untied: [{
                installment: null,
                submitStatus: null,
                actionTakenBy: null,
                applicationStatus: null,
                amountClaimed: null,
                dates: {
                    submittedOn: null
                }
            }]
            ,
            mpc: [{
                installment: null,
                submitStatus: null,
                actionTakenBy: null,
                applicationStatus: null,
                amountClaimed: null,
                dates: {
                    submittedOn: null
                }
            }]


        };
        if (type == 'nmpc_tied') {
            delete obj.mpc;
            delete obj.nmpc_untied;
        } else if (type == 'nmpc_untied') {
            delete obj.mpc;
            delete obj.nmpc_tied;
        } else if (type == 'mpc') {
            delete obj.nmpc_untied;
            delete obj.nmpc_tied;
        }
        let stateData = await State.findOne({ name: state }).lean()
        if (!stateData) {
            console.log(`State Not Found -${state}`)
            return res.json({
                message: `State Not Found -${state}`
            })
        }
        if (date) {
            date = moment(date, 'DD-MM-YYYY')
        }

        let financialYear = await Year.findOne({ year: year }).lean()

        let grantClaimData = await GrantClaim.findOne({ financialYear: ObjectId(financialYear._id), state: ObjectId(stateData._id) }).lean()
        obj['financialYear'] = ObjectId(financialYear._id);
        obj['state'] = ObjectId(stateData._id);
        obj['modifiedAt'] = time();
        obj[type][0]['installment'] = type != 'mpc' ? inst : null;


        obj[type][0]['submitStatus'] = true;
        obj[type][0]['releaseStatus'] = status == '1' ? true : false
        obj[type][0]['actionTakenBy'] = status == '1' || status == '2' ? 'MoHUA' : 'STATE';
        obj[type][0]['applicationStatus'] = status == '1' || status == '2' ? 'APPROVED' : 'PENDING';
        obj[type][0]['amountClaimed'] = amount ?? null;
        obj[type][0]['dates']['submittedOn'] = date ?? null;



        if (!grantClaimData) {
            const doc = new GrantClaim(obj);
            await doc.save();

        } else {
            // console.log(util.inspect(grantClaimData, { showHidden: false, depth: null }))

            if (type != 'mpc') {
                if (grantClaimData.hasOwnProperty(type)) {
                    if (grantClaimData[type].length == 1) {
                        if (grantClaimData[type][0]?.installment == String(inst)) {
                            grantClaimData[type][0] = obj[type][0]
                        } else {
                            grantClaimData[type].push(obj[type][0])
                        }
                    } else if (grantClaimData[type].length == 2) {
                        let c = 0
                        for (el of grantClaimData[type]) {

                            if (el.installment == String(inst)) {
                                // el = null;
                                grantClaimData[type][c] = obj[type][0]
                                console.log('check this', obj[type][0])
                            }
                            c++;
                        }
                        // console.log(util.inspect(grantClaimData, { showHidden: false, depth: null }))

                    } else {

                        grantClaimData[type] = obj[type];
                    }
                } else {
                    grantClaimData[type] = obj[type];
                }
            } else if (type == 'mpc') {
                grantClaimData[type] = obj[type]
            }

            // console.log(util.inspect(grantClaimData, { showHidden: false, depth: null }))
            // res.send(grantClaimData)
            // return

            await GrantClaim.findOneAndUpdate({ financialYear: ObjectId(financialYear._id), state: ObjectId(stateData._id) }, grantClaimData)

        }


    }

    return res.json({
        message: "Task Done"
    });

})

module.exports.updateLatLong = catchAsync(async (req, res) => {
    const jsonArray = req.body.jsonArray;
    let noFound = []
    for (let el of jsonArray) {
        let ulbData = await Ulb.findOne({ code: el['City Finance Code'] }).lean()

        if (!ulbData) {
            notFound.push(el['City Finance Code'])
            continue;
        } else {
            if (ulbData.hasOwnProperty('population') && ulbData['population'] != "" && ulbData['population'] != null) {
                if (el['Population as per Census 2011'] != 'Not found') {
                    ulbData.population = el['Population as per Census 2011']
                }
                if (el['New Latitude'] != 'Not found' && el['New Longitude'] != 'Not found') {
                    ulbData.location.lat = el['New Latitude']
                    ulbData.location.lng = el['New Longitude']
                }
            }



        }
        await Ulb.updateOne({ code: el['City Finance Code'] }, ulbData)

    }
    console.log(notFound)
    return res.json({
        success: true,
        message: "Done",
        notFound: notFound
    })
})

module.exports.updatepopulation = catchAsync(async (req, res) => {
    const jsonArray = req.body.jsonArray;
    let notFound = []
    for (let el of jsonArray) {
        let ulbData = await Ulb.findOne({ code: el['code'] }).lean()
        if (!ulbData) {
            notFound.push(el['code'])
            continue;
        } else {
            ulbData['population'] = el['population']
        }
        await Ulb.updateOne({ code: el['code'] }, ulbData)
    }
    res.send('Done');
})

module.exports.updateyearkeys = catchAsync(async (req, res) => {
    const jsonArray = req.body.jsonArray;
    for (let el of jsonArray) {
        let ulbData = await Ulb.findOne({ code: el['City Finance Code'] }).lean()
        if (ulbData) {
            ulbData['access_2122'] = false;
            Ulb.updateOne({ code: el['City Finance Code'] }, ulbData, function (err, docs) {
                if (err) {
                    console.log(err)
                }
                else {
                    console.log("Updated Docs : ", docs);
                }
            })
        }

    }
    res.send('Done')

})
var download = function (data, _cb) {
    let url = data['Link'];
    let fileName = data['State'] + '_' + data['Year'] + '_' + data['Type'] + '_' + data['Installment'] + '.pdf';
    console.log(fileName);

    let dest = "/tmp/" + fileName;
    var file = fs.createWriteStream(dest);
    let isHttps = url.includes("https");
    if (isHttps) {
        const req = https.get(url, function (response) {
            response.pipe(file);
            file.on('finish', function () {
                file.close(function () {
                    _cb(null, file)
                });  // close() is async, call cb after close completes.
            });
        });
    } else {
        const req = http.get(url, function (response) {
            response.pipe(file);
            file.on('finish', function () {
                file.close(function () {
                    _cb(null, file)
                });  // close() is async, call cb after close completes.
            });
        });
    }
}


function calculateEligibility(financialYear, stateId, expectedValues) {
    return new Promise(async (rslv, rjct) => {
        try {
            let eligibility = {
                nmpc_tied: [{
                    installment: 1,
                    eligible: true
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
            } else {
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