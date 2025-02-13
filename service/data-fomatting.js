module.exports = (data = [], fields = {})=>{
    return new Promise((resolve)=>{
        let arr = [];
        if(Object.keys(fields).length){
            for(let el of data){

                let obj = {};
                el['isActive'] = el.isActive ? "Active" : "InActive";
                for(let key in fields){
                    if(key=='createdAt'){
                       let d = el[key].toDateString().split(' ');
                       obj[fields[key]] = d[1]+" "+d[2]+","+d[3]
                    }
                    else{
                        obj[fields[key]] = el[key];
                    }
                }
                arr.push(obj);
            }
        }
        resolve(arr);
    });
}


