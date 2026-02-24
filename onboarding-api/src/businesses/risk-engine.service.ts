import { Injectable, Logger } from '@nestjs/common';
import { BusinessStatus, DocumentType } from '@prisma/client';

export interface RiskCalculationResult {
  totalScore: number;
  countryRisk: number;
  industryRisk: number;
  documentRisk: number;
  metadata: {
    highRiskCountry: boolean;
    highRiskIndustry: boolean;
    missingDocuments: DocumentType[];
    documentCompleteness: number; // percentage
  };
}

type InitialBusinessStatus = 'PENDING' | 'IN_REVIEW';

@Injectable()
export class RiskEngineService {
  private readonly logger = new Logger(RiskEngineService.name);

  // High-risk countries (tax havens, no fiscal agreements)
  private readonly HIGH_RISK_COUNTRIES = [
    'PA', // Panama
    'VG', // British Virgin Islands
    'KY', // Cayman Islands
    'CH', // Switzerland (some cases)
    'LI', // Liechtenstein
    'MC', // Monaco
  ];

  // High-risk industries
  private readonly HIGH_RISK_INDUSTRIES = [
    'construction',
    'security',
    'casino',
    'money_exchange',
    'gambling',
    'cryptocurrency',
  ];

  private readonly COUNTRY_RISK = 40;
  private readonly INDUSTRY_RISK = 30;
  private readonly MISSING_DOCUMENTS_RISK = 20;

  private readonly HIGH_RISK_THRESHOLD = 70;

  // Required document types
  private readonly REQUIRED_DOCUMENTS: DocumentType[] = [
    DocumentType.TAX_CERTIFICATE,
    DocumentType.REGISTRATION,
    DocumentType.INSURANCE_POLICY,
  ];

  /**
   * Calculate risk score (0-100) based on country, industry, and documents
   */
  calculateRisk(
    country: string,
    industry: string,
    documents: Array<{ type: DocumentType; deletedAt: Date | null }>,
  ): RiskCalculationResult {
    this.logger.debug(`Calculating risk for country: ${country}, industry: ${industry}`);
    
    let totalScore = 0;

    // 1. Country Risk (0-40 points)
    const countryRisk = this.calculateCountryRisk(country);
    totalScore += countryRisk;
    if (countryRisk > 0) {
      this.logger.debug(`Country risk applied: ${countryRisk} points (high-risk country: ${country})`);
    }

    // 2. Industry Risk (0-30 points)
    const industryRisk = this.calculateIndustryRisk(industry);
    totalScore += industryRisk;
    if (industryRisk > 0) {
      this.logger.debug(`Industry risk applied: ${industryRisk} points (high-risk industry: ${industry})`);
    }

    // 3. Document Completeness Risk (0-30 points)
    const activeDocuments = documents.filter((doc) => !doc.deletedAt);
    const { documentRisk, missingDocuments, completeness } = this.calculateDocumentRisk(activeDocuments);
    totalScore += documentRisk;
    
    if (documentRisk > 0) {
      this.logger.debug(
        `Document risk applied: ${documentRisk} points (completeness: ${completeness}%, missing: ${missingDocuments.join(', ')})`,
      );
    }

    // Cap at 100
    totalScore = Math.min(totalScore, 100);

    this.logger.log(
      `Risk calculation complete: Total Score = ${totalScore} (Country: ${countryRisk}, Industry: ${industryRisk}, Documents: ${documentRisk})`,
    );

    return {
      totalScore,
      countryRisk,
      industryRisk,
      documentRisk,
      metadata: {
        highRiskCountry: this.HIGH_RISK_COUNTRIES.includes(country.toUpperCase()),
        highRiskIndustry: this.HIGH_RISK_INDUSTRIES.includes(industry.toLowerCase()),
        missingDocuments,
        documentCompleteness: completeness,
      },
    };
  }

  /**
   * Country risk scoring
   */
  private calculateCountryRisk(country: string): number {
    const isHighRisk = this.HIGH_RISK_COUNTRIES.includes(country.toUpperCase());
    return isHighRisk ? this.COUNTRY_RISK : 0;
  }

  /**
   * Industry risk scoring
   */
  private calculateIndustryRisk(industry: string): number {
    const isHighRisk = this.HIGH_RISK_INDUSTRIES.includes(industry.toLowerCase());
    return isHighRisk ? this.INDUSTRY_RISK : 0;
  }

  /**
   * Document completeness risk
   * If ANY required document is missing -> +20 points
   * If all required documents are present -> +0 points
   */
  private calculateDocumentRisk(
    documents: Array<{ type: DocumentType }>,
  ): {
    documentRisk: number;
    missingDocuments: DocumentType[];
    completeness: number;
  } {
    const uploadedTypes = new Set(documents.map((d) => d.type));

    const missingDocuments = this.REQUIRED_DOCUMENTS.filter(
      (requiredType) => !uploadedTypes.has(requiredType),
    );

    const missingCount = missingDocuments.length;

    const documentRisk = missingCount > 0 ? this.MISSING_DOCUMENTS_RISK : 0;

    const completeness = Math.round(
      ((this.REQUIRED_DOCUMENTS.length - missingCount) /
        this.REQUIRED_DOCUMENTS.length) *
      100,
    );

    return {
      documentRisk,
      missingDocuments,
      completeness,
    };
  }

  /**
   * Determine initial status based on risk score
   * >70 = Requires immediate manual review
   * <=70 = Pending (can be auto-processed later)
   */
  determineInitialStatus(score: number): InitialBusinessStatus {
    const status = score > this.HIGH_RISK_THRESHOLD ? BusinessStatus.IN_REVIEW : BusinessStatus.PENDING;
    this.logger.debug(`Determined initial status: ${status} (score: ${score})`);
    return status;
  }

  /**
   * Check if business should be flagged for review after updates
   */
  shouldRequireReview(score: number): boolean {
    const requiresReview = score > this.HIGH_RISK_THRESHOLD;
    if (requiresReview) {
      this.logger.warn(`Business flagged for review: Risk score ${score} exceeds threshold of 70`);
    }
    return requiresReview;
  }
}