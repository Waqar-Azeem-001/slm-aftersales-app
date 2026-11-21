'use client';

import { useState } from 'react';
import ClaimForm, { blankClaim } from '@/components/ClaimForm';
import { useStore } from '@/lib/store';

export default function NewClaimPage() {
  const { ready } = useStore();
  const [initial] = useState(blankClaim);
  if (!ready) return null;
  return <ClaimForm initial={initial} />;
}
