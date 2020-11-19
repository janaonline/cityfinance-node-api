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