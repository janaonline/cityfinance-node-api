function dateFormatter(input){
    console.log(input)
    const t = new Date(input);
    const date = ('0' + t.getDate()).slice(-2);
    const month = ('0' + (t.getMonth() + 1)).slice(-2);
    const year = t.getFullYear();
    return `${date}/${month}/${year}`;
}
module.exports = dateFormatter