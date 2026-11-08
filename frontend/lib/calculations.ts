import Decimal from 'decimal.js';
import { baseUnit, type MeasurementUnit } from './measurements';
import { Ingredient, RecipeInput, Pricing, Recipe, SimulationResult } from './types';
Decimal.set({precision:50, rounding:Decimal.ROUND_HALF_UP});
export function d(value: string | number | null | undefined) { try { const n = new Decimal(value || 0); return n.isFinite() ? n : new Decimal(0); } catch { return new Decimal(0); } }
// Presentation only. Calculations continue using the original Decimal values.
export function displayDecimal(value: string | Decimal | number | null | undefined) {
 const number=d(value?.toString()), magnitude=number.abs(), remainder=magnitude.mod('0.10');
 const rounded=remainder.gte('0.07')?magnitude.sub(remainder).add('0.10'):magnitude;
 const signed=number.isNegative()?rounded.negated():rounded;
 const result=signed.toDecimalPlaces(2,Decimal.ROUND_HALF_UP);
 return result.isZero()?d(0):result;
}
export function decimalText(value: string | Decimal | number | null | undefined) {
 const [whole,fraction]=displayDecimal(value).toFixed(2).split('.');
 return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g,'.')},${fraction}`;
}
export function money(value: string | Decimal | number | null | undefined) { return `R$ ${decimalText(value)}`; }
export function percent(value: string) { return decimalText(value)+'%'; }
export function baseQuantity(value:string,unit:MeasurementUnit) {return d(value).mul(unit==='kg'?1000:1);}
export function perBaseUnit(i: Pick<Ingredient,'package_price'|'package_quantity'|'measurement_unit'>) { const quantity=baseQuantity(i.package_quantity,i.measurement_unit);return quantity.gt(0)?d(i.package_price).div(quantity):d(0); }
export function margin(profit:Decimal,revenue:Decimal) {return revenue.isZero()?d(0):profit.div(revenue).mul(100);}
export function pricing(r:RecipeInput,ingredients:Ingredient[]):Pricing {
 const subtotal=r.ingredients.reduce((sum,item)=>{const i=ingredients.find(i=>i.id===item.ingredient_id);return sum.add(i&&baseUnit(item.measurement_unit)===baseUnit(i.measurement_unit)?baseQuantity(item.quantity_used,item.measurement_unit).mul(perBaseUnit(i)):0);},d(0));
 const packaging=d(r.packaging_unit_cost).mul(r.packaging_quantity||0), operating=subtotal.add(packaging).mul(d(r.operational_expense_percentage)).div(100), labor=d(r.hourly_labor_cost).mul(r.production_time_minutes||0).div(60);
 const total=subtotal.add(packaging).add(operating).add(labor), unit=total.div(Math.max(r.yield_quantity||1,1)), profit=unit.mul(d(r.desired_markup_percentage)).div(100), suggested=unit.add(profit), effective=r.selling_price!==null?d(r.selling_price):suggested;
 return Object.fromEntries(Object.entries({ingredients_cost:subtotal,packaging_cost:packaging,operational_cost:operating,labor_cost:labor,total_cost:total,unit_cost:unit,desired_profit:profit,suggested_price:suggested,suggested_margin:margin(profit,suggested),effective_price:effective,effective_profit:effective.sub(unit),effective_margin:margin(effective.sub(unit),effective)}).map(([key,value])=>[key,value.toString()])) as Pricing;
}
export function simulate(r:Recipe,quantity:number,price:string):SimulationResult {
 const revenue=d(price).mul(quantity), cost=d(r.pricing.unit_cost).mul(quantity), batches=Math.ceil(quantity/r.yield_quantity), batchCost=d(r.pricing.total_cost).mul(batches);
 return {quantity_sold:quantity,selling_price:price,revenue:revenue.toString(),production_cost:cost.toString(),profit:revenue.sub(cost).toString(),margin:margin(revenue.sub(cost),revenue).toString(),batches,units_produced:batches*r.yield_quantity,surplus:batches*r.yield_quantity-quantity,batch_cost:batchCost.toString(),batch_profit:revenue.sub(batchCost).toString(),batch_margin:margin(revenue.sub(batchCost),revenue).toString()};
}
