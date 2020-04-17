module.exports = (data = [], fields = {})=>{
    return new Promise((resolve)=>{
        let arr = [];
        if(Object.keys(fields).length){
            for(let el of data){
                let obj = {};
                for(let key in fields){
                    obj[fields[key]] = el[key];
                }
                arr.push(obj);
            }
        }
        resolve(arr);
    });
}