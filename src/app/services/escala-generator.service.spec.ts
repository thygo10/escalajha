import assert from 'node:assert';
import { INITIAL_FUNCIONARIOS, INITIAL_FERIADOS } from '../models/mock-data';
import { EscalaGeneratorService } from './escala-generator.service';

/**
 * Spec Test Suite: EscalaGeneratorService
 * Audita a geração e validação de regras de feriado aberto e CLT.
 */
export function runEscalaGeneratorSpec(): void {
  const service = new EscalaGeneratorService();

  // Teste 1: Deve atribuir status TF para todos os colaboradores trabalhando em dia de feriado aberto
  const funcsFrenteCaixa = INITIAL_FUNCIONARIOS.filter(f => f.setor === 'Frente de Caixa' && f.ativo);
  const ano = 2026;
  const mes = 7; // 2 de Julho é Feriado Aberto

  const itens = service.gerarEscalaMensal(funcsFrenteCaixa, ano, mes, {
    feriados: INITIAL_FERIADOS,
    minFuncionariosPorDia: 6
  });

  const diaFeriado = 2;
  const trabalhadoresComTComum = itens.filter(i => i.dias[diaFeriado] === 'T');
  assert.strictEqual(trabalhadoresComTComum.length, 0, 'Nenhum trabalhador no feriado pode estar como T comum');

  const trabalhadoresNoFeriado = itens.filter(i => i.dias[diaFeriado] === 'TF');
  assert.strictEqual(trabalhadoresNoFeriado.length > 0, true, 'Deve haver colaboradores trabalhando como TF no feriado');

  // Teste 2: validarEscala deve detectar erro se algum colaborador estiver como T comum em feriado
  const itensComErro = JSON.parse(JSON.stringify(itens));
  itensComErro[0].dias[2] = 'T';

  const validacaoComErro = service.validarEscala(itensComErro, ano, mes, 6, [], INITIAL_FERIADOS);
  const erroFeriado = validacaoComErro.itensValidados.find(e => e.tipo === 'ERRO_STATUS_FERIADO');
  assert.notStrictEqual(erroFeriado, undefined, 'validarEscala deve detectar erro ERRO_STATUS_FERIADO');
  assert.strictEqual(erroFeriado?.dia, 2, 'O erro de feriado deve indicar o dia 2');

  // Teste 3: Geração completa para Frente de Caixa sem erros de regra
  const validacao = service.validarEscala(itens, ano, mes, 6, [], INITIAL_FERIADOS);
  assert.strictEqual(validacao.valida, true, 'A escala da Frente de Caixa deve ser válida');
  assert.strictEqual(validacao.totalErros, 0, 'Zero erros na Frente de Caixa');

  // Teste 4: Teto máximo de 5 folgas
  itens.forEach(item => {
    const totalFolgas = Object.values(item.dias).filter(st => st === 'F' || st === 'FD' || st === 'FE').length;
    assert.strictEqual(totalFolgas <= 5, true, `${item.nome} não pode ter mais de 5 folgas no mês`);
  });

  console.log('✅ ALL SPECS PASSED CLEANLY FOR EscalaGeneratorService!');
}

// Executa se rodar direto via tsx
runEscalaGeneratorSpec();
