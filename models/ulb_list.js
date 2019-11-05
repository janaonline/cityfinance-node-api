module.exports.getByState = function(stateCode){
    return ulbList[stateCode];
}

module.exports.getUlbInfo = function(stateCode, ulbCode){
    const stateInfo = ulbList[stateCode];
    for (let index = 0; index < stateInfo.ulbs.length; index++) {
        if(stateInfo.ulbs[index] && stateInfo.ulbs[index].code == ulbCode){
            return stateInfo.ulbs[index];
        }
    }
    
    return null;
}

module.exports.getUlbByCode = function(ulbCode){

    let ulbs = [];
    let shortCode = ulbCode.substring(0,2);
    const stateInfo = ulbList[shortCode];
    for (let index = 0; index < stateInfo.ulbs.length; index++) {
        if(stateInfo.ulbs[index] && stateInfo.ulbs[index].code == ulbCode){
            let temp = stateInfo.ulbs[index];
            temp['stateName'] = stateInfo['state'];
            return temp;
        }
    }
    return ulbs;


    // let ulbs = [];
    // const stateList = Object.keys(ulbList);
    // for (let i = 0; i < stateList.length; i++) {
    //     const state = ulbList[stateList[i]];
    //     for (let j = 0; j < state.ulbs.length; j++) {
    //         ulbs.push(state.ulbs[j]);
    //     }
    // }
    // return ulbs;
}

module.exports.getAllUlbs = function(){
    // const stateArr = Object.keys(ulbList);
    // let ulbs = [];
    // for(let i=0; i<stateArr.length; i++){
    //     if(ulbList[stateArr[i]].length > 0){
    //         ulbs = [...ulbs, ...ulbList[stateArr[i]]]
    //     }
    // }
    return ulbList;
}

