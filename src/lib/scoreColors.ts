interface ScoreColors {
  bg10: string;
  bg15: string;
  text: string;
  solid: string;
}

export function scoreColors(score: number): ScoreColors {
  if (score >= 75) return { bg10: "bg-green-500/10", bg15: "bg-green-500/15", text: "text-green-400", solid: "bg-green-400" };
  if (score >= 50) return { bg10: "bg-yellow-500/10", bg15: "bg-yellow-500/15", text: "text-yellow-400", solid: "bg-yellow-400" };
  if (score >= 25) return { bg10: "bg-orange-500/10", bg15: "bg-orange-500/15", text: "text-orange-400", solid: "bg-orange-400" };
  return { bg10: "bg-red-500/10", bg15: "bg-red-500/15", text: "text-red-400", solid: "bg-red-400" };
}
