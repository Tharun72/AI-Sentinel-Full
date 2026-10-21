import { Code2 } from 'lucide-react';
import { CapabilityNotice } from '../components/shared/CapabilityNotice';

export function EditorPage() {
  return <CapabilityNotice title="Code editor" description="Review repository source and findings inline." icon={Code2} dependency="A repository-source retrieval endpoint and a separate, authenticated patch-application workflow." />;
}