const ulbList = {
    AP: {
        "state": "Andhra Pradesh",
        "ulbs": [
            { "state": "Andhra Pradesh", "code": "AP001", "name": "Addanki Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 25, "population": 40353 },
            { "state": "Andhra Pradesh", "code": "AP005", "name": "Atmakur Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 23, "area": 8.8, "population": 45703 },
            { "state": "Andhra Pradesh", "code": "AP006", "name": "Chimakurthy Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 20, "area": 27.92, "population": 30332 },
            { "state": "Andhra Pradesh", "code": "AP008", "name": "Gollaprolu Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 50.10, "population": 78926 },
            { "state": "Andhra Pradesh", "code": "AP009", "name": "Hindupur Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 38, "area": 38.16, "population": 151835 },
            { "state": "Andhra Pradesh", "code": "AP010", "name": "Ichhapurm Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 23, "area": 25.25, "population": 36478 },
            { "state": "Andhra Pradesh", "code": "AP011", "name": "Kakinada Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 50, "area": 192.30, "population": 376861 },
            { "state": "Andhra Pradesh", "code": "AP012", "name": "Kandukur Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 22, "area": 39.63, "population": 57246 },
            { "state": "Andhra Pradesh", "code": "AP013", "name": "Pamidi Nagara Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 0, "population": 26886 },
            { "state": "Andhra Pradesh", "code": "AP016", "name": "Punganur Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 24, "area": 17.02, "population": 54746 },
            { "state": "Andhra Pradesh", "code": "AP017", "name": "Puttaparthi Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 60.50, "population": 31610 },
            { "state": "Andhra Pradesh", "code": "AP018", "name": "Puttur Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 24, "area": 31.8, "population": 54092 },
            { "state": "Andhra Pradesh", "code": "AP019", "name": "Tuni Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 9, "area": 0, "population": 53425 },
            { "state": "Andhra Pradesh", "code": "AP023", "name": "Chittoor Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 50, "area": 9, "population": 189332 },
            { "state": "Andhra Pradesh", "code": "AP025", "name": "Dhone Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 20, "area": 9.85, "population": 59272 },
            { "state": "Andhra Pradesh", "code": "AP026", "name": "Gooty Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 24, "area": 35.0, "population": 48583 },
            { "state": "Andhra Pradesh", "code": "AP035", "name": "Madanapalle Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 35, "area": 14.20, "population": 135669 },
            { "state": "Andhra Pradesh", "code": "AP036", "name": "Mandapeta Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 29, "area": 21.65, "population": 53588 },
            { "state": "Andhra Pradesh", "code": "AP037", "name": "Mangalagiri Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 32, "area": 10.49, "population": 73739 },
            { "state": "Andhra Pradesh", "code": "AP038", "name": "Mummidivaram Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 31.11, "population": 25355 },
            { "state": "Andhra Pradesh", "code": "AP039", "name": "Mydukur Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 23, "area": 49.6, "population": 45701 },
            { "state": "Andhra Pradesh", "code": "AP041", "name": "Nandikotkur Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 23, "area": 8.86, "population": 46953 },
            { "state": "Andhra Pradesh", "code": "AP042", "name": "Narasaraopet Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 34, "area": 0, "population": 117568 },
            { "state": "Andhra Pradesh", "code": "AP043", "name": "Narsipatnam Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 27, "area": 41.95, "population": 61540 },
            { "state": "Andhra Pradesh", "code": "AP047", "name": "Palamaner Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 24, "area": 17.76, "population": 51163 },
            { "state": "Andhra Pradesh", "code": "AP049", "name": "Peddapuram Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 28, "area": 41.15, "population": 49579 },
            { "state": "Andhra Pradesh", "code": "AP053", "name": "Rajamahendravaram Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 50, "area": 0, "population": 343903 },
            { "state": "Andhra Pradesh", "code": "AP054", "name": "Rajam Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 20, "area": 27.65, "population": 42197 },
            { "state": "Andhra Pradesh", "code": "AP056", "name": "Ramachandrapuram Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 27, "area": 13.98, "population": 43683 },
            { "state": "Andhra Pradesh", "code": "AP062", "name": "Srikalahasti Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 35, "area": 25, "population": 80056 },
            { "state": "Andhra Pradesh", "code": "AP067", "name": "Visakhapatnam Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 0, "area": 0, "population": 0 },
            { "state": "Andhra Pradesh", "code": "AP068", "name": "Yelamanchili Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 24, "area": 39.00, "population": 27265 },
            { "state": "Andhra Pradesh", "code": "AP069", "name": "Yeleswaram Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 6.50, "population": 32084 },
            { "state": "Andhra Pradesh", "code": "AP072", "name": "Nellore Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 54, "area": 149.20, "population": 600869 },
            { "state": "Andhra Pradesh", "code": "AP080", "name": "Markapur Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 11, "area": 0, "population": 71092 },
            { "state": "Andhra Pradesh", "code": "AP081", "name": "Naidupet Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 19.40, "population": 45055 },
            { "state": "Andhra Pradesh", "code": "AP082", "name": "Nandigama Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 25.90, "population": 0 },
            { "state": "Andhra Pradesh", "code": "AP083", "name": "Narasapur Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 31, "area": 11.52, "population": 58901 },
            { "state": "Andhra Pradesh", "code": "AP084", "name": "Nellimarla Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 19.89, "population": 24673 },
            { "state": "Andhra Pradesh", "code": "AP087", "name": "Salur Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 29, "area": 0, "population": 49500 },
        
        ]
    },
    AR: {
        "state": "Arunachal Pradesh",
        "ulbs": [

        ]
    },
    AS: {
        "state": "Assam",
        "ulbs": [   
            { "state": "Assam", "code": "AS001", "name": "Barpeta Municipal Board", "natureOfUlb": "Municipal Board", "type": "Municipality", "wards": 0, "area": 2645.0, "population": 1693622 },
            { "state": "Assam", "code": "AS002", "name": "Dhubri Municipal Board", "natureOfUlb": "Municipal Board", "type": "Municipality", "wards": 16, "area": 0, "population": 66234 },
            { "state": "Assam", "code": "AS004", "name": "Hojai Municipal Board", "natureOfUlb": "Municipal Board", "type": "Municipality", "wards": 19, "area": 0, "population": 36638 },
            { "state": "Assam", "code": "AS006", "name": "Narayanpur Town Committee", "natureOfUlb": "Town Committee", "type": "Town Panchayat", "wards": 6, "area": 7.0, "population": 6001 },
        ]
    },
    BR: {
        "state": "Bihar",
        "ulbs": [
           
        ]
    },
    CH: {
        "state": "Chandigarh (UT)",
        "ulbs": [
        ]
    },
    CG: {
        "state": "Chhattisgarh",
        "ulbs": [
            { "state": "Chhattisgarh", "code": "CG001", "name": "Ambagarh Chowki Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 43, "area": 0, "population": 121071 },
            { "state": "Chhattisgarh", "code": "CG002", "name": "Bhilai Nagar Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 67, "area": 0, "population": 627734 },
            { "state": "Chhattisgarh", "code": "CG003", "name": "Bilaspur Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 55, "area": 30, "population": 365579 },
            { "state": "Chhattisgarh", "code": "CG004", "name": "Jagdalpur Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 40, "area": 552, "population": 125463 },
            { "state": "Chhattisgarh", "code": "CG005", "name": "Korba Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 58, "area": 11883, "population": 365253 },
            { "state": "Chhattisgarh", "code": "CG006", "name": "Raipur Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 70, "area": 2892, "population": 1027264 },
            { "state": "Chhattisgarh", "code": "CG007", "name": "Raigarh Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 48, "area": 2892, "population": 2160876 },
            { "state": "Chhattisgarh", "code": "CG008", "name": "Rajnandgaon Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 0, "area": 0, "population": 143727 },
            
        ]
    },
    DH: {
        "state": "Dadra and Nagar Haveli (UT)",
        "ulbs": [
        ]
    },
    DD: {
        "state": "Daman and Diu (UT)",
        "ulbs": [
        ]
    },
    DL: {
        "state": "Delhi (NCT)",
        "ulbs": [
        ]
    },
    GA: {
        "state": "Goa",
        "ulbs": [
           
        ]
    },
    GJ: {
        "state": "Gujarat",
        "ulbs": [
            { "state": "Gujarat", "code": "GJ001", "name": "Surendranagar Dudhrej Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 14, "area": 10489, "population": 177851 },

        ]
    },
    HR: {
        "state": "Haryana",
        "ulbs": [
            { "state": "Haryana", "code": "HR001", "name": "Gorakhpur Nagar Nigam", "natureOfUlb": "Nagar Nigam", "type": "Nagar Nigam", "wards": 19, "area": 3483, "population": 4440895 },
            
        ]
    },
    HP: {
        "state": "Himachal Pradesh",
        "ulbs": [
           
        ]
    },
    JK: {
        "state": "Jammu and Kashmir",
        "ulbs": [
           
        ]
    },
    JH: {
        "state": "Jharkhand",
        "ulbs": [
            { "state": "Jharkand", "code": "JH001", "name": "Adityapur Nagar Parishad", "natureOfUlb": "Nagar Parishad", "type": "Town Panchayat", "wards": 32, "area": 4, "population": 174355 },
            { "state": "Jharkand", "code": "JH002", "name": "Basukinath Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 10, "area": 17, "population": 17123 },
            { "state": "Jharkand", "code": "JH003", "name": "Bishrampur Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 16, "area": 0, "population": 42925 },
            { "state": "Jharkand", "code": "JH004", "name": "Bundu Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 12, "area": 1, "population": 21054 },
            { "state": "Jharkand", "code": "JH005", "name": "Chaibasa Nagar Parishad", "natureOfUlb": "Nagar Parishad", "type": "Town Panchayat", "wards": 26, "area": 5, "population": 69565 },
            { "state": "Jharkand", "code": "JH006", "name": "Chakardharpur Nagar Parishad", "natureOfUlb": "Nagar Parishad", "type": "Town Panchayat", "wards": 24, "area": 10, "population": 56531 },
            { "state": "Jharkand", "code": "JH007", "name": "Chakulia Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 10, "area": 15, "population": 16306 },
            { "state": "Jharkand", "code": "JH008", "name": "Chas Nagar Parishad", "natureOfUlb": "Nagar Parishad", "type": "Town Panchayat", "wards": 30, "area": 30, "population": 141640 },
            { "state": "Jharkand", "code": "JH009", "name": "Chatra Nagar Parishad", "natureOfUlb": "Nagar Parishad", "type": "Town Panchayat", "wards": 22, "area": 10, "population": 49985 },
            { "state": "Jharkand", "code": "JH010", "name": "Chirkunda Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 20, "area": 6, "population": 45508 },
            { "state": "Jharkand", "code": "JH011", "name": "Deoghar Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 35, "area": 120, "population": 203123 },
            { "state": "Jharkand", "code": "JH012", "name": "Dhanbad Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 55, "area": 275, "population": 1162472 },
            { "state": "Jharkand", "code": "JH013", "name": "Dumka Nagar Parishad", "natureOfUlb": "Nagar Parishad", "type": "Town Panchayat", "wards": 23, "area": 6, "population": 47584 },
            { "state": "Jharkand", "code": "JH014", "name": "Garhwa Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 20, "area": 1, "population": 46059 },
            { "state": "Jharkand", "code": "JH015", "name": "Giridih Nagar Parishad", "natureOfUlb": "Nagar Parishad", "type": "Town Panchayat", "wards": 30, "area": 8, "population": 114533 },
            { "state": "Jharkand", "code": "JH016", "name": "Godda Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 20, "area": 0, "population": 48480 },
            { "state": "Jharkand", "code": "JH017", "name": "Gumla Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 22, "area": 1, "population": 51305 },
            { "state": "Jharkand", "code": "JH018", "name": "Hazaribag Nagar Parishad", "natureOfUlb": "Nagar Parishad", "type": "Town Panchayat", "wards": 32, "area": 1, "population": 142489 },
            { "state": "Jharkand", "code": "JH019", "name": "Hussainabad Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 13, "area": 9, "population": 29241 },
            { "state": "Jharkand", "code": "JH020", "name": "Jamshedpur Notified Area Council", "natureOfUlb": "Notified Area Council", "type": "Town Panchayat", "wards": 241, "area": 0, "population": 677350 },
            { "state": "Jharkand", "code": "JH021", "name": "Jamtara Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 14, "area": 1, "population": 29415 },
            { "state": "Jharkand", "code": "JH022", "name": "Jhumri Tilaiya Nagar Parishad", "natureOfUlb": "Nagar Parishad", "type": "Town Panchayat", "wards": 28, "area": 0, "population": 87867 },
            { "state": "Jharkand", "code": "JH023", "name": "Jugsalai Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 14, "area": 1, "population": 49660 },
            { "state": "Jharkand", "code": "JH024", "name": "Khunti Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 16, "area": 2, "population": 36390 },
            { "state": "Jharkand", "code": "JH025", "name": "Kodarma Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 15, "area": 2, "population": 24633 },
            { "state": "Jharkand", "code": "JH026", "name": "Latehar Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 12, "area": 1, "population": 26981 },
            { "state": "Jharkand", "code": "JH027", "name": "Lohardaga Nagar Parishad", "natureOfUlb": "Nagar Parishad", "type": "Town Panchayat", "wards": 23, "area": 3, "population": 57411 },
            { "state": "Jharkand", "code": "JH028", "name": "Madhupur Nagar Parishad", "natureOfUlb": "Nagar Parishad", "type": "Town Panchayat", "wards": 23, "area": 1, "population": 55238 },
            { "state": "Jharkand", "code": "JH029", "name": "Mango Notified Area Council", "natureOfUlb": "Notified Area Council", "type": "Town Panchayat", "wards": 53, "area": 18, "population": 224002 },
            { "state": "Jharkand", "code": "JH030", "name": "Majhion Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 10, "area": 0, "population": 18349 },
            { "state": "Jharkand", "code": "JH031", "name": "Medininagar (Daltonganj) Nagar Parishad", "natureOfUlb": "Nagar Parishad", "type": "Town Panchayat", "wards": 26, "area": 15, "population": 78396 },
            { "state": "Jharkand", "code": "JH032", "name": "Mihijam Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 18, "area": 1, "population": 40463 },
            { "state": "Jharkand", "code": "JH033", "name": "Pakaur Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 19, "area": 0, "population": 45840 },
            { "state": "Jharkand", "code": "JH034", "name": "Phusro Nagar Parishad", "natureOfUlb": "Nagar Parishad", "type": "Town Panchayat", "wards": 28, "area": 0, "population": 89178 },
            { "state": "Jharkand", "code": "JH035", "name": "Rajmahal Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 14, "area": 4, "population": 22514 },
            { "state": "Jharkand", "code": "JH036", "name": "Ranchi Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 55, "area": 0, "population": 1073427 },
            { "state": "Jharkand", "code": "JH037", "name": "Sahibganj Nagar Parishad", "natureOfUlb": "Nagar Parishad", "type": "Town Panchayat", "wards": 28, "area": 1, "population": 88214 },
            { "state": "Jharkand", "code": "JH038", "name": "Seraikela Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 10, "area": 0, "population": 14252 },
            { "state": "Jharkand", "code": "JH039", "name": "Simdega Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 18, "area": 4, "population": 42944 },
            
        ]
    },
    KA: {
        "state": "Karnataka",
        "ulbs": [ 
            { "state": "Karnataka", "code": "KA001", "name": "Afzalpur Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 20, "area": 6.25, "population": 27088 },
            { "state": "Karnataka", "code": "KA003", "name": "Aland Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 10.5, "population": 42371 },
            { "state": "Karnataka", "code": "KA004", "name": "Alur Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 11, "area": 1.50, "population": 6541 },
            { "state": "Karnataka", "code": "KA005", "name": "Anekal Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 14.35, "population": 44260 },
            { "state": "Karnataka", "code": "KA006", "name": "Ankola Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 23, "area": 10.0, "population": 22249 },
            { "state": "Karnataka", "code": "KA007", "name": "Arsikere Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 27, "area": 8.00, "population": 53216 },
            { "state": "Karnataka", "code": "KA008", "name": "Attibele Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 4.47, "population": 20532 },
            { "state": "Karnataka", "code": "KA009", "name": "Aurad Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 14, "area": 14.0, "population": 19849 },
            { "state": "Karnataka", "code": "KA010", "name": "Badami Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 6.00, "population": 30943 },
            { "state": "Karnataka", "code": "KA011", "name": "Bhadravathi City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 35, "area": 67.00, "population": 151102 },
            { "state": "Karnataka", "code": "KA012", "name": "Bagepalli Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 5.11, "population": 27011 },
            { "state": "Karnataka", "code": "KA013", "name": "Bail Hongal Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 27, "area": 15.29, "population": 49182 },
            { "state": "Karnataka", "code": "KA014", "name": "Bhalki Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 12.05, "population": 40333 },
            { "state": "Karnataka", "code": "KA015", "name": "Bellary Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 35, "area": 81.95, "population": 410445 },
            { "state": "Karnataka", "code": "KA016", "name": "Bangarapet Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 6.32, "population": 44849 },
            { "state": "Karnataka", "code": "KA017", "name": "Bankapura Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 3.10, "population": 22529 },
            { "state": "Karnataka", "code": "KA018", "name": "Bannur Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 7.56, "population": 21896 },
            { "state": "Karnataka", "code": "KA019", "name": "Basavana Bagevadi Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 10.35, "population": 33198 },
            { "state": "Karnataka", "code": "KA020", "name": "Basavakalyan City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 31, "area": 32.00, "population": 69717 },
            { "state": "Karnataka", "code": "KA021", "name": "Bhatkal Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 6.32, "population": 32000 },
            { "state": "Karnataka", "code": "KA022", "name": "Bantval Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 27.05, "population": 40155 },
            { "state": "Karnataka", "code": "KA023", "name": "Beltangadi Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 11, "area": 8.87, "population": 7746 },
            { "state": "Karnataka", "code": "KA024", "name": "Belur Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 6.32, "population": 28754 },
            { "state": "Karnataka", "code": "KA025", "name": "Bidar City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 35, "area": 43.00, "population": 216020 },
            { "state": "Karnataka", "code": "KA026", "name": "Bilgi Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 18, "area": 4.4, "population": 17782 },
            { "state": "Karnataka", "code": "KA027", "name": "Byadgi Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 4.20, "population": 30014 },
            { "state": "Karnataka", "code": "KA029", "name": "Chadachana Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 16, "area": 7.50, "population": 17235 },
            { "state": "Karnataka", "code": "KA030", "name": "Challakere Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 31, "area": 5.92, "population": 55194 },
            { "state": "Karnataka", "code": "KA031", "name": "Chamarajanagar City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 31, "area": 18.75, "population": 69852 },
            { "state": "Karnataka", "code": "KA032", "name": "Channagiri Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 23, "area": 5.16, "population": 21313 },
            { "state": "Karnataka", "code": "KA033", "name": "Chikkaballapura City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 31, "area": 18.25, "population": 63652 },
            { "state": "Karnataka", "code": "KA034", "name": "Chikodi Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 8.29, "population": 38307 },
            { "state": "Karnataka", "code": "KA035", "name": "Chintamani City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 31, "area": 15.01, "population": 76068 },
            { "state": "Karnataka", "code": "KA036", "name": "Chitapur Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 17.45, "population": 31299 },
            { "state": "Karnataka", "code": "KA037", "name": "Channarayapatna Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 6.53, "population": 40440 },
            { "state": "Karnataka", "code": "KA038", "name": "Chikmagalur City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 35, "area": 7202.00, "population": 116802 },
            { "state": "Karnataka", "code": "KA039", "name": "Dandeli City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 31, "area": 14.50, "population": 52069 },
            { "state": "Karnataka", "code": "KA040", "name": "Davanagere Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 41, "area": 68.63, "population": 434971 },
            { "state": "Karnataka", "code": "KA041", "name": "Devadurga Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 7.46, "population": 28929 },
            { "state": "Karnataka", "code": "KA042", "name": "Devanahalli Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 16.00, "population": 28039 },
            { "state": "Karnataka", "code": "KA043", "name": "Dod Ballapur City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 31, "area": 18.00, "population": 93105 },
            { "state": "Karnataka", "code": "KA044", "name": "Gadag-Betigeri City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 35, "area": 54.56, "population": 172813 },
            { "state": "Karnataka", "code": "KA045", "name": "Gajendragarh Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 18.89, "population": 32359 },
            { "state": "Karnataka", "code": "KA046", "name": "Gangawati City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 31, "area": 19.50, "population": 105529 },
            { "state": "Karnataka", "code": "KA047", "name": "Gokak City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 31, "area": 0, "population": 79121 },
            { "state": "Karnataka", "code": "KA048", "name": "Gubbi Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 17, "area": 6.67, "population": 18475 },
            { "state": "Karnataka", "code": "KA049", "name": "Gudibanda Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 11, "area": 2.60, "population": 9441 },
            { "state": "Karnataka", "code": "KA050", "name": "Gundlupet Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 6.32, "population": 28754 },
            { "state": "Karnataka", "code": "KA051", "name": "Guledgudda Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 4.84, "population": 33382 },
            { "state": "Karnataka", "code": "KA052", "name": "Gurmatkal Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 23, "area": 3.50, "population": 20614 },
            { "state": "Karnataka", "code": "KA053", "name": "Haliyal Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 23, "area": 15.72, "population": 24238 },
            { "state": "Karnataka", "code": "KA054", "name": "Hangal Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 4.27, "population": 28159 },
            { "state": "Karnataka", "code": "KA055", "name": "Hanur Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 13, "area": 2.2, "population": 11066 },
            { "state": "Karnataka", "code": "KA056", "name": "Harapanahalli Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 27, "area": 8.59, "population": 47059 },
            { "state": "Karnataka", "code": "KA057", "name": "Haveri City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 31, "area": 29.75, "population": 67102 },
            { "state": "Karnataka", "code": "KA058", "name": "Heggadadevankote Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 13, "area": 6.32, "population": 14313 },
            { "state": "Karnataka", "code": "KA060", "name": "Hirekerur Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 16, "area": 5.00, "population": 19191 },
            { "state": "Karnataka", "code": "KA061", "name": "Hiriyur Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 27, "area": 29.13, "population": 56416 },
            { "state": "Karnataka", "code": "KA062", "name": "Holalkere Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 15, "area": 6.25, "population": 15783 },
            { "state": "Karnataka", "code": "KA063", "name": "Hole Narsipur Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 7.38, "population": 30080 },
            { "state": "Karnataka", "code": "KA064", "name": "Honnali Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 16, "area": 2.8, "population": 17928 },
            { "state": "Karnataka", "code": "KA065", "name": "Honavar Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 18, "area": 9.3, "population": 19109 },
            { "state": "Karnataka", "code": "KA066", "name": "Hoovinahadagali Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 19.84, "population": 27967 },
            { "state": "Karnataka", "code": "KA067", "name": "Hosanagara Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 11, "area": 7.25, "population": 5839 },
            { "state": "Karnataka", "code": "KA068", "name": "Hosdurga Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 16.34, "population": 28370 },
            { "state": "Karnataka", "code": "KA069", "name": "Hubli-Dharwad Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 67, "area": 202.30, "population": 943788 },
            { "state": "Karnataka", "code": "KA070", "name": "Hukeri Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 19, "area": 5.5, "population": 25014 },
            { "state": "Karnataka", "code": "KA071", "name": "Homnabad Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 6.32, "population": 28754 },
            { "state": "Karnataka", "code": "KA072", "name": "Hungund Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 23, "area": 0, "population": 20877 },
            { "state": "Karnataka", "code": "KA073", "name": "Hunsur Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 31, "area": 11.76, "population": 50865 },
            { "state": "Karnataka", "code": "KA074", "name": "Indi Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 10.50, "population": 38217 },
            { "state": "Karnataka", "code": "KA075", "name": "Jagalur Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 15, "area": 16.58, "population": 17257 },
            { "state": "Karnataka", "code": "KA076", "name": "Jevargi Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 20, "area": 5.2, "population": 25661 },
            { "state": "Karnataka", "code": "KA077", "name": "Jog Kargal Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 11, "area": 44.43, "population": 10847 },
            { "state": "Karnataka", "code": "KA078", "name": "Krnagar Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 8.04, "population": 35805 },
            { "state": "Karnataka", "code": "KA079", "name": "Krpet, Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 4.26, "population": 25946 },
            { "state": "Karnataka", "code": "KA080", "name": "Kalghatgi Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 13, "area": 6.32, "population": 16719 },
            { "state": "Karnataka", "code": "KA081", "name": "Kamalapuram Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 20, "area": 39.60, "population": 25552 },
            { "state": "Karnataka", "code": "KA082", "name": "Kampli Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 26.23, "population": 39307 },
            { "state": "Karnataka", "code": "KA083", "name": "Kanakapura Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 23.06, "population": 27090 },
            { "state": "Karnataka", "code": "KA084", "name": "Karkal Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 23.06, "population": 27090 },
            { "state": "Karnataka", "code": "KA085", "name": "Karwar City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 31, "area": 27.15, "population": 63755 },
            { "state": "Karnataka", "code": "KA086", "name": "Kerur Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 16, "area": 3.5, "population": 19731 },
            { "state": "Karnataka", "code": "KA087", "name": "Khanapur Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 16, "area": 3.54, "population": 19309 },
            { "state": "Karnataka", "code": "KA088", "name": "Kollegal City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 31, "area": 27.70, "population": 57149 },
            { "state": "Karnataka", "code": "KA089", "name": "Konnur Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 23, "area": 10.1, "population": 27474 },
            { "state": "Karnataka", "code": "KA090", "name": "Koratagere Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 14, "area": 4.32, "population": 15263 },
            { "state": "Karnataka", "code": "KA091", "name": "Kotturu Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 20, "area": 37.65, "population": 26289 },
            { "state": "Karnataka", "code": "KA092", "name": "Kudchi Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 23, "area": 4.0, "population": 23154 },
            { "state": "Karnataka", "code": "KA093", "name": "Kudligi Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 20, "area": 32.16, "population": 26680 },
            { "state": "Karnataka", "code": "KA094", "name": "Kumta Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 15.34, "population": 29266 },
            { "state": "Karnataka", "code": "KA095", "name": "Kundapura Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 14.01, "population": 30450 },
            { "state": "Karnataka", "code": "KA096", "name": "Kundgol Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 15, "area": 2.8, "population": 18719 },
            { "state": "Karnataka", "code": "KA097", "name": "Kunigal Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 8.00, "population": 34155 },
            { "state": "Karnataka", "code": "KA098", "name": "Kushalnagar Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 13, "area": 18.50, "population": 15326 },
            { "state": "Karnataka", "code": "KA099", "name": "Kushtagi Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 15.00, "population": 24878 },
            { "state": "Karnataka", "code": "KA100", "name": "Lakshmeshwar Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 12.00, "population": 36754 },
            { "state": "Karnataka", "code": "KA101", "name": "Lingsugur Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 7.47, "population": 34932 },
            { "state": "Karnataka", "code": "KA102", "name": "Maddur Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 6.32, "population": 28754 },
            { "state": "Karnataka", "code": "KA103", "name": "Madhugiri Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 8.81, "population": 19152 },
            { "state": "Karnataka", "code": "KA104", "name": "Magadi Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 5.59, "population": 27605 },
            { "state": "Karnataka", "code": "KA105", "name": "Mahalingpur Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 12.50, "population": 36055 },
            { "state": "Karnataka", "code": "KA107", "name": "Malavalli Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 10.36, "population": 37527 },
            { "state": "Karnataka", "code": "KA108", "name": "Malur Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 7.12, "population": 40062 },
            { "state": "Karnataka", "code": "KA109", "name": "Mandya City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 35, "area": 17.03, "population": 137735 },
            { "state": "Karnataka", "code": "KA110", "name": "Manvi Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 17.70, "population": 46465 },
            { "state": "Karnataka", "code": "KA111", "name": "Molakalmuru Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 15, "area": 13.00, "population": 15797 },
            { "state": "Karnataka", "code": "KA112", "name": "Mudbidri Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 39.62, "population": 29431 },
            { "state": "Karnataka", "code": "KA113", "name": "Mudgal Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 23, "area": 7.2, "population": 22.731 },
            { "state": "Karnataka", "code": "KA114", "name": "Mundgod Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 16, "area": 11.99, "population": 18886 },
            { "state": "Karnataka", "code": "KA115", "name": "Mudalgi Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 11.98, "population": 29128 },
            { "state": "Karnataka", "code": "KA116", "name": "Mudhol Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 31, "area": 8.49, "population": 52199 },
            { "state": "Karnataka", "code": "KA117", "name": "Mudigere Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 11, "area": 4.20, "population": 9667 },
            { "state": "Karnataka", "code": "KA118", "name": "Mulababilu Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 27, "area": 13.50, "population": 57258 },
            { "state": "Karnataka", "code": "KA119", "name": "Mulgund Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 19, "area": 16.30, "population": 18763 },
            { "state": "Karnataka", "code": "KA120", "name": "Mulki Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 23, "area": 11.00, "population": 28754 },
            { "state": "Karnataka", "code": "KA121", "name": "Mundargi Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 8.50, "population": 24919 },
            { "state": "Karnataka", "code": "KA122", "name": "Mysore Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 65, "area": 128.42, "population": 920550 },
            { "state": "Karnataka", "code": "KA123", "name": "Nagamangala Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 16, "area": 2.50, "population": 17763 },
            { "state": "Karnataka", "code": "KA125", "name": "Nanjangud Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 27, "area": 11.29, "population": 50598 },
            { "state": "Karnataka", "code": "KA126", "name": "Narasimharajapura Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 11, "area": 5.00, "population": 7458 },
            { "state": "Karnataka", "code": "KA127", "name": "Naregal Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 17, "area": 22.50, "population": 16724 },
            { "state": "Karnataka", "code": "KA128", "name": "Nargund Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 19.02, "population": 36921 },
            { "state": "Karnataka", "code": "KA129", "name": "Navalgund Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 48.60, "population": 24613 },
            { "state": "Karnataka", "code": "KA130", "name": "Nelamangala Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 3.29, "population": 37232 },
            { "state": "Karnataka", "code": "KA131", "name": "Nipani City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 35, "area": 0, "population": 50000 },
            { "state": "Karnataka", "code": "KA132", "name": "Pandavapura Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 18, "area": 2.46, "population": 20399 },
            { "state": "Karnataka", "code": "KA133", "name": "Pavagada Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 6.32, "population": 28486 },
            { "state": "Karnataka", "code": "KA134", "name": "Piriyapatna Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 23, "area": 6.32, "population": 28754 },
            { "state": "Karnataka", "code": "KA135", "name": "Puttur Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 27, "area": 32.23, "population": 53061 },
            { "state": "Karnataka", "code": "KA136", "name": "Rabkavi Banhatti City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 31, "area": 25.52, "population": 77004 },
            { "state": "Karnataka", "code": "KA137", "name": "Robertson Pet City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 38, "area": 58.12, "population": 143233 },
            { "state": "Karnataka", "code": "KA138", "name": "Raybag Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 15, "area": 4.0, "population": 18736 },
            { "state": "Karnataka", "code": "KA139", "name": "Raichur City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 35, "area": 60.00, "population": 234073 },
            { "state": "Karnataka", "code": "KA140", "name": "Ramdurg Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 27, "area": 5.01, "population": 40043 },
            { "state": "Karnataka", "code": "KA141", "name": "Ramanagara City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 31, "area": 14.53, "population": 95167 },
            { "state": "Karnataka", "code": "KA142", "name": "Ranibennur City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 31, "area": 41.32, "population": 106406 },
            { "state": "Karnataka", "code": "KA143", "name": "Ron Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 10.89, "population": 24748 },
            { "state": "Karnataka", "code": "KA144", "name": "Sadalgi Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 20, "area": 12.21, "population": 23790 },
            { "state": "Karnataka", "code": "KA145", "name": "Sagar City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 31, "area": 19.71, "population": 54550 },
            { "state": "Karnataka", "code": "KA146", "name": "Sakleshpur Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 4.50, "population": 23352 },
            { "state": "Karnataka", "code": "KA147", "name": "Saligram Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 14, "area": 14.69, "population": 15123 },
            { "state": "Karnataka", "code": "KA148", "name": "Sandur Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 22.13, "population": 37441 },
            { "state": "Karnataka", "code": "KA149", "name": "Sankeshwar Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 7.15, "population": 34637 },
            { "state": "Karnataka", "code": "KA150", "name": "Saragur Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 12, "area": 1.3, "population": 11425 },
            { "state": "Karnataka", "code": "KA151", "name": "Savanur Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 5.49, "population": 40567 },
            { "state": "Karnataka", "code": "KA152", "name": "Shahabad City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 27, "area": 7.80, "population": 47582 },
            { "state": "Karnataka", "code": "KA153", "name": "Shiggaon Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 2.04, "population": 28207 },
            { "state": "Karnataka", "code": "KA155", "name": "Shirhatti Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 19, "area": 11.76, "population": 17610 },
            { "state": "Karnataka", "code": "KA156", "name": "Shimoga City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 35, "area": 70.01, "population": 322650 },
            { "state": "Karnataka", "code": "KA156", "name": "Shimoga City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 35, "area": 70.01, "population": 322650 },
            { "state": "Karnataka", "code": "KA157", "name": "Shorapur Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 27, "area": 18.53, "population": 51378 },
            { "state": "Karnataka", "code": "KA158", "name": "Siddapur Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 14, "area": 18.51, "population": 14204 },
            { "state": "Karnataka", "code": "KA159", "name": "Sidlaghatta Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 27, "area": 5.00, "population": 51159 },
            { "state": "Karnataka", "code": "KA160", "name": "Sindgi Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 8.25, "population": 37213 },
            { "state": "Karnataka", "code": "KA161", "name": "Sira City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 31, "area": 15.3, "population": 57740 },
            { "state": "Karnataka", "code": "KA162", "name": "Siruguppa City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 27, "area": 31.14, "population": 52492 },
            { "state": "Karnataka", "code": "KA163", "name": "Sirsi City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 31, "area": 11.33, "population": 62882 },
            { "state": "Karnataka", "code": "KA164", "name": "Somvarpet Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 11, "area": 8.83, "population": 6729 },
            { "state": "Karnataka", "code": "KA165", "name": "Sorab Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 11, "area": 3.25, "population": 11332 },
            { "state": "Karnataka", "code": "KA166", "name": "Saundatti-Yellamma Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 16.00, "population": 41215 },
            { "state": "Karnataka", "code": "KA167", "name": "Shiralakoppa Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 15, "area": 2.25, "population": 16864 },
            { "state": "Karnataka", "code": "KA168", "name": "Srinivaspur Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 5.00, "population": 26981 },
            { "state": "Karnataka", "code": "KA169", "name": "Shrirangapattana Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 8.60, "population": 25061 },
            { "state": "Karnataka", "code": "KA170", "name": "Sulya Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 18, "area": 17.1, "population": 19958 },
            { "state": "Karnataka", "code": "KA171", "name": "Tirumakudal Narsipur Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 23, "area": 3.67, "population": 31498 },
            { "state": "Karnataka", "code": "KA172", "name": "Talikota Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 11.46, "population": 31693 },
            { "state": "Karnataka", "code": "KA173", "name": "Tarikere Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 15.01, "population": 35943 },
            { "state": "Karnataka", "code": "KA174", "name": "Tekkalakote Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 20, "area": 43.16, "population": 26224 },
            { "state": "Karnataka", "code": "KA175", "name": "Terdal Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 12.50, "population": 26088 },
            { "state": "Karnataka", "code": "KA176", "name": "Tirthahalli Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 15, "area": 5.91, "population": 14528 },
            { "state": "Karnataka", "code": "KA177", "name": "Tiptur City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 31, "area": 11.60, "population": 59543 },
            { "state": "Karnataka", "code": "KA178", "name": "Udupi City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 35, "area": 69.28, "population": 125350 },
            { "state": "Karnataka", "code": "KA179", "name": "Ullal Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 27, "area": 11.05, "population": 53773 },
            { "state": "Karnataka", "code": "KA180", "name": "Vijayapura Town Municipal Council", "natureOfUlb": "Town Municipal Council", "type": "Town Panchayat", "wards": 23, "area": 16.00, "population": 34866 },
            { "state": "Karnataka", "code": "KA181", "name": "Yadgir City Municipal Council", "natureOfUlb": "City Municipal Council", "type": "Municipality", "wards": 31, "area": 14.95, "population": 74294 },
            { "state": "Karnataka", "code": "KA182", "name": "Yelbarga Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 15, "area": 6.50, "population": 17400 },
            { "state": "Karnataka", "code": "KA183", "name": "Yellapur Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 18, "area": 64.00, "population": 20452 },
            { "state": "Karnataka", "code": "KA184", "name": "Yelandur Town Panchayat", "natureOfUlb": "Town Panchayat", "type": "Town Panchayat", "wards": 11, "area": 0.72, "population": 8779 },
        
        ]
    },
    KL: {
        "state": "Kerala",
        "ulbs": [
            { "state": "Kerala", "code": "KL001", "name": "Attingal Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 31, "area": 14.18, "population": 35648 },
            { "state": "Kerala", "code": "KL002", "name": "Chalakudy Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 0, "area": 0, "population": 0 },
            { "state": "Kerala", "code": "KL003", "name": "Chittur-Thathamangalam Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 29, "area": 14.71, "population": 130736 },
            { "state": "Kerala", "code": "KL004", "name": "Kayamkulam Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 44, "area": 21.7, "population": 65299 },
            { "state": "Kerala", "code": "KL006", "name": "Kottakkal Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 32, "area": 20.43, "population": 0 },
            { "state": "Kerala", "code": "KL007", "name": "Neelaswaram Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 0, "area": 0, "population": 0 },
            { "state": "Kerala", "code": "KL008", "name": "Payyannur Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 44, "area": 54.6, "population": 68711 },
            { "state": "Kerala", "code": "KL009", "name": "Perumbavoor Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 27, "area": 13.5, "population": 26550 },
            { "state": "Kerala", "code": "KL011", "name": "Thalassery Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 52, "area": 23.9, "population": 99386 },
            { "state": "Kerala", "code": "KL012", "name": "Alappuzha Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 52, "area": 1415, "population": 2127789 },
            { "state": "Kerala", "code": "KL013", "name": "Kozhikode Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 75, "area": 2345.0, "population": 3086293 },
            { "state": "Kerala", "code": "KL014", "name": "Palakkad Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 52, "area": 26.6, "population": 44613 },
            { "state": "Kerala", "code": "KL015", "name": "Thiruvananthapuram Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 100, "area": 214.9, "population": 957730 },
        ]
    },
    LD: {
        "state": "Lakshadweep (UT)",
        "ulbs": [
            
        ]
    },
    MP: {
        "state": "Madhya Pradesh",
        "ulbs": [
            { "state": "Madhya Pradesh", "code": "MP001", "name": "Chhindwara Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 39, "area": 11815, "population": 175052 },
            { "state": "Madhya Pradesh", "code": "MP002", "name": "Dabra Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 24, "area": 4.00, "population": 61277 },
            { "state": "Madhya Pradesh", "code": "MP003", "name": "Ujjain Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 54, "area": 0, "population": 515215 },
        ]
    },
    MH: {
        "state": "Maharashtra",
        "ulbs": [
            { "code": "MH002", "name": "Jalgaon Municipal Corporation", "type": "City Municipal Corporation", "wards": "4", "area": "68.78", "population": "46762" },
            
            { "code": "MH005", "name": "Achalpur Muncipal Council", "type": "Municipal Council", "wards": "38", "area": "17", "population": "112311" },
            { "code": "MH006", "name": "Ahmadpur Municipal Council", "type": "Municipal Council", "wards": "20", "area": "18", "population": "43936" },
            { "code": "MH007", "name": "Akkalkot Municipal Council", "type": "Municipal Council", "wards": "21", "area": "4", "population": "40103" },
            { "code": "MH009", "name": "Alandi Municipal Council", "type": "Municiapl Council", "wards": "17", "area": "6.84", "population": "28645" },
            { "code": "MH010", "name": "Alibaug Municipal Council", "type": "Municipal Council", "wards": "17", "area": "2", "population": "2634200" },
            { "code": "MH011", "name": "Amalner Municipal Council", "type": "Municipal Council", "wards": "33", "area": "16", "population": "95994" },
            { "code": "MH012", "name": "Ambad Municipal Council", "type": "Municipal Council", "wards": "17", "area": "12", "population": "31553" },
            { "code": "MH013", "name": "Ambajogai Municipal Council", "type": "Municiapl Council", "wards": "28", "area": "10", "population": "73975" },
            { "code": "MH015", "name": "Ambarnath Municipal Council", "type": "Municipal Council", "wards": "50", "area": "38", "population": "253475" },
            { "code": "MH016", "name": "Anjangaon Muncipal Council", "type": "Municipal Council", "wards": "23", "area": "3", "population": "56380" },
            
            { "code": "MH017", "name": "Ardhapur Municipal Council", "type": "Municipal Council", "wards": "0", "area": "0", "population": "0" },
            { "code": "MH018", "name": "Arni Municipal Council", "type": "Municipal Council", "wards": "0", "area": "0", "population": "27809" },
            { "code": "MH019", "name": "Arvi Municipal Council", "type": "Municiapl Council", "wards": "23", "area": "7", "population": "42822" },
            { "code": "MH020", "name": "Ashta Municipal Council", "type": "Municiapl Council", "wards": "19", "area": "84", "population": "37105" },
            { "code": "MH021", "name": "Ballarpur Municipal Council", "type": "Municiapl Council", "wards": "32", "area": "0", "population": "2194262" },
            { "code": "MH022", "name": "Baramati Municipal Council", "type": "Municiapl Council", "wards": "25", "area": "4.35", "population": "54415" },
            { "code": "MH023", "name": "Barshi Municipal Council", "type": "Municiapl Council", "wards": "38", "area": "36", "population": "118722" },
            { "code": "MH024", "name": "Beed Municipal Council", "type": "Municipal Council", "wards": "0", "area": "0", "population": "146709" },
            { "code": "MH025", "name": "Bhadgaon Municipal Council", "type": "Municipal Council", "wards": "18", "area": "48", "population": "37214" },
            { "code": "MH026", "name": "Bhadrawati Municipal Council", "type": "Municiapl Council", "wards": "26", "area": "36", "population": "3356" },
            
            { "code": "MH027", "name": "Bhagur Municipal Council", "type": "Municipal Council", "wards": "17", "area": "0", "population": "12353" },
            { "code": "MH028", "name": "Bhandara Municipal Council", "type": "Municiapl Council", "wards": "32", "area": "17", "population": "91845" },
            { "code": "MH029", "name": "Bhokar Municipal Council", "type": "Municipal Council", "wards": "17", "area": "20", "population": "32899" },
            { "code": "MH030", "name": "Bhoom Municipal Council", "type": "Municipal Council", "wards": "0", "area": "0", "population": "0" },
            { "code": "MH031", "name": "Bhor Municipal Council", "type": "Municiapl Council", "wards": "17", "area": "8.36", "population": "18453" },
            { "code": "MH032", "name": "Bhusawal Municpal Council", "type": "Municipal Council", "wards": "47", "area": "13", "population": "187421" },
            { "code": "MH033", "name": "Biloli Municipal Council", "type": "Municipal Council", "wards": "17", "area": "20", "population": "14923" },
            { "code": "MH034", "name": "Bramhapuri Muncipal Council", "type": "Municipal Council", "wards": "19", "area": "22", "population": "36025" },
            { "code": "MH036", "name": "Buldhana Muncipal Council", "type": "Municipal Council", "wards": "27", "area": "0", "population": "67431" },
            { "code": "MH037", "name": "Chalisgaon Municipal Council", "type": "Municipal Council", "wards": "33", "area": "19", "population": "97551" },
            
            { "code": "MH038", "name": "Chandur Bazar Muncipal Council", "type": "Municipal Council", "wards": "17", "area": "2", "population": "18759" },
            { "code": "MH039", "name": "Chandur Railway Muncipal Council", "type": "Municipal Council", "wards": "17", "area": "3", "population": "19776" },
            { "code": "MH040", "name": "Chikhaldara Muncipal Council", "type": "Municipal Council", "wards": "17", "area": "4", "population": "5158" },
            { "code": "MH041", "name": "Chikhli Muncipal Council", "type": "Municipal Council", "wards": "24", "area": "8", "population": "57889" },
            { "code": "MH042", "name": "Chiplun Municipal Council", "type": "Municipal Council", "wards": "24", "area": "15", "population": "55139" },
            { "code": "MH043", "name": "Chopda Municipal Council", "type": "Municipal Council", "wards": "27", "area": "0", "population": "72783" },
            { "code": "MH044", "name": "Dahanu Municipal Council", "type": "Municipal Council", "wards": "23", "area": "18", "population": "50287" },
            { "code": "MH045", "name": "Dapoli Municipal Council", "type": "Municipal Council", "wards": "17", "area": "0", "population": "15713" },
            { "code": "MH046", "name": "Darwah Muncipal Council", "type": "Municipal Council", "wards": "17", "area": "2", "population": "25791" },
            { "code": "MH047", "name": "Daryapur Muncipal Council", "type": "Municipal Council", "wards": "20", "area": "4", "population": "36463" },
            
            { "code": "MH048", "name": "Daund Municipal Council", "type": "Municiapl Council", "wards": "23", "area": "6.23", "population": "49450" },
            { "code": "MH049", "name": "Deolali Municipal Council", "type": "Municipal Council", "wards": "18", "area": "44", "population": "30997" },
            { "code": "MH050", "name": "Deoli Municipal Council", "type": "Municiapl Council", "wards": "18", "area": "0", "population": "1300774" },
            { "code": "MH051", "name": "Deulgaonraja Muncipal Council", "type": "Municipal Council", "wards": "17", "area": "8", "population": "30827" },
            { "code": "MH052", "name": "Derukh Municipal Council", "type": "Municipal Council", "wards": "0", "area": "0", "population": "0" },
            { "code": "MH053", "name": "Dhamangaon Muncipal Council", "type": "Municipal Council", "wards": "17", "area": "3", "population": "21059" },
            { "code": "MH054", "name": "Dharangaon Municipal Council", "type": "Municipal Council", "wards": "19", "area": "5", "population": "35375" },
            { "code": "MH055", "name": "Dharmabad Municipal Council", "type": "Municipal Council", "wards": "18", "area": "13", "population": "33741" },
            { "code": "MH056", "name": "Dondaicha Municipal Council", "type": "Municipal Council", "wards": "23", "area": "33", "population": "46767" },
            { "code": "MH058", "name": "Erandol Municipal Council", "type": "Municipal Council", "wards": "18", "area": "0", "population": "31071" },
            
            { "code": "MH059", "name": "Faizpur Municipal Council", "type": "Municipal Council", "wards": "17", "area": "4", "population": "26602" },
            { "code": "MH060", "name": "Gad Chandur Municipal Council", "type": "Municiapl Council", "wards": "0", "area": "0", "population": "0" },
            { "code": "MH061", "name": "Gangakhed Municipal Council", "type": "Municipal Council", "wards": "23", "area": "10", "population": "49891" },
            { "code": "MH062", "name": "Gangapur Municipal Council", "type": "Municipal Council", "wards": "17", "area": "22", "population": "27745" },
            { "code": "MH063", "name": "Georai Municipal Council", "type": "Municipal Council", "wards": "18", "area": "4", "population": "33562" },
            { "code": "MH064", "name": "Gadchiroli Municipal Council", "type": "Municiapl Council", "wards": "23", "area": "0", "population": "1072942" },
            { "code": "MH066", "name": "Gondia Municipal Council", "type": "Municiapl Council", "wards": "0", "area": "0", "population": "0" },
            { "code": "MH067", "name": "Guhagar Municipal Council", "type": "Municipal Council", "wards": "0", "area": "25", "population": "0" },
            { "code": "MH069", "name": "Hinganghat Municipal Council", "type": "Municiapl Council", "wards": "33", "area": "13", "population": "101805" },
            { "code": "MH071", "name": "Igatpuri Municipal Council", "type": "Municipal Council", "wards": "19", "area": "29", "population": "30989" },
            
            { "code": "MH072", "name": "Indapur Municipal Council", "type": "Municipal Council", "wards": "17", "area": "5.62", "population": "25515" },
            { "code": "MH073", "name": "Islampur Municipal Council", "type": "Municipal Council", "wards": "26", "area": "11.4", "population": "67391" },
            { "code": "MH074", "name": "Jalgaon Muncipal Council", "type": "Municipal Council", "wards": "69", "area": "68.78", "population": "460228" },
            { "code": "MH076", "name": "Jamner Municipal Council", "type": "Municipal Council", "wards": "20", "area": "41", "population": "46762" },
            { "code": "MH077", "name": "Jawhar Municipal Council", "type": "Municipal Council", "wards": "26", "area": "0", "population": "12040" },
            { "code": "MH079", "name": "Jejuri Municipal Council", "type": "Municipal Council", "wards": "17", "area": "6.68", "population": "14515" },
            { "code": "MH081", "name": "Junnar Municipal Council", "type": "Municipal Council", "wards": "17", "area": "2.65", "population": "25315" },
            { "code": "MH085", "name": "Kalmeshwar Municipal Council", "type": "Municipal Council", "wards": "0", "area": "0", "population": "4653171" },
            { "code": "MH086", "name": "Kamptee Municipal Council", "type": "Municipal Council", "wards": "31", "area": "4", "population": "86793" },
            { "code": "MH088", "name": "Kanhan-Pimpri Municipal Council", "type": "Municipal Council", "wards": "0", "area": "0", "population": "0" },
            
            { "code": "MH089", "name": "Kankavali Municipal Council", "type": "Municipal Council", "wards": "0", "area": "9", "population": "0" },
            { "code": "MH091", "name": "Karanja Muncipal Council", "type": "Municipal Council", "wards": "27", "area": "14", "population": "67907" },
            { "code": "MH092", "name": "Karjat Municipal Council", "type": "Municipal Council", "wards": "17", "area": "8", "population": "29663" },
            { "code": "MH093", "name": "Karmala Municipal Council", "type": "Municipal Council", "wards": "17", "area": "4.74", "population": "23199" },
            { "code": "MH094", "name": "Kataol Municipal Council", "type": "Municipal Council", "wards": "21", "area": "20", "population": "43267" },
            { "code": "MH095", "name": "Khamgaon Municipal Council", "type": "Municipal Council", "wards": "32", "area": "13", "population": "94191" },
            { "code": "MH096", "name": "Khapa Municipal Council", "type": "Municipal Council", "wards": "17", "area": "3", "population": "14659" },
            { "code": "MH097", "name": "Khed Municipal Council", "type": "Municipal Council", "wards": "17", "area": "4", "population": "16892" },
            { "code": "MH098", "name": "Khopoli Municipal Council", "type": "Municipal Council", "wards": "26", "area": "30", "population": "71141" },
            { "code": "MH102", "name": "Kiwant Municipal Council", "type": "Municipal Council", "wards": "0", "area": "0", "population": "0" },
            
            { "code": "MH103", "name": "Kopargaon Municipal Council", "type": "Municipal Council", "wards": "26", "area": "11", "population": "65273" },
            { "code": "MH104", "name": "Kulgaon Municipal Council", "type": "Municipal Council", "wards": "34", "area": "36", "population": "174226" },
            { "code": "MH105", "name": "Kurduwadi Municipal Council", "type": "Municipal Council", "wards": "17", "area": "6.48", "population": "22463" },
            { "code": "MH106", "name": "Kurundwad Municipal Council", "type": "Municipal Council", "wards": "0", "area": "0", "population": "0" },
            { "code": "MH107", "name": "Lanja Municipal Council", "type": "Municipal Council", "wards": "0", "area": "0", "population": "0" },
            { "code": "MH109", "name": "Lonar Municipal Council", "type": "Municipal Council", "wards": "17", "area": "1", "population": "23416" },
            { "code": "MH110", "name": "Mahableshwar Municipal Council", "type": "Municipal Council", "wards": "17", "area": "145", "population": "13393" },
            { "code": "MH111", "name": "Mahadula Municipal Council", "type": "Municipal Council", "wards": "0", "area": "0", "population": "0" },
            { "code": "MH113", "name": "Maindargi Municipal Council", "type": "Municipal Council", "wards": "17", "area": "2", "population": "12363" },
            { "code": "MH115", "name": "Malkapur Muncipal Council", "type": "Municipal Council", "wards": "27", "area": "5", "population": "67740" },
            
            { "code": "MH117", "name": "Malkapur(Kolhapur) Municipal Council", "type": "Municipal Council", "wards": "17", "area": "0", "population": "5339" },
            { "code": "MH118", "name": "Malkapur(Satara) Municipal Council", "type": "Municipal Council", "wards": "0", "area": "0", "population": "0" },
            { "code": "MH119", "name": "Malwan Municipal Council", "type": "Municipal Council", "wards": "17", "area": "", "population": "18648" },
            { "code": "MH120", "name": "Mangalwedha Municipal Council", "type": "Municipal Council", "wards": "17", "area": "0", "population": "21824" },
            { "code": "MH121", "name": "Mangrulpir Muncipal Council", "type": "Municipal Council", "wards": "17", "area": "4", "population": "30983" },
            { "code": "MH123", "name": "Manmad Municipal Council", "type": "Municipal Council", "wards": "29", "area": "29", "population": "80058" },
            { "code": "MH125", "name": "Matheran Municipal Council", "type": "Municipal Council", "wards": "17", "area": "7", "population": "4393" },
            { "code": "MH126", "name": "Mauda Municipal Council", "type": "Municipal Council", "wards": "0", "area": "0", "population": "0" },
            { "code": "MH127", "name": "Mehkar Muncipal Council", "type": "Municipal Council", "wards": "21", "area": "0", "population": "45248" },
            { "code": "MH128", "name": "Mhaswad Municipal Council", "type": "Municipal Council", "wards": "17", "area": "88", "population": "24120" },
            
            { "code": "MH129", "name": "Mohpa Municipal Council", "type": "Municipal Council", "wards": "17", "area": "2", "population": "6987" },
            { "code": "MH130", "name": "Morshi Muncipal Council", "type": "Municipal Council", "wards": "19", "area": "18", "population": "37333" },
            { "code": "MH131", "name": "Mowad Municipal Council", "type": "Municipal Council", "wards": "17", "area": "7", "population": "8777" },
            { "code": "MH134", "name": "Mul Municipal Council", "type": "Municipal Council", "wards": "17", "area": "23", "population": "25449" },
            { "code": "MH135", "name": "Murtizapur Municipal Council", "type": "Municipal Council", "wards": "21", "area": "5", "population": "40295" },
            { "code": "MH139", "name": "Nandgaon Municipal Council", "type": "Municipal Council", "wards": "17", "area": "4", "population": "23604" },
            { "code": "MH141", "name": "Narkhed Municipal Council", "type": "Municipal Council", "wards": "17", "area": "4", "population": "21127" },
            { "code": "MH142", "name": "Navapur Municipal Council", "type": "Municipal Council", "wards": "18", "area": "0", "population": "34207" },
            { "code": "MH143", "name": "Ner Muncipal Council", "type": "Municipal Council", "wards": "17", "area": "0", "population": "29302" },
            { "code": "MH146", "name": "Pachora Municipal Council", "type": "Municipal Council", "wards": "25", "area": "5", "population": "59609" },
            
            { "code": "MH148", "name": "Palghar Municipal Council", "type": "Municipal Council", "wards": "25", "area": "64", "population": "68930" },
            { "code": "MH149", "name": "Panchagani Municipal Council", "type": "Municipal Council", "wards": "17", "area": "6.86", "population": "14894" },
            { "code": "MH150", "name": "Pandarkawda Muncipal Council", "type": "Municipal Council", "wards": "17", "area": "0", "population": "31094" },
            { "code": "MH151", "name": "Pandharpur Municipal Council", "type": "Municipal Council", "wards": "33", "area": "17.28", "population": "98923" },
            { "code": "MH152", "name": "Panhala Municipal Council", "type": "Municipal Council", "wards": "17", "area": "1.58", "population": "3121" },
            { "code": "MH155", "name": "Parola Municipal Council", "type": "Municipal Council", "wards": "20", "area": "4", "population": "37666" },
            { "code": "MH157", "name": "Pathardi Municipal Council", "type": "Municipal Council", "wards": "17", "area": "34", "population": "27211" },
            { "code": "MH161", "name": "Pauni Muncipal Council", "type": "Municipal Council", "wards": "17", "area": "9", "population": "22821" },
            { "code": "MH163", "name": "Pen Municipal Council", "type": "Municipal Council", "wards": "18", "area": "10", "population": "37852" },
            { "code": "MH164", "name": "Phaltan Municipal Council", "type": "Municipal Council", "wards": "25", "area": "15", "population": "52118" },
            
            { "code": "MH165", "name": "Pulgaon Municipal Council", "type": "Municipal Council", "wards": "19", "area": "3", "population": "33925" },
            { "code": "MH167", "name": "Rahata Municipal Council", "type": "Municipal Council", "wards": "17", "area": "0", "population": "22335" },
            { "code": "MH168", "name": "Rahuri Municipal Council", "type": "Municipal Council", "wards": "20", "area": "42", "population": "38813" },
            { "code": "MH169", "name": "Rahuri Municipal Council", "type": "Municipal Council", "wards": "20", "area": "42", "population": "38813" },
            { "code": "MH170", "name": "Rajapur Municipal Council", "type": "Municipal Council", "wards": "17", "area": "6", "population": "9753" },
            { "code": "MH171", "name": "Rajura Municipal Council", "type": "Municipal Council", "wards": "17", "area": "3", "population": "29668" },
            { "code": "MH172", "name": "Ramtek Muncipal Council", "type": "Municipal Council", "wards": "17", "area": "4", "population": "22310" },
            { "code": "MH174", "name": "Ratnagiri Municipal Council", "type": "Municipal Council", "wards": "28", "area": "10", "population": "76229" },
            { "code": "MH175", "name": "Raver Municipal Council", "type": "Municipal Council", "wards": "17", "area": "2", "population": "27039" },
            { "code": "MH176", "name": "Risod Muncipal Council", "type": "Municipal Council", "wards": "17", "area": "14", "population": "34136" },
            
            { "code": "MH177", "name": "Roha Municipal Council", "type": "Municipal Council", "wards": "17", "area": "0", "population": "20849" },
            { "code": "MH179", "name": "Soner Municipal Council", "type": "Municipal Council", "wards": "0", "area": "0", "population": "0" },
            { "code": "MH180", "name": "Satana Municipal Council", "type": "Municipal Council", "wards": "19", "area": "0", "population": "37701" },
            { "code": "MH181", "name": "Savda Municipal Council", "type": "Municipal Council", "wards": "17", "area": "2", "population": "20584" },
            { "code": "MH182", "name": "Sawantwadi Municipal Council", "type": "Municipal Council", "wards": "17", "area": "7", "population": "23851" },
            { "code": "MH183", "name": "Selu Municipal Council", "type": "Municipal Council", "wards": "21", "area": "5", "population": "46915" },
            { "code": "MH184", "name": "Shahada Municipal Council", "type": "Municipal Council", "wards": "0", "area": "0", "population": "0" },
            { "code": "MH185", "name": "Shegaon Municipal Council", "type": "Municipal Council", "wards": "25", "area": "6", "population": "59672" },
            { "code": "MH186", "name": "Shendurjana Ghat Municipal Council", "type": "Municipal Council", "wards": "17", "area": "10.2", "population": "21748" },
            { "code": "MH187", "name": "Shirdi Municipal Council", "type": "Municipal Council", "wards": "17", "area": "3", "population": "36004" },
            
            { "code": "MH188", "name": "Shirpur Municipal Council", "type": "Municipal Council", "wards": "27", "area": "6", "population": "76905" },
            { "code": "MH189", "name": "Shrigonda Municipal Council", "type": "Municipal Council", "wards": "17", "area": "86", "population": "31134" },
            { "code": "MH190", "name": "Shrirampur Municipal Council", "type": "Municipal Council", "wards": "31", "area": "9", "population": "89282" },
            { "code": "MH191", "name": "Sriwardhan Municipal Council", "type": "Municipal Council", "wards": "17", "area": "4", "population": "15123" },
            { "code": "MH192", "name": "Sillod Municipal Council", "type": "Municipal Council", "wards": "23", "area": "36", "population": "58230" },
            { "code": "MH194", "name": "Sindkhedraja Muncipal Council", "type": "Municipal Council", "wards": "17", "area": "39", "population": "16434" },
            { "code": "MH196", "name": "Sinnar Municipal Council", "type": "Municipal Council", "wards": "23", "area": "50", "population": "65299" },
            { "code": "MH197", "name": "Sonpeth Municipal Council", "type": "Municipal Council", "wards": "17", "area": "3", "population": "15765" },
            { "code": "MH198", "name": "Taloda Municipal Council", "type": "Municipal Council", "wards": "17", "area": "0", "population": "26363" },
            { "code": "MH201", "name": "Trimbak Municipal Council", "type": "Municipal Council", "wards": "17", "area": "2", "population": "12056" },
            
            { "code": "MH202", "name": "Tumsar Muncipal Council", "type": "Municipal Council", "wards": "23", "area": "7", "population": "44869" },
            { "code": "MH204", "name": "Udgir Municipal Council", "type": "Municipal Council", "wards": "33", "area": "6", "population": "103550" },
            { "code": "MH205", "name": "Umerga Municipal Council", "type": "Municipal Council", "wards": "0", "area": "0", "population": "0" },
            { "code": "MH206", "name": "Umari Municipal Council", "type": "Municipal Council", "wards": "0", "area": "0", "population": "0" },
            { "code": "MH207", "name": "Umarkhed Muncipal Council", "type": "Municipal Council", "wards": "21", "area": "29", "population": "47458" },
            { "code": "MH209", "name": "Uran Municipal Council", "type": "Municipal Council", "wards": "17", "area": "2", "population": "30439" },
            { "code": "MH210", "name": "Vaijapur Municipal Council", "type": "Municipal Council", "wards": "21", "area": "11", "population": "41296" },
            { "code": "MH211", "name": "Vengurle Municipal Council", "type": "Municipal Council", "wards": "17", "area": "13", "population": "12392" },
            { "code": "MH212", "name": "Wadi Municipal Council", "type": "Municipal Council", "wards": "23", "area": "21", "population": "37988" },
            { "code": "MH213", "name": "Wadsa Municipal Council", "type": "Municipal Council", "wards": "0", "area": "0", "population": "0" },
            
            { "code": "MH214", "name": "Wani Muncipal Council", "type": "Municipal Council", "wards": "25", "area": "9", "population": "58840" },
            { "code": "MH215", "name": "Wardha Municipal Council", "type": "Municipal Council", "wards": "39", "area": "12", "population": "1300774" },
            { "code": "MH217", "name": "Washim Municipal council", "type": "Municipal Council", "wards": "27", "area": "48", "population": "78387" },
            { "code": "MH218", "name": "Wasmut Nagar Municipal Council", "type": "Municipal Council", "wards": "0", "area": "0", "population": "0" },
            { "code": "MH219", "name": "Yawal Municipal Council", "type": "Municipal Council", "wards": "19", "area": "54", "population": "36706" },
            { "code": "MH220", "name": "Yawatmal Municipal Council", "type": "Municipal Council", "wards": "40", "area": "10", "population": "36706" }
            
        ]
    },
    MN: {
        "state": "Manipur",
        "ulbs": [
            
        ]
    },
    ML: {
        "state": "Meghalaya",
        "ulbs": [
           
        ]
    },
    MZ: {
        "state": "Mizoram",
        "ulbs": [
            { "state": "Mizoram", "code": "MZ001", "name": "Aizawl Notified Town", "natureOfUlb": "Notified Town", "type": "Town Panchayat", "wards": 76, "area": 457, "population": 293416 },

        ]
    },
    NL: {
        "state": "Nagaland",
        "ulbs": [
           
        ]
    },
    OD: {
        "state": "Odisha",
        "ulbs": [
            { "state": "Odisha", "code": "OD001", "name": "Baripada Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 28, "area": 0, "population": 116849 },
            { "state": "Odisha", "code": "OD002", "name": "Brahmapur Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 25, "area": 0, "population": 195223 },
            { "state": "Odisha", "code": "OD003", "name": "Bhubaneswar Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 60, "area": 186, "population": 885363 },
            { "state": "Odisha", "code": "OD004", "name": "Cuttack Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 54, "area": 193, "population": 610189 },
            { "state": "Odisha", "code": "OD005", "name": "Raurkela Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 33, "area": 200, "population": 272721 },
        ]
    },
    PY: {
        "state": "Puducherry (UT)",
        "ulbs": [
           
        ]
    },
    PB: {
        "state": "Punjab",
        "ulbs": [
            { "state": "Punjab", "code": "PB001", "name": "Ferozepur Cantonment Board", "natureOfUlb": "Cantonment Board", "type": "Municipality", "wards": 8, "area": 0, "population": 53199 },
            { "state": "Punjab", "code": "PB002", "name": "Khanna Municipal Council", "natureOfUlb": "Municipal Council", "type": "Municipality", "wards": 27, "area": 32, "population": 128137 },
            { "state": "Punjab", "code": "PB003", "name": "Ludhiana Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 75, "area": 159, "population": 1618879 },
            { "state": "Punjab", "code": "PB004", "name": "Bathinda Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 50, "area": 0, "population": 285788 },
            { "state": "Punjab", "code": "PB005", "name": "Mohali Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 0, "area": 0, "population": 0 },
        ]
    },
    RJ: {
        "state": "Rajasthan",
        "ulbs": [
            { "state": "Rajasthan", "code": "RJ001", "name": "Abu Road Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 31, "area": 15.5, "population": 55599 },
            { "state": "Rajasthan", "code": "RJ002", "name": "Ajmer Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 55, "area": 120.00, "population": 542321 },
            { "state": "Rajasthan", "code": "RJ003", "name": "Aklera Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 5.00, "population": 26240 },
            { "state": "Rajasthan", "code": "RJ004", "name": "Alwar Municipal Council", "natureOfUlb": "Municipal Council", "type": "Municipality", "wards": 52, "area": 49.00, "population": 322568 },
            { "state": "Rajasthan", "code": "RJ005", "name": "Amet Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 8.00, "population": 17335 },
            { "state": "Rajasthan", "code": "RJ006", "name": "Antah Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 23.48, "population": 32377 },
            { "state": "Rajasthan", "code": "RJ007", "name": "Anupgarh Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 4.6, "population": 30877 },
            { "state": "Rajasthan", "code": "RJ008", "name": "Asind Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 15, "area": 25.09, "population": 16611 },
            { "state": "Rajasthan", "code": "RJ009", "name": "Bari Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 15, "area": 22.27, "population": 62721 },
            { "state": "Rajasthan", "code": "RJ010", "name": "Bari Sadri Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 13.00, "population": 15713 },
            { "state": "Rajasthan", "code": "RJ011", "name": "Baggar Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 15, "area": 12.0, "population": 14238 },
            { "state": "Rajasthan", "code": "RJ012", "name": "Bagru Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 32.59, "population": 31229 },
            { "state": "Rajasthan", "code": "RJ013", "name": "Balotra Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 35, "area": 30.0, "population": 74496 },
            { "state": "Rajasthan", "code": "RJ014", "name": "Bandikui Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 4.3, "population": 44664 },
            { "state": "Rajasthan", "code": "RJ015", "name": "Banswara Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 41, "area": 16.1, "population": 101017 },
            { "state": "Rajasthan", "code": "RJ016", "name": "Baran Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 35, "area": 72.36, "population": 117992 },
            { "state": "Rajasthan", "code": "RJ017", "name": "Barmer Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 40, "area": 10.0, "population": 96225 },
            { "state": "Rajasthan", "code": "RJ018", "name": "Bayana Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 12.5, "population": 38502 },
            { "state": "Rajasthan", "code": "RJ019", "name": "Beawar Municipal Council", "natureOfUlb": "Municipal Council", "type": "Municipality", "wards": 45, "area": 25.00, "population": 151152 },
            { "state": "Rajasthan", "code": "RJ020", "name": "Begun Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 6.62, "population": 20705 },
            { "state": "Rajasthan", "code": "RJ021", "name": "Behror Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 15.1, "population": 29531 },
            { "state": "Rajasthan", "code": "RJ022", "name": "Bhadra Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 6.05, "population": 40662 },
            { "state": "Rajasthan", "code": "RJ023", "name": "Bharatpur Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 50, "area": 57.77, "population": 252838 },
            { "state": "Rajasthan", "code": "RJ024", "name": "Bhawani Mandi Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 6.00, "population": 42283 },
            { "state": "Rajasthan", "code": "RJ025", "name": "Bhilwara Municipal Council", "natureOfUlb": "Municipal Council", "type": "Municipality", "wards": 50, "area": 70.00, "population": 359483 },
            { "state": "Rajasthan", "code": "RJ026", "name": "Bhinder Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 3.9, "population": 17878 },
            { "state": "Rajasthan", "code": "RJ027", "name": "Bhinmal Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 11.9, "population": 47932 },
            { "state": "Rajasthan", "code": "RJ028", "name": "Bikaner Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 60, "area": 111.00, "population": 644406 },
            { "state": "Rajasthan", "code": "RJ029", "name": "Bilara Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 10.0, "population": 39590 },
            { "state": "Rajasthan", "code": "RJ030", "name": "Bissau Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 15.0, "population": 23227 },
            { "state": "Rajasthan", "code": "RJ031", "name": "Bundi Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 40, "area": 22.00, "population": 104919 },
            { "state": "Rajasthan", "code": "RJ032", "name": "Chhabra Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 9.0, "population": 32285 },
            { "state": "Rajasthan", "code": "RJ033", "name": "Chaksu Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 40.0, "population": 33432 },
            { "state": "Rajasthan", "code": "RJ034", "name": "Chittaurgarh Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 0, "area": 47.00, "population": 116406 },
            { "state": "Rajasthan", "code": "RJ035", "name": "Chomu Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 30, "area": 27.50, "population": 64417 },
            { "state": "Rajasthan", "code": "RJ036", "name": "Chhoti Sadri Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 7.00, "population": 18360 },
            { "state": "Rajasthan", "code": "RJ037", "name": "Dausa Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 35, "area": 18.00, "population": 85960 },
            { "state": "Rajasthan", "code": "RJ038", "name": "Deeg Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 30, "area": 6.23, "population": 44999 },
            { "state": "Rajasthan", "code": "RJ039", "name": "Deoli Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 5.29, "population": 22065 },
            { "state": "Rajasthan", "code": "RJ040", "name": "Deshnoke Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 6.0, "population": 18470 },
            { "state": "Rajasthan", "code": "RJ041", "name": "Deogarh Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 24.0, "population": 17604 },
            { "state": "Rajasthan", "code": "RJ042", "name": "Dhaulpur Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 40, "area": 32.0, "population": 133075 },
            { "state": "Rajasthan", "code": "RJ043", "name": "Didwana Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 31, "area": 14.0, "population": 53749 },
            { "state": "Rajasthan", "code": "RJ044", "name": "Dungarpur Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 30, "area": 10.24, "population": 47706 },
            { "state": "Rajasthan", "code": "RJ045", "name": "Falna Municipal Board", "natureOfUlb": "Municipal Board", "type": "Municipality", "wards": 20, "area": 25.00, "population": 24839 },
            { "state": "Rajasthan", "code": "RJ046", "name": "Phalodi Nagar Palika", "natureOfUlb": "Nagar Palika", "type": "Municipality", "wards": 31, "area": 40.00, "population": 49914 },
            { "state": "Rajasthan", "code": "RJ047", "name": "Fatehpur Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 35, "area": 16.0, "population": 92595 },
            { "state": "Rajasthan", "code": "RJ048", "name": "Phulera Nagar Palika", "natureOfUlb": "Nagar Palika", "type": "Municipality", "wards": 20, "area": 10.00, "population": 26091 },
            { "state": "Rajasthan", "code": "RJ049", "name": "Gajsinghpur Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 13, "area": 5.00, "population": 9995 },
            { "state": "Rajasthan", "code": "RJ050", "name": "Gangapur Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 40, "area": 10.0, "population": 18777 },
            { "state": "Rajasthan", "code": "RJ051", "name": "Gangapur Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 40, "area": 9.9, "population": 119090 },
            { "state": "Rajasthan", "code": "RJ052", "name": "Gulabpura Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 5.0, "population": 27215 },
            { "state": "Rajasthan", "code": "RJ053", "name": "Hanumangarh Municipal Council", "natureOfUlb": "Municipal Council", "type": "Municipality", "wards": 45, "area": 45.13, "population": 150958 },
            { "state": "Rajasthan", "code": "RJ054", "name": "Hindaun Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 40, "area": 10.0, "population": 105452 },
            { "state": "Rajasthan", "code": "RJ055", "name": "Indragarh Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 13, "area": 13.39, "population": 7444 },
            { "state": "Rajasthan", "code": "RJ056", "name": "Jaipur Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 77, "area": 484.64, "population": 3046163 },
            { "state": "Rajasthan", "code": "RJ057", "name": "Jaisalmer Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 30, "area": 64.76, "population": 65471 },
            { "state": "Rajasthan", "code": "RJ058", "name": "Jalor Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 30, "area": 15.49, "population": 54081 },
            { "state": "Rajasthan", "code": "RJ059", "name": "Jahazpur Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 25.0, "population": 20586 },
            { "state": "Rajasthan", "code": "RJ060", "name": "Jhalrapatan Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 20.17, "population": 37506 },
            { "state": "Rajasthan", "code": "RJ061", "name": "Jhalawar Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 30, "area": 12.9, "population": 66919 },
            { "state": "Rajasthan", "code": "RJ062", "name": "Jhunjhunun Municipal Council", "natureOfUlb": "Municipal Council", "type": "Municipality", "wards": 0, "area": 50.00, "population": 118473 },
            { "state": "Rajasthan", "code": "RJ063", "name": "Jodhpur Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 65, "area": 232.00, "population": 1056191 },
            { "state": "Rajasthan", "code": "RJ064", "name": "Kaithoon Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 17.2, "population": 24260 },
            { "state": "Rajasthan", "code": "RJ065", "name": "Kaman Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 14.00, "population": 38040 },
            { "state": "Rajasthan", "code": "RJ066", "name": "Kanor Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 15, "area": 6.00, "population": 13239 },
            { "state": "Rajasthan", "code": "RJ067", "name": "Kapasan Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 26.0, "population": 20869 },
            { "state": "Rajasthan", "code": "RJ068", "name": "Kaprain Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 0, "area": 42.0, "population": 20748 },
            { "state": "Rajasthan", "code": "RJ069", "name": "Karanpur Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 0, "population": 0 },
            { "state": "Rajasthan", "code": "RJ070", "name": "Karauli Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 35, "area": 35.0, "population": 82960 },
            { "state": "Rajasthan", "code": "RJ071", "name": "Kekri Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 18.61, "population": 41890 },
            { "state": "Rajasthan", "code": "RJ072", "name": "K Patan Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 25.9, "population": 24627 },
            { "state": "Rajasthan", "code": "RJ073", "name": "Kesrisinghpur Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 15, "area": 4.00, "population": 14010 },
            { "state": "Rajasthan", "code": "RJ074", "name": "Khairthal Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 21.09, "population": 38298 },
            { "state": "Rajasthan", "code": "RJ075", "name": "Khandela Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 21, "area": 9.0, "population": 29044 },
            { "state": "Rajasthan", "code": "RJ076", "name": "Kherli Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 3.00, "population": 17634 },
            { "state": "Rajasthan", "code": "RJ077", "name": "Khetri Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 13.0, "population": 18209 },
            { "state": "Rajasthan", "code": "RJ078", "name": "Kishangarh Municipal Council", "natureOfUlb": "Municipal Council", "type": "Municipality", "wards": 45, "area": 45.79, "population": 154886 },
            { "state": "Rajasthan", "code": "RJ079", "name": "Kishangarh Renwal Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 9.20, "population": 29201 },
            { "state": "Rajasthan", "code": "RJ080", "name": "Kota Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 60, "area": 506.78, "population": 1001694 },
            { "state": "Rajasthan", "code": "RJ081", "name": "Kotputli Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 30, "area": 10.2, "population": 49202 },
            { "state": "Rajasthan", "code": "RJ082", "name": "Kuchaman City Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 30, "area": 12.50, "population": 61969 },
            { "state": "Rajasthan", "code": "RJ083", "name": "Kuchera Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 0, "population": 0 },
            { "state": "Rajasthan", "code": "RJ084", "name": "Kushalgarh Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 15, "area": 2.07, "population": 10666 },
            { "state": "Rajasthan", "code": "RJ085", "name": "Ladnu Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 30, "area": 0, "population": 0 },
            { "state": "Rajasthan", "code": "RJ086", "name": "Lakheri Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 25.0, "population": 29572 },
            { "state": "Rajasthan", "code": "RJ087", "name": "Lalsot Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 9.42, "population": 34363 },
            { "state": "Rajasthan", "code": "RJ088", "name": "Lachhmangarh Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 30, "area": 16.26, "population": 53392 },
            { "state": "Rajasthan", "code": "RJ089", "name": "Makrana Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 40, "area": 36.0, "population": 94487 },
            { "state": "Rajasthan", "code": "RJ090", "name": "Malpura Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 26, "area": 43.3, "population": 36028 },
            { "state": "Rajasthan", "code": "RJ091", "name": "Mandawa Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 15.0, "population": 23335 },
            { "state": "Rajasthan", "code": "RJ092", "name": "Mangrol Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 27.4, "population": 25073 },
            { "state": "Rajasthan", "code": "RJ093", "name": "Merta City Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 30, "area": 24.00, "population": 46070 },
            { "state": "Rajasthan", "code": "RJ094", "name": "Mukandgarh Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 13.45, "population": 18469 },
            { "state": "Rajasthan", "code": "RJ095", "name": "Mundwa Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 29.0, "population": 16871 },
            { "state": "Rajasthan", "code": "RJ096", "name": "Nadbai Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 8.10, "population": 26411 },
            { "state": "Rajasthan", "code": "RJ097", "name": "Nagar Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 3.61, "population": 25572 },
            { "state": "Rajasthan", "code": "RJ098", "name": "Nagaur Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 40, "area": 32.3, "population": 105218 },
            { "state": "Rajasthan", "code": "RJ099", "name": "Nainvaa Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 8.5, "population": 19485 },
            { "state": "Rajasthan", "code": "RJ100", "name": "Nawa Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 24.00, "population": 22088 },
            { "state": "Rajasthan", "code": "RJ101", "name": "Nawalgarh Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 30, "area": 27.91, "population": 63948 },
            { "state": "Rajasthan", "code": "RJ102", "name": "Neem-Ka-Thana Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 18.00, "population": 36231 },
            { "state": "Rajasthan", "code": "RJ103", "name": "Nimbahera Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 30, "area": 12.74, "population": 61949 },
            { "state": "Rajasthan", "code": "RJ104", "name": "Niwai Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 48.00, "population": 37765 },
            { "state": "Rajasthan", "code": "RJ105", "name": "Nokha Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 30, "area": 11.16, "population": 62699 },
            { "state": "Rajasthan", "code": "RJ106", "name": "Padampur Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 3.4, "population": 18420 },
            { "state": "Rajasthan", "code": "RJ107", "name": "Pali Municipal Council", "natureOfUlb": "Municipal Council", "type": "Municipality", "wards": 45, "area": 159.00, "population": 230075 },
            { "state": "Rajasthan", "code": "RJ108", "name": "Parbatsar Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 15, "area": 7.0, "population": 15172 },
            { "state": "Rajasthan", "code": "RJ109", "name": "Pirawa Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 15, "area": 9.00, "population": 12807 },
            { "state": "Rajasthan", "code": "RJ110", "name": "Pilani Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 18.0, "population": 29741 },
            { "state": "Rajasthan", "code": "RJ111", "name": "Pilibanga Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 4.5, "population": 37288 },
            { "state": "Rajasthan", "code": "RJ112", "name": "Pindwara Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 10.0, "population": 24487 },
            { "state": "Rajasthan", "code": "RJ113", "name": "Pipar City Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 23.23, "population": 36810 },
            { "state": "Rajasthan", "code": "RJ114", "name": "Pratapgarh Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 12.56, "population": 42079 },
            { "state": "Rajasthan", "code": "RJ115", "name": "Pushkar Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 4.0, "population": 21626 },
            { "state": "Rajasthan", "code": "RJ116", "name": "Raisinghnagar Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 4.76, "population": 28330 },
            { "state": "Rajasthan", "code": "RJ117", "name": "Rajakhera Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 28.68, "population": 33666 },
            { "state": "Rajasthan", "code": "RJ118", "name": "Rajaldesar Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 3.07, "population": 27419 },
            { "state": "Rajasthan", "code": "RJ119", "name": "Rajsamand Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 30, "area": 64.00, "population": 67798 },
            { "state": "Rajasthan", "code": "RJ120", "name": "Ramganj Mandi Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 10.53, "population": 41328 },
            { "state": "Rajasthan", "code": "RJ121", "name": "Ramgarh Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 0, "area": 6.00, "population": 33024 },
            { "state": "Rajasthan", "code": "RJ122", "name": "Rani Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 15, "area": 16.00, "population": 13880 },
            { "state": "Rajasthan", "code": "RJ123", "name": "Ratangarh Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 35, "area": 40.16, "population": 71124 },
            { "state": "Rajasthan", "code": "RJ124", "name": "Ratannagar Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 15, "area": 12.60, "population": 12841 },
            { "state": "Rajasthan", "code": "RJ125", "name": "Rawatsar Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 4.0, "population": 35102 },
            { "state": "Rajasthan", "code": "RJ126", "name": "Reengus Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 30.0, "population": 26139 },
            { "state": "Rajasthan", "code": "RJ127", "name": "Sagwara Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 8.0, "population": 29439 },
            { "state": "Rajasthan", "code": "RJ128", "name": "Sadri Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 85.63, "population": 27390 },
            { "state": "Rajasthan", "code": "RJ129", "name": "Sadulsahar Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 4.50, "population": 24980 },
            { "state": "Rajasthan", "code": "RJ130", "name": "Sanchore Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 49.0, "population": 32875 },
            { "state": "Rajasthan", "code": "RJ131", "name": "Sangaria Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 5.8, "population": 36619 },
            { "state": "Rajasthan", "code": "RJ132", "name": "Sangod Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 14.8, "population": 21846 },
            { "state": "Rajasthan", "code": "RJ133", "name": "Sardarshahar Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 40, "area": 16.00, "population": 95911 },
            { "state": "Rajasthan", "code": "RJ134", "name": "Sarwar Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 6.00, "population": 20372 },
            { "state": "Rajasthan", "code": "RJ135", "name": "Sawai Madhopur Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 40, "area": 59.60, "population": 121106 },
            { "state": "Rajasthan", "code": "RJ136", "name": "Shahpura Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 0, "area": 9.4, "population": 33895 },
            { "state": "Rajasthan", "code": "RJ137", "name": "Shahpura Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 0, "area": 28.2, "population": 30320 },
            { "state": "Rajasthan", "code": "RJ138", "name": "Sheoganj Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 10.0, "population": 28053 },
            { "state": "Rajasthan", "code": "RJ139", "name": "Shri Dungarah Municipal Board", "natureOfUlb": "Municipal Board", "type": "Municipality", "wards": 30, "area": 6.60, "population": 53294 },
            { "state": "Rajasthan", "code": "RJ140", "name": "Shri Ganganagar Municipal Council", "natureOfUlb": "Municipal Council", "type": "Municipality", "wards": 0, "area": 21.00, "population": 237780 },
            { "state": "Rajasthan", "code": "RJ141", "name": "Shri Vijaynagar Municipal Board", "natureOfUlb": "Municipal Board", "type": "Municipality", "wards": 0, "area": 4.00, "population": 18425 },
            { "state": "Rajasthan", "code": "RJ142", "name": "Sri Madhopur Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 16.00, "population": 31366 },
            { "state": "Rajasthan", "code": "RJ143", "name": "Sikar Municipal Council", "natureOfUlb": "Municipal Council", "type": "Municipality", "wards": 45, "area": 39.90, "population": 244497 },
            { "state": "Rajasthan", "code": "RJ144", "name": "Sirohi Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 30.0, "population": 39229 },
            { "state": "Rajasthan", "code": "RJ145", "name": "Sojat Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 50.00, "population": 43023 },
            { "state": "Rajasthan", "code": "RJ146", "name": "Sujangarh Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 40, "area": 15.00, "population": 101523 },
            { "state": "Rajasthan", "code": "RJ147", "name": "Sumerpur Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 9.3, "population": 37093 },
            { "state": "Rajasthan", "code": "RJ148", "name": "Surajgarh Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 18.40, "population": 21666 },
            { "state": "Rajasthan", "code": "RJ149", "name": "Suratgarh Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 30, "area": 11.00, "population": 70536 },
            { "state": "Rajasthan", "code": "RJ150", "name": "Takhatgarh Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 29.40, "population": 16729 },
            { "state": "Rajasthan", "code": "RJ151", "name": "Taranagar Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 10.00, "population": 32640 },
            { "state": "Rajasthan", "code": "RJ152", "name": "Tijara Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 21.0, "population": 24747 },
            { "state": "Rajasthan", "code": "RJ153", "name": "Todabhim Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 9.0, "population": 22977 },
            { "state": "Rajasthan", "code": "RJ154", "name": "Todaraisingh Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 4.08, "population": 23559 },
            { "state": "Rajasthan", "code": "RJ155", "name": "Tonk Municipal Council", "natureOfUlb": "Municipal Council", "type": "Municipality", "wards": 45, "area": 18.18, "population": 165294 },
            { "state": "Rajasthan", "code": "RJ156", "name": "Udaipur Municipal Council", "natureOfUlb": "Municipal Council", "type": "Municipal Corporation", "wards": 55, "area": 54.81, "population": 451100 },
            { "state": "Rajasthan", "code": "RJ157", "name": "Weir Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 20.40, "population": 19385 },
            { "state": "Rajasthan", "code": "RJ158", "name": "Vidyavihar Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 15, "area": 5.00, "population": 15644 },
            { "state": "Rajasthan", "code": "RJ159", "name": "Vijainagar Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 0, "area": 3.6, "population": 32124 },
            { "state": "Rajasthan", "code": "RJ160", "name": "Viratnagar Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 5.48, "population": 20568 },
            { "state": "Rajasthan", "code": "RJ161", "name": "Bali Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 46, "population": 19880 },
            { "state": "Rajasthan", "code": "RJ163", "name": "Bhusawar Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 0, "population": 19946 },
            { "state": "Rajasthan", "code": "RJ166", "name": "Chidawa Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 19.3, "population": 43953 },
            { "state": "Rajasthan", "code": "RJ167", "name": "Churu Municipal Council", "natureOfUlb": "Municipal Council", "type": "Municipal Corporation", "wards": 47, "area": 41, "population": 120157 },
            { "state": "Rajasthan", "code": "RJ168", "name": "Degana Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 0, "area": 31.49, "population": 20035 },
            { "state": "Rajasthan", "code": "RJ170", "name": "Itawa Nagar Palika", "natureOfUlb": "Nagar Palika", "type": "Municipality", "wards": 0, "area": 25, "population": 27344 },
            { "state": "Rajasthan", "code": "RJ171", "name": "Jaitaran Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 12.7, "population": 22621 },
            { "state": "Rajasthan", "code": "RJ173", "name": "Kishangarhbas Municipal Board", "natureOfUlb": "Municipal Board", "type": "Municipality", "wards": 0, "area": 16.00, "population": 12429 },
            { "state": "Rajasthan", "code": "RJ174", "name": "Kumher Nagar Palika", "natureOfUlb": "Nagar Palika", "type": "Municipality", "wards": 0, "area": 0, "population": 0 },
            { "state": "Rajasthan", "code": "RJ177", "name": "Mandalgarh Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 15, "area": 30.58, "population": 13844 },
            { "state": "Rajasthan", "code": "RJ179", "name": "Napasar Nagar Palika", "natureOfUlb": "Nagar Palika", "type": "Municipality", "wards": 0, "area": 77.59, "population": 22893 },
            { "state": "Rajasthan", "code": "RJ181", "name": "Nathdwara Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 0, "population": 42016 },
            { "state": "Rajasthan", "code": "RJ182", "name": "Nohar Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 30, "area": 9.00, "population": 49835 },
            { "state": "Rajasthan", "code": "RJ186", "name": "Rawatbhata Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 25, "area": 21.53, "population": 37699 },
            { "state": "Rajasthan", "code": "RJ187", "name": "Roopwas", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 0 , "area": 2.94, "population": 15735 },
            { "state": "Rajasthan", "code": "RJ192", "name": "Jobner Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 0, "area": 0, "population": 0 },
            
        ]
    },
    SK: {
        "state": "Sikkim",
        "ulbs": [
            
        ]
    },
    TN: {
        "state": "Tamil Nadu",
        "ulbs": [
            { "state": "Tamil Nadu", "code": "TN001", "name": "Karaikudi Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 36, "area": 13.8, "population": 106714 },

        ]
    },
    TS: {
        "state": "Telangana",
        "ulbs": [
            { "state": "Telangana", "code": "TS001", "name": "Atchampet Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 20, "area": 18.70, "population": 28425 },
            { "state": "Telangana", "code": "TS002", "name": "Badangpet Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 20, "area": 74.59, "population": 64549 },
            { "state": "Telangana", "code": "TS003", "name": "Bhainsa Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 23, "area": 35.1, "population": 50134 },
            { "state": "Telangana", "code": "TS004", "name": "Bhupalpalli Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 0, "area": 0, "population": 0 },
            { "state": "Telangana", "code": "TS005", "name": "Devarakonda Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 4, "area": 28.20, "population": 39414 },
            { "state": "Telangana", "code": "TS006", "name": "Huzurabad Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 20, "area": 12.00, "population": 25576 },
            { "state": "Telangana", "code": "TS007", "name": "Huzurnagar Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 0, "area": 0, "population": 0 },
            { "state": "Telangana", "code": "TS008", "name": "Ibrahimpatnam Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 20, "area": 49.50, "population": 27651 },
            { "state": "Telangana", "code": "TS009", "name": "Jagtial Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 38, "area": 16.0, "population": 96460 },
            { "state": "Telangana", "code": "TS010", "name": "Jammikunta Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 0, "area": 0, "population": 0 },
            { "state": "Telangana", "code": "TS011", "name": "Jangaon Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 28, "area": 17.4, "population": 52408 },
            { "state": "Telangana", "code": "TS012", "name": "Kalwakurthy Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 25, "area": 9.00, "population": 28110 },
            { "state": "Telangana", "code": "TS013", "name": "Karimnagar Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 0, "area": 23.50, "population": 261185 },
            { "state": "Telangana", "code": "TS014", "name": "Madhira Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 20, "area": 28.73, "population": 29336 },
            { "state": "Telangana", "code": "TS015", "name": "Mahbubnagar Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 26, "area": 5285.10, "population": 1485567 },
            { "state": "Telangana", "code": "TS016", "name": "Medak Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 27, "area": 22.00, "population": 44110 },
            { "state": "Telangana", "code": "TS017", "name": "Metpalle Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 0, "area": 0, "population": 0 },
            { "state": "Telangana", "code": "TS018", "name": "Miryalaguda Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 36, "area": 28.36, "population": 109891 },
            { "state": "Telangana", "code": "TS019", "name": "Narayanpet Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 23, "area": 18.48, "population": 41539 },
            { "state": "Telangana", "code": "TS020", "name": "Narsampet Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 20, "area": 11.52, "population": 36241 },
            { "state": "Telangana", "code": "TS021", "name": "Nizamabad Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 50, "area": 40.00, "population": 310467 },
            { "state": "Telangana", "code": "TS022", "name": "Parkala Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 0, "area": 0, "population": 0 },
            { "state": "Telangana", "code": "TS023", "name": "Pedda Amberpet Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 20, "area": 54.91, "population": 27813 },
            { "state": "Telangana", "code": "TS024", "name": "Ramagundam Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 0, "area": 93.87, "population": 229644 },
            { "state": "Telangana", "code": "TS025", "name": "Sangareddy Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 31, "area": 13.67, "population": 72395 },
            { "state": "Telangana", "code": "TS026", "name": "Sathupalle Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 0, "area": 0, "population": 0 },
            { "state": "Telangana", "code": "TS027", "name": "Shadnagar Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 23, "area": 18.64, "population": 54431 },
            { "state": "Telangana", "code": "TS028", "name": "Sircilla Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 33, "area": 15.2, "population": 75640 },
            { "state": "Telangana", "code": "TS029", "name": "Tandur Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 0, "area": 0, "population": 0 },
            { "state": "Telangana", "code": "TS030", "name": "Vicarabad Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 28, "area": 64.00, "population": 53143 },
            { "state": "Telangana", "code": "TS031", "name": "Yellandu Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 0, "area": 0, "population": 0 },
            { "state": "Telangana", "code": "TS032", "name": "Khammam Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 20, "area": 94.4, "population": 284268 },
            { "state": "Telangana", "code": "TS033", "name": "Siddipet Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 13, "area": 36, "population": 111358 },
        
        ]
    },
    TR: {
        "state": "Tripura",
        "ulbs": [
            { "state": "Tripura", "code": "TR001", "name": "Sabroom Nagar Panchayat", "natureOfUlb": "Nagar Panchayat", "type": "Town Panchayat", "wards": 9, "area": 5.06, "population": 7134 },

        ]
    },
    UK: {
        "state": "Uttarakhand",
        "ulbs": [
            { "state": "Uttarakhand", "code": "UK001", "name": "Roorkee Nagar Palika Parishad", "natureOfUlb": "Nagar Palika Parishad", "type": "Municipality", "wards": 40, "area": 46.7, "population": 0 },

        ]
    },
    UP: {
        "state": "Uttar Pradesh",
        "ulbs": [
            { "state": "Uttar Pradesh", "code": "UP001", "name": "Agra Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 90, "area": 0, "population": 1585704 },
            { "state": "Uttar Pradesh", "code": "UP002", "name": "Aligarh Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 70, "area": 0, "population": 874408 },
            { "state": "Uttar Pradesh", "code": "UP003", "name": "Baraut Nagar Palika Parishad", "natureOfUlb": "Nagar Palika Parishad", "type": "Municipality", "wards": 25, "area": 10.36, "population": 103764 },
            { "state": "Uttar Pradesh", "code": "UP004", "name": "Bareilly Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 70, "area": 106, "population": 904797 },
            { "state": "Uttar Pradesh", "code": "UP005", "name": "Fatehpur Nagar Palika Parishad", "natureOfUlb": "Nagar Palika Parishad", "type": "Municipality", "wards": 30, "area": 5698, "population": 193193 },
            { "state": "Uttar Pradesh", "code": "UP006", "name": "Jhansi Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 60, "area": 0, "population": 505693 },
            { "state": "Uttar Pradesh", "code": "UP007", "name": "Meerut Nagar Nigam", "natureOfUlb": "Nagar Nigam", "type": "Nagar Nigam", "wards": 0, "area": 450, "population": 11753 },
            { "state": "Uttar Pradesh", "code": "UP008", "name": "Akbarpur Nagar Palika Parishad", "natureOfUlb": "Nagar Palika Parishad", "type": "Municipality", "wards": 61, "area": 72.5, "population": 111447 },
            { "state": "Uttar Pradesh", "code": "UP009", "name": "Allahabad Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 80, "area": 5482.0, "population": 5954391 },
            { "state": "Uttar Pradesh", "code": "UP010", "name": "Amroha Nagar Palika Parishad", "natureOfUlb": "Nagar Palika Parishad", "type": "Municipality", "wards": 0, "area": 2249.0, "population": 1840221 },
            { "state": "Uttar Pradesh", "code": "UP011", "name": "Bahraich Nagar Palika Parishad", "natureOfUlb": "Nagar Palika Parishad", "type": "Municipality", "wards": 0, "area": 4696.8, "population": 186223 },
            { "state": "Uttar Pradesh", "code": "UP012", "name": "Firozabad Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 0, "area": 2362.0, "population": 2498156 },
            { "state": "Uttar Pradesh", "code": "UP013", "name": "Kasganj Nagar Palika Parishad", "natureOfUlb": "Nagar Palika Parishad", "type": "Municipality", "wards": 0, "area": 14.0, "population": 262801 },
            { "state": "Uttar Pradesh", "code": "UP014", "name": "Mirzapur-Cum-Vindhyachal Nagar Palika Parishad", "natureOfUlb": "Nagar Palika Parishad", "type": "Municipality", "wards": 0, "area": 4521.0, "population": 2496970 },
            { "state": "Uttar Pradesh", "code": "UP015", "name": "Saharanpur Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 86, "area": 46.7, "population": 705478 },
            { "state": "Uttar Pradesh", "code": "UP016", "name": "Kanpur Municipal Corporation", "natureOfUlb": "Municipal Corporation", "type": "Municipal Corporation", "wards": 110, "area": 450, "population": 2765348 },
            { "state": "Uttar Pradesh", "code": "UP017", "name": "Loni Nagar Palika Parishad", "natureOfUlb": "Nagar Palika Parishad", "type": "Nagar Palika Parishad", "wards": 45, "area": 35, "population": 516082 },
            { "state": "Uttar Pradesh", "code": "UP018", "name": "Lucknow Nagar Nigam", "natureOfUlb": "Nagar Nigam", "type": "Nagar Nigam", "wards": 0, "area": 2528, "population": 9649 },
            { "state": "Uttar Pradesh", "code": "UP019", "name": "Moradabad Nagar Nigam", "natureOfUlb": "Nagar Nigam", "type": "Nagar Nigam", "wards": 0, "area": 3741, "population": 31305 },
            { "state": "Uttar Pradesh", "code": "UP020", "name": "Varanasi Nagar Nigam", "natureOfUlb": "Nagar Nigam", "type": "Nagar Nigam", "wards": 0, "area": 0, "population": 7561 },
        ]
    },
    WB: {
        "state": "West Bengal",
        "ulbs": [
            { "state": "West Bengal", "code": "WB001", "name": "Kanchrapara Municipality", "natureOfUlb": "Municipality", "type": "Municipality", "wards": 24, "area": 9.1, "population": 129576 },
            { "state": "West Bengal", "code": "WB002", "name": "Panihati Nagar Palika Parishad", "natureOfUlb": "Nagar Palika Parishad", "type": "Municipality", "wards": 30, "area": 19.4, "population": 377351 }
        ]
    }
}