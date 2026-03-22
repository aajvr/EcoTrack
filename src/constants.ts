// Average kg CO2 per unit
export const EMISSION_FACTORS = {
  commute: {
    car: 0.17, // per km
    bus: 0.08, // per km
    bike: 0,
    walking: 0,
  },
  meal: {
    meat: 3.3, // per meal
    vegetarian: 1.5, // per meal
    vegan: 1.0, // per meal
  },
  electricity: 0.4, // per kWh
  shopping: {
    fastFashion: 15.0, // per item
    sustainable: 3.0, // per item
  },
};

export const INITIAL_BADGES = [
  { id: '1', name: 'Eco Starter', description: 'Logged your first activity', icon: 'Leaf', unlocked: false },
  { id: '2', name: 'Plant Powered', description: 'Logged 5 vegan meals', icon: 'Utensils', unlocked: false },
  { id: '3', name: 'Low Carbon Commuter', description: 'Traveled 50km by bike/walking', icon: 'Bike', unlocked: false },
  { id: '4', name: 'Energy Saver', description: 'Reduced electricity usage by 10%', icon: 'Zap', unlocked: false },
];
