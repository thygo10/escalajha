import { describe, it, expect } from 'vitest';
import { generateDeterministicSchedule } from './deterministic-schedule-generator';

const ana = {
  id: 'emp-1', loja_id: 'loja-02-demo', primeiro_nome: 'Ana', matricula_aleatoria: '100001',
  setor: 'Frente de Caixa', cargo: 'Operador de caixa', turno_padrao: '07:00 às 15:50',
  genero: 'F', ativo: true, rodizio_id: 'rod_normal_1x2', grupo_domingo: 'A',
  grupo_feriado: 'A', grupo_folga_compensatoria: 'S5', grupo: 'A'
};

describe('debug ana', () => {
  it('prints Ana August', () => {
    const result = generateDeterministicSchedule({
      employees: [ana as any],
      month: { year: 2026, month: 8 },
      holidays: []
    } as any);
    const item = result.items[0];
    const dias: string[] = [];
    for (let d = 1; d <= 31; d++) dias.push(`${d}:${item.dias[d]}`);
    console.log('ANA:', dias.join(' '));
    expect(1).toBe(1);
  });
});
