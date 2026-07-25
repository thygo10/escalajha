import assert from 'node:assert';
import { INITIAL_FUNCIONARIOS, INITIAL_FERIADOS } from '../models/mock-data';
import { EscalaGeneratorService } from './escala-generator.service';

/**
 * Spec Test Suite: EscalaGeneratorService
 * Audita a geração e validação de regras de feriado aberto com Turma Reduzida por Turnos e CLT.
 */
export function runEscalaGeneratorSpec(): void {
  const service = new EscalaGeneratorService();

  const funcsFrenteCaixa = INITIAL_FUNCIONARIOS.filter(f => f.setor === 'Frente de Caixa' && f.ativo);
  const ano = 2026;
  const mes = 7; // 2 de Julho é Feriado Aberto

  const itens = service.gerarEscalaMensal(funcsFrenteCaixa, ano, mes, {
    feriados: INITIAL_FERIADOS,
    minFuncionariosPorDia: 6,
    minFuncionariosFeriado: 6
  });

  const diaFeriado = 2;
  const trabalhadoresNoFeriado = itens.filter(i => i.dias[diaFeriado] === 'TF');
  const folgandoNoFeriado = itens.filter(i => i.dias[diaFeriado] === 'F' || i.dias[diaFeriado] === 'FE');

  // Teste 1: Turma Reduzida no Feriado (Apenas 6 trabalham TF, maioria folga F)
  assert.strictEqual(trabalhadoresNoFeriado.length, 6, 'Apenas 6 colaboradores devem trabalhar no feriado (Turma Reduzida)');
  assert.strictEqual(folgandoNoFeriado.length, funcsFrenteCaixa.length - 6, 'A maioria dos colaboradores deve estar de folga no feriado');

  // Teste 2: Cobertura por Turnos (Garante abertura e fechamento cobertos no feriado)
  const aberturaFeriado = trabalhadoresNoFeriado.filter(i => i.turno.includes('08:00'));
  const fechamentoFeriado = trabalhadoresNoFeriado.filter(i => i.turno.includes('14:00') || i.turno.includes('13:30'));
  assert.strictEqual(aberturaFeriado.length > 0, true, 'Deve haver pelo menos 1 caixa na Abertura no feriado');
  assert.strictEqual(fechamentoFeriado.length > 0, true, 'Deve haver pelo menos 1 caixa no Fechamento no feriado');

  // Teste 3: Nenhum trabalhador no feriado pode estar como T comum
  const trabalhadoresComTComum = itens.filter(i => i.dias[diaFeriado] === 'T');
  assert.strictEqual(trabalhadoresComTComum.length, 0, 'Nenhum trabalhador no feriado pode estar como T comum');

  // Teste 4: Teto máximo de 5 folgas por mês
  itens.forEach(item => {
    const totalFolgas = Object.values(item.dias).filter(st => st === 'F' || st === 'FD' || st === 'FE').length;
    assert.strictEqual(totalFolgas <= 5, true, `${item.nome} não pode ter mais de 5 folgas no mês`);
  });

  console.log('✅ ALL SPECS PASSED CLEANLY FOR EscalaGeneratorService (TURMA REDUZIDA E EQUILIBRADA POR TURNOS NO FERIADO)!');
}

runEscalaGeneratorSpec();
