export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  greenScore: number;
  createdAt: string;
  bio?: string;
  location?: string;
}

export interface Activity {
  id: string;
  uid: string;
  date: string;
  type: 'commute' | 'meal' | 'electricity' | 'shopping';
  value: number; // distance in km, kWh, or count
  category?: string; // car, bus, meat, veg, etc.
  emissions: number; // calculated kg CO2
  createdAt: string;
}

export interface UserStats {
  totalEmissions: number;
  greenScore: number;
  badges: Badge[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export interface Recommendation {
  title: string;
  description: string;
  potentialSaving: number;
  impact: 'low' | 'medium' | 'high';
}
