const ObjectId = require('mongodb').ObjectId;

let years = {
    "2017-18": "63735a4bd44534713673bfbf",
    "2018-19": "63735a5bd44534713673c1ca",
    "2019-20": "607697074dff55e6c0be33ba",
    "2020-21": "606aadac4dff55e6c075c507",
    "2021-22": "606aaf854dff55e6c075d219",
    "2022-23": "606aafb14dff55e6c075d3ae",
    "2023-24": "606aafc14dff55e6c075d3ec",
    "2024-25": "606aafcf4dff55e6c075d424",
    "2025-26": "606aafda4dff55e6c075d48f",
    "2026-27": "67d7d136d3d038946a5239e9",
}
// Input: 606aafda4dff55e6c075d48f (2025-26), Output: 2019-24
const getStateGsdpYear = (designYear) => {
    if (!designYear) throw new Error('getStateGsdpYear(): designYear is required.');

    const [startYr, endYr] = getDesiredYear(designYear)['yearName'].split("-");
    return `${Number(startYr) - 6}-${Number(endYr) - 2}`;
}
const getDesiredYear = (yearIdOrName, yearDiffercnce = 0) => {
    const entries = Object.entries(years);
    const yearIndex = entries.findIndex((entry) => entry.includes('' + yearIdOrName));
    const [yearName, yearId] = entries[yearIndex + yearDiffercnce];
    return { yearName, yearId, yearIndex };
}

const getAdditionalYears = (lastYearId, currentYearId) => {
    const entries = Object.entries(years);
    const start = entries.findIndex((entry) => entry.includes('' + lastYearId))
    const end = entries.findIndex((entry) => entry.includes('' + currentYearId))
    return Object.entries(years).slice(start + 1, end).map(([yearName, yearId]) => ({ yearName, yearId }));
}

const isBeyond2023_24 = design_year => {
    if (!design_year) return false;
    const { yearIndex: designYearIndex } = getDesiredYear(design_year);
    const { yearIndex: yearIndex23_24 } = getDesiredYear('2023-24');
    return designYearIndex > yearIndex23_24;
}
const isBeyondYear = (design_year, compareYear) => {
    if (!design_year) return false;
    const { yearIndex: designYearIndex } = getDesiredYear(design_year);
    const { yearIndex: yearIndex23_24 } = getDesiredYear(compareYear);
    return designYearIndex > yearIndex23_24;
}

function getAllCurrAndPrevYearsObjectIds(yearId) {
    const yearIndex = Object.values(years).indexOf("" + yearId);
    if (yearIndex === -1 || yearIndex === 0) {
        return [];
    }
    const previousYears = Object.values(years).slice(0, yearIndex + 1);
    return previousYears.map(id => new ObjectId(id));
}

module.exports = {
    years,
    getDesiredYear,
    getAdditionalYears,
    isBeyond2023_24,
    isBeyondYear,
    getAllCurrAndPrevYearsObjectIds,
    getStateGsdpYear
}