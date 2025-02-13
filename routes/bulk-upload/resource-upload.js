const resource = require("../../models/Resources");
const service = require("../../service");
const Response = require("../../service").response;

module.exports = async function (req, res) {

	if (req.files) {

		let reqBody = {};
		reqBody["name"] = req.body.name;
		var reqFile = req.files;
		if (reqFile.pdf) {
			for (e of reqFile.pdf) {
				if (e.originalname.split('.')[e.originalname.split('.').length - 1] === 'pdf') {
					let dir = e.destination.split('/')[e.destination.split('/').length - 1];
					let downloadUrl = req.protocol + "://" + req.headers.host + "/" + dir + "/" + e.filename;
					reqBody["downloadUrl"] = downloadUrl;
				}
			}
		}

		if (reqFile.image) {

			for (i of reqFile.image) {

				let type = (i.originalname.split('.')[i.originalname.split('.').length - 1]).toLowerCase()
				if (type == 'png' || type == 'jpg') {
					let dir = i.destination.split('/')[i.destination.split('/').length - 1];
					let image = req.protocol + "://" + req.headers.host + "/" + dir + "/" + i.filename;
					reqBody["imageUrl"] = image;
				}
			}
		}

		let d = await resource.findOne({ "downloadUrl": reqBody["downloadUrl"] }).exec();

		if (d) {
			let update = { $set: { imageUrl: reqBody["imageUrl"], downloadUrl: reqBody["downloadUrl"] } }
			let ud = await resource.update({ "_id": d._id }, update);
			return Response.OK(res, ud, "update successfully");
		}
		else {
			service.post(resource, reqBody, function (response, value) {
				return res.status(response ? 200 : 400).send(value);
			});
		}

	}
}

module.exports.getResource = function (req, res) {

	service.find({ isActive: true }, resource, function (response, value) {

		return Response.OK(res, value, `success`);
	})
}