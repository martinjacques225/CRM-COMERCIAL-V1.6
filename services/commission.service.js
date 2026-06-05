// services/commission.service.js
// Contrato público del motor de comisiones. Implementación pura en js/utils.js.
// Centraliza la lógica de compensación para futura migración (reglas versionadas / por filial).
// Contrato: calcMonthComision, calcIncentiveSemanal, calcBPI, groupByWeek, getWeekStart, isContadoPlan
import {
  calcMonthComision, calcIncentiveSemanal, calcBPI,
  groupByWeek, getWeekStart, isContadoPlan
} from '../js/utils.js';

export {
  calcMonthComision, calcIncentiveSemanal, calcBPI,
  groupByWeek, getWeekStart, isContadoPlan
};

export const CommissionService = {
  calcMonthComision, calcIncentiveSemanal, calcBPI,
  groupByWeek, getWeekStart, isContadoPlan
};
export default CommissionService;
