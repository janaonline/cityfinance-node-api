const dCForm = require("../../models/DataCollectionForm");
const mongoose = require("mongoose");
const moment = require("moment");
const ObjectId = require("mongoose").Types.ObjectId;
const service = require("../../service");
const email = require("../../service/email");
const Response = require("../../service").response;
const request = require('request');
const { concatenateUrls } = require("../../service/common");
function doRequest(url) {
  let options = {
    url : url,
    method: 'HEAD'
  }
  return new Promise(function (resolve, reject) {
    request(options, function (error, resp, body) {
      if (!error && resp?.statusCode == 404) {
        resolve(url)

      }else{
        reject(url);
      }
    });
  });
}

module.exports.defunc = async(req,res)=> {
  let query = [
    {
        $lookup: {
            from:"ulbs",
            localField:"ulb",
            foreignField:"_id",
            as:"ulb"
            }
        },
        {
            $unwind:"$ulb"
            },
            {
                $project: {
                    ulbName:"$ulb.name",
                    ulbCode:"$ulb.code",
                    pdf_15_16 : {$arrayElemAt:["$documents.financial_year_2015_16.pdf", 0]} ,
                                    excel_15_16 : {$arrayElemAt:["$documents.financial_year_2015_16.excel", 0]} ,
                                    pdf_16_17 : {$arrayElemAt:["$documents.financial_year_2016_17.pdf", 0]} ,
                                    excel_16_17 : {$arrayElemAt:["$documents.financial_year_2016_17.excel", 0]} ,
                                    pdf_17_18 : {$arrayElemAt:["$documents.financial_year_2017_18.pdf", 0]} ,
                                    excel_17_18 : {$arrayElemAt:["$documents.financial_year_2017_18.excel", 0]} ,
                                    pdf_18_19 : {$arrayElemAt:["$documents.financial_year_2018_19.pdf", 0]} ,
                                    excel_18_19 : {$arrayElemAt:["$documents.financial_year_2018_19.excel", 0]} ,
    
                    }
                },
                 {
                $project: {
                    ulbName:"$ulbName",
                    ulbCode:"$ulbCode",
                    pdf_15_16 : "$pdf_15_16.url" ,
                                    excel_15_16 : "$excel_15_16.url" ,
                                    pdf_16_17 : "$pdf_16_17.url" ,
                                    excel_16_17 : "$excel_16_17.url" ,
                                    pdf_17_18 : "$pdf_17_18.url" ,
                                    excel_17_18 : "$excel_17_18.url" ,
                                    pdf_18_19 : "$pdf_18_19.url" ,
                                    excel_18_19 : "$excel_18_19.url" ,
    
                    }
                },
            
    ]
    let arr = [];

    let totalCounter = 1;
  let data = await dCForm.aggregate(query);
  let target = data.length;
console.log(target)
let skip = 0;
let batch = 150;
while(skip<=target){
  const slice = data.slice(parseInt(skip),parseInt(skip)+batch);
  await Promise.all(
    slice.map(async el=>{
      for(let key in el) {
        if(key != '_id' && key != 'ulbName' && key != 'ulbcode' && el[key] ){
          let url = el[key];
        // let url = `https://${process.env.PROD_HOST}/objects/31e1883d-7eef-4b2f-9e29-18d598056a5d.pdf`
          try{
            totalCounter++;
            console.log(totalCounter)
            let response = await doRequest(url);
            
            let obj = {
              ulbName:"",
              ulbCode:"",
              key:"",
              url:"",
            
            }
            obj.ulbName = el.ulbName;
            obj.ulbCode = el.ulbCode;
            obj.key = key;
            obj.url = response
            
            // console.log(obj)
            arr.push(obj);
      
          } catch (error) {
            // console.log('working', error)
            // `error` will be whatever you passed to `reject()` at the top
          }
          
              
          
        }
          
      
      }
    })
  )
  //for(let el of data){
    

    
  ///}
  console.log(skip)
  skip+=batch;
}

  return res.send({
    data:arr,
    number: arr.length,
    total: totalCounter
  });
}

module.exports.post = function (req, res) {
  req.body["state"] = ObjectId(req.body["state"]);
  service.post(dCForm, req.body, function (response, value) {
    return res.status(response ? 200 : 400).send(value);
  });
};

