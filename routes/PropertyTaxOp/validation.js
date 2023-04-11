const { propertyTaxOpFormJson } = require('./fydynemic')
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