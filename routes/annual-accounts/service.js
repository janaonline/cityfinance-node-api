
const catchAsync = require('../../util/catchAsync')
const AnnualAccountData = require('../../models/AnnualAccounts')
const ObjectId = require('mongoose').Types.ObjectId;
const Ulb = require('../../models/Ulb')
const Year = require('../../models/Year')
module.exports.sendAnnualAccountsData = catchAsync(async (req, res, next) => {

    let user = req.decoded;
    console.log(user.role)

    if (user.role == 'ULB') {

        let ulb = await Ulb.findOne({ _id: ObjectId(user.ulb) });
        if (!ulb) {
            return Response.BadRequest(res, {}, `Ulb not found.`);
        }
        let design_year = await Year.findOne({ "year": req.body.data.design_year })
        let year = await Year.findOne({ "year": req.body.data.year })
        req.body.data.design_year = ObjectId(design_year._id);
        req.body.data.year = ObjectId(year._id);
        console.log(req.body.data)
        const annual_account_data = new AnnualAccountData(req.body.data);

        await annual_account_data.save();
        console.log('data saved successfully in DB')



    }

})

