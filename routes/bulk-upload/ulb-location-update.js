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

module.exports.updateState = async (req, res) => {
    let UTs = ['Andaman and Nicobar Islands',
        'Dadra and Nagar Haveli',
        'Daman and Diu',
        'Delhi',
        'Jammu and Kashmir',
        'Lakshadweep',
        'Puducherry',
        'Ladakh',
        'Chandigarh']
    let states = []
    for (let ut of UTs) {
        console.log(ut)
        let state = await State.findOneAndUpdate({ name: ut }, { accesstoXVFC: false }, { new: true })
        states.push(state)
    }


    console.log(states)
    res.status(200).json({
        success: true,
        message: "States Updated"
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