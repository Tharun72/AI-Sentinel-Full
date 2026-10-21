import { Wrench } from 'lucide-react';
import { CapabilityNotice } from '../components/shared/CapabilityNotice';

export function FixesPage() {
  return <CapabilityNotice title="Secure fixes" description="Review generated patches and their lifecycle." icon={Wrench} dependency="Persisted generated-patch, approval, apply, and rollback endpoints. Current AI enrichment returns analysis only." />;
}
