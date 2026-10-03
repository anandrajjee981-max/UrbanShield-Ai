// FRONTEND-ONLY demo identities. No passwords are stored here or in localStorage.
// Any password (4+ characters) is accepted at login — this is a UI demo mechanism.

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: 'CITIZEN' | 'AUTHORITY';
}

export const demoUsers: DemoUser[] = [
  { id: 'u-citizen', name: 'Demo Citizen', email: 'citizen@civic.local', role: 'CITIZEN' },
  { id: 'u-authority', name: 'Ward Officer', email: 'authority@civic.local', role: 'AUTHORITY' },
];
