const FormsMasterCategory = require('../../models/FormsMasterCategory');

module.exports.createCategory = async (req, res)=>{
   try {
       const data = req.body;
   
       const category = await FormsMasterCategory.create(data);
       if(category){
           return res.status(200).json({
               status: true,
               data: category
           });
       }
       return res.status(400).json({
            status: false,
            message: "Category not created"
       })
   } catch (error) {
     return res.status(400).json({
        status: false,
        "message": "Failed to create category"
     })
   }
}

module.exports.getCategory = async (req, res)=>{
    try {
        const categories = await FormsMasterCategory.find();
        if(categories){
            return res.status(200).json({
                status: true,
                data: categories
            });
        }
        return res.status(400).json({
             status: false,
             message: "Category not created"
        })
    } catch (error) {
      return res.status(400).json({
         status: false,
         "message": "Failed to create category"
      })
    }
}