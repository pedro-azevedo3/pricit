import { ChefHat, IceCreamBowl, Scissors, Sandwich, Croissant, Paintbrush, Eye, Palette, Car, Camera, BriefcaseBusiness, type LucideIcon } from 'lucide-react';
import { businessProfiles, type BusinessType } from './business';

const offerIcons: Record<BusinessType, LucideIcon> = {
  food: ChefHat,
  acai: IceCreamBowl,
  beauty: Scissors,
  burger: Sandwich,
  bakery: Croissant,
  manicure: Paintbrush,
  brows: Eye,
  craft: Palette,
  automotive: Car,
  creative: Camera,
  freelance: BriefcaseBusiness,
};

export function businessOfferIcon(type: BusinessType, kind?: 'recipe' | 'service') {
  // Existing records retain their production/service format after a profile change.
  if (kind === 'recipe' && businessProfiles[type].service) return ChefHat;
  if (kind === 'service' && !businessProfiles[type].service) return Scissors;
  return offerIcons[type];
}
