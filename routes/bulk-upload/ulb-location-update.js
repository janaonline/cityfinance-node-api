const moment = require("moment");
const Ulb = require('../../models/Ulb');
const User = require("../../models/User");
const service = require("../../service");
const ObjectId = require('mongoose').Types.ObjectId;
const requiredKeys = ["ULBCODE", "LAT", "LNG"];
const UAData = require('../../models/UA')
const State = require('../../models/State')
const Response = require("../../service").response;
const GrantType = require('../../models/GrantType')
module.exports = async (req, res) => {
    try {
        const jsonArray = req.body.jsonArray;
        let failArr = [];
        if (jsonArray.length) {
            let keys = Object.keys(jsonArray[0]);
            if (requiredKeys.every(k => keys.includes(k))) {
                for (let json of jsonArray) {
                    if (json["ULBCODE"] && json["LAT"] && json["LNG"]) {
                        let du = {
                            query: { code: json["ULBCODE"] },
                            update: { location: { lng: json["LNG"], lat: json["LAT"] } },
                            options: { upsert: true, setDefaultsOnInsert: true, new: true }
                        }
                        let d = await Ulb.findOneAndUpdate(du.query, du.update, du.options);
                    } else {
                        failArr.push(json);
                    }
                }
            } else {
                failArr.push({ message: "keys are missing.", requiredKeys: requiredKeys, requestKeys: keys });
            }
        } else {
            failArr.push({ message: "No row found." });
        }
        return res.status(200).json({ success: true, data: failArr });
    } catch (e) {
        console.log("Exception:", e);
        return res.status(500).json({ message: e.message, success: false })
    }
};

module.exports.nameUpdate = async (req, res) => {
    try {
        const jsonArray = req.body.jsonArray;

        for (let eachRow of jsonArray) {

            //console.log(eachRow.code,eachRow.name)
            service.put({ code: eachRow.code }, eachRow, Ulb, function (response, value) {
                if (!response) {
                    errors.push("Not able to create ulb => ", eachRow.code + "" + response);
                }
                console.log(value.message);
            });

        }
        return res.status(200).json({
            message: "Successfully uploaded file",
            success: true
        })

    } catch (e) {
        console.log("Exception:", e);
        return res.status(500).json({ message: e.message, success: false })
    }
};

