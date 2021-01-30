var xlstojson = require('xls-to-json-lc');
var xlsxtojson = require('xlsx-to-json-lc');
const service = require('../../service');
const Ulb = require('../../models/Ulb');
const State = require('../../models/State');
const UlbType = require('../../models/UlbType');
const ObjectId = require('mongoose').Types.ObjectId;
module.exports = async function (req, res, next) {
    if (req.file) {
        var reqFile = req.file;
        let errors = [];
        var exceltojson;
        res['fileName'] = reqFile.originalname;
        if (
            reqFile.originalname.split('.')[
                reqFile.originalname.split('.').length - 1
            ] === 'xlsx'
        ) {
            exceltojson = xlsxtojson;
        } else {
            exceltojson = xlstojson;
        }
        try {
            await exceltojson(
                {
                    input: reqFile.path,
                    output: null, //since we don't need output.json
                    lowerCaseHeaders: true,
                    //sheet: "Input sheet",
                },
                async function (err, sheet) {
                    //console.log(sheet);
                    //return;
                    // Error encountered in reading XLSX File
                    if (err) {
                        res['errors'] = err;
                        return returnResponse(res);
                    }

                    let counter = 0;
                    for (let eachRow of sheet) {
                        // remove all the empty rows or null rows from eachRow object
                        Object.keys(eachRow).forEach(
                            (key) =>
                                (eachRow[key] == null || eachRow[key] == '') &&
                                delete eachRow[key]
                        );
                        let message = '';

                        // check whether particular state exists or not
                        let state = await State.findOne(
                            { code: eachRow.statecode, isActive: true },
                            { code: 1 }
                        ).exec();

                        // check whether ulb type exists or not
                        let ulbType = await UlbType.findOne(
                            { name: eachRow.ulbtype, isActive: true },
                            { name: 1 }
                        ).exec();

                        state
                            ? eachRow.statecode == state.code
                            : (message +=
                                  'State ' +
                                  eachRow.statecode +
                                  " don't exists");
                        ulbType
                            ? eachRow.ulbType == ulbType.name
                            : (message +=
                                  'Ulb ' + eachRow.ulbcode + " don't exists");
                        console.log(message);
                        if (message != '') {
                            // if any state or ulb type not exists, then return message
                            errors.push(message);
                        } else {
                            // take area, wards, population => if empty then convert to 0 or if comma then remove comma
                            eachRow.area = eachRow.area
                                ? Number(eachRow.area.replace(/\,/g, ''))
                                : 0;
                            eachRow.wards = eachRow.wards
                                ? Number(eachRow.wards.replace(/\,/g, ''))
                                : 0;
                            eachRow.population = eachRow.population
                                ? Number(eachRow.population.replace(/\,/g, ''))
                                : 0;
                            eachRow.location = {
                                lat:
                                    eachRow.latitude && eachRow.latitude != 0
                                        ? eachRow.latitude
                                        : '0.0',
                                lng:
                                    eachRow.longitude && eachRow.longitude != 0
                                        ? eachRow.longitude
                                        : '0.0',
                            };

                            eachRow.state = ObjectId(state._id);
                            eachRow.ulbType = ObjectId(ulbType._id);
                            eachRow.name = eachRow.ulbname;
                            eachRow['natureOfUlb'] = eachRow['natureofulb']
                                ? eachRow['natureofulb']
                                : '';
                            eachRow['name'] = eachRow['ulbname'];
                            eachRow['code'] = eachRow.ulbcode;
                            eachRow['sbCode'] = eachRow.sbcode;
                            eachRow['censusCode'] = eachRow.censuscode;
                            service.put(
                                { code: eachRow.ulbcode },
                                eachRow,
                                Ulb,
                                function (response, value) {
                                    if (!response) {
                                        errors.push(
                                            'Not able to create ulb => ',
                                            eachRow.code + '' + response
                                        );
                                    }
                                    counter++;
                                    console.log(value.message);
                                }
                            );
                        }
                    }
                    res['errors'] = errors;
                    return returnResponse(res);
                }
            );
        } catch (e) {
            console.log('Exception Caught while extracting file => ', e);
            errors.push('Exception Caught while extracting file');
        }
    } else {
        returnResponse(res, 400);
    }
};
function returnResponse(res, status = 200) {
    if (status == 200) {
        return res.status(status).json({
            data: [
                {
                    msg:
                        res.errors && res.errors.length > 0
                            ? res.errors
                            : 'Successfully uploaded file : ' + res['fileName'],
                    success: res.errors && res.errors.length > 0 ? false : true,
                },
            ],
            success: true,
        });
    } else {
        return res.status(status).json({
            data: [],
            message: 'Problem with the file',
            success: false,
        });
    }
}
