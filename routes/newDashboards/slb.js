const Indicators = require('../../models/indicators');
const IndicatorLineItems =require('../../models/indicatorLineItems');
const ObjectId = require("mongoose").Types.ObjectId;
const moment = require("moment");

module.exports.slbFrontPanel = (req, res) => {
    
    let statesWithSLBData = new Promise(async(rslv, rjct)=>{
        let pipeline = [
            {
                $group: {
                    _id: "$ulb"
                } 
            },
            {
                $lookup:{
                    from:"ulbs",
                    localField: "_id",
                    foreignField: "_id",
                    as: "ulbData"  
                }
            },
            {
                $group:{
                    _id:"$ulbData.state"
                }
            }
        ];
        try {
            const data = await Indicators.aggregate(pipeline);
            rslv(data.length);
        } catch (error) {
            rjct(error)
        }
    })

    let ulbsWithSlbData = new Promise( async (rslv, rjct)=>{
        let pipeline = [
            {
               $group: {
                   _id: "$ulb"
               } 
            }
        ]
        try {
            const data = await Indicators.aggregate(pipeline);
            rslv(data.length);
        } catch (error) {
            rjct(error);
        }
    })
    let millionPopulation = new Promise( async (rslv, rjct)=>{
        let pipeline = [
            {
               $group: {
                   _id: "$ulb"
               } 
            },
            {
                $lookup:{
                    from:"ulbs",
                    localField: "_id",
                    foreignField: "_id",
                    as: "ulbData"
                    
                }
            },
            { $unwind:"$ulbData"},
            {
                $group:{
                    _id: null,
                    sum: {$sum: "$ulbData.population"}
                }
            } 
        ];
        try {
            const data = await Indicators.aggregate(pipeline);
            const populationInMillion = (data[0].sum)/1000000;
            rslv(populationInMillion);
        } catch (error) {
            rjct(error);
        }
    })
    
    let slbIndicators = new Promise( async (rslv, rjct)=>{
        try {
            const data = await IndicatorLineItems.find();
            rslv(data.length);
        } catch (error) {
            rjct(error);
        }
    });

    let municipalCorps = new Promise( async (rslv, rjct)=>{
        let pipeline = [
            {
               $group: {
                   _id: "$ulb"
               } 
            },
            {
                $lookup:{
                    from:"ulbs",
                    localField: "_id",
                    foreignField: "_id",
                    as: "ulbData"
                    
                }
            },
            { $unwind:"$ulbData"},
            {
                $match:{
                    "ulbData.ulbType": ObjectId("5dcfa64e43263a0e75c71695")
                    }
            }
        ];
        try {
            const data = await Indicators.aggregate(pipeline);
            rslv(data.length);
        } catch (error) {
            rjct(error);
        }
        
    })

    let otherMunicipalities = new Promise( async (rslv, rjct)=>{
        let pipeline = [
            {
               $group: {
                   _id: "$ulb"
               } 
            },
            {
                $lookup:{
                    from:"ulbs",
                    localField: "_id",
                    foreignField: "_id",
                    as: "ulbData"
                    
                }
            },
            { $unwind:"$ulbData"},
            {
                $match:{
                    "ulbData.ulbType": {$nin: [ObjectId("5dcfa64e43263a0e75c71695")]}
                    }
            }  
        ]
        try {
            const data = await Indicators.aggregate(pipeline);
            rslv(data.length);
        } catch (error) {
            rjct(error);
        }
    })

    Promise.all([statesWithSLBData, ulbsWithSlbData, millionPopulation, slbIndicators,
        municipalCorps, otherMunicipalities]).then((values)=>{
            const obj = [
                {
                    key: "State with SLB data",
                    value: values[0]
                },
                {
                    key: "ULBs with SLB Data",
                    value: values[1]
                },
                {
                    key: "Million Population",
                    value: values[2]
                },
                {
                    key: "SLB Indicators",
                    value: values[3]
                },
                {
                    key: "Municipal Corporations",
                    value: values[4]
                },
                {
                    key: "Other Municipalities",
                    value: values[5]
                },
            ]
        return res.status(200).json({ success: true, message: "Data fetched", data: obj });
        
        }, (rejectError) => {
            return res.status(400).json({ timestamp: moment().unix(), success: false, message: "Rejected Error", err: rejectError });
        }).catch((caughtError) => {
            return res.status(400).json({ timestamp: moment().unix(), success: false, message: "Caught Error", err: caughtError });
        })
}