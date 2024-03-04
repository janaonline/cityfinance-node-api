const DashboardHeaders = require("../../models/Headers");
const ObjectId = require("mongoose").Types.ObjectId;
const Response = require("../../service").response;

module.exports.create = async (req, res) => {
  const data = req.body;
  try {
    let dashboardHeaders = new DashboardHeaders(data);
    dashboardHeaders = await dashboardHeaders.save();
    return res.json({ msg: "DashboardHeaders created!", dashboardHeaders });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "server error" });
  }
};

exports.read = async (req, res) => {
  try {
    const categories = await DashboardHeaders.find().sort({ name: 1 });
    return res.json(categories);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "server error" });
  }
};

exports.readById = async (req, res) => {
  const { id } = req.params;
  try {
    const dashboardHeaders = await DashboardHeaders.find({
      dashboard: ObjectId(id),
      isActive: true
    });
    if (!dashboardHeaders) {
      return res.status(400).json({ msg: "No DashboardHeaders Found" });
    }
    return Response.OK(res, dashboardHeaders);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "server error" });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const dashboardHeaders = await DashboardHeaders.findByIdAndUpdate(
      id,
      { name },
      {
        returnOriginal: false,
      }
    );

    if (!dashboardHeaders)
      return res.json({ msg: `No DashboardHeaders with that id of ${id}` });

    res.status(200).json({ success: true, data: dashboardHeaders });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "server error" });
  }
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  try {
    const dashboardHeaders = await DashboardHeaders.findByIdAndRemove(id);

    if (!dashboardHeaders) {
      return res.status(400).json({ msg: "No DashboardHeaders found" });
    }

    res.status(200).json({ msg: "DashboardHeaders Deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "server error" });
  }
};