module.exports.get = async function (req, res) {
  actionAllowed = ["ADMIN", "MoHUA", "PARTNER", "STATE"];
  filter =
    req.query.filter && !req.query.filter != "null"
      ? JSON.parse(req.query.filter)
      : req.body.filter
      ? req.body.filter
      : {};
  sort =
    req.query.sort && !req.query.sort != "null"
      ? JSON.parse(req.query.sort)
      : req.body.sort
      ? req.body.sort
      : {};
  skip = req.query.skip ? parseInt(req.query.skip) : 0;
  limit = req.query.limit ? parseInt(req.query.limit) : 10;
  let csv = req.query.csv;
  let matchfilter = await service.mapFilter(filter);
  let user = req.decoded;
  if (actionAllowed.indexOf(user.role) > -1) {
    let query = [
      {
        $lookup: {
          from: "states",
          localField: "state",
          foreignField: "_id",
          as: "state",
        },
      },
      {
        $lookup: {
          from: "ulbs",
          localField: "ulb",
          foreignField: "_id",
          as: "ulbs",
        },
      },
      { $unwind: { path: "$ulbs", preserveNullAndEmptyArrays: true } },
      { $unwind: "$state" },
      {
        $lookup: {
          from: "ulbtypes",
          localField: "ulbs.ulbType",
          foreignField: "_id",
          as: "ulbType",
        },
      },
      { $unwind: { path: "$ulbType", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          ulbName: {
            $cond: {
              if: { $eq: ["$ulb", null] },
              then: "$parastatalName",
              else: "$ulbs.name",
            },
          },
          ulb: "$ulb",
          ulbType: {
            $cond: {
              if: { $ne: ["$parastatalName", null] },
              then: "NA",
              else: "$ulbType.name",
            },
          },
          stateName: "$state.name",
          state: "$state._id",
          parastatalName: 1,
          person: 1,
          designation: 1,
          email: 1,
          bodyType: 1,
          documents: 1,
          censusCode: "$ulbs.code",
        },
      },
    ];

    if (matchfilter && Object.keys(matchfilter).length) {
      query.push({ $match: matchfilter });
    }
    if (Object.keys(sort).length) {
      query.push({ $sort: sort });
    }

    if (csv) {
      let total = await dCForm.aggregate(query);
      let index =0;
      for (t of total) {
        t = JSON.parse(JSON.stringify(t));
        total[index] = concatenateUrls(t);
        index++;
        t["financial_year_2015_16_pdf"] = "";
        t["financial_year_2016_17_pdf"] = "";
        t["financial_year_2017_18_pdf"] = "";
        t["financial_year_2018_19_pdf"] = "";
        t["financial_year_2019_20_pdf"] = "";
        

        t["financial_year_2015_16_excel"] = "";
        t["financial_year_2016_17_excel"] = "";
        t["financial_year_2017_18_excel"] = "";
        t["financial_year_2018_19_excel"] = "";
        t["financial_year_2019_20_excel"] = "";
        

        if (t.documents.financial_year_2015_16) {
          t["financial_year_2015_16_pdf"] = "";
          if (t.documents.financial_year_2015_16.pdf.length > 0) {
            t["financial_year_2015_16_pdf"] =
              t.documents.financial_year_2015_16.pdf[0].url;
          }
        }
        if (t.documents.financial_year_2016_17) {
          t["financial_year_2016_17_pdf"] = "";
          if (t.documents.financial_year_2016_17.pdf.length > 0) {
            t["financial_year_2016_17_pdf"] =
              t.documents.financial_year_2016_17.pdf[0].url;
          }
        }
        if (t.documents.financial_year_2017_18 != null) {
          t["financial_year_2017_18_pdf"] = "";
          if (t.documents.financial_year_2017_18.pdf.length > 0) {
            t["financial_year_2017_18_pdf"] =
              t.documents.financial_year_2017_18.pdf[0].url;
          }
        }
        if (t.documents.financial_year_2018_19) {
          t["financial_year_2018_19_pdf"] = "";
          if (t.documents.financial_year_2018_19.pdf.length > 0) {
            t["financial_year_2018_19_pdf"] =
              t.documents.financial_year_2018_19.pdf[0].url;
          }
        }

        if (t.documents.financial_year_2019_20) {
          t["financial_year_2019_20_pdf"] = "";
          if (t.documents.financial_year_2019_20.pdf.length > 0) {
            t["financial_year_2019_20_pdf"] =
              t.documents.financial_year_2019_20.pdf[0].url;
          }
        }
       

        if (t.documents.financial_year_2015_16) {
          t["financial_year_2015_16_excel"] = "";
          if (t.documents.financial_year_2015_16.excel.length > 0) {
            t["financial_year_2015_16_excel"] =
              t.documents.financial_year_2015_16.excel[0].url;
          }
        }
        if (t.documents.financial_year_2016_17) {
          t["financial_year_2016_17_excel"] = "";
          if (t.documents.financial_year_2016_17.excel.length > 0) {
            t["financial_year_2016_17_excel"] =
              t.documents.financial_year_2016_17.excel[0].url;
          }
        }
        if (t.documents.financial_year_2017_18) {
          t["financial_year_2017_18_excel"] = "";
          if (t.documents.financial_year_2017_18.excel.length > 0) {
            t["financial_year_2017_18_excel"] =
              t.documents.financial_year_2017_18.excel[0].url;
          }
        }
        if (t.documents.financial_year_2018_19) {
          t["financial_year_2018_19_excel"] = "";
          if (t.documents.financial_year_2018_19.excel.length > 0) {
            t["financial_year_2018_19_excel"] =
              t.documents.financial_year_2018_19.excel[0].url;
          }
        }
        if (t.documents.financial_year_2019_20) {
          t["financial_year_2019_20_excel"] = "";
          if (t.documents.financial_year_2019_20.excel.length > 0) {
            t["financial_year_2019_20_excel"] =
              t.documents.financial_year_2019_20.excel[0].url;
          }
        }
     
      }
      let xlsData = await service.dataFormating(total, {
        stateName: "State Name",
        bodyType: "Body Type",
        ulbName: "ULB/ Parastatal Agency Name",
        censusCode: "CityFinance code",
        ulbType: "ULB Type",
        person: "Person Name",
        designation: "Designation",
        email: "Email ID",
        financial_year_2015_16_pdf: "Financial Year 2015-16 - PDF",
        financial_year_2016_17_pdf: "Financial Year 2016-17 - PDF",
        financial_year_2017_18_pdf: "Financial Year 2017-18 - PDF",
        financial_year_2018_19_pdf: "Financial Year 2018-19 - PDF",
        financial_year_2019_20_pdf: "Financial Year 2019-20 - PDF",
        

        financial_year_2015_16_excel: "Financial Year 2015-16 - Excel",
        financial_year_2016_17_excel: "Financial Year 2016-17 - Excel",
        financial_year_2017_18_excel: "Financial Year 2017-18 - Excel",
        financial_year_2018_19_excel: "Financial Year 2018-19 - Excel",
        financial_year_2019_20_excel: "Financial Year 2019-20 - Excel",
       
      });
      return res.xls("financial-data.xlsx", xlsData);
    }
    let total = await dCForm.aggregate(query);
    query.push({ $skip: skip });
    query.push({ $limit: limit });
    let arr = await dCForm.aggregate(query).exec();
    return res.json({
      timestamp: moment,
      success: true,
      message: "Successfully fetched",
      total: total.length,
      data: arr,
    });
  } else {
    Response.BadRequest(
      res,
      {},
      `Action not allowed for the role:${user.role}`
    );
  }
};

module.exports.check = async function (req, res) {
  try {
    const { ulb, bodyType, year, type } = req.query;
    let data = await dCForm.find({ ulb, bodyType });
    let historyData = [],
      haveHistory = false;
    if (data.length > 0) {
      data.forEach((element) => {
        let temp = {
          [year]: {
            [type]: {},
          },
        }
        if (element.documents[year][type].length > 0) {
          temp[year][type] = element.documents[year][type];
          historyData.push(temp);
          haveHistory = true;
        }
      });
    }
    return Response.OK(res, { haveHistory, historyData }, "Success");
  } catch (error) {
    return Response.DbError(res, null, error.message + " Db Error");
  }
};
