const MainCategory = require('./MainCategory');
const SubCategory = require('./SubCategory');
const Video = require('./Video');
const CategoryFileUpload = require('../../models/CategoryFileUpload')
const StateResource = require('../../models/StateResource')
module.exports.dbModels = {
    MainCategory,
    SubCategory,
    CategoryFileUpload,
    Video,
    StateResource
}


