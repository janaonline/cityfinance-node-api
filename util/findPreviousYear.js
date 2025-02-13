// input -> 2019-20, output ->2018-19

module.exports.findPreviousYear = (input) => {
    let prevYearVal = input.split("-");
    prevYearVal = Number(prevYearVal[0]) - 1 + "-" + (Number(prevYearVal[1]) - 1);
    return prevYearVal
}

