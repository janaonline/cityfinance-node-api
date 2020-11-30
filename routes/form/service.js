const dCForm = require('../../models/DataCollectionForm');
const mongoose = require("mongoose");
const moment = require("moment");
const ObjectId = require('mongoose').Types.ObjectId
const service = require("../../service");
const email = require('../../service/email');

module.exports.post = function (req, res) {

    req.body["state"] =  ObjectId(req.body["state"])
    service.post(dCForm,req.body,function(response,value){
        return res.status(response ? 200 : 400).send(value);
    });

}

module.exports.get = async function (req, res) {
    actionAllowed = ['ADMIN','MoHUA','PARTNER','STATE'];
    filter = req.query.filter && !req.query.filter != 'null' ? JSON.parse(req.query.filter) : (req.body.filter ? req.body.filter : {})
    sort = req.query.sort  && !req.query.sort != 'null' ? JSON.parse(req.query.sort) : (req.body.sort ? req.body.sort : {})
    skip   = req.query.skip ? parseInt(req.query.skip) : 0
    limit  = req.query.limit ? parseInt(req.query.limit) : 10
    let csv = req.query.csv
    let matchfilter =  await service.mapFilter(filter);
    let user = req.decoded
    if(actionAllowed.indexOf(user.role) > -1){
        let query = [ 
            {
                $lookup: {
                    from: "states",
                    localField: "state",
                    foreignField: "_id",
                    as: "state"
                }
            },
            {
                $lookup: {
                    from: "ulbs",
                    localField: "ulb",
                    foreignField: "_id",
                    as: "ulbs"
                }
            },
            {$unwind:{path:"$ulbs",preserveNullAndEmptyArrays:true}},
            {$unwind:"$state"},
            {
                $lookup: {
                    from: "ulbtypes",
                    localField: "ulbs.ulbType",
                    foreignField: "_id",
                    as: "ulbType"
                }
            }, 
            {$unwind:{path:"$ulbType",preserveNullAndEmptyArrays:true}},
            {$project:{
                "ulbName": {
                    $cond: {
                        if: { $eq: ['$ulb', null] },
                        then: '$parastatalName',
                        else:"$ulbs.name"
                    }
                },          
                "ulb":"$ulb",
                "ulbType": {
                    $cond: {
                        if: { $ne: ['$parastatalName', null] },
                        then: 'NA',
                        else:"$ulbType.name"
                    }
                },
                "stateName":"$state.name",
                "state":"$state._id",
                "parastatalName":1,
                "person":1,
                "designation":1,
                "email":1,
                "bodyType":1,
                "documents":1
                }
            }
        ]

        if(matchfilter && Object.keys(matchfilter).length){
           query.push({$match:matchfilter}) 
        }
        if(Object.keys(sort).length){
            query.push({$sort:sort});
        }

        if (csv) {
            let total = await dCForm.aggregate(query);
            for(t of total){
                t["financial_year_2015_16_pdf"] = ''
                t["financial_year_2016_17_pdf"] = ''
                t["financial_year_2017_18_pdf"] = ''
                t["financial_year_2018_19_pdf"] = ''

                t["financial_year_2015_16_excel"] = ''
                t["financial_year_2016_17_excel"] = ''
                t["financial_year_2017_18_excel"] = ''
                t["financial_year_2018_19_excel"] = ''

                if(t.documents.financial_year_2015_16){
                    t["financial_year_2015_16_pdf"] = ''
                    if(t.documents.financial_year_2015_16.pdf.length >0){
                        t["financial_year_2015_16_pdf"] = `HYPERLINK("${t.documents.financial_year_2015_16.pdf[0].url}","${t.documents.financial_year_2015_16.pdf[0].url}")`
                    }
                }
                if(t.documents.financial_year_2016_17){
                    t["financial_year_2016_17_pdf"] = ''
                    if(t.documents.financial_year_2016_17.pdf.length >0){
                        t["financial_year_2016_17_pdf"] = `HYPERLINK("${t.documents.financial_year_2016_17.pdf[0].url}","${t.documents.financial_year_2016_17.pdf[0].url}")`
                    }
                }
                if(t.documents.financial_year_2017_18!=null){
                    t["financial_year_2017_18_pdf"] = ''
                    if(t.documents.financial_year_2017_18.pdf.length >0){
                        t["financial_year_2017_18_pdf"] = `HYPERLINK("${t.documents.financial_year_2017_18.pdf[0].url}","${t.documents.financial_year_2017_18.pdf[0].url}")`
                    }
                }
                if(t.documents.financial_year_2018_19){
                    t["financial_year_2018_19_pdf"] = ''
                    if(t.documents.financial_year_2018_19.pdf.length >0){
                        t["financial_year_2018_19_pdf"] = `HYPERLINK("${t.documents.financial_year_2018_19.pdf[0].url}","${t.documents.financial_year_2018_19.pdf[0].url}")`
                    }
                }

                if(t.documents.financial_year_2015_16){
                    t["financial_year_2015_16_excel"] = ''
                    if(t.documents.financial_year_2015_16.excel.length >0){
                        t["financial_year_2015_16_excel"] = `HYPERLINK("${t.documents.financial_year_2015_16.excel[0].url}","${t.documents.financial_year_2015_16.excel[0].url}")`
                    }
                }
                if(t.documents.financial_year_2016_17){
                    t["financial_year_2016_17_excel"] = ''
                    if(t.documents.financial_year_2016_17.excel.length >0){
                        t["financial_year_2016_17_excel"] = `HYPERLINK("${t.documents.financial_year_2016_17.excel[0].url}","${t.documents.financial_year_2016_17.excel[0].url}")`
                    }
                }
                if(t.documents.financial_year_2017_18){
                    t["financial_year_2017_18_excel"] = ''
                    if(t.documents.financial_year_2017_18.excel.length >0){
                        t["financial_year_2017_18_excel"] = `HYPERLINK("${t.documents.financial_year_2017_18.excel[0].url}","${t.documents.financial_year_2017_18.excel[0].url}")`
                    }
                }
                if(t.documents.financial_year_2018_19){
                    t["financial_year_2018_19_excel"] = ''
                    if(t.documents.financial_year_2018_19.excel.length >0){
                        t["financial_year_2018_19_excel"] = `HYPERLINK("${t.documents.financial_year_2018_19.excel[0].url}","${t.documents.financial_year_2016_17.excel[0].url}")`
                    }
                }
            }
            let xlsData = await service.dataFormating(total, {
                stateName : 'State Name',
                bodyType: 'Body Type',
                ulbName: 'ULB/ Parastatal Agency Name',
                ulbType: 'ULB Type',
                person:'Person Name',
                designation:'Designation',
                email:'Email ID',
                financial_year_2015_16_pdf: "Financial Year 2015-16 - PDF",
                financial_year_2016_17_pdf: "Financial Year 2016-17 - PDF",
                financial_year_2017_18_pdf: "Financial Year 2017-18 - PDF",
                financial_year_2018_19_pdf: "Financial Year 2018-19 - PDF",
                financial_year_2015_16_excel: "Financial Year 2015-16 - Excel",
                financial_year_2016_17_excel: "Financial Year 2016-17 - Excel",
                financial_year_2017_18_excel: "Financial Year 2017-18 - Excel",
                financial_year_2018_19_excel: "Financial Year 2018-19 - Excel"
            });
            return res.xls('financial-data.xlsx', xlsData);
        } 
        let total = await dCForm.aggregate(query);
        query.push({$skip:skip})
        query.push({$limit:limit})
        let arr =  await dCForm.aggregate(query).exec();
        return res.json({"timestamp":moment,success:true,message:"Successfully fetched",total:total.length,data:arr})
    }

    else{
        Response.BadRequest(res,{},`Action not allowed for the role:${user.role}`);
    }

}
