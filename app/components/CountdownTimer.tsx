'use client';

import { useState, useEffect, useRef } from 'react';

interface CountdownTimerProps {
  endTime: string | Date;
  onExpire?: () => void;
  isExtended?: boolean;
  className?: string;
}

export default function CountdownTimer({
  endTime,
  onExpire,
  isExtended = false,
  className = '',
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
  }>({ hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 });

  const hasExpiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    hasExpiredRef.current = false;

    const calculateTime = () => {
      const targetTime = new Date(endTime).getTime();
      const now = Date.now();
      const diffMs = targetTime - now;

      if (diffMs <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 });
        if (!hasExpiredRef.current) {
          hasExpiredRef.current = true;
          if (onExpireRef.current) {
            onExpireRef.current();
          }
        }
        return;
      }

      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft({ hours, minutes, seconds, totalSeconds });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const isZero = timeLeft.totalSeconds <= 0;

  return (
    <div className={`flex flex-col items-start ${className}`}>
      <div
        className={`flex items-center gap-1.5 font-mono font-bold tracking-wider text-xl transition-all duration-300 ${
          isExtended
            ? 'text-amber-500 dark:text-amber-400 animate-pulse scale-105'
            : isZero
            ? 'text-gray-400 dark:text-gray-500'
            : timeLeft.totalSeconds <= 120
            ? 'text-red-600 dark:text-red-400 animate-pulse'
            : 'text-gray-900 dark:text-white'
        }`}
      >
        <div className="bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs">
          {pad(timeLeft.hours)}
        </div>
        <span className="text-gray-400">:</span>
        <div className="bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs">
          {pad(timeLeft.minutes)}
        </div>
        <span className="text-gray-400">:</span>
        <div className="bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs">
          {pad(timeLeft.seconds)}
        </div>
      </div>

      {isExtended && !isZero && (
        <span className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-bounce">
          ⚡ +5m Anti-Sniping Extension Active
        </span>
      )}
    </div>
  );
}