module.exports.signup = async (req, res) => {
    try {
        const jsonArray = req.body.jsonArray;
        let errors = []
        for (let eachRow of jsonArray) {
            //console.log(eachRow.code,eachRow.name)
            let message = "";
            let ulb = await Ulb.findOne({ code: eachRow.ulbCode, isActive: true }).exec();
            //let user = await User.findOne({ulb : ObjectId(ulb._id),role:'ULB'}).exec();
            ulb ? eachRow.ulbCode == ulb.code : message += "Ulb " + eachRow.ulbcode + " don't exists";
            if (message != "") {
                // if any state or ulb type not exists, then return message
                errors.push(message);
            } else {

                eachRow["state"] = ObjectId(ulb.state)
                eachRow["ulb"] = ObjectId(ulb._id)
                eachRow["name"] = ulb.name
                eachRow["sbCode"] = ulb.sbCode
                eachRow["censusCode"] = ulb.censusCode
                eachRow["role"] = 'ULB'
                eachRow["status"] = 'APPROVED'
                eachRow["isEmailVerified"] = true
                eachRow["isRegistered"] = false
                eachRow["password"] = await service.getHash(eachRow.password);
                //res.json(eachRow);return;
                service.put({ ulb: eachRow["ulb"], role: 'ULB' }, eachRow, User, function (response, value) {
                    if (!response) {
                        errors.push("Not able to create ulb => ", eachRow.code + "" + response);
                    }
                    console.log(value.message);
                });

            }



        }
        return res.status(200).json({
            message: errors,
            success: true
        })

    } catch (e) {
        console.log("Exception:", e);
        return res.status(500).json({ message: e.message, success: false })
    }
};
module.exports.signupNew = async (req, res) => {
    try {
        let userData = req.decoded
        console.log(userData.role)
        if (userData.role == 'ADMIN' || userData.role == 'MoHUA' || userData.role == 'PARTNER') {
            const data = req.body
            const code = data.ulbCode;
            const censusCode = data.censusCode;
            const sbCode = data.sbCode;
            console.log(censusCode, sbCode)
            if (!censusCode && !sbCode) {
                return res.status(400).json({
                    success: false,
                    message: "Either Census Code or SB Code must be provided"
                })
            }
            let ulb = await Ulb.findOne({ code: code })
            if (!ulb.censusCode && !ulb.sbCode) {
                if (censusCode) {
                    ulb['censusCode'] = censusCode
                    await ulb.save()
                } else if (sbCode) {
                    ulb['sbCode'] = sbCode
                    await ulb.save()
                }
                console.log('here', ulb)
                let passwordSuffix = ulb.censusCode ?? ulb.sbCode
                let password = code.substring(0, 2) + '@' + passwordSuffix
                data["state"] = ObjectId(ulb.state)
                data["ulb"] = ObjectId(ulb._id)
                data["name"] = ulb.name
                data["sbCode"] = ulb.sbCode
                data["censusCode"] = ulb.censusCode
                data["role"] = 'ULB'
                data["status"] = 'APPROVED'
                data["isEmailVerified"] = true
                data["isRegistered"] = false
                data["password"] = await service.getHash(password);
                console.log(data)
                //res.json(eachRow);return;
                service.put({ ulb: data["ulb"], role: 'ULB' }, data, User, function (response, value) {
                    if (!response) {
                        errors.push("Not able to create ulb => ", code + "" + response);
                    }
                    console.log(value.message);
                });
                return res.status(200).json({
                    // message: errors,
                    success: true,
                    username: passwordSuffix,
                    password: password

                })



            } else if (!ulb.censusCode && ulb.sbCode || ulb.censusCode && !ulb.sbCode || ulb.censusCode && ulb.sbCode) {
                let passwordSuffix = ulb.censusCode ?? ulb.sbCode
                let password = code.substring(0, 2) + '@' + passwordSuffix
                let userData = await User.findOne({ ulb: ulb['_id'] })
                if (userData) {
                    return res.status(409).json({
                        success: false,
                        message: "User Already Exist for Given ULB Code"
                    })
                } else {
                    data["state"] = ObjectId(ulb.state)
                    data["ulb"] = ObjectId(ulb._id)
                    data["name"] = ulb.name
                    data["sbCode"] = ulb.sbCode
                    data["censusCode"] = ulb.censusCode
                    data["role"] = 'ULB'
                    data["status"] = 'APPROVED'
                    data["isEmailVerified"] = true
                    data["isRegistered"] = false
                    data["password"] = await service.getHash(password);
                    console.log(data)
                    //res.json(eachRow);return;
                    service.put({ ulb: data["ulb"], role: 'ULB' }, data, User, function (response, value) {
                        if (!response) {
                            errors.push("Not able to create ulb => ", code + "" + response);
                        }
                        console.log(value.message);
                    });
                    return res.status(200).json({
                        // message: errors,
                        success: true,
                        username: passwordSuffix,
                        password: password

                    })

                }
            }
        } else {
            return res.status(403).json({
                success: false,
                message: userData.role + " is Not Authenticated to Perform this Action"
            })

        }


    } catch (e) {
        console.log("Exception:", e);
        return res.status(500).json({ message: e.message, success: false })
    }
};
module.exports.deleteNullNamedUA = async (req, res) => {
    await UAData.findOneAndDelete({ name: null }, function (err, docs) {
        if (err) {
            res.send(err)
        } else {
            res.json({
                success: true,
                docs: docs
            })
        }
    })
}
module.exports.updateUlb = async (req, res) => {
    try {
        let x = 0;
        const jsonArray = req.body.jsonArray;

        let errors = []
        for (let eachRow of jsonArray) {
            console.log(eachRow['City Finance Code'])
            x = x + 1;
            //console.log(eachRow.code,eachRow.name)
            if (eachRow['UA Name'] === 'Not a U.A' || eachRow['UA Name'] === '#N/A') {
                let ulb = await Ulb.findOne({ code: eachRow['City Finance Code'] }).exec();
                if (!ulb) {
                    continue;
                }
                await Ulb.updateOne({ _id: ObjectId(ulb._id) }, { $set: { isUA: 'No', UA: null } })

            } else if (eachRow['UA Name'] != 'Not a U.A' || eachRow['UA Name'] != '#N/A') {
                let uaData = await UAData.findOne({ "name": eachRow['UA Name'] })
                let ulb = await Ulb.findOne({ code: eachRow['City Finance Code'] }).exec();
                if (!ulb) {
                    continue;
                }
                await Ulb.updateOne({ _id: ObjectId(ulb._id) }, { $set: { isUA: 'Yes', UA: ObjectId(uaData._id) } })

            }
        }

        console.log('Task Completed')
        res.send('Task Completed')
    } catch (e) {
        return Response.BadRequest(res, {}, e.message);

    }


}

