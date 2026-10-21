import { Users } from 'lucide-react';
import { CapabilityNotice } from '../components/shared/CapabilityNotice';

export function TeamPage() {
  return <CapabilityNotice title="Team" description="Manage workspace members and roles." icon={Users} dependency="Team, membership, invitation, and role-based authorization models and APIs. The current backend supports individual user ownership only." />;
}
