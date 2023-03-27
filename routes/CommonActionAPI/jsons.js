
let DurProjectJson = {
    "name": {
        "information": "",
        "_id": "64097dfb3b2eb509dc61e581",
        "order": "6.001",
        "answer_option": [],
        "title": "Name of the Project",
        "hint": "",
        "resource_urls": [],
        "label": "",
        "shortKey": "name",
        "viewSequence": "21",
        "child": [],
        "parent": [],
        "pattern": "",
        "validation": [
            {
                "error_msg": "",
                "_id": "1"
            }
        ],
        "restrictions": [],
        "min": 1,
        "max": 50,
        "input_type": "1",
        "weightage": [],
        "selectedValue": "",
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
            "name": " 1"
        },
        "forParentValue": 1
    },
    "category": {
        "information": "",
        "_id": "64097e1e3b2eb509dc61e5ba",
        "order": "6.002",
        "answer_option": [
            {
                "name": "Yes",
                "did": [],
                "viewSequence": "1",
                "_id": "1"
            }
        ],
        "title": "Sector",
        "modelName":"Category",
        "type":"referenceById",
        "modelFilter":{},
        "hint": "",
        "resource_urls": [],
        "label": "",
        "shortKey": "category",
        "viewSequence": "22",
        "child": [],
        "parent": [],
        "validation": [
            {
                "_id": "1",
                "error_msg": ""
            }
        ],
        "restrictions": [],
        "input_type": "3",
        "weightage": [],
        "selectedValue": "",
        "value": "",
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
            "name": " 1"
        },
        "forParentValue": 1
    },
    "lat": {
        "information": "",
        "_id": "64097e4f3b2eb509dc61e5f5",
        "order": "6.003",
        "answer_option": [],
        "title": "Latitude",
        "hint": "",
        "resource_urls": [],
        "label": "",
        "shortKey": "lat",
        "viewSequence": "23",
        "child": [],
        "parent": [],
        "validation": [
            {
                "error_msg": "",
                "_id": "1"
            }
        ],
        "restrictions": [],
        "minRange": null,
        "maxRange": null,
        "min": 1,
        "max": 3,
        "pattern": "",
        "input_type": "2",
        "weightage": [],
        "valueHolder": "",
        "selectedValue": "",
        "value": "",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "2",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "6",
            "index": 2,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1
    },
    "long": {
        "information": "",
        "_id": "64097e5f3b2eb509dc61e632",
        "order": "6.004",
        "answer_option": [],
        "title": "Longitude",
        "hint": "",
        "resource_urls": [],
        "label": "",
        "shortKey": "long",
        "viewSequence": "24",
        "child": [],
        "parent": [],
        "validation": [
            {
                "error_msg": "",
                "_id": "1"
            }
        ],
        "restrictions": [],
        "minRange": null,
        "maxRange": null,
        "min": 1,
        "max": 3,
        "pattern": "",
        "input_type": "2",
        "weightage": [],
        "valueHolder": "",
        "selectedValue": "",
        "value": "",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "2",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "6",
            "index": 3,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1
    },
    "cost": {
        "information": "i = The total project cost is as per the DPR.",
        "_id": "64097e763b2eb509dc61e671",
        "order": "6.005",
        "answer_option": [],
        "title": "Total Project Cost (INR in lakhs)",
        "hint": "",
        "resource_urls": [],
        "label": "",
        "shortKey": "cost",
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
            },
            {
                "_id": "14",
                "error_msg": "",
                "value": "0.00"
            }
        ],
        "restrictions": [],
        "minRange": 0,
        "maxRange": 9,
        "min": 1,
        "max": 4,
        "pattern": "^((?:^([0-8])(?:\\.\\d{1,3})?|9))$",
        "input_type": "2",
        "weightage": [],
        "valueHolder": "",
        "selectedValue": "",
        "value": "",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "2",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "6",
            "index": 4,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1
    },
    "expenditure": {
        "information": "i = This is the outlay from 15th FC grant out of the total project cost. For Ex: If project total cost is 100 Cr, out of which 80 Cr is sourced from AMRUT 2.0, rest 20 Cr is sourced from 15th FC tied grants, then 20 Cr should be entered here. Please do not enter the expenditure incurred.",
        "_id": "64097e903b2eb509dc61e6b2",
        "order": "6.006",
        "answer_option": [],
        "title": "Amount of 15th FC Grants in Total Project Cost (INR in lakhs)",
        "hint": "",
        "resource_urls": [],
        "label": "",
        "shortKey": "expenditure",
        "viewSequence": "26",
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
            },
            {
                "_id": "14",
                "error_msg": "",
                "value": "0.00"
            }
        ],
        "restrictions": [],
        "minRange": 0,
        "maxRange": 9,
        "min": 1,
        "max": 4,
        "pattern": "^((?:^([0-8])(?:\\.\\d{1,3})?|9))$",
        "input_type": "2",
        "weightage": [],
        "valueHolder": "",
        "selectedValue": "",
        "value": "",
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
            "name": " 1"
        },
        "forParentValue": 1
    },
    "totalProjectCost": {
        "information": "",
        "_id": "64097eb23b2eb509dc61e6f5",
        "order": "6.007",
        "answer_option": [],
        "title": "% of 15th FC Grants in Total Project Cost",
        "hint": "",
        "resource_urls": [],
        "label": "",
        "shortKey": "totalProjectCost",
        "viewSequence": "27",
        "child": [],
        "parent": [],
        "validation": [
            {
                "error_msg": "",
                "_id": "1"
            }
        ],
        "restrictions": [],
        "minRange": null,
        "maxRange": null,
        "min": 1,
        "max": 3,
        "pattern": "",
        "input_type": "2",
        "weightage": [],
        "valueHolder": "",
        "selectedValue": "",
        "value": "",
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
            "name": " 1"
        },
        "forParentValue": 1
    },
    "startDate": {
        "information": "",
        "_id": "6409b860235a2809db04c501",
        "order": "6.008",
        "answer_option": [],
        "title": "Project Start Date",
        "hint": "",
        "resource_urls": [],
        "label": "",
        "shortKey": "startDate",
        "viewSequence": "28",
        "child": [],
        "parent": [],
        "validation": [
            {
                "_id": "24",
                "error_msg": "",
                "value": ""
            },
            {
                "error_msg": "",
                "_id": "1"
            }
        ],
        "restrictions": [],
        "input_type": "14",
        "weightage": [],
        "selectedValue": "",
        "value": "",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "14",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "6",
            "index": 7,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1
    },
    "completionDate": {
        "information": "",
        "_id": "6409b8cb235a2809db04c550",
        "order": "6.009",
        "answer_option": [],
        "title": "Project Completion Date",
        "hint": "",
        "resource_urls": [],
        "label": "",
        "shortKey": "completionDate",
        "viewSequence": "29",
        "child": [],
        "parent": [],
        "validation": [
            {
                "error_msg": "",
                "_id": "1"
            }
        ],
        "restrictions": [],
        "input_type": "14",
        "weightage": [],
        "selectedValue": "",
        "value": "",
        "acceptableType": "",
        "acceptableFileType": "",
        "type": "14",
        "visibility": true,
        "nestedConfig": {
            "parentOrder": "6",
            "index": 8,
            "loopIndex": 0
        },
        "selectedAnswerOption": {
            "name": " 1"
        },
        "forParentValue": 1
    }
}

module.exports.DurProjectJson = DurProjectJson