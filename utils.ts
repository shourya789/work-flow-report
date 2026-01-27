
/**
 * Converts HH:MM:SS string to total seconds
 */
export const timeToSeconds = (timeStr: string): number => {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
};

/**
 * Converts total seconds to HH:MM:SS string
 */
export const secondsToTime = (totalSeconds: number): string => {
  const isNegative = totalSeconds < 0;
  const absoluteSeconds = Math.abs(totalSeconds);
  const h = Math.floor(absoluteSeconds / 3600);
  const m = Math.floor((absoluteSeconds % 3600) / 60);
  const s = absoluteSeconds % 60;
  
  const formatted = [
    h.toString().padStart(2, '0'),
    m.toString().padStart(2, '0'),
    s.toString().padStart(2, '0')
  ].join(':');

  return isNegative ? `-${formatted}` : formatted;
};

/**
 * Validates if string is in strict HH:MM:SS format
 */
export const isValidTimeFormat = (str: string): boolean => {
  return /^([0-9]+):([0-5][0-9]):([0-5][0-9])$/.test(str);
};

/**
 * Attempts to correct loose time inputs (e.g., "1:5:30" -> "01:05:30")
 */
export const autoCorrectTime = (str: string): string => {
  if (!str.trim()) return '00:00:00';
  const parts = str.split(':').map(p => p.trim()).filter(p => p !== '');
  
  // Fill missing parts if only 1 or 2 parts provided
  while (parts.length < 3) parts.unshift('0');
  
  const formatted = parts.slice(0, 3).map((p, idx) => {
    let num = parseInt(p, 10);
    if (isNaN(num)) num = 0;
    // Seconds and Minutes should cap at 59 for "correctness", though hours can grow
    if (idx > 0 && num > 59) num = 59;
    return num.toString().padStart(2, '0');
  });
  
  return formatted.join(':');
};

/**
 * Format date for display
 */
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
