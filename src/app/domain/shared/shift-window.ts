export interface ShiftWindow {
  start: string;
  end: string;
}

export function parseTime(timeStr: string): { hour: number; minute: number } {
  const parts = timeStr.split(':');
  return { hour: Number(parts[0]), minute: Number(parts[1]) };
}

export function timeToMinutes(timeStr: string): number {
  const { hour, minute } = parseTime(timeStr);
  return hour * 60 + minute;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function shiftDurationMinutes(shift: ShiftWindow): number {
  return timeToMinutes(shift.end) - timeToMinutes(shift.start);
}

export function netWorkMinutes(shift: ShiftWindow, breakMinutes: number): number {
  return shiftDurationMinutes(shift) - breakMinutes;
}

export function overlaps(a: ShiftWindow, b: ShiftWindow): boolean {
  return timeToMinutes(a.start) < timeToMinutes(b.end) && timeToMinutes(b.start) < timeToMinutes(a.end);
}

export function isWithin(shift: ShiftWindow, time: string): boolean {
  const t = timeToMinutes(time);
  return t >= timeToMinutes(shift.start) && t < timeToMinutes(shift.end);
}

export function extractLunchInterval(
  nome: string,
  entrada: string,
  saida: string,
  intervaloMinutos: number,
): { inicio: number; fim: number } {
  const lunchMatch = nome.match(/Almoço\s+(\d{2}:\d{2})\s+às\s+(\d{2}:\d{2})/i);
  if (lunchMatch) {
    return {
      inicio: timeToMinutes(lunchMatch[1]),
      fim: timeToMinutes(lunchMatch[2]),
    };
  }
  const entradaMin = timeToMinutes(entrada);
  const saidaMin = timeToMinutes(saida);
  if (saidaMin < entradaMin) {
    return { inicio: saidaMin, fim: saidaMin + intervaloMinutos };
  }
  const inicio = (entradaMin + saidaMin) / 2 - intervaloMinutos / 2;
  return { inicio, fim: inicio + intervaloMinutos };
}
