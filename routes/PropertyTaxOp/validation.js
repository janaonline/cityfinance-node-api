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
      "otherValueWaterTaxDm",
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
                    "1.6",
                    "1.7"
                ],
                "message": "Sum of current and arrears should be equal to total property tax demand.",
                "displayNumber": "1.5"
            },
            {
                "logic": "sum",
                "fields": [
                    "dmdexcludingCess",
                    "taxTypeDemand",
                    "cessDemand"
                ],
                "sequence": [
                    "1.8",
                    "1.9",
                    "1.10"
                ],
                "message": "Sum should be equal to total proprety tax demand.",
                "displayNumber": "1.5"
            }
        ],
        "displayNumber": "1.5"
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
                    "1.5"
                ],
                "message": "Total property tax collection including cess, other taxes, AND excluding user charges should be less than or equal to total property tax demand.",
                "displayNumber": "1.13"
            },
            {
                "logic": "sum",
                "fields": [
                    "collectExcludingCess",
                    "taxTypeCollection",
                    "cessCollect"
                ],
                "sequence": [
                    "1.16",
                    "1.17",
                    "1.18"
                ],
                "message": "Sum should be equal to total property tax collection.",
                "displayNumber": "1.13"
            },
            {
                "logic": "sum",
                "fields": [
                    "cuCollectIncludingCess",
                    "arCollectIncludingCess"
                ],
                "sequence": [
                    "1.14",
                    "1.15"
                ],
                "message": "Sum of current and arrears should be equal to total property tax collection",
                "displayNumber": "1.13"
            }
        ],
        "displayNumber": "1.13"
    },
    "collectExcludingCess": {
        "logic": "ltequal",
        "fields": [
            "dmdexcludingCess"
        ],
        "sequence": [
            "1.8"
        ],
        "message": "Total property tax collection exlluding cess, other taxes, and user charges should be less than or equal to total property tax demand.",
        "displayNumber": "1.16"
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
        "message": "Sum should be equal to total number of properties from which property tax is demanded",
        "displayNumber": "2.3"
    },
    "totalPropertiesTaxDmCollected": {
        "logic": "sum",
        "fields": [
            "totalPropertiesTax",
            "resNoPropertyTaxCollected",
            "comNoPropertyTaxCollected",
            "indNoPropertyTaxCollected",
            "insNoPropertyTaxCollected",
            "otherNoPropertyTaxCollected"
        ],
        "sequence": [
            "2.8",
            "2.12",
            "2.16",
            "2.2",
            "2.24",
            "2.29"
        ],
        "message": " Sum should be equal to total number of properties from which property tax is collected",
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
        "message": " Number of properties from which property tax is collected should be less that or equal to number of properties from which property tax is demanded.",
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
        "message": "Value of property tax collected should be less that or equal to value of property tax demanded.",
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
        "message": "Number of properties that paid online should be less than or equal to total number of properties from which property tax was collected.",
        "displayNumber": "3.2"
    },
    "waterChrgDm": {
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
            "entityWaterCharges",
            "resNoWaterChrgCollected",
            "indNoWaterChrgCollected",
            "othersNoWaterChrgCollected"
        ],
        "sequence": [
            "5.16",
            "5.2",
            "5.24",
            "5.29"
        ],
        "message": "Total collections made via online channel should be less than or equal to total property tax collections.",
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
    'otherValuePropertyTaxCollected':{
        "logic": "ltequal",
        "fields": [
            "otherValuePropertyTaxDm"
        ],
        "sequence": [
            "2.26"
        ],
        "message": " Value of property tax collected should be less that or equal to value of property tax demanded." 
    },
    "otherNoPropertyTaxCollected":{
        "logic":"ltequal",
        "fields":[
            "otherNoPropertyTaxCollected"
        ],
        "sequence":[
            "2.29"
        ],
        "message":"Number of properties from which property tax is collected should be less that or equal to number of properties from which property tax is demanded."
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