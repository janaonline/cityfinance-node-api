const mongoose = require('mongoose');
const { Types } = mongoose;
const marketReadinessModule = require('./marketReadiness');

// Mock dependencies
jest.mock('../../models/LedgerLog');
jest.mock('../../models/Ulb');
jest.mock('../../models/Year');
jest.mock('../../models/PropertyTaxOpMapper');
jest.mock('../../models/State');

const ledgerLog = require('../../models/LedgerLog');
const ulb = require('../../models/Ulb');
const financialYear = require('../../models/Year');
const propertyTax = require('../../models/PropertyTaxOpMapper');
const State = require('../../models/State');

describe('Market Readiness API Tests', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      query: {},
      body: {},
      params: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  // ============================================
  // Tests for getAllStates
  // ============================================
  describe('getAllStates', () => {
    it('should return all non-excluded states sorted by name', async () => {
      const mockStates = [
        { _id: new Types.ObjectId(), name: 'Gujarat' },
        { _id: new Types.ObjectId(), name: 'Maharashtra' },
        { _id: new Types.ObjectId(), name: 'Tamil Nadu' },
      ];

      State.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockStates),
      });

      await marketReadinessModule.getAllStates(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ states: mockStates });
    });

    it('should exclude test states', async () => {
      const mockStates = [
        { _id: new Types.ObjectId(), name: 'Maharashtra' },
      ];

      State.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockStates),
      });

      await marketReadinessModule.getAllStates(mockReq, mockRes);

      // Verify the find was called with $nin excluding test states
      expect(State.find).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.objectContaining({
            $nin: expect.arrayContaining(['TEST STATE', 'Chandigarh']),
          }),
        })
      );
    });

    it('should handle empty state list', async () => {
      State.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      await marketReadinessModule.getAllStates(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ states: [] });
    });

    it('should handle database errors', async () => {
      State.find.mockImplementation(() => {
        throw new Error('Database error');
      });

      await marketReadinessModule.getAllStates(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Internal server error',
      });
    });
  });

  // ============================================
  // Tests for marketReadinessDataByUlb
  // ============================================
  describe('marketReadinessDataByUlb', () => {
    it('should return 400 when ulbId is missing', async () => {
      mockReq.query = { year: '2021-22' };

      await marketReadinessModule.marketReadinessDataByUlb(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'ulbId and year are required parameters.',
      });
    });

    it('should return 400 when year is missing', async () => {
      mockReq.query = { ulbId: new Types.ObjectId().toString() };

      await marketReadinessModule.marketReadinessDataByUlb(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when ULB is not found', async () => {
      const ulbId = new Types.ObjectId();
      mockReq.query = { ulbId: ulbId.toString(), year: '2021-22' };

      ulb.findById.mockResolvedValue(null);

      await marketReadinessModule.marketReadinessDataByUlb(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'ULB not found.',
      });
    });

    it('should return 200 when data is not found for both years', async () => {
      const ulbId = new Types.ObjectId();
      mockReq.query = { ulbId: ulbId.toString(), year: '2021-22' };

      ulb.findById.mockResolvedValue({ name: 'Test City' });
      financialYear.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      });

      await marketReadinessModule.marketReadinessDataByUlb(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Data not found for the specified ULB and years ',
      });
    });

    it('should return 200 when ledger data is incomplete', async () => {
      const ulbId = new Types.ObjectId();
      const yearId = new Types.ObjectId();
      mockReq.query = { ulbId: ulbId.toString(), year: '2021-22' };

      ulb.findById.mockResolvedValue({ name: 'Test City' });
      financialYear.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([{ _id: yearId, year: '2021-22' }]),
      });
      ledgerLog.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([
          { ulb_id: ulbId, year: '2021-22', indicators: {}, lineItems: {} },
        ]),
      });

      await marketReadinessModule.marketReadinessDataByUlb(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Data not found for the specified ULB and years',
      });
    });

    it('should return complete market readiness data on success', async () => {
      const ulbId = new Types.ObjectId();
      const yearId1 = new Types.ObjectId();
      const yearId2 = new Types.ObjectId();

      mockReq.query = { ulbId: ulbId.toString(), year: '2021-22' };

      ulb.findById.mockResolvedValue({ name: 'Pune' });

      financialYear.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([
          { _id: yearId1, year: '2021-22' },
          { _id: yearId2, year: '2020-21' },
        ]),
      });

      const mockIndicators = {
        totRevenue: 5000,
        totOwnRevenue: 2000,
        totRevenueExpenditure: 4000,
        totDebtByTotOwnRevenue: 2,
        iscrRatio: 2.5,
        qaRatio: 0.8,
        grantsByTotRevenue: 30,
        totOwnRevenueByTotRevenue: 40,
        OperSurplusTotRevenueExpenditure: 3500,
      };

      ledgerLog.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([
          {
            ulb_id: ulbId,
            year: '2021-22',
            indicators: mockIndicators,
            lineItems: {
              '210': 100,
              '220': 50,
              '230': 200,
              '431': 10,
              '432': 5,
            },
          },
          {
            ulb_id: ulbId,
            year: '2020-21',
            indicators: { totRevenue: 4000, totOwnRevenue: 1800 },
            lineItems: {},
          },
        ]),
      });

      propertyTax.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([
          { displayPriority: '1.9', value: 1000, year: yearId1 },
          { displayPriority: '1.17', value: 950, year: yearId1 },
        ]),
      });

      await marketReadinessModule.marketReadinessDataByUlb(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const callArgs = mockRes.json.mock.calls[0][0];
      expect(callArgs).toHaveProperty('ulbId');
      expect(callArgs).toHaveProperty('ulbName', 'Pune');
      expect(callArgs).toHaveProperty('year', '2021-22');
      expect(callArgs).toHaveProperty('sections');
      expect(callArgs).toHaveProperty('sectionScores');
      expect(callArgs).toHaveProperty('overallScore');
      expect(callArgs).toHaveProperty('marketReadinessBand');
    });

    it('should handle missing debt data and derive score', async () => {
      const ulbId = new Types.ObjectId();
      const yearId1 = new Types.ObjectId();
      const yearId2 = new Types.ObjectId();

      mockReq.query = { ulbId: ulbId.toString(), year: '2021-22' };

      ulb.findById.mockResolvedValue({ name: 'Mumbai' });

      financialYear.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([
          { _id: yearId1, year: '2021-22' },
          { _id: yearId2, year: '2020-21' },
        ]),
      });

      const mockIndicators = {
        totRevenue: 5000,
        totOwnRevenue: 2000,
        totRevenueExpenditure: 4000,
        // Missing: totDebtByTotOwnRevenue
        iscrRatio: 2.5,
        qaRatio: 0.8,
        grantsByTotRevenue: 30,
        totOwnRevenueByTotRevenue: 40,
        OperSurplusTotRevenueExpenditure: 3500,
      };

      ledgerLog.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([
          {
            ulb_id: ulbId,
            year: '2021-22',
            indicators: mockIndicators,
            lineItems: {
              '210': 100,
              '220': 50,
              '230': 200,
              '431': 10,
              '432': 5,
            },
          },
          {
            ulb_id: ulbId,
            year: '2020-21',
            indicators: { totRevenue: 4000, totOwnRevenue: 1800 },
            lineItems: {},
          },
        ]),
      });

      propertyTax.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      });

      await marketReadinessModule.marketReadinessDataByUlb(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const callArgs = mockRes.json.mock.calls[0][0];
      expect(callArgs).toHaveProperty('footNote');
      expect(callArgs.footNote).toContain('debt');
    });

    it('should handle errors gracefully', async () => {
      mockReq.query = { ulbId: new Types.ObjectId(), year: '2021-22' };

      ulb.findById.mockRejectedValue(new Error('Database error'));

      await marketReadinessModule.marketReadinessDataByUlb(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Internal server error',
      });
    });
  });

  // ============================================
  // Tests for getAllUlbsMarketReadiness
  // ============================================
  describe('getAllUlbsMarketReadiness', () => {
    it('should return 400 when year is missing', async () => {
      mockReq.query = {};

      await marketReadinessModule.getAllUlbsMarketReadiness(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'year is required',
      });
    });

    it('should return paginated list of ULBs', async () => {
      mockReq.query = {
        year: '2021-22',
        page: 1,
        limit: 10,
      };

      const mockData = [
        {
          city: 'Pune',
          state: 'Maharashtra',
          populationCategory: '1M–4M',
          bandPrevYear: 'B (Aspirational)',
          bandCurrYear: 'A3 (Moderately Prepared)',
          score: 52.5,
          delta: 2.5,
          nextMilestone: '3.5 points to A2 (Well Prepared)',
        },
      ];

      ledgerLog.aggregate
        .mockResolvedValueOnce([{ total: 1 }]) // total count
        .mockResolvedValueOnce(mockData); // actual data

      await marketReadinessModule.getAllUlbsMarketReadiness(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const callArgs = mockRes.json.mock.calls[0][0];
      expect(callArgs).toHaveProperty('page', 1);
      expect(callArgs).toHaveProperty('limit', 10);
      expect(callArgs).toHaveProperty('totalRecords', 1);
      expect(callArgs).toHaveProperty('data');
    });

    it('should filter by state', async () => {
      mockReq.query = {
        year: '2021-22',
        state: 'Maharashtra',
        page: 1,
        limit: 10,
      };

      ledgerLog.aggregate
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([]);

      await marketReadinessModule.getAllUlbsMarketReadiness(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should filter by city name', async () => {
      mockReq.query = {
        year: '2021-22',
        city: 'Pune',
        page: 1,
        limit: 10,
      };

      ledgerLog.aggregate
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([]);

      await marketReadinessModule.getAllUlbsMarketReadiness(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should filter by population category', async () => {
      mockReq.query = {
        year: '2021-22',
        populationCategory: '1M–4M',
        page: 1,
        limit: 10,
      };

      ledgerLog.aggregate
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([]);

      await marketReadinessModule.getAllUlbsMarketReadiness(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should filter by market readiness band', async () => {
      mockReq.query = {
        year: '2021-22',
        band: 'A1 (Highly Prepared)',
        page: 1,
        limit: 10,
      };

      ledgerLog.aggregate
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([]);

      await marketReadinessModule.getAllUlbsMarketReadiness(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should sort by population category', async () => {
      mockReq.query = {
        year: '2021-22',
        sortBy: 'populationCategory',
        sortOrder: 'asc',
        page: 1,
        limit: 10,
      };

      ledgerLog.aggregate
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([]);

      await marketReadinessModule.getAllUlbsMarketReadiness(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should sort by city name', async () => {
      mockReq.query = {
        year: '2021-22',
        sortBy: 'city',
        sortOrder: 'desc',
        page: 1,
        limit: 10,
      };

      ledgerLog.aggregate
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([]);

      await marketReadinessModule.getAllUlbsMarketReadiness(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle pagination correctly', async () => {
      mockReq.query = {
        year: '2021-22',
        page: 2,
        limit: 5,
      };

      ledgerLog.aggregate
        .mockResolvedValueOnce([{ total: 15 }])
        .mockResolvedValueOnce([]);

      await marketReadinessModule.getAllUlbsMarketReadiness(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const callArgs = mockRes.json.mock.calls[0][0];
      expect(callArgs.totalPages).toBe(3);
    });

    it('should handle database errors', async () => {
      mockReq.query = { year: '2021-22' };

      ledgerLog.aggregate.mockImplementation(() => {
        throw new Error('Aggregation error');
      });

      await marketReadinessModule.getAllUlbsMarketReadiness(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Internal server error',
      });
    });
  });

  // ============================================
  // Tests for getUlbSlugByName
  // ============================================
  describe('getUlbSlugByName', () => {
    it('should return 400 when name is missing', async () => {
      mockReq.query = {};

      await marketReadinessModule.getUlbSlugByName(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'ULB name is required',
      });
    });

    it('should return ULB data by name (case-insensitive)', async () => {
      const ulbData = {
        _id: new Types.ObjectId(),
        name: 'Pune',
        slug: 'pune',
      };

      mockReq.query = { name: 'pune' };

      ulb.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(ulbData),
      });

      await marketReadinessModule.getUlbSlugByName(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        ulbId: ulbData._id,
        ulbName: ulbData.name,
        slug: ulbData.slug,
      });
    });

    it('should return 404 when ULB is not found', async () => {
      mockReq.query = { name: 'NonExistentCity' };

      ulb.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await marketReadinessModule.getUlbSlugByName(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'ULB not found',
      });
    });

    it('should handle database errors', async () => {
      mockReq.query = { name: 'Pune' };

      ulb.findOne.mockImplementation(() => {
        throw new Error('Database error');
      });

      await marketReadinessModule.getUlbSlugByName(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Internal server error',
      });
    });
  });

  // ============================================
  // Tests for getPreviousFinancialYear
  // ============================================
  describe('getPreviousFinancialYear', () => {
    it('should return previous financial year correctly', () => {
      const result = marketReadinessModule.getPreviousFinancialYear('2021-22');
      expect(result).toBe('2020-21');
    });

    it('should handle year 2020-21', () => {
      const result = marketReadinessModule.getPreviousFinancialYear('2020-21');
      expect(result).toBe('2019-20');
    });

    it('should handle year 2000-01', () => {
      const result = marketReadinessModule.getPreviousFinancialYear('2000-01');
      expect(result).toBe('1999-00');
    });

    it('should work with various years', () => {
      const result = marketReadinessModule.getPreviousFinancialYear('2025-26');
      expect(result).toBe('2024-25');
    });
  });

  // ============================================
  // Edge Cases and Error Scenarios
  // ============================================
  describe('Edge Cases and Error Scenarios', () => {
    it('should handle null indicators gracefully', async () => {
      const ulbId = new Types.ObjectId();
      const yearId1 = new Types.ObjectId();
      const yearId2 = new Types.ObjectId();

      mockReq.query = { ulbId: ulbId.toString(), year: '2021-22' };

      ulb.findById.mockResolvedValue({ name: 'Test City' });

      financialYear.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([
          { _id: yearId1, year: '2021-22' },
          { _id: yearId2, year: '2020-21' },
        ]),
      });

      ledgerLog.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([
          {
            ulb_id: ulbId,
            year: '2021-22',
            indicators: null, // null indicators
            lineItems: {},
          },
          {
            ulb_id: ulbId,
            year: '2020-21',
            indicators: null,
            lineItems: {},
          },
        ]),
      });

      propertyTax.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      });

      await marketReadinessModule.marketReadinessDataByUlb(mockReq, mockRes);

      // Should still return a response (not an error)
      expect(mockRes.status).toHaveBeenCalled();
    });

    it('should handle zero values in calculations', async () => {
      const ulbId = new Types.ObjectId();
      const yearId1 = new Types.ObjectId();
      const yearId2 = new Types.ObjectId();

      mockReq.query = { ulbId: ulbId.toString(), year: '2021-22' };

      ulb.findById.mockResolvedValue({ name: 'Test City' });

      financialYear.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([
          { _id: yearId1, year: '2021-22' },
          { _id: yearId2, year: '2020-21' },
        ]),
      });

      const mockIndicators = {
        totRevenue: 0, // zero revenue
        totOwnRevenue: 0,
        totRevenueExpenditure: 0,
        OperSurplusTotRevenueExpenditure: 0,
      };

      ledgerLog.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([
          {
            ulb_id: ulbId,
            year: '2021-22',
            indicators: mockIndicators,
            lineItems: {
              '210': 0,
              '220': 0,
              '230': 0,
              '431': 0,
              '432': 0,
            },
          },
          {
            ulb_id: ulbId,
            year: '2020-21',
            indicators: mockIndicators,
            lineItems: {},
          },
        ]),
      });

      propertyTax.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      });

      await marketReadinessModule.marketReadinessDataByUlb(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle very large numbers', async () => {
      const ulbId = new Types.ObjectId();
      const yearId1 = new Types.ObjectId();
      const yearId2 = new Types.ObjectId();

      mockReq.query = { ulbId: ulbId.toString(), year: '2021-22' };

      ulb.findById.mockResolvedValue({ name: 'Large City' });

      financialYear.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([
          { _id: yearId1, year: '2021-22' },
          { _id: yearId2, year: '2020-21' },
        ]),
      });

      const mockIndicators = {
        totRevenue: 999999999999,
        totOwnRevenue: 999999999999,
        totRevenueExpenditure: 999999999999,
        totDebtByTotOwnRevenue: 2,
        iscrRatio: 2.5,
        qaRatio: 0.8,
        grantsByTotRevenue: 30,
        totOwnRevenueByTotRevenue: 40,
        OperSurplusTotRevenueExpenditure: 500000000,
      };

      ledgerLog.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([
          {
            ulb_id: ulbId,
            year: '2021-22',
            indicators: mockIndicators,
            lineItems: {
              '210': 100000000,
              '220': 50000000,
              '230': 200000000,
              '431': 10000000,
              '432': 5000000,
            },
          },
          {
            ulb_id: ulbId,
            year: '2020-21',
            indicators: {
              totRevenue: 999999999998,
              totOwnRevenue: 999999999998,
            },
            lineItems: {},
          },
        ]),
      });

      propertyTax.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      });

      await marketReadinessModule.marketReadinessDataByUlb(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle negative values correctly', async () => {
      const ulbId = new Types.ObjectId();
      const yearId1 = new Types.ObjectId();
      const yearId2 = new Types.ObjectId();

      mockReq.query = { ulbId: ulbId.toString(), year: '2021-22' };

      ulb.findById.mockResolvedValue({ name: 'Test City' });

      financialYear.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([
          { _id: yearId1, year: '2021-22' },
          { _id: yearId2, year: '2020-21' },
        ]),
      });

      const mockIndicators = {
        totRevenue: 5000,
        totOwnRevenue: 2000,
        totRevenueExpenditure: 4000,
        totDebtByTotOwnRevenue: 2,
        iscrRatio: -1, // negative
        qaRatio: 0.8,
        grantsByTotRevenue: 30,
        totOwnRevenueByTotRevenue: 40,
        OperSurplusTotRevenueExpenditure: 4500, // deficit
      };

      ledgerLog.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([
          {
            ulb_id: ulbId,
            year: '2021-22',
            indicators: mockIndicators,
            lineItems: {
              '210': 100,
              '220': 50,
              '230': 200,
              '431': 10,
              '432': 5,
            },
          },
          {
            ulb_id: ulbId,
            year: '2020-21',
            indicators: { totRevenue: 4000, totOwnRevenue: 1800 },
            lineItems: {},
          },
        ]),
      });

      propertyTax.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      });

      await marketReadinessModule.marketReadinessDataByUlb(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const callArgs = mockRes.json.mock.calls[0][0];
      expect(callArgs.overallScore).toBeDefined();
    });

    it('should handle special characters in ULB names', async () => {
      mockReq.query = { name: "O'Brien City" };

      const ulbData = {
        _id: new Types.ObjectId(),
        name: "O'Brien City",
        slug: 'obrien-city',
      };

      ulb.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(ulbData),
      });

      await marketReadinessModule.getUlbSlugByName(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle multiple filter combinations', async () => {
      mockReq.query = {
        year: '2021-22',
        state: 'Maharashtra',
        city: 'Pune',
        populationCategory: '1M–4M',
        band: 'A1 (Highly Prepared)',
        page: 1,
        limit: 10,
      };

      ledgerLog.aggregate
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([]);

      await marketReadinessModule.getAllUlbsMarketReadiness(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  // ============================================
  // Integration Tests
  // ============================================
  describe('Integration Tests', () => {
    it('should fetch all states and then get readiness by ULB', async () => {
      // First call: getAllStates
      const mockStates = [
        { _id: new Types.ObjectId(), name: 'Maharashtra' },
      ];

      State.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockStates),
      });

      await marketReadinessModule.getAllStates(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);

      // Second call: marketReadinessDataByUlb
      jest.clearAllMocks();
      const ulbId = new Types.ObjectId();
      const yearId1 = new Types.ObjectId();
      const yearId2 = new Types.ObjectId();

      mockReq.query = { ulbId: ulbId.toString(), year: '2021-22' };

      ulb.findById.mockResolvedValue({ name: 'Pune' });

      financialYear.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([
          { _id: yearId1, year: '2021-22' },
          { _id: yearId2, year: '2020-21' },
        ]),
      });

      ledgerLog.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([
          {
            ulb_id: ulbId,
            year: '2021-22',
            indicators: {
              totRevenue: 5000,
              totOwnRevenue: 2000,
              totRevenueExpenditure: 4000,
              totDebtByTotOwnRevenue: 2,
              iscrRatio: 2.5,
              qaRatio: 0.8,
              grantsByTotRevenue: 30,
              totOwnRevenueByTotRevenue: 40,
              OperSurplusTotRevenueExpenditure: 3500,
            },
            lineItems: {},
          },
          {
            ulb_id: ulbId,
            year: '2020-21',
            indicators: { totRevenue: 4000, totOwnRevenue: 1800 },
            lineItems: {},
          },
        ]),
      });

      propertyTax.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      });

      await marketReadinessModule.marketReadinessDataByUlb(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should calculate scores correctly across different financial scenarios', async () => {
      const scenarios = [
        { name: 'High performer', totRevenue: 5000, totOwnRevenue: 3000 },
        { name: 'Low performer', totRevenue: 1000, totOwnRevenue: 200 },
        { name: 'Moderate performer', totRevenue: 3000, totOwnRevenue: 1200 },
      ];

      for (const scenario of scenarios) {
        jest.clearAllMocks();

        const ulbId = new Types.ObjectId();
        const yearId1 = new Types.ObjectId();
        const yearId2 = new Types.ObjectId();

        mockReq.query = { ulbId: ulbId.toString(), year: '2021-22' };

        ulb.findById.mockResolvedValue({ name: scenario.name });

        financialYear.find.mockReturnValue({
          select: jest.fn().mockResolvedValue([
            { _id: yearId1, year: '2021-22' },
            { _id: yearId2, year: '2020-21' },
          ]),
        });

        ledgerLog.find.mockReturnValue({
          select: jest.fn().mockResolvedValue([
            {
              ulb_id: ulbId,
              year: '2021-22',
              indicators: {
                totRevenue: scenario.totRevenue,
                totOwnRevenue: scenario.totOwnRevenue,
                totRevenueExpenditure: scenario.totRevenue * 0.9,
                totDebtByTotOwnRevenue: 2,
                iscrRatio: 2.5,
                qaRatio: 0.8,
                grantsByTotRevenue: 30,
                totOwnRevenueByTotRevenue:
                  (scenario.totOwnRevenue / scenario.totRevenue) * 100,
                OperSurplusTotRevenueExpenditure: scenario.totRevenue * 0.8,
              },
              lineItems: {
                '210': 100,
                '220': 50,
                '230': 200,
                '431': 10,
                '432': 5,
              },
            },
            {
              ulb_id: ulbId,
              year: '2020-21',
              indicators: {
                totRevenue: scenario.totRevenue * 0.9,
                totOwnRevenue: scenario.totOwnRevenue * 0.9,
              },
              lineItems: {},
            },
          ]),
        });

        propertyTax.find.mockReturnValue({
          select: jest.fn().mockResolvedValue([]),
        });

        await marketReadinessModule.marketReadinessDataByUlb(
          mockReq,
          mockRes
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
      }
    });
  });
});