module.exports.createGrantType = async (req, res) => {
    await GrantType.insertMany([
        {
            "_id": ObjectId("60f6cdb368e143a9b134c335"),
            // "modifiedAt": ISODate("2021-07-20T13:20:14.976Z"),
            // "createdAt": ISODate("2021-07-20T13:20:14.976Z"),
            "isActive": true,
            "name": "Million Plus for Water Supply and SWM",

        },
        {
            "_id": ObjectId("60f6cdb468e143a9b134c337"),
            // "modifiedAt": ISODate("2021-07-20T13:20:14.976Z"),
            // "createdAt": ISODate("2021-07-20T13:20:14.976Z"),
            "isActive": true,
            "name": "Non-Million Untied",

        },
        {
            "_id": ObjectId("60f6cdb468e143a9b134c339"),
            // "modifiedAt": ISODate("2021-07-20T13:20:14.976Z"),
            // "createdAt": ISODate("2021-07-20T13:20:14.976Z"),
            "isActive": true,
            "name": "Non-Million Tied",

        }
    ]).then(function () {
        console.log("Data inserted")  // Success
    }).catch(function (error) {
        console.log(error)      // Failure
    })
}

module.exports.deleteNullNamedUA = async (req, res) => {
    await UAData.findOneAndDelete({ name: null }, function (err, docs) {
        if (err) {
            res.send(err)
        } else {
            res.json({
                success: true,
                docs: docs
            })
        }
    })
}
module.exports.createUA = async (req, res) => {


    const jsonArray = req.body.jsonArray;

    let errors = []
    for (let eachRow of jsonArray) {
        //console.log(eachRow.code,eachRow.name)
        if (eachRow['UA Name'] === 'Not a U.A' || eachRow['UA Name'] === '#N/A') {
            // let ulb = await Ulb.findOne({ code: eachRow['City Finance Code'] }).exec();
            // await Ulb.updateOne({_id:ObjectId(ulb._id)}, {$set:{isUA: 'No'}})
            continue;
        } else if (eachRow['UA Name'] != 'Not a U.A' || eachRow['UA Name'] != '#N/A') {
            eachRow['UA Name']
            let state = await State.findOne({ name: eachRow['State Name'] }).exec();
            let ulb = await Ulb.findOne({ code: eachRow['City Finance Code'] }).exec();
            data = {
                "name": eachRow['UA Name'],
                "state": ObjectId(state._id),
                $addToSet: { "ulb": ObjectId(ulb._id) }
            }

            await UAData.findOneAndUpdate({ "name": eachRow['UA Name'] }, data, { new: true, setDefaultsOnInsert: true, upsert: true })
        }
    }

    console.log('Task Completed')
    res.send('Task Completed')
}

