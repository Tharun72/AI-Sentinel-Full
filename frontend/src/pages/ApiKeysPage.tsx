import { KeyRound } from 'lucide-react';
import { CapabilityNotice } from '../components/shared/CapabilityNotice';

export function ApiKeysPage() {
  return <CapabilityNotice title="API keys" description="Create narrowly scoped machine credentials." icon={KeyRound} dependency="Hashed API-key storage, scoped authorization, one-time secret presentation, rotation, and revocation endpoints." />;
}
