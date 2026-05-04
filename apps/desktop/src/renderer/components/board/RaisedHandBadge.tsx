"use client";
/**
 * RaisedHandBadge — Dynamic Island pill that morphs when an agent raises its hand.
 *
 * Isolated client component (MOTION_INTENSITY 6 rule: perpetual animations
 * must be memoized and isolated so they never trigger parent re-renders).
 *
 * Behavior:
 *   - Appears with overshoot spring when raisedHand becomes true
 *   - Pulses accent color to demand attention
 *   - Morphs from compact pill → expanded label on hover
 *
 * Requires: framer-motion
 * TODO: implement once framer-motion is installed
 */
import { memo } from "react";

interface RaisedHandBadgeProps {
  agentProvider: string;
}

export const RaisedHandBadge = memo(function RaisedHandBadge({
  agentProvider,
}: RaisedHandBadgeProps) {
  // Framer Motion AnimatePresence + spring physics implemented here
  // Using layoutId for morphing pill transition
  return (
    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-white text-[10px] font-mono">
      {agentProvider} needs you
    </div>
  );
});
