const Category = require("../../models/Category");

module.exports.create = async (req, res) => {
  const { name } = req.body;
  try {
    let category = new Category({ name });
    category = await category.save();
    return res.json({ msg: "category created!", category });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "server error" });
  }
};

exports.read = async (req, res) => {
  try {
    const categories = await Category.find().sort({name:1});
    return res.json(categories);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "server error" });
  }
};

exports.readById = async (req, res) => {
  const { id } = req.params;
  try {
    const category = await Category.findById(id);
    if (!category) {
      return res.status(400).json({ msg: "No Category Found" });
    }
    return res.json(category);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "server error" });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const category = await Category.findByIdAndUpdate(
      id,
      { name },
      {
        returnOriginal: false,
      }
    );

    if (!category)
      return res.json({ msg: `No category with that id of ${id}` });

    res.status(200).json({ success: true, data: category });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "server error" });
  }
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  try {
    const category = await Category.findByIdAndRemove(id);

    if (!category) {
      return res.status(400).json({ msg: "No category found" });
    }

    res.status(200).json({ msg: "Category Deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "server error" });
  }
};
