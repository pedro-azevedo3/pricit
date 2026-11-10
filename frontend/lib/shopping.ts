import Decimal from 'decimal.js';
import { d } from './calculations';
import { type Ingredient } from './types';
import { type MeasurementUnit } from './measurements';
export { documentMoney as shoppingMoney } from './documents';

export type ShoppingItem = {ingredient_id:string;packages:number;purchased:boolean;name:string;measurement_unit:MeasurementUnit;package_quantity:string;package_price:string;estimated_cost?:string};
export type ShoppingList = {id:string;name:string;notes:string;created_at:string;updated_at:string;items:ShoppingItem[];estimated_total:string;pending_total:string;purchased_count:number};
export type ShoppingDraft = {name:string;notes:string;items:ShoppingItem[]};
export function fromIngredient(item:Ingredient):ShoppingItem {
  return {ingredient_id:item.id,packages:1,purchased:false,name:item.name,measurement_unit:item.measurement_unit,package_quantity:item.package_quantity,package_price:item.package_price};
}
export function shoppingTotals(items:ShoppingItem[]) {
  const lines=items.map(item=>d(item.package_price).mul(item.packages||0).toDecimalPlaces(2,Decimal.ROUND_HALF_UP));
  return {lines,total:lines.reduce((sum,line)=>sum.add(line),d(0)),pending:lines.reduce((sum,line,index)=>items[index].purchased?sum:sum.add(line),d(0))};
}
export function shoppingQuantity(value:string) {
  const [whole,fraction]=d(value).toFixed().split('.');
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g,'.')+(fraction?','+fraction:'');
}
