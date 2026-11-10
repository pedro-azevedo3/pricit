import { d } from './calculations';
import Decimal from 'decimal.js';

export type DocumentItem = {description:string;category:'service'|'labor'|'material'|'equipment'|'other';quantity:string;unit_price:string};
export type DocumentInput = {
  kind:'quote'|'contract';title:string;provider_name:string;provider_document:string;provider_contact:string;provider_address:string;
  client_name:string;client_document:string;client_contact:string;client_address:string;
  issue_date:string;valid_until:string|null;start_date:string;end_date:string;scope:string;payment_terms:string;terms:string;
  items:DocumentItem[];discount:string;
};
export type BusinessDocument = DocumentInput & {id:string;created_at:string;updated_at:string;totals:{line_totals:string[];subtotal:string;discount:string;total:string}};
export const documentCategories = {service:'Serviço / entrega',labor:'Mão de obra',material:'Material',equipment:'Equipamento',other:'Outro'};
export const baseTerms = 'O prestador executará os itens e entregas descritos no escopo, nos prazos e condições de pagamento informados.\n\nO cliente fornecerá as informações e os acessos necessários à execução.\n\nAlterações de escopo, valores ou prazos deverão ser registradas e aceitas pelas partes antes de sua execução.\n\nAs condições específicas de revisões, cancelamento, reagendamento e uso das entregas devem ser definidas pelas partes neste documento, respeitando a legislação aplicável.';
export function todayRecife() {
  const parts=new Intl.DateTimeFormat('en',{timeZone:'America/Recife',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  return ['year','month','day'].map(type=>parts.find(p=>p.type===type)?.value).join('-');
}
export function newDocument(kind:DocumentInput['kind'],name:string):DocumentInput {
  return {kind,title:'',provider_name:name,provider_document:'',provider_contact:'',provider_address:'',client_name:'',client_document:'',client_contact:'',client_address:'',
    issue_date:todayRecife(),valid_until:null,start_date:'',end_date:'',scope:'',payment_terms:'',terms:kind==='contract'?baseTerms:'',items:[{description:'',category:'service',quantity:'',unit_price:''}],discount:''};
}
export function documentTotals(items:DocumentItem[],discount:string) {
  const lines=items.map(item=>d(item.quantity).mul(d(item.unit_price)).toDecimalPlaces(2,Decimal.ROUND_HALF_UP));
  const subtotal=lines.reduce((sum,line)=>sum.add(line),d(0));
  return {lines,subtotal,total:subtotal.sub(d(discount))};
}
// A document's agreed price uses ordinary cents, independent of UI-only recipe rounding.
export function documentMoney(value:string|Decimal|number) {
  const [whole,fraction]=d(String(value)).toFixed(2,Decimal.ROUND_HALF_UP).split('.');
  return `R$ ${whole.replace(/\B(?=(\d{3})+(?!\d))/g,'.')},${fraction}`;
}
export function inputFromDocument(doc:BusinessDocument):DocumentInput {
  const {id,created_at,updated_at,totals,...input}=doc;
  return input;
}
