// routes_v2/ledger/tests/indicators.test.js
beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterAll(() => {
  console.error.mockRestore();
});

jest.mock("../../../models/ledgerIndicators", () => ({}));

// ✅ Mock ULB model
jest.mock("../../../models/Ulb", () => ({
  find: jest.fn().mockReturnValue({ exec: jest.fn() }),
}));

// ✅ Mock helper with .default (since indicators.js uses require("./helper").default)
jest.mock("../helper", () => ({
  __esModule: true,
  default: {
    getInfoHTML: jest.fn(),
    CompareBygroupIndicators: jest.fn(),
    formatToCroreSummary: jest.fn(),
    safeDivide: jest.fn(),
    normalize: jest.fn(),
    safePercent: jest.fn(),
  },
}));

const {
  getUlbDetailsById,
  getIndicatorsNameCompareByPage,
} = require("../indicators");
const ulb = require("../../../models/Ulb");

describe("getUlbDetailsById Controller", () => {
  let req, res;

  beforeEach(() => {
    req = { query: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return 400 if slug is missing", async () => {
    await getUlbDetailsById(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "ulbId is required" });
  });

  it("should return 404 if no ULBs found", async () => {
    req.query.slug = "nonexistent";
    ulb.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });

    await getUlbDetailsById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "ULB not found" });
  });

  it("should return 200 with ulbDetails if found", async () => {
    req.query.slug = "bengaluru";
    const mockData = [{ _id: "1", name: "Test ULB", slug: "bengaluru" }];
    ulb.find.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockData) });

    await getUlbDetailsById(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ulbDetails: mockData });
  });

  it("should return 500 on error", async () => {
    req.query.slug = "bengaluru";
    ulb.find.mockReturnValue({
      exec: jest.fn().mockRejectedValue(new Error("DB error")),
    });

    await getUlbDetailsById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Internal Server Error" });
  });
});

describe("getIndicatorsNameCompareByPage Controller", () => {
  let req, res;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return 200 with mapped data", async () => {
    // Arrange: fake CompareBygroupIndicators from helper.js
    const mockIndicators = [
      {
        label: "Group A",
        key: "group-a",
        indicators: [
          { key: "ind-1", name: "Indicator 1" },
          { key: "ind-2", name: "Indicator 2" },
        ],
      },
    ];
    require("../helper").default.CompareBygroupIndicators = mockIndicators;

    // Act
    await getIndicatorsNameCompareByPage(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: [
        {
          label: "Group A",
          key: "group-a",
          isActive: false,
          children: [
            { key: "ind-1", label: "Indicator 1", isActive: false },
            { key: "ind-2", label: "Indicator 2", isActive: false },
          ],
        },
      ],
    });
  });

  it("should return 500 on error", async () => {
    // Force CompareBygroupIndicators.map to throw
    require("../helper").default.CompareBygroupIndicators = null;

    await getIndicatorsNameCompareByPage(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Internal Server Error" });
  });
});
