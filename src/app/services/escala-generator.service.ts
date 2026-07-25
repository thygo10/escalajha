import { Injectable } from '@angular/core';
import { Funcionario, EscalaItem } from '../models/types';

export interface OpcionesGeracaoEscala {
  permitirDoisDiasConsecutivos: boolean;
  diasPermitidosFolga: number[]; // Array de dias da semana (0 = Dom, 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sáb)
}

@Injectable({
  providedIn: 'root'
})
export class EscalaGeneratorService {

  /**
   * Identifica se a colaboradora é do sexo feminino para regras da CLT / CCT
   */
  private isFeminino(func: Funcionario): boolean {
    if (func.genero === 'F') return true;
    if (func.genero === 'M') return false;

    const n = func.primeiro_nome.trim().toLowerCase();
    const nomesFemininosExatos = new Set([
      'nayle', 'alane', 'ana', 'jaqueline', 'jaine', 'kamilly', 'sabrina', 'viviane',
      'laísa', 'claudia', 'joesiane', 'sueli', 'luciene', 'luciana', 'natália', 'edma',
      'analandia', 'roseli', 'edinalia', 'suzaine', 'eduarda', 'valdenice', 'nicole',
      'normelia', 'marielle', 'angela', 'ivonete', 'maisa', 'jeane', 'raquel', 'thais',
      'walta', 'lane', 'acleia', 'ana paula', 'ana luísa', 'ana beatriz', 'ana félix', 'ana cláudia'
    ]);

    const primeiroNome = n.split(' ')[0];
    return nomesFemininosExatos.has(n) || nomesFemininosExatos.has(primeiroNome);
  }

  /**
   * Gera a escala 6x1 Giratória sem fixar dias de folga, respeitando:
   * 1. 6x1 Giratória perfeita (a folga roda pelos dias permitidos).
   * 2. Revezamento feminino: Mulheres NÃO podem trabalhar 2 domingos seguidos.
   * 3. Revezamento masculino: Homens DEVEM ter pelo menos 1 domingo de folga no mês.
   * 4. Opção de permitir/bloquear folgas em dias consecutivos.
   * 5. Distribuição justa e igualitária sem priorizar nenhum colaborador.
   */
  gerarEscalaMensal(
    funcionarios: Funcionario[],
    ano: number,
    mes: number,
    opcoes?: Partial<OpcionesGeracaoEscala>
  ): EscalaItem[] {
    const totalDias = new Date(ano, mes, 0).getDate();
    const itens: EscalaItem[] = [];

    const config: OpcionesGeracaoEscala = {
      permitirDoisDiasConsecutivos: opcoes?.permitirDoisDiasConsecutivos ?? false,
      diasPermitidosFolga: (opcoes?.diasPermitidosFolga && opcoes.diasPermitidosFolga.length > 0)
        ? opcoes.diasPermitidosFolga
        : [0, 1, 2, 3, 4, 5, 6]
    };

    // Identificar os domingos do mês
    const domingosDoMes: number[] = [];
    for (let d = 1; d <= totalDias; d++) {
      if (new Date(ano, mes - 1, d).getDay() === 0) {
        domingosDoMes.push(d);
      }
    }

    funcionarios.forEach((func, idx) => {
      const dias: Record<number, string> = {};
      const souFeminino = this.isFeminino(func);

      let diasTrabalhadosSeguidos = 0;
      let domingoAnteriorTrabalhado = false;
      let domingosFolgadosNoMes = 0;
      let ultimoDiaFoiFolga = false;

      // Ponto de partida inicial na lista de dias permitidos para girar igualitariamente
      let ponteiroFolgaIndex = (idx * 2) % config.diasPermitidosFolga.length;

      for (let dia = 1; dia <= totalDias; dia++) {
        const dateObj = new Date(ano, mes - 1, dia);
        const diaSemana = dateObj.getDay();
        const isDomingo = diaSemana === 0;

        // REGRA DE DOMINGOS (CCT)
        if (isDomingo) {
          const eUltimoDomingoDoMes = dia === domingosDoMes.at(-1);

          // 1. Mulher não pode 2 domingos seguidos trabalhados
          const forcarFolgaMulher = souFeminino && domingoAnteriorTrabalhado;

          // 2. Homem deve ter pelo menos 1 domingo de folga no mês
          const forcarFolgaHomem = !souFeminino && eUltimoDomingoDoMes && (domingosFolgadosNoMes === 0);

          // 3. Checagem se o dia atual coincide com a rotação ou 6 dias seguidos de trabalho
          const coincideRotacao = config.diasPermitidosFolga.includes(0) &&
            (config.diasPermitidosFolga[ponteiroFolgaIndex] === 0);

          const darFolgaNoDomingo = forcarFolgaMulher || forcarFolgaHomem || coincideRotacao || (diasTrabalhadosSeguidos >= 6);

          if (darFolgaNoDomingo) {
            dias[dia] = 'DOMINGO';
            diasTrabalhadosSeguidos = 0;
            domingoAnteriorTrabalhado = false;
            domingosFolgadosNoMes++;
            ultimoDiaFoiFolga = true;

            // Avançar ponteiro de rotação giratória
            ponteiroFolgaIndex = (ponteiroFolgaIndex + 1) % config.diasPermitidosFolga.length;
          } else {
            dias[dia] = 'TRABALHO';
            diasTrabalhadosSeguidos++;
            domingoAnteriorTrabalhado = true;
            ultimoDiaFoiFolga = false;
          }

        } else {
          // DIAS DE SEMANA (SEG A SÁB)
          const diaEstaPermitido = config.diasPermitidosFolga.includes(diaSemana);
          const coincideRotacaoSemana = diaEstaPermitido && (config.diasPermitidosFolga[ponteiroFolgaIndex] === diaSemana);

          // Regra de Dias Consecutivos
          const proibeFolgaConsecutiva = ultimoDiaFoiFolga && !config.permitirDoisDiasConsecutivos;

          const deveFolgarHoje = (diasTrabalhadosSeguidos >= 6 || coincideRotacaoSemana) && !proibeFolgaConsecutiva;

          if (deveFolgarHoje) {
            dias[dia] = 'FOLGA';
            diasTrabalhadosSeguidos = 0;
            ultimoDiaFoiFolga = true;

            // Avançar ponteiro de rotação giratória
            ponteiroFolgaIndex = (ponteiroFolgaIndex + 1) % config.diasPermitidosFolga.length;
          } else {
            dias[dia] = 'TRABALHO';
            diasTrabalhadosSeguidos++;
            ultimoDiaFoiFolga = false;
          }
        }
      }

      itens.push({
        matricula: func.matricula_aleatoria,
        nome: func.primeiro_nome,
        setor: func.setor,
        turno: func.turno_padrao,
        dias
      });
    });

    return itens;
  }
}
