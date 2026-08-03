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

    // Semana 1 (Dom 02 trabalhado): folga compensatória na Sexta 07 (dia preferencial S5)
    expect(item.dias[2]).toBe('TD');
    expect(item.dias[7]).toBe('F');

    // Semana 2 (Dom 09 folga): NÃO ganha outra folga na semana
    expect(item.dias[9]).toBe('FD');

    // Dom 23 trabalhado: sem dia pós-domingo viável (criaria vão > 7 desde o FD 16),
    // folga compensatória PRÉ-domingo no dia mais recente possível (Sáb 22)
    expect(item.dias[22]).toBe('F');
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

  it('6. Afastamentos/Férias: dias cobertos por evento de férias viram FR e não são convertidos pelo reparo de cobertura', () => {
    const result = generateDeterministicSchedule({
      employees: sampleEmployees,
      month: createYearMonth(2026, 8),
      minFuncionariosDia: 3,
      minFuncionariosDomingo: 2,
      leaveEvents: [
        {
          matricula: '100001',
          tipo: 'FERIAS',
          data_inicio: '2026-08-01',
          data_fim: '2026-08-10'
        },
        {
          matricula: '100002',
          tipo: 'ATESTADO',
          data_inicio: '2026-08-05',
          data_fim: '2026-08-05'
        }
      ]
    });

    const ana = result.items.find(i => i.matricula === '100001')!;
    const bruno = result.items.find(i => i.matricula === '100002')!;

    for (let d = 1; d <= 10; d++) {
      expect(ana.dias[d]).toBe('FR');
    }
    expect(bruno.dias[5]).toBe('AF');

    // O reparo de cobertura nunca converte dias de afastamento/férias
    for (const item of result.items) {
      for (let d = 1; d <= 31; d++) {
        if (item.matricula === '100001' && d <= 10) expect(item.dias[d]).toBe('FR');
        if (item.matricula === '100002' && d === 5) expect(item.dias[d]).toBe('AF');
      }
    }
  });

  it('7. Cobertura mínima: com 3 funcionários e minDia=2/minDomingo=2 (matematicamente inviável com rotação 1T:2F), reporta ERROR honesto sem criar domingos consecutivos', () => {
    const result = generateDeterministicSchedule({
      employees: sampleEmployees,
      month: createYearMonth(2026, 8),
      minFuncionariosDia: 2,
      minFuncionariosDomingo: 2
    });

    // Inviável: 3 funcionários não cobrem 2 por domingo sem quebrar 1T:2F
    const errors = result.violations.filter(v => v.severity === 'ERROR');
    expect(errors.some(v => v.code === 'MIN_COVERAGE_NOT_MET')).toBe(true);
    expect(result.isValid).toBe(false);

    // Apesar de inviável, o reparo NUNCA cria domingos consecutivos
    for (const item of result.items) {
      let prevSunWorked = false;
      for (let d = 1; d <= 31; d++) {
        const isDom = new Date(2026, 7, d).getDay() === 0;
        if (!isDom) continue;
        const worked = isWorkDay(item.dias[d]);
        expect(!(prevSunWorked && worked), `Matrícula ${item.matricula} trabalhou 2 domingos consecutivos (dia ${d})`).toBe(true);
        prevSunWorked = worked;
      }
    }
  });

  it('7b. Cobertura mínima viável: com 6 funcionários (2 por grupo A/B/C) e minDia=2/minDomingo=2, todo dia tem >= 2 trabalhando e nenhum domingo consecutivo', () => {
    const sixEmployees: Funcionario[] = [
      ...sampleEmployees,
      {
        id: 'emp-4',
        loja_id: 'loja-1',
        primeiro_nome: 'Daniela',
        matricula_aleatoria: '100004',
        setor: 'Frente de Caixa',
        cargo: 'Operador de Caixa',
        turno_padrao: '07:00 às 15:50',
        genero: 'F',
        ativo: true,
        grupo_domingo: 'A',
        grupo_feriado: 'B',
        grupo_folga_compensatoria: 'S2'
      },
      {
        id: 'emp-5',
        loja_id: 'loja-1',
        primeiro_nome: 'Eduardo',
        matricula_aleatoria: '100005',
        setor: 'Frente de Caixa',
        cargo: 'Operador de Caixa',
        turno_padrao: '07:00 às 15:50',
        genero: 'M',
        ativo: true,
        grupo_domingo: 'B',
        grupo_feriado: 'A',
        grupo_folga_compensatoria: 'S4'
      },
      {
        id: 'emp-6',
        loja_id: 'loja-1',
        primeiro_nome: 'Fernanda',
        matricula_aleatoria: '100006',
        setor: 'Frente de Caixa',
        cargo: 'Operador de Caixa',
        turno_padrao: '07:00 às 15:50',
        genero: 'F',
        ativo: true,
        grupo_domingo: 'C',
        grupo_feriado: 'B',
        grupo_folga_compensatoria: 'S5'
      }
    ];

    const result = generateDeterministicSchedule({
      employees: sixEmployees,
      month: createYearMonth(2026, 8),
      minFuncionariosDia: 2,
      minFuncionariosDomingo: 2
    });

    expect(result.isValid, JSON.stringify(result.violations.filter(v => v.severity === 'ERROR'))).toBe(true);

    for (let d = 1; d <= 31; d++) {
      const working = result.items.filter(it => isWorkDay(it.dias[d])).length;
      expect(working, `Dia ${d} deve ter >= 2 trabalhando, tem ${working}`).toBeGreaterThanOrEqual(2);
    }

    for (const item of result.items) {
      let streak = 0;
      let prevSunWorked = false;
      for (let d = 1; d <= 31; d++) {
        if (isWorkDay(item.dias[d])) {
          streak++;
          expect(streak).toBeLessThanOrEqual(6);
        } else {
          streak = 0;
        }
        if (new Date(2026, 7, d).getDay() === 0) {
          const worked = isWorkDay(item.dias[d]);
          expect(!(prevSunWorked && worked), `Matrícula ${item.matricula} trabalhou 2 domingos consecutivos (dia ${d})`).toBe(true);
          prevSunWorked = worked;
        }
      }
    }
  });

  it('8. Histórico inter-meses por matrícula: virada de mês respeitada mesmo quando chave é a matrícula', () => {
    const result = generateDeterministicSchedule({
      employees: [sampleEmployees[0]],
      month: createYearMonth(2026, 8),
      previousStates: {
        '100001': {
          consecutiveDaysAtStart: 6
        }
      }
    });

    const item = result.items[0];
    expect(item.dias[1]).toBe('F');
  });

  it('9. Cobertura impossível reporta violação ERROR em vez de gerar escala inválida silenciosamente', () => {
    const result = generateDeterministicSchedule({
      employees: [sampleEmployees[0]],
      month: createYearMonth(2026, 8),
      minFuncionariosDia: 2
    });

    const errors = result.violations.filter(v => v.severity === 'ERROR');
    expect(errors.some(v => v.code === 'MIN_COVERAGE_NOT_MET')).toBe(true);
    expect(result.isValid).toBe(false);
  });
});
