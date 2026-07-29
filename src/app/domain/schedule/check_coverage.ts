// Quick audit script - coverage per hour + folgas per employee for July 2026 Frente de Caixa
import { generateSchedule } from './schedule-generator';
import { INITIAL_FUNCIONARIOS } from '../../models/mock-data';
import { EscalaValidatorService } from '../../services/escala-validator.service';

const funcs = INITIAL_FUNCIONARIOS.filter(f => f.setor === 'Frente de Caixa' && f.ativo);
console.log('Total funcionarios Frente de Caixa:', funcs.length);

const res = generateSchedule({ 
  employees: funcs as any, 
  month: { year: 2026, month: 7 }, 
  holidays: [{ id: '1', nome: 'Independência Bahia', data: '2026-07-02', tipo: 'Estadual', abrangencia: 'BA', funcionamento_proibido: false }]
});

const turnosConfigs = [
  { id: 't1', nome: '07:00 às 15:50 (Almoço 11:00 às 12:30)', entrada: '07:00', saida: '15:50', intervaloMinutos: 90, cargaHorariaLiquidaMinutos: 440, excedeLimiteDiario: false },
  { id: 't2', nome: '09:00 às 17:50 (Almoço 13:00 às 14:30)', entrada: '09:00', saida: '17:50', intervaloMinutos: 90, cargaHorariaLiquidaMinutos: 440, excedeLimiteDiario: false },
  { id: 't3', nome: '12:40 às 21:30 (Almoço 14:20 às 15:50)', entrada: '12:40', saida: '21:30', intervaloMinutos: 90, cargaHorariaLiquidaMinutos: 440, excedeLimiteDiario: false },
  { id: 't4', nome: '12:40 às 21:30 (Almoço 15:30 às 17:00)', entrada: '12:40', saida: '21:30', intervaloMinutos: 90, cargaHorariaLiquidaMinutos: 440, excedeLimiteDiario: false }
];

const validator = new EscalaValidatorService();

// === 1. FOLGAS por funcionário ===
console.log('\n=== FOLGAS POR FUNCIONÁRIO (max 5) ===');
let violouFolga = false;
res.entries.forEach(e => {
  const folgas = Object.values(e.dias).filter(st => st === 'F' || st === 'FD' || st === 'FE').length;
  if (folgas > 5) {
    console.log(`  ⛔ ${e.nome} | ${folgas} folgas (ACIMA DO LIMITE)`);
    violouFolga = true;
  }
});
if (!violouFolga) console.log('  ✅ Todos com máximo 5 folgas');

// === 2. COBERTURA horária por dia (dias úteis) ===
console.log('\n=== COBERTURA HORÁRIA - DIAS COM PROBLEMA (<6 em alguma faixa) ===');
let violouCobertura = false;
for (let dia = 1; dia <= 31; dia++) {
  const date = new Date(2026, 6, dia);
  if (date.getMonth() !== 6) break; // July only
  const isDomingo = date.getDay() === 0;
  
  const presenca = validator.calcularPresencaPorFaixaHoraria(res.entries as any, turnosConfigs, dia);
  const hIni = isDomingo ? 8 : 7;
  const hFim = isDomingo ? 20 : 21;
  
  const problemas: string[] = [];
  for (const faixa of presenca) {
    const hNum = parseInt(faixa.horaStr.split(':')[0], 10);
    if (hNum >= hIni && hNum < hFim) {
      if (faixa.quantidadeTrabalhando < 6) {
        problemas.push(`${faixa.horaStr}: ${faixa.quantidadeTrabalhando}`);
      }
    }
  }
  if (problemas.length > 0) {
    const dayLabel = isDomingo ? 'DOM' : 'útil';
    console.log(`  ⛔ Dia ${String(dia).padStart(2,'0')} (${dayLabel}): ${problemas.join(', ')}`);
    violouCobertura = true;
  }
}
if (!violouCobertura) console.log('  ✅ Todos os dias com cobertura ≥ 6 em todos os horários de funcionamento');

// === 3. Detalhe de um dia útil típico (dia 7 = quarta) ===
console.log('\n=== DETALHE PRESENÇA DIA 7 (Quarta-feira) ===');
const presencaDia7 = validator.calcularPresencaPorFaixaHoraria(res.entries as any, turnosConfigs, 7);
presencaDia7.forEach(f => {
  const hNum = parseInt(f.horaStr.split(':')[0], 10);
  if (hNum >= 7 && hNum <= 21) {
    const ok = f.quantidadeTrabalhando >= 6;
    console.log(`  ${ok ? '✅' : '⛔'} ${f.horaStr} -> ${f.quantidadeTrabalhando} operadores`);
  }
});

// === 4. Dia com mais folgas (pior caso) ===
console.log('\n=== CONTAGEM DE TRABALHANDO/FOLGA POR DIA ===');
for (let dia = 1; dia <= 31; dia++) {
  const date = new Date(2026, 6, dia);
  if (date.getMonth() !== 6) break;
  const trab = res.entries.filter(e => {
    const s = e.dias[dia];
    return s === 'T' || s === 'TD' || s === 'TF';
  }).length;
  const folg = res.entries.filter(e => {
    const s = e.dias[dia];
    return s === 'F' || s === 'FD' || s === 'FE';
  }).length;
  const isDom = date.getDay() === 0;
  console.log(`  Dia ${String(dia).padStart(2,'0')} ${isDom?'DOM':'   '}: Trab=${trab} Folg=${folg}`);
}
