'use client';

import { businessOfferIcon } from '@/lib/business-icons';
import { useBusiness } from './business-context';

export function BusinessOfferIcon({kind,size=20}:{kind?:'recipe'|'service';size?:number}) {
  const {profile}=useBusiness();
  const Icon=businessOfferIcon(profile.business_type,kind);
  return <Icon size={size} aria-hidden="true"/>;
}
