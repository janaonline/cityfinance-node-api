const UlbLedger = require("../../models/Schema/UlbLedger");
const Ulb = require("../../models/Schema/Ulb");
const LineItem = require("../../models/Schema/LineItem");
const csv = require("csvtojson");
const lineItems  = {
    "Audit report": "1001",
    "Balance sheet": "1002",
    "Income & Expenditure": "1003",
    "Schedules": "1004",
    "Trial balance": "1005",
    "Notes to accounts": "1006",
    "Schedule and Trial Balance": "1007"
};
module.exports = async (req, res)=>{
    console.log("Files", req.file)
    try {
        const jsonArray = await csv().fromFile(req.file.path);
        let dataArr= [ ];
        console.log("jsonArray",jsonArray.length);
        for(let json of jsonArray){
            for(let k in json){
                //console.log("ulb Code:",{code : json["ULB Code"]})
                let ulb = await Ulb.findOne({code : json["ULB Code"]},"_id");
                if(["YEAR","ULB Code"].indexOf(k) < 0 && lineItems[k]){
                    let lineItem = await LineItem.findOne({code : lineItems[k]},"_id");
                    if(ulb && lineItem){
                        dataArr.push({
                            ulb:ulb._id,
                            lineItem:lineItem._id,
                            financialYear:json["YEAR"],
                            amount: !isNaN(Number(json[k])) ? Number(json[k]) : 0
                        })
                    }
                }
            }
        }
        console.log("Out of loop");
        for(let data of dataArr){
            let du = {
                query : {ulb:data.ulb, lineItem:data.lineItem, financialYear: data.financialYear},
                update : data,
                options : {upsert : true,setDefaultsOnInsert : true,new: true}
            }
            let d = await UlbLedger.findOneAndUpdate(du.query,du.update,du.options);
            console.log("d",d);
        }
        return res.status(200).json({success:true, data:dataArr});
    }catch (e) {
        console.log("Exception:",e);
        return res.status(500).json({message:e.message, success:false})
    }
};

