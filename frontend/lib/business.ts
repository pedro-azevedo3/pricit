export type BusinessType = 'food' | 'acai' | 'beauty' | 'burger' | 'bakery';
export type PricingGoal = 'understand_costs' | 'set_prices' | 'improve_profit';
export type BusinessProfile = { business_name: string; business_type: BusinessType; pricing_goal: PricingGoal };
export const defaultProfile: BusinessProfile = { business_name: '', business_type: 'food', pricing_goal: 'understand_costs' };
export const pricingGoals = [
  { value: 'understand_costs', label: 'Entender meus custos' },
  { value: 'set_prices', label: 'Definir meus preços' },
  { value: 'improve_profit', label: 'Avaliar meu lucro e minhas vendas' },
] as const;
export const businessProfiles = {
  food: { label: 'Culinária e confeitaria', service: false, resources: 'Ingredientes', resource: 'ingrediente', resourceCapital: 'Ingrediente', offers: 'Receitas', offer: 'receita', offerCapital: 'Receita', newOffer: 'Nova receita', sampleResource: 'Chocolate meio amargo', sampleOffer: 'Brownie tradicional', yieldLabel: 'Rendimento (unidades)', sampleYield: '12', costs: 'Ingredientes, embalagens, forno, energia e mão de obra.' },
  acai: { label: 'Lojas de açaí e sorveterias', service: false, resources: 'Ingredientes', resource: 'ingrediente', resourceCapital: 'Ingrediente', offers: 'Produtos', offer: 'produto', offerCapital: 'Produto', newOffer: 'Novo produto', sampleResource: 'Polpa de açaí', sampleOffer: 'Copo de açaí 500 ml', yieldLabel: 'Rendimento (porções)', sampleYield: '1', costs: 'Bases, complementos, copos, colheres, energia e uso de freezer.' },
  beauty: { label: 'Barbearias e cabeleireiros', service: true, resources: 'Produtos', resource: 'produto', resourceCapital: 'Produto', offers: 'Serviços', offer: 'serviço', offerCapital: 'Serviço', newOffer: 'Novo serviço', sampleResource: 'Shampoo profissional', sampleOffer: 'Corte de cabelo', yieldLabel: 'Rendimento (atendimentos)', sampleYield: '1', costs: 'Produtos consumidos, tempo de atendimento, energia, manutenção e uso das máquinas.' },
  burger: { label: 'Hamburguerias', service: false, resources: 'Ingredientes', resource: 'ingrediente', resourceCapital: 'Ingrediente', offers: 'Lanches', offer: 'lanche', offerCapital: 'Lanche', newOffer: 'Novo lanche', sampleResource: 'Carne para hambúrguer', sampleOffer: 'Hambúrguer artesanal', yieldLabel: 'Rendimento (lanches)', sampleYield: '1', costs: 'Pães, carnes, molhos, embalagens, chapa, gás e mão de obra.' },
  bakery: { label: 'Padarias', service: false, resources: 'Ingredientes', resource: 'ingrediente', resourceCapital: 'Ingrediente', offers: 'Receitas', offer: 'receita', offerCapital: 'Receita', newOffer: 'Nova receita', sampleResource: 'Farinha de trigo', sampleOffer: 'Pão francês', yieldLabel: 'Rendimento (unidades)', sampleYield: '50', costs: 'Ingredientes, rendimento por fornada, embalagens, energia e uso dos equipamentos.' },
} as const;
export function offerVocabulary(kind: 'recipe' | 'service' | undefined, type: BusinessType) {
  return kind === 'service' ? businessProfiles.beauty : businessProfiles[type].service ? businessProfiles.food : businessProfiles[type];
}
