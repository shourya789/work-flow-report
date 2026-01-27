
import * as XLSX from 'xlsx';
import { TimeData, User, EntryStatus } from '../types';
import { timeToSeconds, secondsToTime } from '../utils';

/**
 * Common data mapper for Excel export
 */
const mapEntryForExcel = (entry: TimeData, userName: string, empId: string) => {
  const loginSec = timeToSeconds(entry.currentLogin);
  const pauseSec = timeToSeconds(entry.pause);
  const dispoSec = timeToSeconds(entry.dispo);
  const deadSec = timeToSeconds(entry.dead);
  
  const totalBreakSec = pauseSec + dispoSec + deadSec;
  const shiftBase = entry.shiftType === 'Full Day' ? 9 * 3600 : 4.5 * 3600;
  const breakLimit = entry.shiftType === 'Full Day' ? 7200 : 2700; 
  
  const excessSeconds = loginSec - shiftBase;
  const otSec = excessSeconds > 0 ? excessSeconds : 0;
  const isBreakExceeded = totalBreakSec > breakLimit;

  return {
    "Working Date": entry.date.split('T')[0],
    "Employee ID": empId.toUpperCase(),
    "Employee Name": userName,
    "Shift Category": entry.shiftType,
    "Status": entry.status || "N/A",
    "Session Duration": entry.currentLogin,
    "OT Calculated": secondsToTime(otSec),
    "Total Break Time": secondsToTime(totalBreakSec),
    "Inbound Calls": entry.inbound || 0,
    "Outbound Calls": entry.outbound || 0,
    "Login Start": entry.loginTimestamp || "—",
    "Login End": entry.logoutTimestamp || "—",
    "Pause Time": entry.pause,
    "Dispo Time": entry.dispo,
    "Dead Time": entry.dead,
    "Wait Time": entry.wait || "00:00:00",
    "Talk Time": entry.talk || "00:00:00",
    "Hold Time": entry.hold || "00:00:00",
    "Customer Talk Time": entry.customerTalk || "00:00:00",
    "Break Cap Status": isBreakExceeded ? "EXCEEDED" : "OK",
    "Notes/Reason": entry.reason || "N/A"
  };
};

export const exportToExcel = (entries: TimeData[], user: User) => {
  if (!entries.length) return alert("No data to export");
  const data = entries.map(entry => mapEntryForExcel(entry, user.name, user.empId));
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Performance_Audit");
  XLSX.writeFile(workbook, `WF_Audit_${user.empId}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportConsolidatedExcel = (allEntries: any[]) => {
  if (!allEntries.length) return alert("No master data to export");
  const data = allEntries.map(entry => 
    mapEntryForExcel(entry, entry.userName || "N/A", entry.userId || "N/A")
  );
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Master_Property_Log");
  XLSX.writeFile(workbook, `MASTER_AUDIT_REPORT_4K_${new Date().toISOString().split('T')[0]}.xlsx`);
};
