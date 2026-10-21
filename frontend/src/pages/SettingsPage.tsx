import { Settings } from 'lucide-react';
import { CapabilityNotice } from '../components/shared/CapabilityNotice';

export function SettingsPage() {
  return <CapabilityNotice title="Settings" description="Manage profile, notification, and workspace preferences." icon={Settings} dependency="Persisted account and workspace preference endpoints. This page avoids showing settings that cannot be saved." />;
}
