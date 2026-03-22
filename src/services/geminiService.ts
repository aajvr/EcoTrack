import { Activity, Recommendation } from "../types";

/**
 * Rule-based recommendations based on user activity patterns.
 * Replaces Gemini AI to avoid quota issues and provide instant feedback.
 */
export async function getAIRecommendations(activities: Activity[], score: number): Promise<Recommendation[]> {
  // Artificial delay to simulate "analysis" for better UX
  await new Promise(resolve => setTimeout(resolve, 600));

  if (activities.length === 0) return getGeneralRecommendations();

  // Group emissions by type
  const totals = activities.reduce((acc, curr) => {
    acc[curr.type] = (acc[curr.type] || 0) + curr.emissions;
    return acc;
  }, {} as Record<string, number>);

  // Find the highest emission category
  const sortedTypes = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const topType = sortedTypes[0][0];
  const topValue = sortedTypes[0][1];

  const recommendations: Recommendation[] = [];

  // 1. High Impact Recommendation (based on top usage)
  if (topValue > 0) {
    recommendations.push(getHighImpactRec(topType));
  }

  // 2. Medium Impact (based on second top or general)
  const secondType = sortedTypes[1]?.[0];
  if (secondType) {
    recommendations.push(getMediumImpactRec(secondType));
  } else {
    recommendations.push({
      title: "Energy Efficiency",
      description: "Unplug electronics when not in use to eliminate 'vampire' energy draw.",
      potentialSaving: 1.5,
      impact: "medium"
    });
  }

  // 3. Low Impact / General
  recommendations.push({
    title: "Eco-Awareness",
    description: "Continue logging your activities daily to stay mindful of your environmental footprint.",
    potentialSaving: 0.5,
    impact: "low"
  });

  return recommendations;
}

function getHighImpactRec(type: string): Recommendation {
  switch (type) {
    case 'commute':
      return {
        title: "Reduce Car Mileage",
        description: "Your transport emissions are high. Try carpooling or using public transit for 3 days a week.",
        potentialSaving: 15.0,
        impact: "high"
      };
    case 'meal':
      return {
        title: "Go Meatless More Often",
        description: "Dietary emissions are your biggest factor. Switching to plant-based meals can cut your food footprint by 60%.",
        potentialSaving: 12.0,
        impact: "high"
      };
    case 'electricity':
      return {
        title: "Optimize Home Heating",
        description: "Lowering your thermostat by just 1 degree can save up to 10% on your energy bill and emissions.",
        potentialSaving: 8.5,
        impact: "high"
      };
    case 'shopping':
      return {
        title: "Avoid Fast Fashion",
        description: "Shopping habits are impacting your score. Prioritize quality over quantity and buy second-hand.",
        potentialSaving: 5.0,
        impact: "high"
      };
    default:
      return {
        title: "General Reduction",
        description: "Focus on reducing overall consumption in your most active categories.",
        potentialSaving: 5.0,
        impact: "high"
      };
  }
}

function getMediumImpactRec(type: string): Recommendation {
  switch (type) {
    case 'commute':
      return {
        title: "Active Transport",
        description: "For trips under 2km, consider walking or cycling instead of driving.",
        potentialSaving: 4.0,
        impact: "medium"
      };
    case 'meal':
      return {
        title: "Reduce Food Waste",
        description: "Plan your meals to avoid throwing away food. Food waste in landfills produces methane.",
        potentialSaving: 3.5,
        impact: "medium"
      };
    default:
      return {
        title: "Waste Reduction",
        description: "Recycle and compost to reduce the amount of waste sent to landfills.",
        potentialSaving: 2.0,
        impact: "medium"
      };
  }
}

function getGeneralRecommendations(): Recommendation[] {
  return [
    {
      title: "Switch to Plant-Based",
      description: "Try replacing one meat meal a day with a plant-based alternative to significantly reduce your footprint.",
      potentialSaving: 12.5,
      impact: "high"
    },
    {
      title: "Active Commuting",
      description: "Consider biking or walking for short trips under 3km instead of driving.",
      potentialSaving: 5.2,
      impact: "medium"
    },
    {
      title: "Unplug Devices",
      description: "Turn off power strips when not in use to save on standby power.",
      potentialSaving: 1.2,
      impact: "low"
    }
  ];
}

/**
 * Rule-based insights based on Green Score tiers.
 */
export async function getPredictiveInsights(activities: Activity[], score: number): Promise<string> {
  // Artificial delay
  await new Promise(resolve => setTimeout(resolve, 400));

  if (score <= 10) return "Critical: Your footprint is extremely high. Immediate changes are needed to reduce your environmental impact.";
  if (score <= 20) return "Very High: You're significantly above the average footprint. Focus on your biggest emission sources today.";
  if (score <= 30) return "High: Your lifestyle has a heavy carbon cost. Look for major reduction opportunities in transport and diet.";
  if (score <= 40) return "Above Average: You're making progress, but there's still a lot of room for improvement in your daily habits.";
  if (score <= 50) return "Average: You're right in the middle. Small consistent changes can push you into the 'Green' zone.";
  if (score <= 60) return "Good: You're doing better than most! Focus on optimizing your energy use to reach the next level.";
  if (score <= 70) return "Great: Your footprint is becoming quite sustainable. Consider sharing your tips with others!";
  if (score <= 80) return "Excellent: You're a sustainability leader. Keep refining your habits to maintain this elite score.";
  if (score <= 90) return "Exceptional: You're in the top tier of eco-warriors. Your impact is minimal and highly commendable.";
  return "Perfect: You've achieved an ideal balance. You're living a truly low-impact lifestyle. Keep it up!";
}
