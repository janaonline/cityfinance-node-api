var xlstojson = require('xls-to-json-lc');
var xlsxtojson = require('xlsx-to-json-lc');
const service = require('../../service');
const bondIssuerJson = require('../../models/bondIssuer');
const BondIssuerItem = require('../../models/BondIssuerItem');

module.exports = async function(req, res, next) {
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
          // lowerCaseHeaders: true,
          sheet: 'Sheet1'
        },
        async function(err, sheet) {
          // Error encountered in reading XLSX File
          if (err) {
            res['errors'] = err;
            return returnResponse(res);
          }
          // console.log(sheet);
          for (let eachRow of sheet) {
            // remove all the empty rows or null rows from eachRow object
            Object.keys(eachRow).forEach(
              key =>
                (eachRow[key] == null || eachRow[key] == '') &&
                delete eachRow[key]
            );

            bondIssuerJson['rating'].forEach((rating, i) => {
              for (let key in eachRow) {
                if (rating.toLowerCase() === key) {
                  console.log(key);
                  //eachRow[key.toUpperCase()] = eachRow[key];
                }
              }
            });

            console.log(eachRow);

            for (let key in eachRow) {
              if (camelize(key) !== key) {
                eachRow[camelize(key)] = eachRow[key];
                //delete eachRow[key];
              }
            }

            //console.log(eachRow);

            let message = '';

            // check whether particular state exists or not
            // let state = await State.findOne(
            //   { name: eachRow.state, isActive: true },
            //   { _id: 1 }
            // ).exec();

            // check for ulb
            if (Object.keys(eachRow).length !== 0) {
              if (eachRow.ulbName) {
                eachRow.ulb = eachRow.ulbName ? eachRow.ulbName.trim() : null;
                delete eachRow.ulbName;
                // let date = new Date(eachRow['dateOfIssue']);
                eachRow['yearOfBondIssued'] = getYear(eachRow['dateOfIssue']);
                // console.log(eachRow);
              } else {
                message += 'Ulb Name required';
              }
            }

            // ulbType
            //   ? (eachRow.ulbtype = ulbType._id)
            //   : (message += 'Ulb ' + eachRow.type + " don't exists");

            if (message != '') {
              // if any state or ulb type not exists, then return message
              errors.push(message);
            } else {
              if (eachRow.ulb) {
                // console.log('put called', eachRow);
                await service.put(
                  {
                    ulb: eachRow['ulb'],
                    dateOfIssue: eachRow['dateOfIssue'],
                    issueSize: eachRow['issueSize']
                  },
                  eachRow,
                  BondIssuerItem,
                  function(response, value) {
                    if (!response) {
                      errors.push(
                        'Not able to create ulb => ',
                        eachRow.code + '' + response
                      );
                    }
                  }
                );
              }
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
          success: res.errors && res.errors.length > 0 ? false : true
        }
      ],
      success: true
    });
  } else {
    return res.status(status).json({
      data: [],
      message: 'Problem with the file',
      success: false
    });
  }
}

function camelize(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
    if (+match === 0) return ''; // or if (/\s+/.test(match)) for white spaces
    return index == 0 ? match.toLowerCase() : match.toUpperCase();
  });
}

function getYear(str) {
  if (str.includes('-')) return str.split('-').slice(-1)[0];
  return str;
}
