const { propertyTaxOpFormJson } = require('./fydynemic')
const keysWithChild = {
    // "taxTypeDemand": [
    //   "taxTypeDemandChild"
    // ],
    // "cessDemand": [
    //   "cessDemandChild"
    // ],
    // "userChargesDmnd": [
    //   "userChargesDmndChild"
    // ],
    // "taxTypeCollection": [
    //   "taxTypeCollectionChild"
    // ],
    // "cessCollect": [
    //   "cessCollectChild"
    // ],
    // "userChargesCollection": [
    //   "userChargesCollectionChild"
    // ],
    "otherValuePropertyType": [
      "otherValuePropertyTaxDm",
      "otherNoPropertyTaxDm",
      "otherValuePropertyTaxCollected",
      "otherNoPropertyTaxCollected"
    ],
    "othersValueWaterType": [
      "othersValueWaterChrgDm",
      "othersNoWaterChrgDm",
      "othersValueWaterChrgCollected",
      "othersNoWaterChrgCollected"
    ],
    "otherValueSewerageType": [
      "otherValueSewerageTaxDm",
      "otherNoSewerageTaxDm",
      "otherValueSewerageTaxCollected",
      "otherNoSewerageTaxCollected"
    ]
  }
const validationJson = {
    "dmdIncludingCess": {
        "logic": "multiple",
        "multipleValidations": [
            {
                "logic": "sum",
                "fields": [
                    "cdmdIncludingCess",
                    "admdIncludingCess"
                ],
                "sequence": [
                    "1.10",
                    "1.11"
                ],
                "message": "Sum of current and arrears should be equal to total property tax demand.",
                "displayNumber": "1.9"
            },
            {
                "logic": "sum",
                "fields": [
                    "dmdexcludingCess",
                    "taxTypeDemand",
                    "cessDemand"
                ],
                "sequence": [
                    "1.12",
                    "1.13",
                    "1.14"
                ],
                "message": "Sum should be equal to total property tax demand.",
                "displayNumber": "1.9"
            },
            {
                "logic": "sum",
                "fields": [
                    "resValuePropertyTaxDm",
                    "comValuePropertyTaxDm",
                    "indValuePropertyTaxDm",
                    "govValuePropertyTaxDm",
                    "insValuePropertyTaxDm",
                    "otherValuePropertyTaxDm"
                ],
                "sequence": [
                    "2.5",
                    "2.9",
                    "2.13",
                    "2.17",
                    "2.21",
                    "2.26",
                ],
                "message": "Total Property tax demand should be equal to the sum of total of all the tax demand figures under property type section.",
                "displayNumber": "1.9"
            },
        ],
        "displayNumber": "1.9"
    },
    "collectIncludingCess": {
        "logic": "multiple",
        "multipleValidations": [
            {
                "logic": "ltequal",
                "fields": [
                    "dmdIncludingCess"
                ],
                "sequence": [
                    "1.9"
                ],
                "message": "Total property tax collection including cess, other taxes, AND excluding user charges should be less than or equal to total property tax demand.",
                "displayNumber": "1.17"
            },
            {
                "logic": "sum",
                "fields": [
                    "resValuePropertyTaxCollected",
                    "comValuePropertyTaxCollected",
                    "indValuePropertyTaxCollected",
                    "govValuePropertyTaxCollected",
                    "insValuePropertyTaxCollected",
                    "otherValuePropertyTaxCollected"
                ],
                "sequence": [
                    "2.7",
                    "2.11",
                    "2.15",
                    "2.19",
                    "2.23",
                    "2.28"
                ],
                "message": "Total Property tax collection should be equal to the sum of total of all the tax collection figures under property type section",
                "displayNumber": "1.17"
            },
            {
                "logic": "sum",
                "fields": [
                    "collectExcludingCess",
                    "taxTypeCollection",
                    "cessCollect"
                ],
                "sequence": [
                    "1.20",
                    "1.21",
                    "1.22"
                ],
                "message": "Sum should be equal to total property tax collection.",
                "displayNumber": "1.17"
            },
            {
                "logic": "sum",
                "fields": [
                    "cuCollectIncludingCess",
                    "arCollectIncludingCess"
                ],
                "sequence": [
                    "1.18",
                    "1.19"
                ],
                "message": "Sum of current and arrears should be equal to total property tax collection",
                "displayNumber": "1.13"
            }
        ],
        "displayNumber": "1.17"
    },
    "collectExcludingCess": {
        "logic": "ltequal",
        "fields": [
            "dmdexcludingCess"
        ],
        "sequence": [
            "1.12"
        ],
        "message": "Total property tax collection exlluding cess, other taxes, and user charges should be less than or equal to total property tax demand.",
        "displayNumber": "1.20"
    },
    "noOfPropertiesPaidOnline": {
        "logic": "ltequal",
        "fields": [
            "totalPropertiesTaxDmCollected"
        ],
        "sequence": [
            "2.4"
        ],
        "message": "Number of properties that paid online should be less than or equal to total number of properties from which property tax was collected.",
        "displayNumber": "3.1"
    },
    "insValuePropertyTaxCollected": {
        "logic": "ltequal",
        "fields": [
            "insValuePropertyTaxDm"
        ],
        "sequence": [
            "2.21"
        ],
        "message": "Value of property tax collected should be less that or equal to value of property tax demanded.",
        "displayNumber": "2.23"
    },
    "insNoPropertyTaxCollected": {
        "logic": "ltequal",
        "fields": [
            "insNoPropertyTaxDm"
        ],
        "sequence": [
            "2.22"
        ],
        "message": "Number of properties from which property tax is collected should be less that or equal to number of properties from which property tax is demanded.",
        "displayNumber": "2.24"
    },
    "totalPropertiesTaxDm": {
        "logic": "sum",
        "fields": [
            'resNoPropertyTaxDm',
            'comNoPropertyTaxDm',
            'indNoPropertyTaxDm',
            'govNoPropertyTaxDm',
            'insNoPropertyTaxDm',
            "otherNoPropertyTaxDm"
        ],
        "sequence": [
            "2.6",
            "2.10",
            "2.14",
            "2.18",
            "2.22",
            "2.27"
        ],
        "message": "Sum should be equal to total number of properties from which property tax is demanded.",
        "displayNumber": "2.3"
    },
    "totalPropertiesTaxDmCollected": {
        "logic": "sum",
        "fields": [
            'resNoPropertyTaxCollected',
            'comNoPropertyTaxCollected',
            'indNoPropertyTaxCollected',
            'govNoPropertyTaxCollected',
            'insNoPropertyTaxCollected',
            "otherNoPropertyTaxCollected"
        ],
        "sequence": [
            "2.8",
            "2.12",
            "2.16",
            "2.20",
            "2.24",
            "2.29"
        ],
        "message": "Sum should be equal to total number of properties from which property tax is collected",
        "displayNumber": "2.4"
    },
    "resValuePropertyTaxCollected": {
        "logic": "ltequal",
        "fields": [
            "resValuePropertyTaxDm"
        ],
        "sequence": [
            "2.5"
        ],
        "message": "Value of property tax collected should be less that or equal to value of property tax demanded.",
        "displayNumber": "2.7"
    },
    "resNoPropertyTaxCollected": {
        "logic": "ltequal",
        "fields": [
            "resNoPropertyTaxDm"
        ],
        "sequence": [
            "2.6"
        ],
        "message": "Number of properties from which property tax is collected should be less that or equal to number of properties from which property tax is demanded.",
        "displayNumber": "2.8"
    },
    "comValuePropertyTaxCollected": {
        "logic": "ltequal",
        "fields": [
            "comValuePropertyTaxDm"
        ],
        "sequence": [
            "2.9"
        ],
        "message": "Value of property tax collected should be less that or equal to value of property tax demanded.",
        "displayNumber": "2.11"
    },
    "comNoPropertyTaxCollected": {
        "logic": "ltequal",
        "fields": [
            "comNoPropertyTaxDm"
        ],
        "sequence": [
            "2.10"
        ],
        "message": "Number of properties from which property tax is collected should be less that or equal to number of properties from which property tax is demanded.",
        "displayNumber": "2.12"
    },
    "indValuePropertyTaxCollected": {
        "logic": "ltequal",
        "fields": [
            "indValuePropertyTaxDm"
        ],
        "sequence": [
            "2.13"
        ],
        "message": "Value of property tax collected should be less that or equal to value of property tax demanded.",
        "displayNumber": "2.15"
    },
    "indNoPropertyTaxCollected": {
        "logic": "ltequal",
        "fields": [
            "indNoPropertyTaxDm"
        ],
        "sequence": [
            "2.14"
        ],
        "message": "Number of properties from which property tax is collected should be less that or equal to number of properties from which property tax is demanded.",
        "displayNumber": "2.16"
    },
    "govValuePropertyTaxCollected": {
        "logic": "ltequal",
        "fields": [
            "govValuePropertyTaxDm"
        ],
        "sequence": [
            "2.17"
        ],
        "message": "Value of property tax collected should be less that or equal to value of property tax demanded",
        "displayNumber": "2.19"
    },
    "govNoPropertyTaxCollected": {
        "logic": "ltequal",
        "fields": [
            "govNoPropertyTaxDm"
        ],
        "sequence": [
            "2.18"
        ],
        "message": "Number of properties from which property tax is collected should be less that or equal to number of properties from which property tax is demanded.",
        "displayNumber": "2.19"
    },
    "totalCollectionOnline": {
        "logic": "ltequal",
        "fields": [
            "collectIncludingCess"
        ],
        "sequence": [
            "1.13"
        ],
        "message": "Total collections made via online channel should be less than or equal to total property tax collections.",
        "displayNumber": "3.2"
    },
    "waterChrgDm": {
        "logic": "multiple",
        "multipleValidations": [
            {
                "logic":"sum",
                "fields":[
                    "resValueWaterChrgDm",
                    "comValueWaterChrgDm",
                    "indValueWaterChrgDm",
                    "othersValueWaterChrgDm"
                ],
                "sequence":[
                    "5.13",
                    "5.17",
                    "5.21",
                    "5.26"
                ],
                "message":"Total water charges demand should be equal to the sum total of all the water charges demanded under the connection type",
                "displayNumber":"5.5"
            },
            {
                "logic": "sum",
                "fields": [
                    "cuWaterChrgDm",
                    "arWaterChrgDm"
                ],
                "sequence": [
                    "5.6",
                    "5.7"
                ],
                "message": "Sum of current and arrears should be equal to total water charges demand.",
                "displayNumber": "5.5"
            },],
            "displayNumber": "5.5"
    },
    "waterChrgCol": {
        "logic":"multiple",
        "multipleValidations":[
            {
                "logic":"sum",
                "fields":[
                    "resValueWaterChrgCollected",
                    "comValueWaterChrgCollected",
                    "indValueWaterChrgCollected",
                    "othersValueWaterChrgCollected"
                ],
                "sequence":[
                    "5.15",
                    "5.19",
                    "5.23",
                    "5.28"
                ],
                "message":`Total water charges collection figures should be equal to the sum total of all the water charges collected under the "connection" type`
            },
            {
                "logic": "sum",
                "fields": [
                    "cuWaterChrgCol",
                    "arWaterChrgCol",
                ],
                "sequence": [
                    "5.9",
                    "5.10",
                ],
                "message": "Sum of current and arrears should be equal to total water charges collection.",
                "displayNumber": "5.8"
            }
        ],
        "displayNumber": "5.8"
    },
    "waterChrgConnectionDm": {
        "logic": "sum",
        "fields": [
            "resNoWaterChrgDm",
            "comNoWaterChrgDm",
            "indNoWaterChrgDm",
            "othersNoWaterChrgDm"
        ],
        "sequence": [
            "5.14",
            "5.18",
            "5.22",
            "5.27"
        ],
        "message": "The sum should be equal to total number of connections from which water charges was demanded",
        "displayNumber": "5.11"
    },
    "waterChrgConnectionCol": {
        "logic": "sum",
        "fields": [
            "resNoWaterChrgCollected",
            "comNoWaterChrgCollected",
            "indNoWaterChrgCollected",
            "othersNoWaterChrgCollected"
        ],
        "sequence": [
            "5.16",
            "5.20",
            "5.24",
            "5.29"
        ],
        "message": "The sum should be equal to total number of connections from which water charges was collected.",
        "displayNumber": "5.12"
    },
    "resValueWaterChrgCollected": {
        "logic": "ltequal",
        "fields": [
            "resValueWaterChrgDm"
        ],
        "sequence": [
            "5.13"
        ],
        "message": "Value of water charges collected should be less that or equal to value of water charges demanded.",
        "displayNumber": "5.15"
    },
    "comValueWaterChrgCollected": {
        "logic": "ltequal",
        "fields": [
            "comValueWaterChrgDm"
        ],
        "sequence": [
            "5.17"
        ],
        "message": "Value of water charges collected should be less that or equal to value of water charges demanded.",
        "displayNumber": "5.19"
    },
    "comNoWaterChrgCollected": {
        "logic": "ltequal",
        "fields": [
            "comNoWaterChrgDm"
        ],
        "sequence": [
            "5.18"
        ],
        "message": "Number of connections from which water charges was collected should be less that or equal to number of connections from which water charges was demanded.",
        "displayNumber": "5.20"
    },
    "indValueWaterChrgCollected": {
        "logic": "ltequal",
        "fields": [
            "indValueWaterChrgDm"
        ],
        "sequence": [
            "5.21"
        ],
        "message": "Value of water charges collected should be less that or equal to value of water charges demanded.",
        "displayNumber": "5.20"
    },
    "indNoWaterChrgCollected": {
        "logic": "ltequal",
        "fields": [
            "indNoWaterChrgDm"
        ],
        "sequence": [
            "5.22"
        ],
        "message": "Number of connections from which water charges was collected should be less that or equal to number of connections from which water charges was demanded.",
        "displayNumber": "5.24"
    },
    "othersValueWaterChrgCollected": {
        "logic": "ltequal",
        "fields": [
            "othersValueWaterChrgDm"
        ],
        "sequence": [
            "5.26"
        ],
        "message": " Value of water charges collected should be less that or equal to value of water charges demanded",
        "displayNumber": "5.28"
    },
    "othersNoWaterChrgCollected": {
        "logic": "ltequal",
        "fields": [
            "othersNoWaterChrgDm"
        ],
        "sequence": [
            "5.27"
        ],
        "message": "Number of connections from which water charges was collected should be less that or equal to number of connections from which water charges was demanded.",
        "displayNumber": "5.29"
    },
    "resNoWaterChrgCollected": {
        "logic": "ltequal",
        "fields": [
            "resNoWaterChrgDm"
        ],
        "sequence": [
            "5.14"
        ],
        "message": "Number of connections from which water charges was collected should be less that or equal to number of connections from which water charges was demanded.",
        "displayNumber": "5.16"
    },
    'otherValuePropertyTaxCollected': {
        "logic": "ltequal",
        "fields": [
            "otherValuePropertyTaxDm"
        ],
        "sequence": [
            "2.26"
        ],
        "message": " Value of property tax collected should be less that or equal to value of property tax demanded."
    },
    "otherNoPropertyTaxCollected": {
        "logic": "ltequal",
        "fields": [
            "otherNoPropertyTaxDm"
        ],
        "sequence": [
            "2.27"
        ],
        "message": "Number of properties from which property tax is collected should be less that or equal to number of properties from which property tax is demanded.",
        "displayNumber":"2.29"
    },
    "totalSewergeChrgDm": {
        "logic":"multiple",
        "multipleValidations":[
            {
                "logic":"sum",
                "fields":[
                    "resValueSewerageTaxDm",
                    "comValueSewerageTaxDm",
                    "indValueSewerageTaxDm",
                    "otherValueSewerageTaxDm"
                ],
                "sequence":[
                    "6.13",
                    "6.17",
                    "6.21",
                    "6.26"
                ],
                "displayNumber":"6.5",
                "message":`Total sewerage charges demand figures should be equal to the sum total of all the sewerage charges demanded under "connection" type`
            },
            {
            "logic": "sum",
            "fields": [
                "curSewergeChrgDm",
                "arrSewergeChrgDm"
            ],
            "sequence": [
                "6.6",
                "6.7"
            ],
            "message": "Sum of current and arrears should match the total charges demand.",
            "displayNumber":"6.5"
        }],
        "displayNumber":"6.5"
    },
    "totalSewergeChrgCol": {
        "logic":"multiple",
        "multipleValidations":[
           
            {
                "logic": "sum",
                "fields": [
                    "curSewergeChrgCol",
                    "arrSewergeChrgCol"
                ],
                "sequence": [
                    "6.9",
                    "6.10"
                ],
                "message": "Sum of current and arrears should match the total charges collection."
            },
            {
                "logic":"sum",
                "fields":[
                    "resValueSewerageTaxCollected",
                    "comValueSewerageTaxCollected",
                    "indValueSewerageTaxCollected",
                    "otherValueSewerageTaxCollected"
                ],
                "sequence":[
                    "6.15",
                    "6.19",
                    "6.23",
                    "6.28"
                ],
                "message":`Total sewerage charges collection figures should be equal to the sum total of all the sewerage charges collected under the "connection" type`
            },
        ],
        "displayNumber":"6.8"
        
    },
    "totalSewergeConnectionDm": {
        "logic": "sum",
        "fields": [
            "resNoSewerageTaxDm",
            "comNoSewerageTaxDm",
            "indNoSewerageTaxDm",
            "otherNoSewerageTaxDm"
        ],
        "sequence": [
            "6.14",
            "6.18",
            "6.22",
            "6.27"
        ],
        "message": "The sum should be equal to total number of connections from which sewerage charges were demanded."
    },
    "totalSewergeConnectionCol": {
        "logic": "sum",
        "fields": [
            "resNoSewerageTaxCollected",
            "comNoSewerageTaxCollected",
            "indNoSewerageTaxCollected",
            "otherNoSewerageTaxCollected"
        ],
        "sequence": [
            "6.16",
            "6.20",
            "6.24",
            "6.29"
        ],
        "message": "The sum should be equal to total number of connections from which sewerage charges were collected."
    },
    "resValueSewerageTaxCollected": {
        "logic": "ltequal",
        "fields": [
            "resValueSewerageTaxDm"
        ],
        "sequence": [
            "6.13"
        ],
        "message": "Value of sewerage charges collected should be less than or equal to value of sewerage charges demanded."
    },
    "resNoSewerageTaxCollected": {
        "logic": "ltequal",
        "fields": [
            "resNoSewerageTaxDm"
        ],
        "sequence": [
            "6.14"
        ],
        "message": "Number of connections from which sewerage charges was collected should be less than or equal to Number of connections from which sewerage charges was demanded."
    },
    "comValueSewerageTaxCollected": {
        "logic": "ltequal",
        "fields": [
            "comValueSewerageTaxDm"
        ],
        "sequence": [
            "6.17"
        ],
        "message": "Value of sewerage charges collected should be less than or equal to value of sewerage charges demanded.."
    },
    "comNoSewerageTaxCollected": {
        "logic": "ltequal",
        "fields": [
            "comNoSewerageTaxDm"
        ],
        "sequence": [
            "6.18"
        ],
        "message": "Number of connections from which sewerage charges was collected should be less than or equal to Number of connections from which sewerage charges was demanded."
    },
    "indValueSewerageTaxCollected": {
        "logic": "ltequal",
        "fields": [
            "indValueSewerageTaxDm"
        ],
        "sequence": [
            "6.21"
        ],
        "message": "Value of sewerage charges collected should be less than or equal to value of sewerage charges demanded."
    },
    "indNoSewerageTaxCollected": {
        "logic": "ltequal",
        "fields": [
            "indNoSewerageTaxDm"
        ],
        "sequence": [
            "6.22"
        ],
        "message": "Number of connections from which sewerage charges was collected should be less than or equal to Number of connections from which sewerage charges was demanded."
    },
    "otherValueSewerageTaxCollected": {
        "logic": "ltequal",
        "fields": [
            "otherValueSewerageTaxDm"
        ],
        "sequence": [
            "6.26"
        ],
        "message": "Value of sewerage charges collected should be less than or equal to value of sewerage charges demanded."
    },
    "otherNoSewerageTaxCollected": {
        "logic": "ltequal",
        "fields": [
            "otherNoSewerageTaxDm"
        ],
        "sequence": [
            "6.27"
        ],
        "message": "Number of connections from which sewerage charges was collected should be less than or equal to Number of connections from which sewerage charges was demanded."
    }
}
exports.checkValidation = async function (req, res, next) {
    try {
        const { actions, isDraft } = req.body;
        if (isDraft == null || isDraft == true) {
            next();
        } else {
            let mainErrorArr = [];
            if (actions.length) {
                for (let el of actions) {
                    let { data } = el;
                    for (let sortKey in data) {
                        const { yearData } = data[sortKey];
                        let errorList = await getErrorList({ sortKey, "bodyYearData": yearData.filter(e => e?.year) });
                        if (errorList.length) {
                            mainErrorArr.push({ [sortKey]: errorList })
                        }
                    }
                }
            }
            let pmrArr = await Promise.all(mainErrorArr);
            if (pmrArr.length) {
                return res.status(400).json({ status: false, message: "Something went wrong!", err: mainErrorArr });
            } else {
                next();
            }
        }
    } catch (error) {
        console.log("error", error);
        return res.status(400).json({ status: false, message: "Something went wrong!", err: error.message });
    }
}
const getErrorList = ({ sortKey, bodyYearData }) => {
    return new Promise(async (resolve, reject) => {
        try {
            let errArr = []
            if (bodyYearData.length) {
                for (const byData of bodyYearData) {
                    let validatedObj = await getVavidationObject(sortKey, byData);
                    const { max, required, formFieldType, year, type } = validatedObj;
                    let postValue = await getValue(formFieldType, byData);
                    if (required) {
                        !postValue ? errArr.push({ "message": "Required field", "type": type, "year": year }) : ""
                    } else if (max) {
                        (!max.length >= postValue.length) ? errArr.push({ "message": "Max value is out of range", "type": type, "year": year }) : ""
                    }
                }
            }
            let pmArr = await Promise.all(errArr);
            resolve(pmArr);
        } catch (error) {
            console.log("getErrorList :::::", error)
            reject(error);
        }
    })
}
const getValue = (formFieldType, byData) => {
    switch (formFieldType) {
        case 'date':
            return byData['date']
        case 'file':
            return byData['file'].url
        default:
            return byData['value']
    }
}
const getVavidationObject = (sortKey, byData) => {
    return new Promise(async (resolve, reject) => {
        try {
            const { tabs } = await propertyTaxOpFormJson();
            const { data } = tabs[0];
            const { yearData } = data[sortKey];
            const { year, type } = byData;
            let d = yearData.find((e => e.type === type && e.year === year));
            resolve(d);
        } catch (error) {
            reject(error);
        }
    })
}

module.exports.validationJson = validationJson
module.exports.keysWithChild = keysWithChild