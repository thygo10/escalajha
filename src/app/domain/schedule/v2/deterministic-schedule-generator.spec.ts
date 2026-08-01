import { describe, it, expect } from 'vitest';
import { generateDeterministicSchedule } from './deterministic-schedule-generator';
import { createYearMonth } from '../../shared/year-month';
import { Funcionario } from '../../../models/types';
import { isWorkDay } from './consecutive-days.engine';

describe('Motor Determinístico EscalaJHA v2 - Testes Obrigatórios', () => {
  const sampleEmployees: Funcionario[] = [
    {
      id: 'emp-1',
      loja_id: 'loja-1',
      primeiro_nome: 'Ana',
      matricula_aleatoria: '100001',
      setor: 'Frente de Caixa',
      cargo: 'Operador de Caixa',
      turno_padrao: '07:00 às 15:50',
      genero: 'F',
      ativo: true,
      grupo_domingo: 'A',
      grupo_feriado: 'A',
      grupo_folga_compensatoria: 'S5' // Sexta-feira
    },
    {
      id: 'emp-2',
      loja_id: 'loja-1',
      primeiro_nome: 'Bruno',
      matricula_aleatoria: '100002',
      setor: 'Frente de Caixa',
      cargo: 'Operador de Caixa',
      turno_padrao: '07:00 às 15:50',
      genero: 'M',
      ativo: true,
      grupo_domingo: 'B',
      grupo_feriado: 'B',
      grupo_folga_compensatoria: 'S1' // Segunda-feira
    },
    {
      id: 'emp-3',
      loja_id: 'loja-1',
      primeiro_nome: 'Carla',
      matricula_aleatoria: '100003',
      setor: 'Frente de Caixa',
      cargo: 'Operador de Caixa',
      turno_padrao: '07:00 às 15:50',
      genero: 'F',
      ativo: true,
      grupo_domingo: 'C',
      grupo_feriado: 'A',
      grupo_folga_compensatoria: 'S3' // Quarta-feira
    }
  ];

  it('1. Agosto/2026 (5 domingos): Grupo A deve trabalhar 2 domingos e folgar 3 domingos', () => {
    const result = generateDeterministicSchedule({
      employees: [sampleEmployees[0]], // Ana - Grupo A, Folga Sexta S5
      month: createYearMonth(2026, 8), // Agosto 2026
      holidays: []
    });

    expect(result.isValid).toBe(true);
    const item = result.items[0];

    // Domingos em Agosto/2026: 02, 09, 16, 23, 30
    expect(item.dias[2]).toBe('TD'); // 1º domingo -> TRABALHA
    expect(item.dias[9]).toBe('FD'); // 2º domingo -> FOLGA
    expect(item.dias[16]).toBe('FD'); // 3º domingo -> FOLGA
    expect(item.dias[23]).toBe('TD'); // 4º domingo -> TRABALHA
    expect(item.dias[30]).toBe('FD'); // 5º domingo -> FOLGA
  });

  it('2. Regra de Ouro DSR + CLT: Folga semanal concedida no domingo trabalhado e ajustada para respeitar Art. 67 CLT', () => {
    const result = generateDeterministicSchedule({
      employees: [sampleEmployees[0]], // Ana - Grupo A, Folga Sexta S5
      month: createYearMonth(2026, 8),
      holidays: []
    });

    const item = result.items[0];

    // Semana 1 (Dom 02 trabalhado): ganha folga compensatória na sexta 07
    expect(item.dias[2]).toBe('TD');
    expect(item.dias[7]).toBe('F');

    // Semana 2 (Dom 09 folga): NÃO ganha outra folga na semana
    expect(item.dias[9]).toBe('FD');

    // Dom 23 trabalhado: ganha folga compensatória na Sexta 21 e ajuste CLT na Sexta 28 (para impedir > 6 dias consecutivos entre dom 16 e dom 30)
    expect(item.dias[21]).toBe('F');
    expect(item.dias[23]).toBe('TD');

    // Semanas com domingos em folga preservam FD como o DSR da semana
    expect(item.dias[30]).toBe('FD');

    // Garantia absoluta de que NENHUMA sequência de trabalho excede 6 dias
    let maxConsecutive = 0;
    let streak = 0;
    for (let d = 1; d <= 31; d++) {
      if (isWorkDay(item.dias[d])) {
        streak++;
        if (streak > maxConsecutive) maxConsecutive = streak;
      } else {
        streak = 0;
      }
    }
    expect(maxConsecutive).toBeLessThanOrEqual(6);
  });

  it('3. Transição de mês: Funcionário que iniciou Agosto após 6 dias consecutivos no final de Julho recebe folga imediata no dia 01', () => {
    const result = generateDeterministicSchedule({
      employees: [sampleEmployees[0]],
      month: createYearMonth(2026, 8),
      previousStates: {
        'emp-1': {
          consecutiveDaysAtStart: 6 // Terminou Julho com 6 dias consecutivos trabalhados
        }
      }
    });

    const item = result.items[0];
    // Dia 1 de Agosto deve obrigatoriamente ser Folga 'F' para não atingir o 7º dia
    expect(item.dias[1]).toBe('F');
  });

  it('4. Art. 67 CLT: Nenhum funcionário nunca ultrapassa 6 dias consecutivos trabalhados em qualquer mês', () => {
    const result = generateDeterministicSchedule({
      employees: sampleEmployees,
      month: createYearMonth(2026, 8)
    });

    for (const item of result.items) {
      let streak = 0;
      for (let d = 1; d <= 31; d++) {
        if (isWorkDay(item.dias[d])) {
          streak++;
          expect(streak).toBeLessThanOrEqual(6);
        } else {
          streak = 0;
        }
      }
    }
  });

  it('5. Reprodutibilidade e Determinismo: Executar o gerador 100 vezes com as mesmas entradas gera EXATAMENTE o mesmo resultado', () => {
    const input = {
      employees: sampleEmployees,
      month: createYearMonth(2026, 8)
    };

    const firstRun = generateDeterministicSchedule(input);
    const firstJson = JSON.stringify(firstRun);

    for (let i = 0; i < 100; i++) {
      const run = generateDeterministicSchedule(input);
      expect(JSON.stringify(run)).toBe(firstJson);
    }
  });
});
