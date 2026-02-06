import { Injectable } from '@nestjs/common';

@Injectable()
export class RiskEngineService {
  private readonly HIGH_RISK_COUNTRIES = ['PA', 'VG', 'KY']; // Paraísos fiscales
  private readonly HIGH_RISK_INDUSTRIES = ['construction', 'security', 'casino', 'money_exchange'];

  calculate(country: string, industry: string): number {
    let score = 0;

    // Regla 1: País
    if (this.HIGH_RISK_COUNTRIES.includes(country)) {
      score += 40; // Alto riesgo
    }

    // Regla 2: Industria
    if (this.HIGH_RISK_INDUSTRIES.includes(industry)) {
      score += 30;
    }

    // Regla 3: Documentación (Simplificado para el registro inicial)
    // Asumimos que al crear, faltan documentos (+20 puntos según requisito)
    score += 20;

    return Math.min(score, 100);
  }

  determineInitialStatus(score: number): 'PENDING' | 'IN_REVIEW' {
    // Si el riesgo es muy alto (>70), requiere revisión manual inmediata
    return score > 70 ? 'IN_REVIEW' : 'PENDING';
  }
}