module.exports.addULBsToUA = async (req, res) => {
    let newULBs = [
        ObjectId("5dd24729437ba31f7eb42ef8"),
        ObjectId("5fd2249984bf593ae2ee5f9d"),
        ObjectId("5dd24729437ba31f7eb42f39"),
        ObjectId("5dd2472a437ba31f7eb42f85"),
        ObjectId("5dd24729437ba31f7eb42ef2"),
        ObjectId("5dd2472a437ba31f7eb42f9e")
    ]
    let data = await UAData.findOne({ name: "Bhilainagar U.A." })
    console.log(data)
    for (let el of newULBs) {
        data['ulb'].push(el)
    }
    await data.save();
    console.log(data);
    //  await data.save();
    for (let el of newULBs) {
        await Ulb.findOneAndUpdate({ _id: el }, {
            isUA: true,
            UA: data['_id']
        })
    }

    res.status(200).json({
        success: true,
        message: "ULBs added to UA"
    })
}

module.exports.updateState = async (req, res) => {
    let UTs = ['5dcf9d7216a06aed41c748dc',
        '5dcf9d7216a06aed41c748e3',
        '5dcf9d7316a06aed41c748e4',
        '5dcf9d7316a06aed41c748e5',
        '5dcf9d7316a06aed41c748ea',
        '5dcf9d7316a06aed41c748ee',
        '5dcf9d7416a06aed41c748f6',
        '5efd6a2fb5cd039b5c0cfed2',
        '5fa25a6e0fb1d349c0fdfbc7']
    let states = []
    for (let ut of UTs) {
        console.log(ut)
        let state = await State.updateOne({ "name": ut }, { "accessToXVFC": true }, function (err, docs) {
            if (err) {
                console.log(err)
            }
            else {
                console.log("Updated Docs : ", docs);
            }
        })

    }



    res.status(200).json({
        success: true,
        message: "States Updated",

    })
}

module.exports.updateUA = async (req, res) => {
    let arr = await UAData.find({});

    let counter = 1;
    let code_prefix = 'UA_'
    arr.forEach(element => {
        let UACode = String(code_prefix + counter)
        element['UACode'] = UACode;
        counter++;
    })
    console.log(arr);
    arr.forEach(async (element) => {
        await UAData.updateOne({ "_id": element._id }, element)
    })


}

module.exports.updateUser = async (req, res) => {
    let stateData = await State.find().lean();
    let state_id = [];
    stateData.forEach(el => {
        state_id.push(el._id)
    })
    let sum = 0;
    console.log(state_id)
    for (let el of state_id) {
        let userData = await User.findOneAndUpdate({ state: ObjectId(el) }, { isNodalOfficer: true }, null, function (err, docs) {
            if (err) {
                console.log(err)
            }
            else {
                console.log("Original Doc : ", docs);
            }
        });
        // console.log(userData.length)
        if (userData) {
            sum++;
        }

    }
    res.send('Task Completed')
    console.log(sum)

    // await User.findOneAndUpdate({state: ObjectId(id)}, {isNodalOfficer: true})
}
module.exports.updateUserFinal = async (req, res) => {
    let stateData = await State.find().lean();
    let state_id = [];
    stateData.forEach(el => {
        state_id.push(el._id)
    })
    let sum = 0;
    console.log(state_id)
    for (let el of state_id) {
        let userData = await User.findOneAndUpdate({ state: ObjectId(el), role: "STATE" }, { isNodalOfficer: true }, null, function (err, docs) {
            if (err) {
                console.log(err)
            }
            else {
                console.log("Original Doc : ", docs);
            }
        });
        // console.log(userData.length)
        if (userData) {
            sum++;
        }

    }
    res.send('Task Completed')
    console.log(sum)

    // await User.findOneAndUpdate({state: ObjectId(id)}, {isNodalOfficer: true})
}

