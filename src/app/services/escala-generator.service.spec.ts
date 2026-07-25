import assert from 'node:assert';
import { INITIAL_FUNCIONARIOS, INITIAL_FERIADOS } from '../models/mock-data';
import { EscalaGeneratorService } from './escala-generator.service';

/**
 * Spec Test Suite: EscalaGeneratorService (Julho a Dezembro 2026)
 * Audita a geração e validação de regras 6x1, trava FD->TD, 4-5 folgas por domingos do mês e Natal.
 */
export function runEscalaGeneratorSpec(): void {
  const service = new EscalaGeneratorService();
  const funcsFrenteCaixa = INITIAL_FUNCIONARIOS.filter(f => f.setor === 'Frente de Caixa' && f.ativo);
  const ano = 2026;

  // TESTE 1: JULHO/2026 (4 Domingos)
  const itensJul = service.gerarEscalaMensal(funcsFrenteCaixa, ano, 7, {
    feriados: INITIAL_FERIADOS,
    minFuncionariosPorDia: 6,
    minFuncionariosFeriado: 6
  });
  const valJul = service.validarEscala(itensJul, ano, 7, 6, [], INITIAL_FERIADOS);
  assert.strictEqual(valJul.valida, true, 'Julho/2026 deve ser 100% válida sem erros de CLT');
  itensJul.forEach(item => {
    const totalFolgas = Object.values(item.dias).filter(st => st === 'F' || st === 'FD' || st === 'FE').length;
    assert.strictEqual(totalFolgas >= 4 && totalFolgas <= 6, true, `${item.nome} em Julho deve ter entre 4 e 6 folgas`);
  });

  // TESTE 2: AGOSTO/2026 (5 Domingos)
  const itensAgo = service.gerarEscalaMensal(funcsFrenteCaixa, ano, 8, {
    feriados: INITIAL_FERIADOS,
    minFuncionariosPorDia: 6
  });
  const valAgo = service.validarEscala(itensAgo, ano, 8, 6, [], INITIAL_FERIADOS);
  assert.strictEqual(valAgo.valida, true, 'Agosto/2026 deve ser 100% válida sem erros de CLT');
  itensAgo.forEach(item => {
    const totalFolgas = Object.values(item.dias).filter(st => st === 'F' || st === 'FD' || st === 'FE').length;
    assert.strictEqual(totalFolgas >= 5 && totalFolgas <= 6, true, `${item.nome} em Agosto (5 domingos) deve ter 5 ou 6 folgas`);
  });

  // TESTE 3: SETEMBRO/2026 (4 Domingos | Feriado 07/09)
  const itensSet = service.gerarEscalaMensal(funcsFrenteCaixa, ano, 9, {
    feriados: INITIAL_FERIADOS,
    minFuncionariosPorDia: 6
  });
  const valSet = service.validarEscala(itensSet, ano, 9, 6, [], INITIAL_FERIADOS);
  assert.strictEqual(valSet.valida, true, 'Setembro/2026 deve ser 100% válida sem erros');
  itensSet.forEach(item => {
    const totalFolgas = Object.values(item.dias).filter(st => st === 'F' || st === 'FD' || st === 'FE').length;
    assert.strictEqual(totalFolgas >= 4 && totalFolgas <= 6, true, `${item.nome} em Setembro deve ter entre 4 e 6 folgas`);
  });

  // TESTE 4: OUTUBRO/2026 (4 Domingos | Feriados 12/10 e 31/10)
  const itensOut = service.gerarEscalaMensal(funcsFrenteCaixa, ano, 10, {
    feriados: INITIAL_FERIADOS,
    minFuncionariosPorDia: 6
  });
  const valOut = service.validarEscala(itensOut, ano, 10, 6, [], INITIAL_FERIADOS);
  assert.strictEqual(valOut.valida, true, 'Outubro/2026 deve ser 100% válida');
  itensOut.forEach(item => {
    const totalFolgas = Object.values(item.dias).filter(st => st === 'F' || st === 'FD' || st === 'FE').length;
    assert.strictEqual(totalFolgas >= 4 && totalFolgas <= 6, true, `${item.nome} em Outubro deve ter entre 4 e 6 folgas`);
  });

  // TESTE 5: NOVEMBRO/2026 (5 Domingos)
  const itensNov = service.gerarEscalaMensal(funcsFrenteCaixa, ano, 11, {
    feriados: INITIAL_FERIADOS,
    minFuncionariosPorDia: 6
  });
  const valNov = service.validarEscala(itensNov, ano, 11, 6, [], INITIAL_FERIADOS);
  if (!valNov.valida) {
    console.log('NOVEMBRO ERROS:', JSON.stringify(valNov.itensValidados, null, 2));
  }
  assert.strictEqual(valNov.valida, true, 'Novembro/2026 (5 domingos) deve ser 100% válida');
  itensNov.forEach(item => {
    const totalFolgas = Object.values(item.dias).filter(st => st === 'F' || st === 'FD' || st === 'FE').length;
    assert.strictEqual(totalFolgas >= 5 && totalFolgas <= 7, true, `${item.nome} em Novembro deve ter entre 5 e 7 folgas`);
  });

  // TESTE 6: DEZEMBRO/2026 (Natal 25/12 Fechado)
  const feriadosDez: typeof INITIAL_FERIADOS = [
    ...INITIAL_FERIADOS,
    {
      id: 'natal-2026',
      nome: 'Natal',
      data: '2026-12-25',
      tipo: 'Nacional',
      funcionamento_proibido: true
    }
  ];
  const itensDez = service.gerarEscalaMensal(funcsFrenteCaixa, ano, 12, {
    feriados: feriadosDez,
    minFuncionariosPorDia: 6
  });
  const valDez = service.validarEscala(itensDez, ano, 12, 6, [], feriadosDez);
  if (!valDez.valida) {
    console.log('DEZEMBRO ERROS:', JSON.stringify(valDez.itensValidados, null, 2));
  }
  assert.strictEqual(valDez.valida, true, 'Dezembro/2026 com Natal Fechado deve ser 100% válida');
  itensDez.forEach(item => {
    const totalFolgas = Object.values(item.dias).filter(st => st === 'F' || st === 'FD' || st === 'FE').length;
    assert.strictEqual(totalFolgas >= 4 && totalFolgas <= 6, true, `${item.nome} em Dezembro deve ter entre 4 e 6 folgas`);
  });

  // TESTE 7: Trava FD -> TD (Nenhuma infração de 7 dias na transição)
  [itensJul, itensAgo, itensSet, itensOut, itensNov, itensDez].forEach((itensMes, idx) => {
    const m = idx + 7;
    const res = service.validarEscala(itensMes, ano, m, 6, [], INITIAL_FERIADOS);
    const errosTransicao = res.itensValidados.filter(e => e.tipo === 'ERRO_TRANSICAO_DOMINGO');
    assert.strictEqual(errosTransicao.length, 0, `Mês ${m} não pode ter erros de transição FD->TD`);
  });

  console.log('✅ ALL SPECS PASSED CLEANLY FOR EscalaGeneratorService (JULHO A DEZEMBRO 2026)!');
}

runEscalaGeneratorSpec();
