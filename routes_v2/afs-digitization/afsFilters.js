const Ulb = require("../../models/Ulb");
const State = require("../../models/State");
const FinancialYear = require("../../models/FinancialYear");



module.exports.getAFSFilterData = async (req, res) => {
  try {
    const [states, rawCities, years] = await Promise.all([
      State.find({ isActive: true }, { _id: 1, name: 1 }).sort({ name: 1 }),
      Ulb.find({}, { _id: 1, name: 1, population: 1, state: 1,  code: 1  }).populate('state', 'name').sort({ name: 1 }),
      FinancialYear.find({ isActive: true }, { _id: 1, name: 1 }).sort({ name: -1 }),
   
    ]);


const documentTypes = [
  {
    heading: 'AFS',
    items: [
       { key: 'bal_sheet', name: 'Balance Sheet' },
       { key: 'bal_sheet_schedules', name: 'Schedules To Balance Sheet' },
       { key: 'inc_exp', name: 'Income And Expenditure' },
       { key: 'inc_exp_schedules', name: 'Schedules To Income And Expenditure' },
       { key: 'cash_flow', name: 'Cash Flow Statement' },
       { key: '16th_fc', name: '16th FC (*always audited*)' }
    ]
  }
];
 


const latestYears = [
  { name: "2021-22" },
  { name: "2022-23" },
  { name: "2023-24" },
  { name: "2024-25" },
  { name: "2025-26" }
];

const existingYearNames = new Set(years.map(y => y.name));
latestYears.forEach(y => {
  if (!existingYearNames.has(y.name)) {
    years.push({ _id: null, name: y.name });
  }
});

years.sort((a, b) => b.name.localeCompare(a.name)); 
    

    const populationCategoriesSet = new Set();
    const categorizedCities = rawCities.map(city => {
      let pop = city.population || 0;
      let category = ""; 

      if (pop < 100_000) category = "<100K"; 
      else if (pop < 500_000) category = "100K–500K";
      else if (pop < 1_000_000) category = "500K–1M";
      else if (pop < 4_000_000) category = "1M–4M"; 
      else category = "4M+"; 

      populationCategoriesSet.add(category);

      return {
        _id: city._id,
        name: city.name,
        code: city.code || "",   
        populationCategory: category,
        stateName: city.state?.name || "", 
        stateId: city.state?._id.toString()|| "" 
      };
    });

    return res.status(200).json({
      success: true,
      filters: {
        states,
        populationCategories: ["All", ...Array.from(populationCategoriesSet).sort()],
        cities: categorizedCities,
        years,
        documentTypes
      }
    });
  } catch (error) {
    console.error("AFS Filter Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch AFS filters",
    });
  } 
};




// const Ulb = require("../../models/Ulb");
// const State = require("../../models/State");
// const FinancialYear = require("../../models/FinancialYear");

// module.exports.getAFSFilterData = async (req, res) => {
//   try {
//     const { stateId } = req.query; 

//     const [states, years, allCities] = await Promise.all([
//       State.find({ isActive: true }, { _id: 1, name: 1 }).sort({ name: 1 }),
//       FinancialYear.find({ isActive: true }, { _id: 1, name: 1 }).sort({ name: -1 }),
//       Ulb.find({}, { _id: 1, name: 1, population: 1, state: 1, code: 1 })
//         .populate("state", "name")
//         .sort({ name: 1 }),
//     ]);

    
//     const populationCategoriesSet = new Set();
//     allCities.forEach((city) => {
//       let pop = city.population || 0;
//       if (pop < 100_000) populationCategoriesSet.add("<100K");
//       else if (pop < 500_000) populationCategoriesSet.add("100K–500K");
//       else if (pop < 1_000_000) populationCategoriesSet.add("500K–1M");
//       else if (pop < 4_000_000) populationCategoriesSet.add("1M–4M");
//       else populationCategoriesSet.add("4M+");
//     });

//     let filteredCities = [];
//     if (stateId) {
//       filteredCities = allCities
//         .filter((c) => c.state?._id.toString() === stateId)
//         .map((city) => {
//           let pop = city.population || 0;
//           let category = "";
//           if (pop < 100_000) category = "<100K";
//           else if (pop < 500_000) category = "100K–500K";
//           else if (pop < 1_000_000) category = "500K–1M";
//           else if (pop < 4_000_000) category = "1M–4M";  
//           else category = "4M+";

//           return {
//             _id: city._id,
//             name: city.name,
//             code: city.code || "",
//             populationCategory: category,
//             stateName: city.state?.name || "",
//             stateId: city.state?._id.toString() || "",
//           };
//         });
//     }

   
//     const documentTypes = [
//       {
//         heading: "AFS",
//         items: [
//           { key: "bal_sheet", name: "Balance Sheet" },
//           { key: "bal_sheet_schedules", name: "Schedules To Balance Sheet" },
//           { key: "inc_exp", name: "Income And Expenditure" },
//           { key: "inc_exp_schedules", name: "Schedules To Income And Expenditure" },
//           { key: "cash_flow", name: "Cash Flow Statement" },
//         ],
//       },
//       {
//         heading: "Others (*always audited*)",
//         items: [{ key: "16th_fc", name: "16th FC" }],
//       },
//     ];

//     const latestYears = [
//       { name: "2021-22" },
//       { name: "2022-23" },
//       { name: "2023-24" },
//       { name: "2024-25" },
//       { name: "2025-26" },
//     ];

//     const existingYearNames = new Set(years.map((y) => y.name));
//     latestYears.forEach((y) => {
//       if (!existingYearNames.has(y.name)) {
//         years.push({ _id: null, name: y.name });
//       }
//     });
//     years.sort((a, b) => b.name.localeCompare(a.name));

//     return res.status(200).json({
//       success: true,
//       filters: {
//         states,
//         populationCategories: ["All", ...Array.from(populationCategoriesSet).sort()],
//         cities: filteredCities, //  empty until a state is chosen
//         years,
//         documentTypes,
//       },
//     });
//   } catch (error) {
//     console.error("AFS Filter Error:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch AFS filters",
//     });
//   }
// };