module.exports.getNodalOfficers = async (req, res) => {
    let stateData = await State.find().lean();
    let state_id = [];
    stateData.forEach(el => {
        state_id.push(el._id)
    })

    let userData = [];
    for (let el of state_id) {
        let user = await User.find({ isNodalOfficer: true, state: ObjectId(el), role: "STATE" }).lean();
        if (user.length == 0 || !user) {
            continue;
        }
        userData.push(user)
    }

    console.log('UserData', userData)
    console.log('Total Users=', userData.length);
    res.send(userData.length)
}
module.exports.updateUserData_Final = async (req, res) => {

    await User.updateMany({ isNodalOfficer: true }, { isNodalOfficer: false }, null, function (err, docs) {
        if (err) {
            console.log(err)
        }
        else {
            console.log("Original Doc : ", docs);
        }
    })


    let stateData = await State.find().lean();
    let state_id = [];
    stateData.forEach(el => {
        state_id.push(el._id)
    })

    let userData = [];
    for (let el of state_id) {
        let user = await User.findOneAndUpdate({ state: ObjectId(el), role: "STATE", isDeleted: false }, { isNodalOfficer: true }).lean();
        if (!user) {
            continue;
        }
        userData.push(user)
    }

    console.log('UserData', userData)
    console.log('Total Users=', userData.length);
    res.status(200).json({
        success: true,
        updatedDocuments: userData.length
    })
}

module.exports.addULBsToUA = async (req, res) => {
    let newULBs = [
        ObjectId("5dd24729437ba31f7eb42ef8"),
        ObjectId("5fd2249984bf593ae2ee5f9d"),
        ObjectId("5dd24729437ba31f7eb42f39"),
        ObjectId("5dd2472a437ba31f7eb42f85"),
        ObjectId("5dd24729437ba31f7eb42ef2"),
        ObjectId("5dd2472a437ba31f7eb42f9e")
    ]
    let data = await UAData.findOne({ name: "Bhilainagar U.A." })
    console.log(data)
    for (let el of newULBs) {
        data['ulb'].push(el)
    }
    await data.save();
    console.log(data);
    //  await data.save();
    for (let el of newULBs) {
        await Ulb.findOneAndUpdate({ _id: el }, {
            isUA: true,
            UA: data['_id']
        })
    }

    res.status(200).json({
        success: true,
        message: "ULBs added to UA"
    })
}


module.exports.getULBCount = async (req, res) => {
    let { state_id } = req.query
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
            $unwind: "$state"
        },
        {
            $group: {
                _id: null,
                totalULBs: { $sum: 1 },
                id: { $addToSet: "$_id" }
            }
        },

        {
            $lookup: {

                from: "users",
                localField: "id",
                foreignField: "ulb",
                as: "user"
            }
        },
        {
            $group: {
                _id: null,

                totalULBs: { $first: "$totalULBs" },
                ulbsWithUser: { $first: { $size: "$user" } }
            }
        }

    ]
    let query2 = [
        {
            $lookup: {

                from: "states",
                localField: "state",
                foreignField: "_id",
                as: "state"
            }
        },
        {
            $unwind: "$state"
        },
        {
            $match: {
                "state.accessToXVFC": true
            }
        },
        {
            $group: {
                _id: null,
                validULBs: { $sum: 1 }
            }
        }

    ]
    let matchObject = {
        $match: {
            state: ObjectId(state_id)
        }
    }

    if (state_id) {
        query.unshift(matchObject);
        query2.unshift(matchObject);

    }

    let responseData = await Ulb.aggregate(query);
    let responseData2 = await Ulb.aggregate(query2);
    responseData.push(responseData2)

    return res.json({
        data: responseData ? responseData : 'Not Found',
        success: responseData ? true : false
    })

}