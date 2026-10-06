import type { TourStep } from "../../../components/ui/GuidedTour";

export const CRICKET_SCORER_TOUR: TourStep[] = [
  {
    target: "status-bar",
    title: "Live status",
    description: "Score, overs bowled out of the overs limit, and the current run rate. During a chase this also shows the target and runs still needed.",
  },
  {
    target: "batter-bowler-switcher",
    title: "Batter · Non-striker · Bowler",
    description: "Who's doing what right now, at a glance. Tap \"Swap striker / non-striker\" if the ends need a manual correction.",
  },
  {
    target: "keypad",
    title: "Score a normal delivery",
    description: "Tap the runs scored off the bat. Strike rotation, the over count, and every stat update automatically — you never need to work it out yourself.",
  },
  {
    target: "out-bye-undo",
    title: "OUT · BYE · UNDO",
    description: "OUT opens the dismissal form. BYE is promoted up here since it's common. UNDO reverses the most recent delivery completely if you tap the wrong thing.",
  },
  {
    target: "extras",
    title: "Other extras",
    description: "Wide, No Ball, and Leg Bye each open a small runs picker before recording.",
  },
  {
    target: "over-balls",
    title: "This over",
    description: "Every ball bowled this over, color-coded — a four, a six, a wicket, or an extra are all easy to spot at a glance.",
  },
  {
    target: "timeline",
    title: "Ball-by-ball",
    description: "The full delivery history for the match. Struck-through entries have been undone.",
  },
];
