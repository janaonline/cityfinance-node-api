var awsService = require("./s3-services");
module.exports = async function (req, res) {
    try {
        if (req.body && Array.isArray(req.body)) {
            let data = [];
            for (single of req.body) {
                const params = {
                    folder: single.folder,
                    file_name: encodeURIComponent(single.file_name), 
                    mime_type: single.mime_type
                }
                // get unresolved signed url
                data.push(awsService.generateSignedUrl(params));
            }
            let resolved = await Promise.all(data);
            return res.status(200).json({ success: true, data: resolved });
        } else {
            return res.status(400).json({ success: false, data: req.body });
        }
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Something went wrong!" });
    }
};