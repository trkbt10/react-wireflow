/**
 * @file Development-time helper to detect render loops (high commit rate while idle).
 */
import * as React from "react";

export type RenderLoopDetectorProps = {
  /**
   * Human-readable label included in logs.
   */
  label: string;
  /**
   * Sampling interval in ms.
   */
  intervalMs: number;
  /**
   * If commits exceed this number within one interval, `onDetected` fires.
   */
  thresholdCommitsPerInterval: number;
  /**
   * Called when a render loop is detected.
   */
  onDetected?: (info: { label: string; commitsInInterval: number; totalCommits: number }) => void;
  children: React.ReactNode;
};

export const RenderLoopDetector: React.FC<RenderLoopDetectorProps> = ({
  label,
  intervalMs,
  thresholdCommitsPerInterval,
  onDetected,
  children,
}) => {
  const totalCommitsRef = React.useRef(0);
  const lastSampleTotalRef = React.useRef(0);
  const onDetectedRef = React.useRef(onDetected);
  onDetectedRef.current = onDetected;

  React.useEffect(() => {
    if (intervalMs <= 0) {
      throw new Error("RenderLoopDetector requires intervalMs > 0");
    }
    if (thresholdCommitsPerInterval <= 0) {
      throw new Error("RenderLoopDetector requires thresholdCommitsPerInterval > 0");
    }

    const id = window.setInterval(() => {
      const total = totalCommitsRef.current;
      const last = lastSampleTotalRef.current;
      const delta = total - last;
      lastSampleTotalRef.current = total;

      if (delta > thresholdCommitsPerInterval) {
        const info = { label, commitsInInterval: delta, totalCommits: total };
        const handler = onDetectedRef.current;
        if (handler) {
          handler(info);
        } else {
          console.warn(`[RenderLoopDetector] render loop detected`, info);
        }
      }
    }, intervalMs);

    return () => {
      window.clearInterval(id);
    };
  }, [label, intervalMs, thresholdCommitsPerInterval]);

  return (
    <React.Profiler
      id={label}
      onRender={() => {
        totalCommitsRef.current += 1;
      }}
    >
      {children}
    </React.Profiler>
  );
};

RenderLoopDetector.displayName = "RenderLoopDetector";
