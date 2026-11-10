'use client';
import { createContext, useContext, type ReactNode } from 'react';
import { businessProfiles, defaultProfile, type BusinessProfile } from '@/lib/business';
const BusinessContext = createContext<BusinessProfile>(defaultProfile);
export function BusinessProvider({ profile, children }: { profile: BusinessProfile; children: ReactNode }) {
  return <BusinessContext.Provider value={profile}>{children}</BusinessContext.Provider>;
}
export function useBusiness() {
  const profile = useContext(BusinessContext);
  return { profile, business: businessProfiles[profile.business_type] };
}
