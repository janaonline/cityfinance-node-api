// TODO: Clean and put this in DB
module.exports.sfcForm = {
    //    "_id": "646f43699fb8d567eae2dd2e",
    //    "ulb": "5dd24729437ba31f7eb42f2f",
    "design_year": "606aafc14dff55e6c075d3ec",
    "isDraft": true,
    "tabs": [
        {
            "_id": "63e4cdf74d1e781623cac3f8",
            "key": "sfcInformation",
            "icon": "",
            "text": "",
            "label": "SFC Information",
            "id": "s3",
            "displayPriority": 3,
            "__v": 0,
            "data": {
                // Question 1.
                "sfcConstituted": {
                    "key": "isSfcConstituted",
                    "label": "Is SFC constituted?",
                    "required": true,
                    "displayPriority": "1",
                    "yearData": [
                        {
                            //  "label": "FY 2018-19",
                            //  "key": "FY2018-19",
                            "label": "FY 2024-25",
                            "key": "FY2024-25",
                            "postion": "0",
                            "value": "Yes",
                            "file": "",
                            "min": "",
                            "max": "",
                            "required": true,
                            "type": "sfcConstituted",
                            //  "year": "63735a5bd44534713673c1ca",
                            "year": "606aafcf4dff55e6c075d424", // 24-25
                            "code": [],
                            "readonly": false,
                            "formFieldType": "radio-toggle",
                            "bottomText": "",
                            "placeHolder": ""
                        },
                        // {},
                        // {},
                        // {},
                        // {}

                    ],
                    "info": "This checks if there's a group in charge of making sure money is shared fairly among different levels of government."
                },
                // Question 2.
                "notification": {
                    "key": "sfcNotification",
                    "label": "Please upload Notification of SFC constitution",
                    "required": true,
                    "displayPriority": "2",
                    "yearData": [
                        {
                            //  "label": "FY 2018-19",
                            //  "key": "FY2018-19",
                            "label": "FY 2024-25",
                            "key": "FY2024-25",
                            "postion": "0",
                            "value": "",
                            "file": {
                                "name": "",
                                "url": ""
                            },
                            "allowedFileTypes": [
                                "pdf"
                            ],
                            "min": "0.01",
                            "max": "15",
                            "required": true,
                            "type": "notification",
                            //  "year": "63735a5bd44534713673c1ca",
                            "year": "606aafcf4dff55e6c075d424", // 24-25
                            "code": [],
                            "readonly": false,
                            "formFieldType": "file",
                            "bottomText": "",
                            "placeHolder": ""
                        },
                        {},
                        // {},
                        // {},
                        // {}
                    ],
                    "info": "The Notification of SFC constitution provides the official document or notification confirming the establishment or formation of the State Financial Commission (SFC)."
                },
                // Question 3.
                "constitutionDate": {
                    "key": "sfcConstitutionDate",
                    "label": "Date of SFC Constitution",
                    "required": true,
                    "displayPriority": "3",
                    "yearData": [
                        {
                            //  "label": "FY 2018-19",
                            //  "key": "FY2018-19",
                            "label": "FY 2024-25",
                            "key": "FY2024-25",
                            "postion": "0",
                            "value": "",
                            "file": "",
                            "date": "",
                            "min": "2015-04-01",
                            "max": "2025-03-31",
                            "required": true,
                            "type": "constitutionDate",
                            //  "year": "63735a5bd44534713673c1ca",
                            "year": "606aafcf4dff55e6c075d424", // 24-25
                            "code": [],
                            "readonly": false,
                            "formFieldType": "date",
                            "bottomText": "",
                            "placeHolder": ""
                        },
                        {},
                        // {},
                        // {},
                        // {}
                    ],
                    "info": "The Date of SFC Constitution refers to the specific date on which the State Financial Commission (SFC) was officially established or formed"
                },
                // Question 4.
                "awardPeriod": {
                    "key": "sfcAwardPeriod",
                    "label": "Award Period of SFC",
                    "required": true,
                    "displayPriority": "4",
                    "yearData": [
                        {
                            //  "label": "FY 2018-19",
                            //  "key": "FY2018-19",
                            "label": "FY 2024-25",
                            "key": "FY2024-25",
                            "postion": "0",
                            "value": "",
                            "file": "",
                            "date": "",
                            "min": "2015-04-01",
                            "max": "2030-03-31",
                            "required": true,
                            "type": "awardPeriod",
                            //  "year": "63735a5bd44534713673c1ca",
                            "year": "606aafcf4dff55e6c075d424", // 24-25
                            "code": [],
                            "readonly": false,
                            "formFieldType": "date",
                            "bottomText": "",
                            "placeHolder": ""
                        },
                        {},
                        // {},
                        // {},
                        // {}
                    ],
                    "info": "The Award Period of SFC refers to the duration or timeframe for which the State Financial Commission (SFC) is authorized to make decisions or allocate financial resources."
                },
                // Question 5.
                "actionTakenReport": {
                    "key": "sfcActionTakenReport",
                    "label": "Action Taken Report",
                    "required": true,
                    "displayPriority": "5",
                    "yearData": [
                        {
                            //  "label": "FY 2018-19",
                            //  "key": "FY2018-19",
                            "label": "FY 2024-25",
                            "key": "FY2024-25",
                            "postion": "0",
                            "value": "",
                            "file": {
                                "name": "",
                                "url": ""
                            },
                            "allowedFileTypes": [
                                "pdf"
                            ],
                            "min": "0.01",
                            "max": "15",
                            "required": true,
                            "type": "actionTakenReport",
                            //  "year": "63735a5bd44534713673c1ca",
                            "year": "606aafcf4dff55e6c075d424", // 24-25
                            "code": [],
                            "readonly": false,
                            "formFieldType": "file",
                            "bottomText": "",
                            "placeHolder": ""
                        },
                        {},
                        // {},
                        // {},
                        // {}
                    ],
                    "info": "The Action Taken Report provides details on the measures implemented, decisions made, or progress achieved concerning a particular matter."
                },
                // Question 6.
                "report": {
                    "key": "sfcReport",
                    "label": "Please upload SFC Report",
                    "required": true,
                    "displayPriority": "6",
                    "yearData": [
                        {
                            //  "label": "FY 2018-19",
                            //  "key": "FY2018-19",
                            "label": "FY 2024-25",
                            "key": "FY2024-25",
                            "postion": "0",
                            "value": "",
                            "file": {
                                "name": "",
                                "url": ""
                            },
                            "allowedFileTypes": [
                                "pdf"
                            ],
                            "min": "0.01",
                            "max": "15",
                            "required": true,
                            "type": "report",
                            //  "year": "63735a5bd44534713673c1ca",
                            "year": "606aafcf4dff55e6c075d424", // 24-25
                            "code": [],
                            "readonly": false,
                            "formFieldType": "file",
                            "bottomText": "",
                            "placeHolder": ""
                        },
                        {},
                        // {},
                        // {},
                        // {}
                    ],
                    "info": "The SFC Report is a document that contains information, findings, or recommendations related to the activities, decisions, or outcomes of the State Financial Commission (SFC)."
                },
                // Question 7.
                "releaseDate": {
                    "key": "sfcReleaseDate",
                    "label": "Date of release of SFC report",
                    "required": true,
                    "displayPriority": "7",
                    "yearData": [
                        {
                            //  "label": "FY 2018-19",
                            //  "key": "FY2018-19",
                            "label": "FY 2024-25",
                            "key": "FY2024-25",
                            "postion": "0",
                            "value": "",
                            "file": "",
                            "date": "",
                            "min": "2015-04-01",
                            "max": "2025-03-31",
                            "required": true,
                            "type": "releaseDate",
                            //  "year": "63735a5bd44534713673c1ca",
                            "year": "606aafcf4dff55e6c075d424", // 24-25
                            "code": [],
                            "readonly": false,
                            "formFieldType": "date",
                            "bottomText": "",
                            "placeHolder": ""
                        },
                        {},
                        // {},
                        // {},
                        // {}
                    ],
                    "info": "The Date of release of SFC report refers to the specific date when the report generated by the State Financial Commission (SFC) is published to stakeholders, government officials, or the public."
                },
                // "signedPdf": {
                //     "key": "signedPdf",
                //     "label": "Upload Signed PDF",
                //     "required": true,
                //     "displayPriority": "7.1",
                //     "yearData": [
                //       {
                //         "label": "FY 2018-19",
                //         "key": "FY2018-19",
                //         "postion": "0",
                //         "value": "",
                //         "file": {
                //           "name": "",
                //           "url": ""
                //         },
                //         "allowedFileTypes": [
                //           "pdf"
                //         ],
                //         "min": "",
                //         "max": "",
                //         "required": true,
                //         "type": "signedPdf",
                //         "year": "63735a5bd44534713673c1ca",
                //         "code": [],
                //         "readonly": false,
                //         "formFieldType": "file",
                //         "bottomText": "",
                //         "placeHolder": ""
                //       },
                //       {},
                //     //   {},
                //     //   {},
                //     //   {}
                //     ],
                //     "info": ""
                //   }
            },
            "feedback": {
                "status": null,
                "comment": ""
            }
        }
    ],
    // "stateGsdpGrowthRate": 8.86,
    "statusId": 1,
    "status": "Under Review By MoHUA",
    "canTakeAction": true,
    "financialYearTableHeader": {},
    "specialHeaders": {
        "1": {
            "label": "SFC Details",
            "info": ""
        },
        // "7.1": {
        //     "label": "Download and Upload Signed PDF",
        //     "info": ""
        // }
    },
    // "skipLogicDependencies": {
    // }

};