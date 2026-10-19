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
      <div className={`cd ${isZero ? 'done' : ''}`}>
        <div className="cdd">{pad(timeLeft.hours)}</div>
        <i>:</i>
        <div className="cdd">{pad(timeLeft.minutes)}</div>
        <i>:</i>
        <div className="cdd">{pad(timeLeft.seconds)}</div>
      </div>

      {isExtended && !isZero && (
        <span className="tag gold mt-2 animate-bounce">
          ⚡ Anti-Sniping +5m Active
        </span>
      )}
    </div>
  );
}
