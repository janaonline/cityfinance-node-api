const catchAsync = require('../../util/catchAsync')
const MasterFormData = require('../../models/MasterForm')
const ObjectId = require('mongoose').Types.ObjectId;


module.exports.get = catchAsync(async (req, res) => {
    let user = req.decoded

    let { design_year } = req.params;
    if (!design_year) {
        return res.status(400).json({
            success: false,
            message: 'Design Year Not Found'
        })
    }
    if (!user) {
        return res.status(400).json({
            success: false,
            message: 'User Not Found'
        })
    }
    let masterFormData = await MasterFormData.findOne({
        "ulb": ObjectId(user.ulb),
        "design_year": ObjectId(design_year)
    },
        '-history')
    if (!masterFormData) {
        return res.status(500).json({
            success: false,
            message: 'Master Data Not Found for ' + user.name
        })
    } else {
        return res.status(200).json({
            success: true,
            message: 'Data Found Successfully!',
            response: masterFormData
        })
    }
})


module.exports.getAll = catchAsync(async (req, res) => {
    let user = req.decoded;
    if (!user) {
        return res.status(400).json({
            success: false,
            message: 'User Not Found!'
        })
    }
    if (user.role === 'ADMIN' || 'MoHUA' || 'PARTNER' || 'USER' || 'STATE') {
        let { design_year } = req.params;
        if (!design_year) {
            return res.status(400).json({
                success: false,
                message: 'Design Year Not Found'
            })
        }
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'User Not Found'
            })
        }

        let match = {
            $match:
            {
                design_year: ObjectId(design_year)
            }
        }

        if (user.role === 'STATE') {
            match = {
                $match:
                {
                    design_year: ObjectId(design_year),
                    state: ObjectId(user.state)
                }
            }
        }

        let query =
            [
                match
                ,
                {
                    $lookup:
                    {
                        from: 'ulbs',
                        localField: 'ulb',
                        foreignField: '_id',
                        as: 'ulb'

                    }
                },
                { $unwind: "$ulb" },
                {
                    $lookup:
                    {
                        from: 'ulbtypes',
                        localField: 'ulb.ulbType',
                        foreignField: '_id',
                        as: 'ulbType'
                    }
                },
                { $unwind: "$ulbType" },
                {
                    $lookup: {
                        from: 'states',
                        localField: 'ulb.state',
                        foreignField: '_id',
                        as: 'state'

                    }
                },
                { $unwind: "$state" },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'actionTakenBy',
                        foreignField: '_id',
                        as: 'actionTakenBy',
                    },
                },
                { $unwind: '$actionTakenBy' },
                // {
                //     $lookup: {
                //         from: 'UA',
                //         localField: 'UA',
                //         foreignField: '_id',
                //         as: 'UA',
                //     },
                // },
                // { $unwind: '$UA' },
                {
                    $project: {
                        "state.name": 1,
                        "ulb.name": 1,
                        "ulb.censusCode": 1,
                        "ulb.sbCode": 1,
                        "populationType": {
                            $cond: {
                                if: { $eq: ['$ulb.isMillionPlus', 'Yes'] },
                                then: 'Million Plus',
                                else: 'Non Million',
                            },
                        },
                        "ulb.isUA": { $ifNull: ["$ulb.isUA", "No"] },
                        "UA": {
                            $cond: {
                                if: { $eq: ['$ulb.isUA', 'Yes'] },
                                then: { $ifNull: ["$ulb.UA.name", "Does Not Exist"] },
                                else: 'NA',
                            },
                        },
                        "ulbType.name": 1,
                        "status": {
                            $cond: {
                                if: { $eq: ['$status', 'NA'] },
                                then: 'Not Started',
                                else: '$status',
                            }
                        },
                        "createdAt": '$createdAt',
                        "modifiedAt": '$modifiedAt'
                    }
                }

            ]

        let masterFormData = await MasterFormData.aggregate(query);
        if (masterFormData) {
            console.log(masterFormData)
            return res.status(200).json({
                success: true,
                message: "Data Found Successfully!",
                data: masterFormData
            }

            );
        } else {
            return res.status(400).json({
                success: false,
                message: "No Data Found"
            })
        }
    } else {
        return res.status(403).json({
            success: false,
            message: user.role + " is Not Authenticated to Perform this Action"
        })
    }



})