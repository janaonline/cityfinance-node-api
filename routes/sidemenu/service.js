const catchAsync = require('../../util/catchAsync')
const Sidemenu = require('../../models/Sidemenu')
const ObjectId = require("mongoose").Types.ObjectId;
const Year = require('../../models/Year');
const { ULBMASTER } = require('../../_helper/constants');
const StatusList = require('../../util/newStatusList')
//Importing all ULB forms
const AnnualAccounts = require('../../models/AnnualAccounts')
const DUR = require('../../models/UtilizationReport')
const ODF = require('../../models/OdfFormCollection')
const GFC = require('../../models/GfcFormCollection')
const SLB = require('../../models/XVFcGrantForm')
const PFMS = require('../../models/LinkPFMS')
const PropTax = require('../../models/PropertyTaxOp')
const ticks = {
    "green": "../../../assets/form-icon/checked.svg",
    "red": "../../../assets/form-icon/cancel.svg"
}
const FormModelMapping = {
    AnnualAccounts: ObjectId("62b3f7b29bac122d28cf7e25"),
    DUR: ObjectId("62b3f79e9bac122d28cf7e23"),
    GFC: "",
    ODF: "",
    SLB: "",
    PFMS: ObjectId("62b3f7c49bac122d28cf7e27"),
    PropTax: ObjectId("62b3f7d79bac122d28cf7e29"),
}

const calculateTick = (tooltip) => {
    if (tooltip == StatusList.Not_Started || tooltip == StatusList.In_Progress || tooltip == StatusList.Rejected_By_State || tooltip == StatusList.Rejected_By_MoHUA) {
        return ticks['red']
    } else {
        return ticks['green']
    }

}

const calculateStatus = (status, actionTakenByRole, isDraft) => {
    switch (true) {
        case status == 'PENDING' && actionTakenByRole == 'ULB' && isDraft:
            return StatusList.In_Progress
            break;
        case status == 'PENDING' && actionTakenByRole == 'ULB' && !isDraft:
            return StatusList.Under_Review_By_State
            break;
        case status == 'APPROVED' && actionTakenByRole == 'STATE' && !isDraft:
            return StatusList.Under_Review_By_MoHUA
            break;
        case status == 'REJECTED' && actionTakenByRole == 'STATE' && !isDraft:
            return StatusList.Rejected_By_State
            break;
        case status == 'APPROVED' && actionTakenByRole == 'MoHUA' && !isDraft:
            return StatusList.Approved_By_MoHUA
            break;
        case status == 'REJECTED' && actionTakenByRole == 'MoHUA' && !isDraft:
            return StatusList.Rejected_By_MoHUA
            break;

        default:
            return StatusList.Not_Started
            break;
    }
}

const findStatusAndTooltip = (formData, formId) => {
    if (formId == ObjectId("62b3f7fe9bac122d28cf7e2b") || formId == ObjectId("62b3f8a29bac122d28cf7e33")) {

    }
    let status = formData.status;
    let actionTakenByRole = formData.actionTakenByRole;
    let isDraft = formData.isDraft;
    let tooltip = calculateStatus(status, actionTakenByRole, isDraft);
    let tick = calculateTick(tooltip)

    return {
        [formId]: {
            tooltip: tooltip,
            tick: tick
        }
    }

}

module.exports.get = catchAsync(async (req, res) => {
    let user = req.decoded;
    let role = req.query.role;
    let year = req.query.year;
    let _id = req.query._id;

    if (!role || !year || !_id)
        return res.status(400).json({
            success: false,
            message: "Data missing"
        })
    let isUA;
    let yearData = await Year.findOne({ _id: ObjectId(year) }).lean()
    let ulbStatusObj = {
        "annualAcc": {
            "tick": "",
            "tooltip": ""
        },
        "pfms": {
            "tick": "",
            "tooltip": ""
        },
        "dur": {
            "tick": "",
            "tooltip": ""
        },
        "slb": {
            "tick": "",
            "tooltip": ""
        },
        "ptax": {
            "tick": "",
            "tooltip": ""
        },
        "gfc": {
            "tick": "",
            "tooltip": ""
        },
        "odf": {
            "tick": "",
            "tooltip": ""
        },

    }
    let output = []
    if (role == 'ULB') {
        let ulbInfo = await Ulb.findOne({ _id: ObjectId(_id) }).lean();
        isUA = ulbInfo.isUA
        FormModelMapping[GFC] = isUA == 'Yes' ? ObjectId("62b3f8569bac122d28cf7e2f") : ObjectId("62b3f8c29bac122d28cf7e37")
        FormModelMapping[ODF] = isUA == 'Yes' ? ObjectId("62b3f8489bac122d28cf7e2d") : ObjectId("62b3f8b59bac122d28cf7e35")
        FormModelMapping[SLB] = isUA == 'Yes' ? ObjectId("62b3f7fe9bac122d28cf7e2b") : ObjectId("62b3f8a29bac122d28cf7e33")

        let condition = {
            ulb: ObjectId(_id),
        }
        let formArr = [AnnualAccounts, DUR, ODF, GFC, SLB, PFMS, PropTax]
        formArr.forEach(async el => {
            if (el == DUR) {
                delete condition['design_year'];
                condition['designYear'] = ObjectId(year)
            } else {
                delete condition['designYear'];
                condition['design_year'] = ObjectId(year)
            }
            let formData = await el.findOne(condition).lean()
            if (formData) {

                output.push(findStatusAndTooltip(formData, FormModelMapping[el]))
            }
        })

        console.log(output)




        // findStatus(isDraft, status, actionTakenByRole )
    }

    let data = await Sidemenu.find({ year: ObjectId(year), role: role }).lean()
    if (data.length) {
        data = groupByKey(data, "category")
    }



    if (role == 'ULB') {
        if (isUA) {
            delete data['Performance Conditions']
        } else {
            delete data['Million Plus City Challenge Fund']
        }
    }


    res.status(200).json({
        success: true,
        data: data
    })
})

module.exports.post = catchAsync(async (req, res) => {
    let data = req.body;
    if (!data.name || !data.url || !data.role || !data.position || !data.year) {
        return res.status(400).json({
            success: false,
            message: "Data missing"
        })

    }
    let year = await Year.findOne({ _id: ObjectId(data.year) }).lean()
    let code = data.role + year.year


    let obj = {
        name: data.name,
        category: data.category ?? "",
        url: data.url,
        role: data.role,
        position: data.position,
        year: ObjectId(data.year),
        code: code,
        icon: data.icon ?? ""

    }
    let menuData = new Sidemenu(obj);

    await menuData.save();

    let fetchedData = await Sidemenu.find({ code: code })

    return res.status(200).json({
        success: true,
        message: "Data Saved",
        data: fetchedData

    })

})


module.exports.put = catchAsync(async (req, res) => {

})


module.exports.delete = catchAsync(async (req, res) => {

})

const groupByKey = (list, key) => list.reduce((hash, obj) => ({ ...hash, [obj[key]]: (hash[obj[key]] || []).concat(obj) }), {})


