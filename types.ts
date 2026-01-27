
export interface User {
  id: string;
  empId: string;
  name: string;
  email: string;
  role?: 'user' | 'admin';
  password?: string;
}

export type ShiftType = 'Full Day' | 'Half Day';

export type EntryStatus = 'Approved' | 'Pending' | 'Rejected' | 'N/A';

export interface TimeData {
  id: string;
  userId: string; // Reference to owner (Employee ID)
  userName?: string; // Cache for reports
  userRealId?: string; // Internal UUID reference for admin lookups
  date: string;
  shiftType: ShiftType;
  pause: string; // HH:MM:SS
  dispo: string; // HH:MM:SS
  dead: string;  // HH:MM:SS
  currentLogin: string; // HH:MM:SS (Duration)
  loginTimestamp: string; // HH:MM:SS (Start time)
  logoutTimestamp: string; // HH:MM:SS (End time)
  wait: string;
  talk: string;
  hold: string;
  customerTalk: string;
  inbound: number;
  outbound: number;
  reason?: string; // Optional reason for performance/OT
  status: EntryStatus;
}

export interface AIExtractionLog {
  id: string;
  timestamp: string;
  rawText: string;
  parsedData: Omit<TimeData, 'id' | 'date' | 'shiftType' | 'userId'>;
}

export interface CalculationResult {
  totalPauseTime: string;
  loginRemaining: string;
  breakRemaining: string;
  otTime: string;
  breakUsedSeconds: number;
  breakLeftSeconds: number;
  loginRemainingSeconds: number;
  totalBreakSeconds: number;
  otSeconds: number;
}
