const Ulb = require('../../models/Ulb');
const UlbFinancialData = require('../../models/UlbFinancialData');
const LoginHistory = require('../../models/LoginHistory');
const User = require('../../models/User');
const State = require('../../models/State');
const Response = require('../../service').response;
const Service = require('../../service');
const ObjectId = require('mongoose').Types.ObjectId;
const ulbTye = {
    "Town Panchayat": 0,
    "Municipality": 0,
    "Municipal Corporation":0
}
module.exports = (req,res)=>{
   
    let cond = {$match:{"isActive" : true}}
    let cond1 = {$match:{"isDeleted" : false,role:"ULB"}}
    let cond2 = {
        $lookup: {
            from: 'ulbs',
            localField: 'ulb',
            foreignField: '_id',
            as: 'ulb'
        }
    }
    let cond3 = {$unwind:"$ulb"}
    let group = {$group:{ "_id":"$ulbtype.name", "count":{$sum:1}}}    
    let project = {$project:{"name":"$_id","count":"$count",_id:0}}

    let query = [
        cond,
        {
            $lookup: {
                from: 'ulbtypes',
                localField: 'ulbType',
                foreignField: '_id',
                as: 'ulbtype'
            }
        },
        {
            $unwind: {
                path: '$ulbtype',
                preserveNullAndEmptyArrays: true
            }
        },
        group,   
        project      
    ]

    let totalULB = new Promise(async(rslv,rjct)=>{
        try{
            let data = await Ulb.aggregate(query).exec();
            let object = data.reduce((obj,item)=>Object.assign(obj, { [item.name]: item.count }),{})
            rslv(ulbType(object))
        }
        catch(err){
            rjct(err);
        }
    })

    let registeredUlb = new Promise(async(rslv,rjct)=>{
        try{
            let query = [
                cond1,
                cond2,
                cond3,
                {
                    $lookup: {
                        from: 'ulbtypes',
                        localField: 'ulb.ulbType',
                        foreignField: '_id',
                        as: 'ulbtype'
                    }
                },
                {
                    $unwind: {
                        path: '$ulbtype',
                        preserveNullAndEmptyArrays: true
                    }
                },
                group,   
                project    
            ]
            let data = await User.aggregate(query).exec();
            let object = data.reduce((obj,item)=> Object.assign(obj, { [item.name]: item.count }),{})
            rslv(ulbType(object))
        }
        catch(err){
            rjct(err);
        }
    })

    let registeredMillionPlus = new Promise(async(rslv,rjct)=>{
        try{
            let query = [
                cond1,
                cond2,
                cond3,
                {$match:{"ulb.isMillionPlus":"Yes"}},   
                {
                    $lookup: {
                        from: 'ulbtypes',
                        localField: 'ulb.ulbType',
                        foreignField: '_id',
                        as: 'ulbtype'
                    }
                },
                {
                    $unwind: {
                        path: '$ulbtype',
                        preserveNullAndEmptyArrays: true
                    }
                },
                group,   
                project
            ]
            let data = await User.aggregate(query).exec();
            let object = data.reduce((obj,item)=> Object.assign(obj, { [item.name]: item.count }),{})
            rslv(ulbType(object))
        }
        catch(err){
            rjct(err);
        }
    })

    let totalMillionPlus = new Promise(async(rslv,rjct)=>{
        try{
            let query = commonQuery(cond,'Yes')
            let data = await Ulb.aggregate(query).exec();
            let object = data.reduce((obj,item)=> Object.assign(obj, { [item.name]: item.count }),{})
            rslv(ulbType(object))
        }
        catch(err){
            rjct(err);
        }
    })

    let registeredNonMillionPlus = new Promise(async(rslv,rjct)=>{
        try{
            let query = [
                cond1,
                cond2,
                cond3,
                {$match:{"ulb.isMillionPlus":"No"}},   
                {
                    $lookup: {
                        from: 'ulbtypes',
                        localField: 'ulb.ulbType',
                        foreignField: '_id',
                        as: 'ulbtype'
                    }
                },
                {
                    $unwind: {
                        path: '$ulbtype',
                        preserveNullAndEmptyArrays: true
                    }
                },
                group,   
                project
            ]
            let data = await User.aggregate(query).exec();
            let object = data.reduce((obj,item)=> Object.assign(obj, { [item.name]: item.count }),{})
            rslv(ulbType(object))
        }
        catch(err){
            rjct(err);
        }
    })

    let totalNonMillionPlus = new Promise(async(rslv,rjct)=>{
        try{                
            let query = commonQuery(cond,'No')
            let data = await Ulb.aggregate(query).exec();
            let object = data.reduce((obj,item)=> Object.assign(obj, { [item.name]: item.count }),{})
            rslv(ulbType(object))
        }
        catch(err){
            rjct(err);
        }
    })

    Promise.all([totalULB,registeredUlb,registeredMillionPlus,totalMillionPlus,registeredNonMillionPlus,totalNonMillionPlus]).then((values)=>{
        let data = {
            totalULB : values[0],
            registeredUlb:values[1],
            registeredMillionPlus : values[2],
            totalMillionPlus:values[3],
            registeredNonMillionPlus:values[4],
            totalNonMillionPlus:values[5]
        };
        return res.status(200).json({success : true, message : "Data fetched", data : data});
        },(rejectError)=>{
        console.log(rejectError);
        return  res.status(400).json({ timestamp : moment().unix(), success : false, message : "Rejected Error", err : rejectError });
        }).catch((caughtError)=>{
        console.log("final caughtError",caughtError);
        return  res.status(400).json({ timestamp : moment().unix(), success : false, message : "Caught Error", err : caughtError });
    })

    function ulbType(object){
        for(let type in ulbTye){
            if(!object[type]){
                Object.assign(object,{[type]:ulbTye[type]})
            }            
        }
        return object
    }
    function commonQuery(cond,s){
        let query = [
            cond,
            {$match:{"isMillionPlus":`${s}`}},
            {
                $lookup: {
                    from: 'ulbtypes',
                    localField: 'ulbType',
                    foreignField: '_id',
                    as: 'ulbtype'
                }
            },
            {
                $unwind: {
                    path: '$ulbtype',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group:{  
                    "_id":"$ulbtype.name", 
                    "count":{$sum:1}
                }
            },
            {$project:
                { 
                  "name":"$_id",  
                  "count":"$count",
                  _id:0  
                }
            }
        ] 
        return query;
    }
}

module.exports.chartDataStatus = async(req,res)=>{
    let labels = [
        'Not Started', 
        'Saved as Draft', 
        'Under Review By State',
        'Under Review By MoHUA', 
        'Rejected By State', 
        'Rejected By MoHUA',
        'Approval Completed'
    ]

    let notStarted = new Promise(async(rslv,rjct)=>{
        try{                
            let query = dataUploadStatusQuery(1);
            let totalData = await Ulb.count({isActive:true}).exec();
            let startedData = await UlbFinancialData.count({isActive:true}).exec();
            let remainData = totalData-startedData
            rslv({c:remainData})
        }
        catch(err){
            rjct(err)
        }
    })
    let draft = new Promise(async(rslv,rjct)=>{
        try{                
            let query = dataUploadStatusQuery(1);
            let data = await UlbFinancialData.aggregate(query).exec();
            rslv(data ? data[0] :{c:0})
        }
        catch(err){
            rjct(err)
        }
    })

    let UnderReviewState = new Promise(async(rslv,rjct)=>{
        try{                
            let query = dataUploadStatusQuery(2);
            //res.json(query);return;
            let data = await UlbFinancialData.aggregate(query).exec();
            rslv(data.length> 0 ? data[0] :{c:0})
        }
        catch(err){
            rjct(err)
        }
    })

    let UnderReviewMoHUA = new Promise(async(rslv,rjct)=>{
        try{                
            let query = dataUploadStatusQuery(3);
            let data = await UlbFinancialData.aggregate(query).exec();
            rslv(data.length> 0 ? data[0] :{c:0})
        }
        catch(err){
            rjct(err)
        }
    })

    let rejectByState = new Promise(async(rslv,rjct)=>{
        try{                
            let query = dataUploadStatusQuery(4);
            let data = await UlbFinancialData.aggregate(query).exec();
            rslv(data.length> 0 ? data[0] :{c:0})
        }
        catch(err){
            rjct(err)
        }
    })

    let rejectByMoHUA = new Promise(async(rslv,rjct)=>{
        try{                
            let query = dataUploadStatusQuery(5);
            let data = await UlbFinancialData.aggregate(query).exec();
            rslv(data.length> 0 ? data[0] :{c:0})
        }
        catch(err){
            rjct(err)
        }
    })

    let approvalCompleted = new Promise(async(rslv,rjct)=>{
        try{                
            let query = dataUploadStatusQuery(6);
            let data = await UlbFinancialData.aggregate(query).exec();
            rslv(data.length> 0 ? data[0] :{c:0})
        }
        catch(err){
            rjct(err)
        }
    })

    Promise.all([notStarted,draft,UnderReviewState,UnderReviewMoHUA,rejectByState,rejectByMoHUA,approvalCompleted]).then((values)=>{
        dataArr = []
        for(v of values){
            dataArr.push(v.c);
        }
        let data = {
            "x-axis":"Number of ULBS",
            "y-axis":"15th FC Form Submit Status",
            graphType:'groupBar',
            labels:labels,
            datasets : [{"data":dataArr}]
        };
        return res.status(200).json({success : true, message : "Data fetched", data : data});
        },(rejectError)=>{
        console.log(rejectError);
        return  res.status(400).json({ timestamp : moment().unix(), success : false, message : "Rejected Error", err : rejectError });
        }).catch((caughtError)=>{
        console.log("final caughtError",caughtError);
        return  res.status(400).json({ timestamp : moment().unix(), success : false, message : "Caught Error", err : caughtError });
    })

    function dataUploadStatusQuery(s){

        let statusFilter = {
            "1":{"status":"PENDING","isCompleted":false,actionTakenByUserRole:"ULB"},
            "2":{"status":"PENDING","isCompleted":true,actionTakenByUserRole:"ULB"},
            "3":{"status":"APPROVED",actionTakenByUserRole:"STATE"},
            "4":{"status":"REJECTED",actionTakenByUserRole:"STATE"},
            "5":{"status":"REJECTED",actionTakenByUserRole:"MoHUA"},
            "6":{"status":"APPROVED",actionTakenByUserRole:"MoHUA"},
        }
        let match  =  {$match:statusFilter[s]}
        return [
            {
                $lookup: {
                    from: 'ulbs',
                    localField: 'ulb',
                    foreignField: '_id',
                    as: 'ulb'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'actionTakenBy',
                    foreignField: '_id',
                    as: 'actionTakenBy'
                }
            },
            { $unwind: '$ulb' },
            {
                $unwind: {
                    path: '$actionTakenBy',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 1,               
                    waterManagement:1,
                    solidWasteManagement:1,
                    millionPlusCities:1,
                    isCompleted:1,
                    status: 1,
                    ulb: '$ulb._id',
                    ulbName: '$ulb.name',
                    ulbCode: '$ulb.code',
                    actionTakenByUserName: '$actionTakenBy.name',
                    actionTakenByUserRole: '$actionTakenBy.role',
                    isActive: '$isActive',
                    createdAt: '$createdAt'
                }
            },
            match,
            {"$count":"c"}
        ]

    }

}
