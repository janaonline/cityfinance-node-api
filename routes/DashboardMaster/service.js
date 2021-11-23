const DashboardMaster = require("../../models/DashboardMaster");

module.exports.create = async (req, res) => {
  const { name } = req.body;
  try {
    let dashboardMaster = new DashboardMaster({ name });
    dashboardMaster = await dashboardMaster.save();
    return res.json({ msg: "DashboardMaster created!", DashboardMaster });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "server error" });
  }
};

exports.read = async (req, res) => {
  try {
    const categories = await DashboardMaster.find().sort({name:1});
    return res.json(categories);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "server error" });
  }
};

exports.readById = async (req, res) => {
  const { id } = req.params;
  try {
    const DashboardMaster = await DashboardMaster.findById(id);
    if (!DashboardMaster) {
      return res.status(400).json({ msg: "No DashboardMaster Found" });
    }
    return res.json(DashboardMaster);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "server error" });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const DashboardMaster = await DashboardMaster.findByIdAndUpdate(
      id,
      { name },
      {
        returnOriginal: false,
      }
    );

    if (!DashboardMaster)
      return res.json({ msg: `No DashboardMaster with that id of ${id}` });

    res.status(200).json({ success: true, data: DashboardMaster });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "server error" });
  }
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  try {
    const DashboardMaster = await DashboardMaster.findByIdAndRemove(id);

    if (!DashboardMaster) {
      return res.status(400).json({ msg: "No DashboardMaster found" });
    }

    res.status(200).json({ msg: "DashboardMaster Deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "server error" });
  }
};
