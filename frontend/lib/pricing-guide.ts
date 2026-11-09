import { d } from './calculations';

export interface LaborStudy {
  income: string; days: string; hours: string; minutes: string; yield: string;
}
export interface SalesStudy {
  cost: string; markupA: string; unitsA: string; markupB: string; unitsB: string;
}

// Empty and invalid values never become zero-cost estimates or divide by zero.
function valid(value: string, min: number, max: number, integer = false) {
  if (!value.trim() || !/^\d+(?:\.\d+)?$/.test(value)) return false;
  const number = d(value);
  return number.gte(min) && number.lte(max) && (!integer || number.isInteger());
}

export function studyLabor(input: LaborStudy) {
  if (!valid(input.income, 0.01, 1e9) || !valid(input.days, 1, 31, true)
    || !valid(input.hours, 0.01, 24) || !valid(input.minutes, 0, 1e6, true)
    || !valid(input.yield, 1, 1e6, true)) return null;
  const monthlyHours = d(input.days).mul(input.hours);
  const hourly = d(input.income).div(monthlyHours);
  const batch = hourly.mul(input.minutes).div(60);
  return { monthlyHours, hourly, batch, unit: batch.div(input.yield) };
}

export function studySales(input: SalesStudy) {
  if (!valid(input.cost, 0.01, 1e9)
    || !valid(input.markupA, 0, 1e6) || !valid(input.markupB, 0, 1e6)
    || !valid(input.unitsA, 0, 1e6, true) || !valid(input.unitsB, 0, 1e6, true)) return null;
  const scenario = (markup: string, units: string) => {
    const unitResult = d(input.cost).mul(markup).div(100);
    const price = d(input.cost).add(unitResult);
    return { price, unitResult, revenue: price.mul(units), result: unitResult.mul(units) };
  };
  return { a: scenario(input.markupA, input.unitsA), b: scenario(input.markupB, input.unitsB) };
}
