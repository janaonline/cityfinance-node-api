const jwt = require('jsonwebtoken');
const FiscalRanking = require('../models/FiscalRanking');
const Config = require('../config/app_config');
const ObjectId = require("mongoose").Types.ObjectId;
const axios = require('axios');
const User = require('../models/User');
const { writeFileSync } = require('fs')
const { APPROVAL_TYPES, ENV } = require("../util/FormNames");
const MASTER_FORM_STATUS = {
    IN_PROGRESS : 2,
    RETURNED_BY_PMU: 10,
    VERIFICATION_IN_PROGRESS: 9
}

module.exports.frFormFreeze = async () => {
    try {
        let compareDate = new Date();
        compareDate.setDate(compareDate.getDate() - 10);

        let url = "http://localhost:8080/api/v1/";

        if ((process.env.ENV == ENV['prod'])) {
            url = `https://${process.env.PROD_HOST}/api/v1/`;
        } else if ((process.env.ENV == ENV['demo'])) {
            url = `https://${process.env.DEMO_HOST_BACKEND}/api/v1/`;
        } else if ((process.env.ENV == ENV['stg'])) {
            url = `https://${process.env.STAGING_HOST}/api/v1/`;
        }

        let viewEndPoint = "fiscal-ranking/view";
        let createEndPoint = "fiscal-ranking/create-form";

        let getUlbForms = await FiscalRanking.find({
            pmuSubmissionDate: { $lt: compareDate },
            isAutoApproved: { $ne: true },
            currentFormStatus: { $in: [MASTER_FORM_STATUS['IN_PROGRESS'], MASTER_FORM_STATUS['RETURNED_BY_PMU']] }
        }).select('ulb design_year pmuSubmissionDate isAutoApproved');

        writeFileSync("cron-freeze-error-test.txt", JSON.stringify(getUlbForms, 3, 3), function (err) {
            if (err) throw err;
            console.log('Saved!');
        })
        const logDetails = [];
        for (let frData of getUlbForms) {
            let user = await User.findOne({ role: 'ULB', ulb: ObjectId(frData?.ulb) });
            if (!user) continue;
            let token = createToken(user)

            const response = await axios.get(`${url}${viewEndPoint}`, {
                params: {
                    design_year: frData?.design_year.toString(),
                    ulb: frData?.ulb.toString()
                },
                headers: {
                    "x-access-token": token || req?.query?.token || "",
                },
            });
            const responseData = response?.data?.data;

            let payload = {
                ulbId: frData?.ulb?.toString(),
                formId: frData?._id?.toString(),
                design_year: frData?.design_year.toString(),
                isDraft: false,
                currentFormStatus: MASTER_FORM_STATUS['VERIFICATION_IN_PROGRESS'],
                isAutoApproved: true,
                actions: responseData?.tabs
            }


            const financialTabIndicators = Object.entries(payload['actions'][2]['data']);

            financialTabIndicators.forEach(([key, indicator]) => {
                indicator.yearData?.reverse();
                indicator['position'] = +indicator.displayPriority || 1;
                mutateIndicatorPayload(indicator);
            });





            // Api call for ulb to submit the FR form.
            try {
                autoSumAndLedgerCheck(financialTabIndicators);
                await axios.post(`${url}${createEndPoint}`, payload, {
                    headers: {
                        "x-access-token": token || req?.query?.token || "",
                    }
                });
                // Handle the response data as needed
            } catch (postError) {
                logDetails.push({
                    timestamp: new Date().toISOString(),
                    ulbId: frData?.ulb?.toString(),
                    frFormId: frData?._id?.toString(),
                    data: JSON.stringify(postError?.response?.data || {}, 3, 3),
                    message: postError?.message,
                });
                
            }

        }
        writeFileSync("cron-freeze-error-logs.txt", JSON.stringify(logDetails, 3, 3), function (err) {
            if (err) throw err;
            console.log('Saved!');
        })
        return console.log("Executed successfully!");
    } catch (error) {
        console.error("Error while Freezing Fr form throw cronJob:-", error)
    }
}

const autoSumAndLedgerCheck = financialTabIndicators => {
    financialTabIndicators.forEach(([key, indicator]) => {
        if (indicator.logic == 'sum') {
            console.log('key', key)
            const childIndicators = financialTabIndicators
                .filter(([key, value]) => indicator.calculatedFrom.includes(value.displayPriority));

            childIndicators.reduce((acc, [childKey, childIndicator]) => {
                childIndicator?.yearData.forEach((year, index) => {
                    acc[index] += + year.value;
                })
                return acc;
            }, [0, 0, 0, 0]).forEach((value, index) => {
                const updatableYearItem = indicator['yearData'][index];
                if (updatableYearItem?.modelName && Math.floor(updatableYearItem.value) != Math.floor(value)) {
                    const error = new Error('Ledger mismatch');
                    error['response'] = {};
                    error.response.data = {
                        key: indicator.key,
                        yearIndex: index,
                        oldValue: updatableYearItem.value,
                        updatableValue: value
                    };
                    throw error;
                }
                updatableYearItem.value = value;
            })
        }
    });
}

const createToken = (user) => {
    let keys = [
        '_id',
        'accountantEmail',
        'email',
        'role',
        'name',
        'ulb',
        'state',
        'isEmailVerified',
        'isPasswordResetInProgress',
    ];

    let data = {};
    for (k in user) {
        if (keys.indexOf(k) > -1) {
            data[k] = user[k];
        }
    }
    data['purpose'] = 'WEB';
    return jwt.sign(data, Config.JWT.SECRET, { expiresIn: Config.JWT.TOKEN_EXPIRY });
}

function mutateIndicatorPayload(indicator) {
    indicator.yearData?.forEach(yearItem => {
        if (yearItem.status === 'REJECTED' && yearItem.suggestedValue) {
            if (yearItem.formFieldType == 'date') {
                yearItem.ulbValue = yearItem.date;
                yearItem.date = yearItem.suggestedValue;
            } else {
                yearItem.ulbValue = yearItem.value;
                yearItem.value = yearItem.suggestedValue;
            }
            yearItem.status = 'APPROVED';
            yearItem.originalValue = yearItem?.value;
            yearItem.approvalType = APPROVAL_TYPES['enteredPmuAcceptPmuAuto'];
        }
    });
}

