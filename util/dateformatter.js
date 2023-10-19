const dateFormatter = (input, separator="/")=> {
    const t = new Date(input);
    const date = ('0' + t.getDate()).slice(-2);
    const month = ('0' + (t.getMonth() + 1)).slice(-2);
    const year = t.getFullYear();
    return `${date}${separator}${month}${separator}${year}`;
}

module.exports.convertToKolkataDate = (isoDate, timeZone='Asia/Kolkata')=> {
    const options = { year: 'numeric', month: 'numeric', day: 'numeric', timeZone };
    const date = new Date(isoDate);
    const kolkataDate = new Intl.DateTimeFormat('en-US', options).format(date);
    return dateFormatter(kolkataDate);
}

module.exports.dateFormatter = dateFormatter