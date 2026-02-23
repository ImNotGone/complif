import { RiskEngineService } from './risk-engine.service';
import { DocumentType } from '@prisma/client';

function makeDoc(type: DocumentType, deletedAt: Date | null = null) {
  return { type, deletedAt };
}

const ALL_DOCS = [
  makeDoc(DocumentType.TAX_CERTIFICATE),
  makeDoc(DocumentType.REGISTRATION),
  makeDoc(DocumentType.INSURANCE_POLICY),
];

describe('RiskEngineService', () => {
  let service: RiskEngineService;

  beforeEach(() => {
    service = new RiskEngineService();
  });

  describe('calculateRisk — country risk', () => {
    it('adds 40 points for a high-risk country (PA)', () => {
      const result = service.calculateRisk('PA', 'software', ALL_DOCS);
      expect(result.countryRisk).toBe(40);
    });

    it('adds 40 points for all known high-risk countries', () => {
      const highRisk = ['PA', 'VG', 'KY', 'CH', 'LI', 'MC'];
      highRisk.forEach((country) => {
        const result = service.calculateRisk(country, 'software', ALL_DOCS);
        expect(result.countryRisk).toBe(40);
      });
    });

    it('adds 0 points for a low-risk country (AR)', () => {
      const result = service.calculateRisk('AR', 'software', ALL_DOCS);
      expect(result.countryRisk).toBe(0);
    });

    it('is case-insensitive for country codes', () => {
      const upper = service.calculateRisk('PA', 'software', ALL_DOCS);
      const lower = service.calculateRisk('pa', 'software', ALL_DOCS);
      expect(upper.countryRisk).toBe(lower.countryRisk);
    });

    it('sets highRiskCountry metadata to true for high-risk country', () => {
      const result = service.calculateRisk('PA', 'software', ALL_DOCS);
      expect(result.metadata.highRiskCountry).toBe(true);
    });

    it('sets highRiskCountry metadata to false for low-risk country', () => {
      const result = service.calculateRisk('AR', 'software', ALL_DOCS);
      expect(result.metadata.highRiskCountry).toBe(false);
    });
  });

  describe('calculateRisk — industry risk', () => {
    it('adds 30 points for a high-risk industry (casino)', () => {
      const result = service.calculateRisk('AR', 'casino', ALL_DOCS);
      expect(result.industryRisk).toBe(30);
    });

    it('adds 30 points for all known high-risk industries', () => {
      const highRisk = ['construction', 'security', 'casino', 'money_exchange', 'gambling', 'cryptocurrency'];
      highRisk.forEach((industry) => {
        const result = service.calculateRisk('AR', industry, ALL_DOCS);
        expect(result.industryRisk).toBe(30);
      });
    });

    it('adds 0 points for a low-risk industry (software)', () => {
      const result = service.calculateRisk('AR', 'software', ALL_DOCS);
      expect(result.industryRisk).toBe(0);
    });

    it('is case-insensitive for industry names', () => {
      const upper = service.calculateRisk('AR', 'CASINO', ALL_DOCS);
      const lower = service.calculateRisk('AR', 'casino', ALL_DOCS);
      expect(upper.industryRisk).toBe(lower.industryRisk);
    });

    it('sets highRiskIndustry metadata to true for high-risk industry', () => {
      const result = service.calculateRisk('AR', 'casino', ALL_DOCS);
      expect(result.metadata.highRiskIndustry).toBe(true);
    });

    it('sets highRiskIndustry metadata to false for low-risk industry', () => {
      const result = service.calculateRisk('AR', 'software', ALL_DOCS);
      expect(result.metadata.highRiskIndustry).toBe(false);
    });
  });

  describe('calculateRisk — document risk', () => {
    it('adds 0 points when all required documents are present', () => {
      const result = service.calculateRisk('AR', 'software', ALL_DOCS);
      expect(result.documentRisk).toBe(0);
    });

    it('adds 20 points when any required document is missing', () => {
      const result = service.calculateRisk('AR', 'software', []);
      expect(result.documentRisk).toBe(20);
    });

    it('adds 20 points when only some documents are present', () => {
      const result = service.calculateRisk('AR', 'software', [makeDoc(DocumentType.TAX_CERTIFICATE)]);
      expect(result.documentRisk).toBe(20);
    });

    it('excludes soft-deleted documents from completeness calculation', () => {
      const docsWithDeleted = [
        makeDoc(DocumentType.TAX_CERTIFICATE, new Date()), // deleted
        makeDoc(DocumentType.REGISTRATION),
        makeDoc(DocumentType.INSURANCE_POLICY),
      ];
      // TAX_CERTIFICATE is deleted so it shouldn't count -> one missing -> 20 pts
      const result = service.calculateRisk('AR', 'software', docsWithDeleted);
      expect(result.documentRisk).toBe(20);
      expect(result.metadata.missingDocuments).toContain(DocumentType.TAX_CERTIFICATE);
    });

    it('reports all missing documents when no documents are uploaded', () => {
      const result = service.calculateRisk('AR', 'software', []);
      expect(result.metadata.missingDocuments).toEqual(
        expect.arrayContaining([
          DocumentType.TAX_CERTIFICATE,
          DocumentType.REGISTRATION,
          DocumentType.INSURANCE_POLICY,
        ]),
      );
      expect(result.metadata.missingDocuments).toHaveLength(3);
    });

    it('reports no missing documents when all are uploaded', () => {
      const result = service.calculateRisk('AR', 'software', ALL_DOCS);
      expect(result.metadata.missingDocuments).toHaveLength(0);
    });

    it('calculates documentCompleteness as 0% when no documents uploaded', () => {
      const result = service.calculateRisk('AR', 'software', []);
      expect(result.metadata.documentCompleteness).toBe(0);
    });

    it('calculates documentCompleteness as 100% when all documents uploaded', () => {
      const result = service.calculateRisk('AR', 'software', ALL_DOCS);
      expect(result.metadata.documentCompleteness).toBe(100);
    });

    it('calculates documentCompleteness as 33% when 1 of 3 documents uploaded', () => {
      const result = service.calculateRisk('AR', 'software', [makeDoc(DocumentType.TAX_CERTIFICATE)]);
      expect(result.metadata.documentCompleteness).toBe(33);
    });
  });

  describe('calculateRisk — total score', () => {
    it('returns 0 for low-risk country, low-risk industry, complete documents', () => {
      const result = service.calculateRisk('AR', 'software', ALL_DOCS);
      expect(result.totalScore).toBe(0);
    });

    it('returns 20 for low-risk country, low-risk industry, no documents', () => {
      const result = service.calculateRisk('AR', 'software', []);
      expect(result.totalScore).toBe(20);
    });
    
    it('returns 30 for low-risk country, high-risk industry, complete documents', () => {
      const result = service.calculateRisk('AR', 'casino', ALL_DOCS);
      expect(result.totalScore).toBe(30);
    });

    it('returns 40 for high-risk country, low-risk industry, complete documents', () => {
      const result = service.calculateRisk('PA', 'software', ALL_DOCS);
      expect(result.totalScore).toBe(40);
    });

    it('returns 50 for high-risk industry + no documents (30 + 20)', () => {
      const result = service.calculateRisk('AR', 'casino', []);
      expect(result.totalScore).toBe(50);
    });

    it('returns 60 for high-risk country + no documents (40 + 20)', () => {
      const result = service.calculateRisk('PA', 'software', []);
      expect(result.totalScore).toBe(60);
    });

    it('returns 70 for high-risk country + high-risk industry + all documents (40 + 30)', () => {
      const result = service.calculateRisk('PA', 'casino', ALL_DOCS);
      expect(result.totalScore).toBe(70);
    });

    it('returns 90 for high-risk country + high-risk industry + no documents (40 + 30 + 20)', () => {
      const result = service.calculateRisk('PA', 'casino', []);
      expect(result.totalScore).toBe(90);
    });

    it('caps total score at 100', () => {
      // This is a hypothetical — with current weights max is 90, but the cap logic should exist
      jest.spyOn(service as any, 'calculateCountryRisk').mockReturnValue(60);
      jest.spyOn(service as any, 'calculateIndustryRisk').mockReturnValue(60);
      const result = service.calculateRisk('PA', 'casino', []);
      expect(result.totalScore).toBeLessThanOrEqual(100);
    });
  });

  describe('determineInitialStatus', () => {
    it('returns PENDING for scores <= 70', () => {
      expect(service.determineInitialStatus(0)).toBe('PENDING');
      expect(service.determineInitialStatus(70)).toBe('PENDING');
      expect(service.determineInitialStatus(50)).toBe('PENDING');
    });

    it('returns IN_REVIEW for scores > 70', () => {
      expect(service.determineInitialStatus(71)).toBe('IN_REVIEW');
      expect(service.determineInitialStatus(90)).toBe('IN_REVIEW');
      expect(service.determineInitialStatus(100)).toBe('IN_REVIEW');
    });

    it('boundary: 70 is PENDING, 71 is IN_REVIEW', () => {
      expect(service.determineInitialStatus(70)).toBe('PENDING');
      expect(service.determineInitialStatus(71)).toBe('IN_REVIEW');
    });
  });

  describe('shouldRequireReview', () => {
    it('returns false for score <= 70', () => {
      expect(service.shouldRequireReview(70)).toBe(false);
      expect(service.shouldRequireReview(0)).toBe(false);
    });

    it('returns true for score > 70', () => {
      expect(service.shouldRequireReview(71)).toBe(true);
      expect(service.shouldRequireReview(100)).toBe(true);
    });

    it('boundary: 70 is false, 71 is true', () => {
      expect(service.shouldRequireReview(70)).toBe(false);
      expect(service.shouldRequireReview(71)).toBe(true);
    });
  });
});