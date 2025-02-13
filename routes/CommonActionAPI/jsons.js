let DurProjectJson = {
    "name": {
        "information": "",
        "_id": "64097dfb3b2eb509dc61e581",
        "order": "6.001",
        "answer_option": [],
        "title": "Name of the Project",
        "hint": "",
        "resource_urls": [],
        "label": "1",
        "shortKey": "name",
        "viewSequence": "21",
        "child": [],
        "parent": [],
        "pattern": "",
        "required": true,
        "validation": [
            {
                "error_msg": "",
                "_id": "1"
            }
        ],
        "restrictions": [],
        "min": 1,
        "max": 200,
        "input_type": "1",
        "weightage": [],
        "value": "",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "1",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "6",
            "index": 0,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 2"
        },
        "forParentValue": 2,
        "isSelectValue": false,
        "previousValue": "",
        "modelValue": "",
        "selectedValue": [
            {
                "label": "",
                "textValue": "",
                "value": ""
            }
        ],
        "answer": {
            "answer": [
                {
                    "label": "",
                    "textValue": "",
                    "value": ""
                }
            ],
            "input_type": "1",
            "nestedAnswer": [],
            "order": "6.001",
            "pattern": "",
            "shortKey": "name"
        }
    },
    "category": {
        "information": "",
        "_id": "64097e1e3b2eb509dc61e5ba",
        "order": "6.002",
        "isQuestionDisabled": false,
        "modelName": "Category",
        "type": "referenceById",
        "modelFilter": {},
        "answer_option": [
            {
                "name": "Rejuvenation of Water Bodies",
                "did": [],
                "viewSequence": "1",
                "_id": "1"
            },
            {
                "name": "Drinking Water",
                "did": [],
                "viewSequence": "2",
                "_id": "2"
            },
            {
                "name": "Rainwater Harvesting",
                "did": [],
                "viewSequence": "3",
                "_id": "3"
            },
            {
                "name": "Water Recycling",
                "did": [],
                "viewSequence": "4",
                "_id": "4"
            },
            {
                "name": "Sanitation",
                "did": [],
                "viewSequence": "5",
                "_id": "5"
            },
            {
                "name": "Solid Waste Management",
                "did": [],
                "viewSequence": "6",
                "_id": "6"
            }
        ],
        "title": "Sector",
        "hint": "",
        "resource_urls": [],
        "label": "2",
        "shortKey": "category",
        "viewSequence": "22",
        "child": [],
        "parent": [],
        "required": true,
        "validation": [
            {
                "_id": "1",
                "error_msg": ""
            }
        ],
        "restrictions": [],
        "input_type": "3",
        "weightage": [],
        "value": "6",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "3",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "6",
            "index": 1,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 2"
        },
        "forParentValue": 2,
        "modelValue": "6",
        "isSelectValue": true,
        "previousValue": "6",
        "selectedValue": [
            {
                "label": "Solid Waste Management",
                "textValue": "",
                "value": "6"
            }
        ],
        "answer": {
            "answer": [
                {
                    "label": "Solid Waste Management",
                    "textValue": "",
                    "value": "6"
                }
            ],
            "input_type": "3",
            "nestedAnswer": [],
            "order": "6.002",
            "shortKey": "category"
        }
    },
    "dpr_status":{
        "isQuestionDisabled": false,
        "modelName": "Option",
        "type": "referenceById",
        "modelFilter": {
            "type": "dpr_status"
        },
        "required": true,
        "information" : "",
        "_id" : "65e6b6e6e1cc56023238f7d1",
        "answer_option" : [
            {
                "name" : "Yes",
                "did" : [

                ],
                "viewSequence" : "1",
                "coordinates" : [

                ],
                "_id" : "1"
            },
            {
                "name" : "No",
                "did" : [

                ],
                "viewSequence" : "2",
                "coordinates" : [

                ],
                "_id" : "2"
            },
            {
                "name" : "Don't know",
                "did" : [

                ],
                "viewSequence" : "3",
                "coordinates" : [

                ],
                "_id" : "3"
            }
        ],
        "value": "",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "3",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "2",
            "index": 1,
            "loopIndex": 0
        },
        "forParentValue": 2,
        "modelValue": "",
        "isSelectValue": true,
        "previousValue": "2",    
        "title" : "Is DPR prepared?",
        "hint" : "",
        "order" : "6.009",
        "resource_urls" : [

        ],
        "label" : "9",
        "shortKey" : "dpr_status",
        "viewSequence" : "29",
        "child" : [

        ],
        "parent" : [

        ],
        "validation" : [
            {
                "error_msg" : "",
                "_id" : "1"
            }
        ],
        "restrictions" : [

        ],
        "input_type" : "3",
        "weightage" : [

        ]

    },

    "startDate": {
        "information": "",
        "_id": "6409b860235a2809db04c501",
        "order": "6.003",
        "answer_option": [],
        "title": "Project Start Date",
        "hint": "",
        "resource_urls": [],
        "label": "3",
        "shortKey": "startDate",
        "max": new Date().toISOString().slice(0, 10),
        "viewSequence": "23",
        "child": [],
        "parent": [],
        "required": true,
        "validation": [
            {
                "error_msg": "",
                "_id": "1"
            }
        ],
        "restrictions": [],
        "input_type": "14",
        "weightage": [],
        "value": "",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "14",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "6",
            "index": 2,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 2"
        },
        "forParentValue": 2,
        "modelValue": "",
        "isSelectValue": false,
        "previousValue": "",
        "selectedValue": [
            {
                "label": "",
                "textValue": "",
                "value": ""
            }
        ],
        "answer": {
            "answer": [
                {
                    "label": "",
                    "textValue": "",
                    "value": "2023-03-15"
                }
            ],
            "input_type": "14",
            "nestedAnswer": [],
            "order": "6.008",
            "shortKey": "startDate"
        }
    },
    "completionDate": {
        "information": "",
        "_id": "6409b8cb235a2809db04c550",
        "order": "6.004",
        "answer_option": [],
        "title": "Project Completion Date",
        "hint": "",
        "resource_urls": [],
        "label": "4",
        "shortKey": "completionDate",
        "viewSequence": "24",
        "child": [],
        "parent": [],
        "required": true,
        "validation": [
            {
                "error_msg": "",
                "_id": "1"
            },
        ],
        "restrictions": [],
        "input_type": "14",
        "weightage": [],
        "value": "",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "14",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "6",
            "index": 3,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 2"
        },
        "forParentValue": 2,
        "modelValue": "",
        "isSelectValue": false,
        "previousValue": "",
        "selectedValue": [
            {
                "label": "",
                "textValue": "",
                "value": ""
            }
        ],
        "answer": {
            "answer": [
                {
                    "label": "",
                    "textValue": "",
                    "value": "2023-03-20"
                }
            ],
            "input_type": "14",
            "nestedAnswer": [],
            "order": "6.009",
            "shortKey": "completionDate"
        }
    },
    "location": {
        "information": "",
        "_id": "64194d9138d5190d4dcda08d",
        "order": "6.005",
        "answer_option": [],
        "title": "Location",
        "hint": "",
        "resource_urls": [],
        "label": "5",
        "shortKey": "location",
        "viewSequence": "25",
        "child": [],
        "parent": [],
        "min": null,
        "max": null,
        "minRange": null,
        "maxRange": null,
        "pattern": "",
        "validation": [],
        "restrictions": [],
        "input_type": "19",
        "weightage": [],
        "value": "",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "19",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "6",
            "index": 4,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 2"
        },
        "forParentValue": 2,
        "answer": {
            "answer": [],
            "input_type": "19",
            "nestedAnswer": [],
            "order": "6.010",
            "pattern": "",
            "shortKey": "location"
        }
    },
    "cost": {
        "information": "i = The total project cost is as per the DPR.",
        "_id": "64097e763b2eb509dc61e671",
        "order": "6.006",
        "answer_option": [],
        "title": "Total Project Cost (INR in lakhs)",
        "hint": "",
        "resource_urls": [],
        "label": "6",
        "shortKey": "cost",
        "viewSequence": "26",
        "child": [],
        "parent": [],
        "required": true,
        "validation": [
            {
                "error_msg": "",
                "_id": "1"
            },
            {
                "error_msg": "",
                "_id": "2"
            },
            {
                "_id": "14",
                "error_msg": "",
                "value": "0.00"
            }
        ],
        "restrictions": [],
        "minRange": 0,
        "maxRange": 999999,
        "min": 1,
        "max": 9,
        "pattern": "^((?:^((?:[0-9]|[1-9][0-9]{1,4}|[1-8][0-9]{5}|9[0-8][0-9]{4}|99[0-8][0-9]{3}|999[0-8][0-9]{2}|9999[0-8][0-9]|99999[0-8]))(?:\\.\\d{1,3})?|999999))$",
        "input_type": "2",
        "weightage": [],
        "valueHolder": "",
        "value": "400",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "2",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "6",
            "index": 5,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 2"
        },
        "forParentValue": 2,
        "isSelectValue": false,
        "previousValue": "",
        "modelValue": "400",
        "selectedValue": [
            {
                "label": "",
                "textValue": "",
                "value": "400"
            }
        ],
        "answer": {
            "answer": [
                {
                    "label": "",
                    "textValue": "",
                    "value": "400"
                }
            ],
            "input_type": "2",
            "nestedAnswer": [],
            "order": "6.005",
            "pattern": "^((?:^((?:[0-9]|[1-9][0-9]{1,4}|[1-8][0-9]{5}|9[0-8][0-9]{4}|99[0-8][0-9]{3}|999[0-8][0-9]{2}|9999[0-8][0-9]|99999[0-8]))(?:\\.\\d{1,3})?|999999))$",
            "shortKey": "cost"
        }
    },
    "expenditure": {
        "information": "i = This is the outlay from 15th FC grant out of the total project cost. For Ex: If project total cost is 100 Cr, out of which 80 Cr is sourced from AMRUT 2.0, rest 20 Cr is sourced from 15th FC tied grants, then 20 Cr should be entered here. Please do not enter the expenditure incurred.",
        "_id": "64097e903b2eb509dc61e6b2",
        "order": "6.007",
        "answer_option": [],
        "title": "Amount of 15th FC Grants in Total Project Cost (INR in lakhs)",
        "hint": "",
        "resource_urls": [],
        "label": "7",
        "shortKey": "expenditure",
        "viewSequence": "27",
        "child": [],
        "parent": [],
        "required": true,
        "validation": [
            {
                "error_msg": "",
                "_id": "1"
            },
            {
                "error_msg": "",
                "_id": "2"
            },
            {
                "_id": "14",
                "error_msg": "",
                "value": "0.00"
            }
        ],
        "restrictions": [],
        "minRange": 0,
        "maxRange": 999999,
        "min": 1,
        "max": 9,
        "pattern": "^((?:^((?:[0-9]|[1-9][0-9]{1,4}|[1-8][0-9]{5}|9[0-8][0-9]{4}|99[0-8][0-9]{3}|999[0-8][0-9]{2}|9999[0-8][0-9]|99999[0-8]))(?:\\.\\d{1,3})?|999999))$",
        "input_type": "2",
        "weightage": [],
        "valueHolder": "",
        "value": "40",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "2",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "6",
            "index": 6,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 2"
        },
        "forParentValue": 2,
        "isSelectValue": false,
        "previousValue": "",
        "modelValue": "40",
        "selectedValue": [
            {
                "label": "",
                "textValue": "",
                "value": "40"
            }
        ],
        "answer": {
            "answer": [
                {
                    "label": "",
                    "textValue": "",
                    "value": "40"
                }
            ],
            "input_type": "2",
            "nestedAnswer": [],
            "order": "6.006",
            "pattern": "^((?:^((?:[0-9]|[1-9][0-9]{1,4}|[1-8][0-9]{5}|9[0-8][0-9]{4}|99[0-8][0-9]{3}|999[0-8][0-9]{2}|9999[0-8][0-9]|99999[0-8]))(?:\\.\\d{1,3})?|999999))$",
            "shortKey": "expenditure"
        }
    },
    "percProjectCost": {
        "information": "",
        "isQuestionDisabled": true,
        "_id": "64097eb23b2eb509dc61e6f5",
        "order": "6.008",
        "answer_option": [],
        "title": "% of 15th FC Grants in Total Project Cost",
        "hint": "",
        "resource_urls": [],
        "label": "8",
        "shortKey": "percProjectCost",
        "viewSequence": "28",
        "child": [],
        "parent": [],
        "required": true,
        "validation": [
            {
                "error_msg": "",
                "_id": "1"
            },
            {
                "_id": "3",
                "error_msg": ""
            },
            {
                "_id": "5",
                "error_msg": "",
                "value": "((expenditure/cost)*100)"
            },
            {
                "error_msg": "",
                "_id": "2"
            }
        ],
        "restrictions": [],
        "minRange": 0,
        "maxRange": 100,
        "min": 1,
        "max": 3,
        "pattern": "^((?:[0-9]|[1-9][0-9]|100))$",
        "input_type": "2",
        "weightage": [],
        "valueHolder": "",
        "value": 10,
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "2",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "6",
            "index": 7,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 2"
        },
        "forParentValue": 2,
        "selectedValue": [
            {
                "label": "",
                "textValue": "",
                "value": 10
            }
        ],
        "modelValue": 10,
        "answer": {
            "answer": [
                {
                    "label": "",
                    "textValue": "",
                    "value": 0
                }
            ],
            "input_type": "2",
            "nestedAnswer": [],
            "order": "6.007",
            "pattern": "^((?:[0-9]|[1-9][0-9]|100))$",
            "shortKey": "percProjectCost"
        }
    },
    "waterSupply_question": {
        "information": "",
        "_id": "641fdff0cc09cd11d21088c5",
        "order": "1.001",
        "answer_option": [],
        "title": "Sections/Indicators",
        "hint": "",
        "resource_urls": [],
        "label": "",
        "shortKey": "waterSupply_question",
        "viewSequence": "2",
        "child": [],
        "parent": [],
        "pattern": "",
        "showAsText": true,
        "validation": [],
        "restrictions": [],
        "min": 1,
        "max": null,
        "input_type": "1",
        "weightage": [],
        "isQuestionDisabled": true,
        "value": "first water",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "1",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "1",
            "index": 0,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1,
        "isSelectValue": false,
        "previousValue": "first",
        "modelValue": "first water",
        "selectedValue": [
            {
                "label": "",
                "textValue": "first water",
                "value": ""
            }
        ],
        "answer": {
            "answer": [
                {
                    "label": "",
                    "textValue": "first water",
                    "value": ""
                }
            ],
            "input_type": "1",
            "nestedAnswer": [],
            "order": "1.001",
            "pattern": "",
            "shortKey": "waterSupply_question"
        }
    },
    "waterSupply_actualIndicator": {
        "information": "",
        "_id": "641fe0dce6aa5311d3f21656",
        "order": "1.002",
        "answer_option": [],
        "title": "Actual Indicator 2022-23",
        "hint": "",
        "resource_urls": [],
        "label": "",
        "shortKey": "waterSupply_actualIndicator",
        "viewSequence": "3",
        "child": [],
        "parent": [],
        "validation": [
            {
                "error_msg": "",
                "_id": "1"
            },
            {
                "error_msg": "",
                "_id": "2"
            }
        ],
        "restrictions": [],
        "minRange": 0,
        "maxRange": 9999,
        "min": 1,
        "max": 4,
        "pattern": "^((?:[0-9]|[1-9][0-9]{1,3}))$",
        "input_type": "2",
        "weightage": [],
        "valueHolder": "",
        "isQuestionDisabled": false,
        "value": "565",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "2",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "1",
            "index": 1,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1,
        "isSelectValue": false,
        "previousValue": "",
        "modelValue": "565",
        "selectedValue": [
            {
                "label": "",
                "textValue": "",
                "value": "565"
            }
        ],
        "answer": {
            "answer": [
                {
                    "label": "",
                    "textValue": "",
                    "value": "565"
                }
            ],
            "input_type": "2",
            "nestedAnswer": [],
            "order": "1.002",
            "pattern": "^((?:[0-9]|[1-9][0-9]{1,3}))$",
            "shortKey": "waterSupply_actualIndicator"
        },
        "modelType": "object",
        "valueKey": "value"
    },
    "waterSupply_targetIndicator": {
        "information": "",
        "_id": "641fe17ee6aa5311d3f21688",
        "order": "1.003",
        "answer_option": [],
        "title": "Target Indicator 2023-24",
        "hint": "",
        "resource_urls": [],
        "label": "",
        "shortKey": "waterSupply_targetIndicator",
        "viewSequence": "4",
        "child": [],
        "parent": [],
        "validation": [
            {
                "error_msg": "",
                "_id": "1"
            },
            {
                "error_msg": "",
                "_id": "2"
            }
        ],
        "restrictions": [
            {
                "_id": "641fe17ee6aa5311d3f2169e",
                "orders": [
                    {
                        "_id": "641fe17ee6aa5311d3f2169f",
                        "order": "1.002",
                        "value": ""
                    }
                ],
                "type": "7"
            }
        ],
        "minRange": 0,
        "maxRange": 9999,
        "min": 1,
        "max": 4,
        "pattern": "^((?:[0-9]|[1-9][0-9]{1,3}))$",
        "input_type": "2",
        "weightage": [],
        "valueHolder": "",
        "isQuestionDisabled": false,
        "value": "899",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "2",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "1",
            "index": 2,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1,
        "isSelectValue": false,
        "previousValue": "",
        "modelValue": "899",
        "selectedValue": [
            {
                "label": "",
                "textValue": "",
                "value": "899"
            }
        ],
        "answer": {
            "answer": [
                {
                    "label": "",
                    "textValue": "",
                    "value": "899"
                }
            ],
            "input_type": "2",
            "nestedAnswer": [],
            "order": "1.003",
            "pattern": "^((?:[0-9]|[1-9][0-9]{1,3}))$",
            "shortKey": "waterSupply_targetIndicator"
        },
        "modelType": "object",
        "valueKey": "value"
    },
    "waterSupply_indicatorLineItem": {
        "information": "",
        "_id": "641fe1aee6aa5311d3f216c1",
        "order": "1.004",
        "answer_option": [],
        "title": "Indicator LineItem",
        "hint": "",
        "resource_urls": [],
        "label": "",
        "shortKey": "waterSupply_indicatorLineItem",
        "viewSequence": "5",
        "child": [],
        "parent": [],
        "pattern": "",
        "validation": [],
        "restrictions": [],
        "min": 1,
        "max": null,
        "input_type": "1",
        "weightage": [],
        "isQuestionDisabled": false,
        "value": "98",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "1",
        "visibility": true, "hidden": true,
        "nestedConfig": {
            "parentOrder": "1",
            "index": 3,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1,
        "isSelectValue": false,
        "previousValue": "",
        "modelValue": "98",
        "selectedValue": [
            {
                "label": "",
                "textValue": "98",
                "value": ""
            }
        ],
        "answer": {
            "answer": [
                {
                    "label": "",
                    "textValue": "98",
                    "value": ""
                }
            ],
            "input_type": "1",
            "nestedAnswer": [],
            "order": "1.004",
            "pattern": "",
            "shortKey": "waterSupply_indicatorLineItem"
        }
    },
    "waterSupply_unit": {
        "information": "",
        "_id": "641fe1e1e6aa5311d3f21706",
        "order": "1.005",
        "answer_option": [],
        "title": "Unit",
        "hint": "",
        "resource_urls": [],
        "label": "",
        "shortKey": "waterSupply_unit",
        "viewSequence": "6",
        "child": [],
        "parent": [],
        "pattern": "",
        "validation": [],
        "restrictions": [],
        "min": 1,
        "max": null,
        "input_type": "1",
        "weightage": [],
        "isQuestionDisabled": false,
        "value": "%",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "1",
        "visibility": true, "hidden": true,
        "nestedConfig": {
            "parentOrder": "1",
            "index": 4,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1,
        "isSelectValue": false,
        "previousValue": "40",
        "modelValue": "%",
        "selectedValue": [
            {
                "label": "",
                "textValue": "%",
                "value": ""
            }
        ],
        "answer": {
            "answer": [
                {
                    "label": "",
                    "textValue": "%",
                    "value": ""
                }
            ],
            "input_type": "1",
            "nestedAnswer": [],
            "order": "1.005",
            "pattern": "",
            "shortKey": "waterSupply_unit"
        }
    },
    "waterSupply_type": {
        "information": "",
        "_id": "641fe24fcc09cd11d21089b8",
        "order": "1.006",
        "answer_option": [],
        "title": "Type",
        "hint": "",
        "resource_urls": [],
        "label": "",
        "shortKey": "waterSupply_type",
        "viewSequence": "7",
        "child": [],
        "parent": [],
        "pattern": "",
        "validation": [],
        "restrictions": [],
        "min": 1,
        "max": null,
        "input_type": "1",
        "weightage": [],
        "isQuestionDisabled": false,
        "value": "water strom",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "1",
        "visibility": true, "hidden": true,
        "nestedConfig": {
            "parentOrder": "1",
            "index": 5,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1,
        "isSelectValue": false,
        "previousValue": "",
        "modelValue": "water strom",
        "selectedValue": [
            {
                "label": "",
                "textValue": "water strom",
                "value": ""
            }
        ],
        "answer": {
            "answer": [
                {
                    "label": "",
                    "textValue": "water strom",
                    "value": ""
                }
            ],
            "input_type": "1",
            "nestedAnswer": [],
            "order": "1.006",
            "pattern": "",
            "shortKey": "waterSupply_type"
        }
    },
    "sanitation_question": {
        "information": "",
        "_id": "641fe352cc09cd11d2108b17",
        "order": "2.001",
        "answer_option": [],
        "title": "Sections/Indicators",
        "hint": "",
        "resource_urls": [],
        "label": "",
        "showAsText": true,
        "shortKey": "sanitation_question",
        "viewSequence": "9",
        "child": [],
        "parent": [],
        "pattern": "",
        "validation": [],
        "restrictions": [],
        "min": 1,
        "max": null,
        "input_type": "1",
        "weightage": [],
        "isQuestionDisabled": true,
        "value": "first senitation",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "1",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "2",
            "index": 0,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1,
        "isSelectValue": false,
        "previousValue": "first",
        "modelValue": "first senitation",
        "selectedValue": [
            {
                "label": "",
                "textValue": "first senitation",
                "value": ""
            }
        ],
        "answer": {
            "answer": [
                {
                    "label": "",
                    "textValue": "first senitation",
                    "value": ""
                }
            ],
            "input_type": "1",
            "nestedAnswer": [],
            "order": "2.001",
            "pattern": "",
            "shortKey": "sanitation_question"
        }
    },
    "sanitation_actualIndicator": {
        "information": "",
        "_id": "641fe38bcc09cd11d2108b40",
        "order": "2.002",
        "answer_option": [],
        "title": "Actual Indicator 2022-23",
        "hint": "",
        "resource_urls": [],
        "label": "",
        "shortKey": "sanitation_actualIndicator",
        "viewSequence": "10",
        "child": [],
        "parent": [],
        "validation": [
            {
                "error_msg": "",
                "_id": "1"
            },
            {
                "error_msg": "",
                "_id": "2"
            }
        ],
        "restrictions": [],
        "minRange": 0,
        "maxRange": 9999,
        "min": 1,
        "max": 4,
        "pattern": "^((?:[0-9]|[1-9][0-9]{1,3}))$",
        "input_type": "2",
        "weightage": [],
        "valueHolder": "",
        "isQuestionDisabled": false,
        "value": "65",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "2",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "2",
            "index": 1,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1,
        "isSelectValue": false,
        "previousValue": "",
        "modelValue": "65",
        "selectedValue": [
            {
                "label": "",
                "textValue": "",
                "value": "65"
            }
        ],
        "answer": {
            "answer": [
                {
                    "label": "",
                    "textValue": "",
                    "value": "65"
                }
            ],
            "input_type": "2",
            "nestedAnswer": [],
            "order": "2.002",
            "pattern": "^((?:[0-9]|[1-9][0-9]{1,3}))$",
            "shortKey": "sanitation_actualIndicator"
        },
        "modelType": "object",
        "valueKey": "value"
    },
    "sanitation_targetIndicator": {
        "information": "",
        "_id": "641fe3d4cc09cd11d2108b84",
        "order": "2.003",
        "answer_option": [],
        "title": "Target Indicator 2023-24",
        "hint": "",
        "resource_urls": [],
        "label": "",
        "shortKey": "sanitation_targetIndicator",
        "viewSequence": "11",
        "child": [],
        "parent": [],
        "validation": [
            {
                "error_msg": "",
                "_id": "1"
            },
            {
                "error_msg": "",
                "_id": "2"
            }
        ],
        "restrictions": [
            {
                "_id": "641fe3d4cc09cd11d2108b9f",
                "orders": [
                    {
                        "_id": "641fe3d4cc09cd11d2108ba0",
                        "order": "2.002",
                        "value": ""
                    }
                ],
                "type": "7"
            }
        ],
        "minRange": 0,
        "maxRange": 9999,
        "min": 1,
        "max": 4,
        "pattern": "^((?:[0-9]|[1-9][0-9]{1,3}))$",
        "input_type": "2",
        "weightage": [],
        "valueHolder": "",
        "isQuestionDisabled": false,
        "value": "60",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "2",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "2",
            "index": 2,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1,
        "isSelectValue": false,
        "previousValue": "",
        "modelValue": "60",
        "selectedValue": [
            {
                "label": "",
                "textValue": "",
                "value": "60"
            }
        ],
        "answer": {
            "answer": [
                {
                    "label": "",
                    "textValue": "",
                    "value": "60"
                }
            ],
            "input_type": "2",
            "nestedAnswer": [],
            "order": "2.003",
            "pattern": "^((?:[0-9]|[1-9][0-9]{1,3}))$",
            "shortKey": "sanitation_targetIndicator"
        },
        "modelType": "object",
        "valueKey": "value"
    },
    "sanitation_indicatorLineItem": {
        "information": "",
        "_id": "641fe401cc09cd11d2108bae",
        "order": "2.004",
        "answer_option": [],
        "title": "Indicator LineItem",
        "hint": "",
        "resource_urls": [],
        "label": "",
        "shortKey": "sanitation_indicatorLineItem",
        "viewSequence": "12",
        "child": [],
        "parent": [],
        "pattern": "",
        "validation": [],
        "restrictions": [],
        "min": 1,
        "max": null,
        "input_type": "1",
        "weightage": [],
        "isQuestionDisabled": false,
        "value": "",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "1",
        "visibility": true, "hidden": true,
        "nestedConfig": {
            "parentOrder": "2",
            "index": 3,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1,
        "isSelectValue": false,
        "previousValue": "",
        "modelValue": "",
        "selectedValue": [
            {
                "label": "",
                "textValue": "",
                "value": ""
            }
        ],
        "answer": {
            "answer": [
                {
                    "label": "",
                    "textValue": "",
                    "value": ""
                }
            ],
            "input_type": "1",
            "nestedAnswer": [],
            "order": "2.004",
            "pattern": "",
            "shortKey": "sanitation_indicatorLineItem"
        }
    },
    "sanitation_unit": {
        "information": "",
        "_id": "641fe41ee6aa5311d3f21759",
        "order": "2.005",
        "answer_option": [],
        "title": "Unit",
        "hint": "",
        "resource_urls": [],
        "label": "",
        "shortKey": "sanitation_unit",
        "viewSequence": "13",
        "child": [],
        "parent": [],
        "pattern": "",
        "validation": [],
        "restrictions": [],
        "min": 1,
        "max": null,
        "input_type": "1",
        "weightage": [],
        "isQuestionDisabled": false,
        "value": "Year",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "1",
        "visibility": true, "hidden": true,
        "nestedConfig": {
            "parentOrder": "2",
            "index": 4,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1,
        "isSelectValue": false,
        "previousValue": "",
        "modelValue": "Year",
        "selectedValue": [
            {
                "label": "",
                "textValue": "Year",
                "value": ""
            }
        ],
        "answer": {
            "answer": [
                {
                    "label": "",
                    "textValue": "Year",
                    "value": ""
                }
            ],
            "input_type": "1",
            "nestedAnswer": [],
            "order": "2.005",
            "pattern": "",
            "shortKey": "sanitation_unit"
        }
    },
    "sanitation_type": {
        "information": "",
        "_id": "641fe42de6aa5311d3f21786",
        "order": "2.006",
        "answer_option": [],
        "title": "Type",
        "hint": "",
        "resource_urls": [],
        "label": "",
        "shortKey": "sanitation_type",
        "viewSequence": "14",
        "child": [],
        "parent": [],
        "pattern": "",
        "validation": [],
        "restrictions": [],
        "min": 1,
        "max": null,
        "input_type": "1",
        "weightage": [],
        "isQuestionDisabled": false,
        "value": "sanitation",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "1",
        "visibility": true, "hidden": true,
        "nestedConfig": {
            "parentOrder": "2",
            "index": 5,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1,
        "isSelectValue": false,
        "previousValue": "",
        "modelValue": "sanitation",
        "selectedValue": [
            {
                "label": "",
                "textValue": "sanitation",
                "value": ""
            }
        ],
        "answer": {
            "answer": [
                {
                    "label": "",
                    "textValue": "sanitation",
                    "value": ""
                }
            ],
            "input_type": "1",
            "nestedAnswer": [],
            "order": "2.006",
            "pattern": "",
            "shortKey": "sanitation_type"
        }
    },
    "solidWaste_question": {
        "information": "",
        "_id": "641fe499e6aa5311d3f217e0",
        "order": "3.001",
        "answer_option": [],
        "title": "Sections/Indicators",
        "hint": "",
        "resource_urls": [],
        "showAsText": true,
        "label": "",
        "shortKey": "solidWaste_question",
        "viewSequence": "16",
        "child": [],
        "parent": [],
        "pattern": "",
        "validation": [],
        "restrictions": [],
        "min": 1,
        "max": null,
        "input_type": "1",
        "weightage": [],
        "isQuestionDisabled": true,
        "value": "first waste",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "1",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "3",
            "index": 0,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1,
        "isSelectValue": false,
        "previousValue": "",
        "modelValue": "first waste",
        "selectedValue": [
            {
                "label": "",
                "textValue": "first waste",
                "value": ""
            }
        ],
        "answer": {
            "answer": [
                {
                    "label": "",
                    "textValue": "first waste",
                    "value": ""
                }
            ],
            "input_type": "1",
            "nestedAnswer": [],
            "order": "3.001",
            "pattern": "",
            "shortKey": "solidWaste_question"
        }
    },
    "solidWaste_actualIndicator": {
        "information": "",
        "_id": "641fe4d0e6aa5311d3f21818",
        "order": "3.002",
        "answer_option": [],
        "title": "Actual Indicator 2022-23",
        "hint": "",
        "resource_urls": [],
        "label": "",
        "shortKey": "solidWaste_actualIndicator",
        "viewSequence": "17",
        "child": [],
        "parent": [],
        "validation": [
            {
                "error_msg": "",
                "_id": "1"
            },
            {
                "error_msg": "",
                "_id": "2"
            }
        ],
        "restrictions": [],
        "minRange": 0,
        "maxRange": 9999,
        "min": 1,
        "max": 4,
        "pattern": "^((?:[0-9]|[1-9][0-9]{1,3}))$",
        "input_type": "2",
        "weightage": [],
        "valueHolder": "",
        "isQuestionDisabled": false,
        "value": "40",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "2",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "3",
            "index": 1,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1,
        "isSelectValue": false,
        "previousValue": "",
        "modelValue": "40",
        "selectedValue": [
            {
                "label": "",
                "textValue": "",
                "value": "40"
            }
        ],
        "answer": {
            "answer": [
                {
                    "label": "",
                    "textValue": "",
                    "value": "40"
                }
            ],
            "input_type": "2",
            "nestedAnswer": [],
            "order": "3.002",
            "pattern": "^((?:[0-9]|[1-9][0-9]{1,3}))$",
            "shortKey": "solidWaste_actualIndicator"
        },
        "modelType": "object",
        "valueKey": "value"
    },
    "solidWaste_targetIndicator": {
        "information": "",
        "_id": "641fe5a5e6aa5311d3f2188e",
        "order": "3.003",
        "answer_option": [],
        "title": "Target Indicator 2023-24",
        "hint": "",
        "resource_urls": [],
        "label": "",
        "shortKey": "solidWaste_targetIndicator",
        "viewSequence": "18",
        "child": [],
        "parent": [],
        "validation": [
            {
                "error_msg": "",
                "_id": "1"
            },
            {
                "error_msg": "",
                "_id": "2"
            }
        ],
        "restrictions": [
            {
                "_id": "641fe5a5e6aa5311d3f218b9",
                "orders": [
                    {
                        "_id": "641fe5a5e6aa5311d3f218ba",
                        "order": "3.002",
                        "value": ""
                    }
                ],
                "type": "7"
            }
        ],
        "minRange": 0,
        "maxRange": 9999,
        "min": 1,
        "max": 4,
        "pattern": "^((?:[0-9]|[1-9][0-9]{1,3}))$",
        "input_type": "2",
        "weightage": [],
        "valueHolder": "",
        "isQuestionDisabled": false,
        "value": "20",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "2",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "3",
            "index": 2,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1,
        "isSelectValue": false,
        "previousValue": "",
        "modelValue": "20",
        "selectedValue": [
            {
                "label": "",
                "textValue": "",
                "value": "20"
            }
        ],
        "answer": {
            "answer": [
                {
                    "label": "",
                    "textValue": "",
                    "value": "20"
                }
            ],
            "input_type": "2",
            "nestedAnswer": [],
            "order": "3.003",
            "pattern": "^((?:[0-9]|[1-9][0-9]{1,3}))$",
            "shortKey": "solidWaste_targetIndicator"
        },
        "modelType": "object",
        "valueKey": "value"
    },
    "solidWaste_indicatorLineItem": {
        "information": "",
        "_id": "641fe5c2e6aa5311d3f218d2",
        "order": "3.004",
        "answer_option": [],
        "title": "Indicator LineItem",
        "hint": "",
        "resource_urls": [],
        "label": "",
        "shortKey": "solidWaste_indicatorLineItem",
        "viewSequence": "19",
        "child": [],
        "parent": [],
        "pattern": "",
        "validation": [],
        "restrictions": [],
        "min": 1,
        "max": null,
        "input_type": "1",
        "weightage": [],
        "isQuestionDisabled": false,
        "value": "",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "1",
        "visibility": true, "hidden": true,
        "nestedConfig": {
            "parentOrder": "3",
            "index": 3,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1,
        "isSelectValue": false,
        "previousValue": "",
        "modelValue": "",
        "selectedValue": [
            {
                "label": "",
                "textValue": "",
                "value": ""
            }
        ],
        "answer": {
            "answer": [
                {
                    "label": "",
                    "textValue": "",
                    "value": ""
                }
            ],
            "input_type": "1",
            "nestedAnswer": [],
            "order": "3.004",
            "pattern": "",
            "shortKey": "solidWaste_indicatorLineItem"
        }
    },
    "solidWaste_unit": {
        "information": "",
        "_id": "641fe5d4e6aa5311d3f2190d",
        "order": "3.005",
        "answer_option": [],
        "title": "Unit",
        "hint": "",
        "resource_urls": [],
        "label": "",
        "shortKey": "solidWaste_unit",
        "viewSequence": "20",
        "child": [],
        "parent": [],
        "pattern": "",
        "validation": [],
        "restrictions": [],
        "min": 1,
        "max": null,
        "input_type": "1",
        "weightage": [],
        "isQuestionDisabled": false,
        "value": "%",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "1",
        "visibility": true, "hidden": true,
        "nestedConfig": {
            "parentOrder": "3",
            "index": 4,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1,
        "isSelectValue": false,
        "previousValue": "",
        "modelValue": "%",
        "selectedValue": [
            {
                "label": "",
                "textValue": "%",
                "value": ""
            }
        ],
        "answer": {
            "answer": [
                {
                    "label": "",
                    "textValue": "%",
                    "value": ""
                }
            ],
            "input_type": "1",
            "nestedAnswer": [],
            "order": "3.005",
            "pattern": "",
            "shortKey": "solidWaste_unit"
        }
    },
    "solidWaste_type": {
        "information": "",
        "_id": "641fe5e3cc09cd11d2108c19",
        "order": "3.006",
        "answer_option": [],
        "title": "Type",
        "hint": "",
        "resource_urls": [],
        "label": "",
        "shortKey": "solidWaste_type",
        "viewSequence": "21",
        "child": [],
        "parent": [],
        "pattern": "",
        "validation": [],
        "restrictions": [],
        "min": 1,
        "max": null,
        "input_type": "1",
        "weightage": [],
        "isQuestionDisabled": false,
        "value": "Solid Waste",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "1",
        "visibility": true, "hidden": true,
        "nestedConfig": {
            "parentOrder": "3",
            "index": 5,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1,
        "isSelectValue": false,
        "previousValue": "",
        "modelValue": "Solid Waste",
        "selectedValue": [
            {
                "label": "",
                "textValue": "Solid Waste",
                "value": ""
            }
        ],
        "answer": {
            "answer": [
                {
                    "label": "",
                    "textValue": "Solid Waste",
                    "value": ""
                }
            ],
            "input_type": "1",
            "nestedAnswer": [],
            "order": "3.006",
            "pattern": "",
            "shortKey": "solidWaste_type"
        }
    },
    "stormWater_question": {
        "information": "",
        "_id": "641fe634cc09cd11d2108cc9",
        "order": "4.001",
        "answer_option": [],
        "title": "Sections/Indicators",
        "hint": "",
        "resource_urls": [],
        "label": "",
        "shortKey": "stormWater_question",
        "viewSequence": "23",
        "showAsText": true,
        "child": [],
        "parent": [],
        "pattern": "",
        "validation": [],
        "restrictions": [],
        "min": 1,
        "max": null,
        "input_type": "1",
        "weightage": [],
        "isQuestionDisabled": true,
        "value": "first strom",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "1",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "4",
            "index": 0,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1,
        "isSelectValue": false,
        "previousValue": "",
        "modelValue": "first strom",
        "selectedValue": [
            {
                "label": "",
                "textValue": "first strom",
                "value": ""
            }
        ],
        "answer": {
            "answer": [
                {
                    "label": "",
                    "textValue": "first strom",
                    "value": ""
                }
            ],
            "input_type": "1",
            "nestedAnswer": [],
            "order": "4.001",
            "pattern": "",
            "shortKey": "stormWater_question"
        }
    },
    "stormWater_actualIndicator": {
        "information": "",
        "_id": "641fe667cc09cd11d2108d11",
        "order": "4.002",
        "answer_option": [],
        "title": "Actual Indicator 2022-23",
        "hint": "",
        "resource_urls": [],
        "label": "",
        "shortKey": "stormWater_actualIndicator",
        "viewSequence": "24",
        "child": [],
        "parent": [],
        "validation": [
            {
                "error_msg": "",
                "_id": "1"
            },
            {
                "error_msg": "",
                "_id": "2"
            }
        ],
        "restrictions": [],
        "minRange": 0,
        "maxRange": 9999,
        "min": 1,
        "max": 4,
        "pattern": "^((?:[0-9]|[1-9][0-9]{1,3}))$",
        "input_type": "2",
        "weightage": [],
        "valueHolder": "",
        "isQuestionDisabled": false,
        "value": "53",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "2",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "4",
            "index": 1,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1,
        "isSelectValue": false,
        "previousValue": "",
        "modelValue": "53",
        "selectedValue": [
            {
                "label": "",
                "textValue": "",
                "value": "53"
            }
        ],
        "answer": {
            "answer": [
                {
                    "label": "",
                    "textValue": "",
                    "value": "53"
                }
            ],
            "input_type": "2",
            "nestedAnswer": [],
            "order": "4.002",
            "pattern": "^((?:[0-9]|[1-9][0-9]{1,3}))$",
            "shortKey": "stormWater_actualIndicator"
        },
        "modelType": "object",
        "valueKey": "value"
    },
    "stormWater_targetIndicator": {
        "information": "",
        "_id": "641fe6c3cc09cd11d2108d70",
        "order": "4.003",
        "answer_option": [],
        "title": "Target Indicator 2023-24",
        "hint": "",
        "resource_urls": [],
        "label": "",
        "shortKey": "stormWater_targetIndicator",
        "viewSequence": "25",
        "child": [],
        "parent": [],
        "validation": [
            {
                "error_msg": "",
                "_id": "1"
            },
            {
                "error_msg": "",
                "_id": "2"
            }
        ],
        "restrictions": [
            {
                "_id": "641fe6c3cc09cd11d2108dab",
                "orders": [
                    {
                        "_id": "641fe6c3cc09cd11d2108dac",
                        "order": "4.002",
                        "value": ""
                    }
                ],
                "type": "7"
            }
        ],
        "minRange": 0,
        "maxRange": 9999,
        "min": 1,
        "max": 4,
        "pattern": "^((?:[0-9]|[1-9][0-9]{1,3}))$",
        "input_type": "2",
        "weightage": [],
        "valueHolder": "",
        "isQuestionDisabled": false,
        "value": "9240",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "2",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "4",
            "index": 2,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1,
        "isSelectValue": false,
        "previousValue": "",
        "modelValue": "9240",
        "selectedValue": [
            {
                "label": "",
                "textValue": "",
                "value": "9240"
            }
        ],
        "answer": {
            "answer": [
                {
                    "label": "",
                    "textValue": "",
                    "value": "9240"
                }
            ],
            "input_type": "2",
            "nestedAnswer": [],
            "order": "4.003",
            "pattern": "^((?:[0-9]|[1-9][0-9]{1,3}))$",
            "shortKey": "stormWater_targetIndicator"
        },
        "modelType": "object",
        "valueKey": "value"
    },
    "stormWater_indicatorLineItem": {
        "information": "",
        "_id": "641fe6ddcc09cd11d2108db9",
        "order": "4.004",
        "answer_option": [],
        "title": "Indicator LineItem",
        "hint": "",
        "resource_urls": [],
        "label": "",
        "shortKey": "stormWater_indicatorLineItem",
        "viewSequence": "26",
        "child": [],
        "parent": [],
        "pattern": "",
        "validation": [],
        "restrictions": [],
        "min": 1,
        "max": null,
        "input_type": "1",
        "weightage": [],
        "isQuestionDisabled": false,
        "value": "kfasdf",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "1",
        "visibility": true, "hidden": true,
        "nestedConfig": {
            "parentOrder": "4",
            "index": 3,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1,
        "isSelectValue": false,
        "previousValue": "",
        "modelValue": "kfasdf",
        "selectedValue": [
            {
                "label": "",
                "textValue": "kfasdf",
                "value": ""
            }
        ],
        "answer": {
            "answer": [
                {
                    "label": "",
                    "textValue": "kfasdf",
                    "value": ""
                }
            ],
            "input_type": "1",
            "nestedAnswer": [],
            "order": "4.004",
            "pattern": "",
            "shortKey": "stormWater_indicatorLineItem"
        }
    },
    "stormWater_unit": {
        "information": "",
        "_id": "641fe6eecc09cd11d2108e05",
        "order": "4.005",
        "answer_option": [],
        "title": "Unit",
        "hint": "",
        "resource_urls": [],
        "label": "",
        "shortKey": "stormWater_unit",
        "viewSequence": "27",
        "child": [],
        "parent": [],
        "pattern": "",
        "validation": [],
        "restrictions": [],
        "min": 1,
        "max": null,
        "input_type": "1",
        "weightage": [],
        "isQuestionDisabled": false,
        "value": "Hour",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "1",
        "visibility": true, "hidden": true,
        "nestedConfig": {
            "parentOrder": "4",
            "index": 4,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1,
        "isSelectValue": false,
        "previousValue": "",
        "modelValue": "Hour",
        "selectedValue": [
            {
                "label": "",
                "textValue": "Hour",
                "value": ""
            }
        ],
        "answer": {
            "answer": [
                {
                    "label": "",
                    "textValue": "Hour",
                    "value": ""
                }
            ],
            "input_type": "1",
            "nestedAnswer": [],
            "order": "4.005",
            "pattern": "",
            "shortKey": "stormWater_unit"
        }
    },
    "stormWater_type": {
        "information": "",
        "_id": "641fe70ccc09cd11d2108e52",
        "answer_option": [],
        "title": "Type",
        "hint": "",
        "order": "4.006",
        "resource_urls": [],
        "label": "",
        "shortKey": "stormWater_type",
        "viewSequence": "28",
        "child": [],
        "parent": [],
        "pattern": "",
        "validation": [],
        "restrictions": [],
        "min": 1,
        "max": null,
        "input_type": "1",
        "weightage": [],
        "isQuestionDisabled": false,
        "value": "Storm Water",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "1",
        "visibility": true, "hidden": true,
        "nestedConfig": {
            "parentOrder": "4",
            "index": 5,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1,
        "isSelectValue": false,
        "previousValue": "",
        "modelValue": "Storm Water",
        "selectedValue": [
            {
                "label": "",
                "textValue": "Storm Water",
                "value": ""
            }
        ],
        "answer": {
            "answer": [
                {
                    "label": "",
                    "textValue": "Storm Water",
                    "value": ""
                }
            ],
            "input_type": "1",
            "nestedAnswer": [],
            "order": "4.006",
            "pattern": "",
            "shortKey": "stormWater_type"
        }
    },
    declaration:{
        "order" : "38",
        "title" : "Self Declaration",
        "information" : "",
        "answer_option" : [

        ],
        "isQuestionDisabled": false,
        "hint" : "",
        "resource_urls" : [

        ],
        "_id" : "65f598093bfd03509175016e",
        "label" : "",
        "shortKey" : "declaration",
        "viewSequence" : "40",
        "input_type" : "10",
        "validation" : [

        ],
        "restrictions" : [

        ],
        "child" : [

        ],
        "parent" : [

        ],
        "editable" : false,
        "weightage" : [

        ]
    },
    officerName:{
        "order" : "39",
        "title" : "Name",
        "information" : "",
        "answer_option" : [

        ],
        "isQuestionDisabled": false,

        "hint" : "",
        "resource_urls" : [

        ],
        "_id" : "65f5988d3bfd035091750286",
        "label" : "29",
        "shortKey" : "officerName",
        "viewSequence" : "41",
        "input_type" : "1",
        "validation" : [
            {
                "_id" : "1",
                "error_msg" : ""
            }
        ],
        "restrictions" : [

        ],
        "child" : [

        ],
        "parent" : [

        ],
        "pattern" : "",
        "min" : (1),
        "max" : (50),
        "editable" : false,
        "weightage" : [

        ]
    },
    designation:  {
        "order" : "40",
        "title" : "Designation",
        "information" : "",
        "answer_option" : [

        ],
        "isQuestionDisabled": false,

        "hint" : "",
        "resource_urls" : [

        ],
        "_id" : "65f598dc3bfd0350917503a5",
        "label" : "30",
        "shortKey" : "designation",
        "viewSequence" : "42",
        "input_type" : "1",
        "validation" : [
            {
                "_id" : "1",
                "error_msg" : ""
            }
        ],
        "restrictions" : [

        ],
        "child" : [

        ],
        "parent" : [

        ],
        "pattern" : "",
        "min" : (1),
        "max" : (50),
        "editable" : false,
        "weightage" : [

        ]
    },
    cert_declaration:{
        "order" : "41",
        "title" : "Upload",
        "information" : "Kindly obtain the Commissioner or Executive Officer (EO) to sign the PDF file that you downloaded from the 'Preview' section",
        "answer_option" : [

        ],
        "isQuestionDisabled": false,

        "hint" : "",
        "resource_urls" : [

        ],
        "_id" : "65f5996c3bfd0350917504cb",
        "label" : "31",
        "shortKey" : "cert_declaration",
        "viewSequence" : "43",
        "input_type" : "11",
        "validation" : [
            {
                "_id" : "83",
                "error_msg" : "",
                "value" : "application/pdf"
            },
            {
                "_id" : "1",
                "error_msg" : ""
            },
            {
                "_id" : "81",
                "error_msg" : "",
                "value" : "5120"
            },
            {
                "_id" : "82",
                "error_msg" : "",
                "value" : "1"
            }
        ],
        "restrictions" : [

        ],
        "child" : [

        ],
        "parent" : [

        ],
        "pattern" : "",
        "min" : null,
        "minRange" : null,
        "max" : null,
        "maxRange" : null,
        "editable" : false,
        "weightage" : [

        ]
    },
    declaration:{
        "information" : "",
        "_id" : "6409bc56235a2809db04c7df",
        "order" : "7",
        "answer_option" : [
            {
                "name" : "Agree",
                "did" : [

                ],
                "viewSequence" : "1",
                "_id" : "1"
            },
            {
                "name" : "Disagree",
                "did" : [

                ],
                "viewSequence" : "2",
                "_id" : "2"
            }
        ],
        "title" : "Certified that above information has been extracted from the relevent records being maintained with the ULB and is true to to best of my knowledge and belief.",
        "hint" : "",
        "isQuestionDisabled" : false,
        "resource_urls" : [
            {
                "download" : true,
                "_id" : "6409bc56235a2809db04c803",
                "label" : "",
                "url" : "https://staging-dhwani.s3.ap-south-1.amazonaws.com/consent_70744cd4-922c-4a3a-bcdd-e03aa09786b9.txt"
            }
        ],
        "label" : "6",
        "shortKey" : "declaration",
        "viewSequence" : "44",
        "child" : [

        ],
        "parent" : [

        ],
        "validation" : [

        ],
        "restrictions" : [

        ],
        "input_type" : "22",
        "editable" : false,
        "weightage" : [

        ]
    },

    //gtc form childQuestions
    "transAmount": {
        "information": "",
        "_id": "6437ff67bae92b4649191c63",
        "order": "4.001",
        "answer_option": [],
        "title": "Amount Transferred, excluding interest (in lakhs)",
        "hint": "",
        "resource_urls": [],
        "label": "1",
        "shortKey": "transAmount",
        "viewSequence": "15",
        "child": [],
        "parent": [],
        "validation": [
            {
                "error_msg": "",
                "_id": "1"
            },
            {
                "error_msg": "",
                "_id": "2"
            }
        ],
        "restrictions": [],
        "minRange": 1,
        "maxRange": 999999,
        "pattern": "^((?:[1-9]|[1-9][0-9]{1,5}))$",
        "input_type": "2",
        "weightage": [],
        "valueHolder": "",
        "isQuestionDisabled": false,
        "value": "40",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "2",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "4",
            "index": 0,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1,
        "isSelectValue": false,
        "previousValue": "",
        "modelValue": "40",
        "selectedValue": [
            {
                "label": "",
                "textValue": "",
                "value": "40"
            }
        ],
        "errorMessage": ""
    },
    "transDate": {
        "information": "",
        "_id": "6437ffd11a51164651cac69b",
        "order": "4.002",
        "answer_option": [],
        "title": "Date of Transfer",
        "hint": "",
        "resource_urls": [],
        "label": "2",
        "shortKey": "transDate",
        "viewSequence": "16",
        "child": [],
        "parent": [],
        "validation": [
            {
                "error_msg": "",
                "_id": "1"
            },
            {
                "_id": "24",
                "error_msg": "",
                "value": ""
            }
        ],
        "restrictions": [],
        "input_type": "14",
        "weightage": [],
        "isQuestionDisabled": false,
        "value": "",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "14",
        "max": new Date(),
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "4",
            "index": 1,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1
    },
    "transDelay": {
        "information": "",
        "_id": "6438005010d7a646562ea4bf",
        "order": "4.003",
        "answer_option": [
            {
                "name": "Yes",
                "did": [],
                "viewSequence": "1",
                "_id": "1"
            },
            {
                "name": "No",
                "did": [],
                "viewSequence": "2",
                "_id": "2"
            }
        ],
        "title": "Was there any delay in transfer?",
        "hint": "",
        "resource_urls": [],
        "label": "3",
        "shortKey": "transDelay",
        "viewSequence": "17",
        "child": [
            {
                "type": "2",
                "value": "^([1])$",
                "order": "4.004"
            },
            {
                "type": "2",
                "value": "^([1])$",
                "order": "4.005"
            },
            {
                "type": "2",
                "value": "^([1])$",
                "order": "4.006"
            }
        ],
        "parent": [],
        "validation": [
            {
                "error_msg": "",
                "_id": "1"
            }
        ],
        "restrictions": [],
        "input_type": "5",
        "weightage": [],
        "isQuestionDisabled": true,
        "value": "",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "5",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "4",
            "index": 2,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1
    },
    "daysDelay": {
        "information": "",
        "_id": "6438009129e2ab464aea897f",
        "order": "4.004",
        "answer_option": [],
        "title": "No. of working days delayed",
        "hint": "",
        "resource_urls": [],
        "label": "4",
        "shortKey": "daysDelay",
        "viewSequence": "18",
        "child": [],
        "parent": [
            {
                "value": "^([1])$",
                "type": "5",
                "order": "4.003"
            }
        ],
        "validation": [
            {
                "error_msg": "",
                "_id": "1"
            },
            {
                "error_msg": "",
                "_id": "2"
            }
        ],
        "restrictions": [],
        "minRange": 0,
        "maxRange": 999,
        "pattern": "^((?:[0-9]|[1-9][0-9]{1,2}))$",
        "input_type": "2",
        "weightage": [],
        "valueHolder": "",
        "isQuestionDisabled": true,
        "value": "30",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "2",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "4",
            "index": 3,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1,
        "isSelectValue": false,
        "previousValue": "",
        "modelValue": "30",
        "selectedValue": [
            {
                "label": "",
                "textValue": "",
                "value": "30"
            }
        ],
        "errorMessage": ""
    },
    "interest": {
        "information": "",
        "_id": "643800f110d7a646562ea59b",
        "order": "4.005",
        "answer_option": [],
        "title": "Rate of interest (annual rate)",
        "hint": "",
        "resource_urls": [],
        "label": "5",
        "shortKey": "interest",
        "viewSequence": "19",
        "child": [],
        "parent": [
            {
                "value": "^([1])$",
                "type": "5",
                "order": "4.003"
            }
        ],
        "validation": [
            {
                "error_msg": "",
                "_id": "1"
            },
            {
                "error_msg": "",
                "_id": "2"
            }
        ],
        "restrictions": [],
        "minRange": 0,
        "maxRange": 100,
        "pattern": "^((?:[0-9]|[1-9][0-9]|100))$",
        "input_type": "2",
        "weightage": [],
        "valueHolder": "",
        "isQuestionDisabled": false,
        "value": "80",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "2",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "4",
            "index": 4,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1,
        "isSelectValue": false,
        "previousValue": "",
        "modelValue": "80",
        "selectedValue": [
            {
                "label": "",
                "textValue": "",
                "value": "80"
            }
        ],
        "errorMessage": ""
    },
    "intTransfer": {
        "information": "",
        "_id": "643802e229e2ab464aea8af9",
        "order": "4.006",
        "answer_option": [],
        "title": "Amount of interest transferred, If there's any delay (in lakhs)",
        "hint": "",
        "resource_urls": [],
        "label": "6",
        "shortKey": "intTransfer",
        "viewSequence": "20",
        "child": [],
        "parent": [
            {
                "value": "^([1])$",
                "type": "5",
                "order": "4.003"
            }
        ],
        "validation": [
            {
                "error_msg": "",
                "_id": "1"
            },
            {
                "error_msg": "",
                "_id": "2"
            },
            {
                "_id" : "5",
                "error_msg" : "",
                "value" : "(transAmount * daysDelay * interest)"
            }
        ],
        "restrictions": [],
        "minRange": 0,
        "maxRange": 9999,
        "pattern": "^((?:[0-9]|[1-9][0-9]{1,3}))$",
        "input_type": "2",
        "weightage": [],
        "valueHolder": "",
        "formula" : "(transAmount * daysDelay * interest)",
        "isQuestionDisabled": true,
        "value": "40",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "2",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "4",
            "index": 5,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1,
        "isSelectValue": false,
        "previousValue": "",
        "modelValue": "40",
        "selectedValue": [
            {
                "label": "",
                "textValue": "",
                "value": "40"
            }
        ],
        "errorMessage": ""
    },
    "totalTransAmount": {
        "information": "",
        "_id": "6438034510d7a646562ea77b",
        "order": "4.007",
        "answer_option": [],
        "title": "Total Amount Transferred, excluding interest (In lakhs)",
        "hint": "",
        "resource_urls": [],
        "label": "7",
        "shortKey": "totalTransAmount",
        "viewSequence": "21",
        "child": [],
        "parent": [],
        "validation": [
            {
                "error_msg": "",
                "_id": "1"
            }
        ],
        "restrictions": [],
        "minRange": 0,
        "maxRange": 9999,
        "pattern": "",
        "input_type": "2",
        "weightage": [],
        "valueHolder": "",
        "isQuestionDisabled": false,
        "value": "",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "2",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "4",
            "index": 6,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1
    },
    "totalIntTransfer": {
        "information": "",
        "_id": "643803941a51164651cac913",
        "order": "4.008",
        "answer_option": [],
        "title": "Total Amount of Interest Transferred (In lakhs)",
        "hint": "",
        "resource_urls": [],
        "label": "8",
        "shortKey": "totalIntTransfer",
        "viewSequence": "22",
        "child": [],
        "parent": [],
        "validation": [
            {
                "error_msg": "",
                "_id": "1"
            }
        ],
        "restrictions": [],
        "minRange": 0,
        "maxRange": 9999,
        "pattern": "",
        "input_type": "2",
        "weightage": [],
        "valueHolder": "",
        "isQuestionDisabled": false,
        "value": "",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "2",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "4",
            "index": 7,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1
    }
}


module.exports.DurProjectJson = DurProjectJson