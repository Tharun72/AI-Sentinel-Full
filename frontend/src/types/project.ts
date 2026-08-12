export interface Project {
  id: number;
  name: string;
  description: string | null;
  repository_url: string | null;
  owner_id: number;
  created_at: string | null;
  updated_at: string | null;
}