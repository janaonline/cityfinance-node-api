const Ulb = require("../../../models/Ulb");
const Sate = require("../../../models/State");
const Response = require("../../../service").response;
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
// const financialInfo = require('../common-api/financialInfo');
// const { getStandardizedYears } = require('../../common/common');

module.exports.details = async (req, res) => {
    // mongoose.set("debug", true);
    try {
        const stateRes = await Sate.findOne({ slug: req.query.slug }).select('_id name slug code');
        if (!stateRes) {
            return Response.BadRequest(res, null, "State not found");
        }
        req.query.state = stateRes._id;
        const condition = {
            isActive: true,
            // isPublish: true,
            state: ObjectId(req.query.state) || null
        };
        let result = await Ulb.aggregate(getquery(condition));
        if (result.length === 0) {
            return Response.BadRequest(res, null, "No Data Found");
        }
        // const financialData = await financialInfo.getFinancialInfo(req);
        // const yearsList = await getStandardizedYears({ stateCode: stateRes.code });
        const responseData = {
            state: stateRes,
            gridData: formatData(result[0]),
            // financialData: financialData,
            // yearsList: yearsList.sort((a, b) => b.localeCompare(a)),
        }
        return Response.OK(res, responseData, "State details fetched successfully");
    } catch (err) {
        console.error(err.message);
        return Response.BadRequest(res, {}, err.message);
    }
};

function formatNumber(num) {
    if (num >= 1_000_000) {
        return Math.round(num / 1_000_000).toLocaleString() + ' Million'; // Millions
    } else if (num >= 1_000) {
        return Math.round(num / 1_000).toLocaleString() + ' Thousand'; // Thousands
    } else {
        return num.toLocaleString(); // Original number
    }
}


formatData = (data) => {
    const json = [
        {
            key: "population",
            label: "Population",
            value: formatNumber(data.population),
            sequence: 1
        },
        {
            key: "area",
            label: "Urban Area",
            value: Math.round(parseFloat(data.area)).toLocaleString() + ' Sq km',
            sequence: 2
        },
        {
            key: "density",
            label: "Urban Population Density",
            value: parseFloat((data.population / data.area).toFixed(2)).toLocaleString() + ' / Sq km',
            sequence: 3
        },
        {
            key: "ulbs",
            label: "Urban Local Bodies(ULBs)",
            value: data.ulbs.toLocaleString(),
            sequence: 4
        },
        {
            key: "uas",
            label: "ULBs part of Urban Agglomorations",
            value: data.uas.toLocaleString(),
            sequence: 5
        },
        {
            key: "municipalCorporation",
            label: "Municipal Corporations",
            value: data.municipalCorporation.toLocaleString(),
            sequence: 6
        },
        {
            key: "municipality",
            label: "Municipality",
            value: data.municipality.toLocaleString(),
            sequence: 7
        },
        {
            key: "townPanchayat",
            label: "Town Panchayats",
            value: data.townPanchayat.toLocaleString(),
            sequence: 8
        }
    ]
    return json;
};

getquery = (condition) => {
    const ulbType = {
        "townPanchayat": ObjectId("5dcfa66b43263a0e75c71696"),
        "municipality": ObjectId("5dcfa64e43263a0e75c71695"),
        "municipalCorporation": ObjectId("5dcfa67543263a0e75c71697")
    };
    return [
        { $match: condition },
        {
            $group: {
                _id: "$state",
                area: { $sum: "$area" },
                population: { $sum: "$population" },
                ulbs: { $sum: 1 },
                uas: { $sum: { $cond: [{ $eq: ["$isUA", "Yes"] }, 1, 0] } },
                municipalCorporation: { $sum: { $cond: [{ $eq: ["$ulbType", ulbType['municipalCorporation']] }, 1, 0] } },
                municipality: { $sum: { $cond: [{ $eq: ["$ulbType", ulbType['municipality']] }, 1, 0] } },
                townPanchayat: { $sum: { $cond: [{ $eq: ["$ulbType", ulbType['townPanchayat']] }, 1, 0] } }
            }
        },
        {
            $project: {
                area: 1,
                population: 1,
                ulbs: 1,
                uas: 1,
                municipalCorporation: 1,
                municipality: 1,
                townPanchayat: 1,
            }
        }
    ]
};
