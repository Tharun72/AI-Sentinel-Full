import { Blocks } from 'lucide-react';
import { CapabilityNotice } from '../components/shared/CapabilityNotice';

export function BlockchainPage() {
  return <CapabilityNotice title="Blockchain verification" description="Keep a tamper-evident verification record for applied patches." icon={Blocks} dependency="A chain provider, transaction signer, verification persistence, and endpoints that expose transaction status." />;
}
