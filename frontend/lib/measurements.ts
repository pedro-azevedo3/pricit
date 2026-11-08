export type MeasurementUnit = 'g' | 'kg' | 'ml' | 'un';
export type BaseUnit = 'g' | 'ml' | 'un';
export const measurementOptions: {value:MeasurementUnit;label:string}[] = [
  {value:'g',label:'Gramas (g)'}, {value:'kg',label:'Quilogramas (kg)'},
  {value:'ml',label:'Mililitros (ml)'}, {value:'un',label:'Unidade (un)'},
];
export function baseUnit(unit:MeasurementUnit):BaseUnit { return unit==='kg'?'g':unit; }
export function compatibleUnits(unit:MeasurementUnit):MeasurementUnit[] { return baseUnit(unit)==='g'?['g','kg']:[unit]; }
export function costLabel(unit:MeasurementUnit) { return {g:'Custo por grama',ml:'Custo por mililitro',un:'Custo por unidade'}[baseUnit(unit)]; }
