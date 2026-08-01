import { Funcionario } from '../../../models/types';

export interface GroupValidationResult {
  isValid: boolean;
  validatedEmployees: Array<Funcionario & {
    grupo_domingo: string;
    grupo_feriado: string;
    grupo_folga_semanal: string;
  }>;
  warnings: string[];
  errors: string[];
}

const WEEKLY_REST_GROUPS = ['S1', 'S2', 'S3', 'S4', 'S5'];

/**
 * Valida o cadastro dos funcionários para a geração determinística da escala.
 * Se algum funcionário não possuir grupo_domingo ou grupo_feriado ou grupo_folga_semanal,
 * atribui deterministicamente um fallback baseado no índice e registra um warning.
 */
export function validateAndNormalizeEmployeeGroups(employees: Funcionario[]): GroupValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!employees || employees.length === 0) {
    return {
      isValid: false,
      validatedEmployees: [],
      warnings: [],
      errors: ['Nenhum funcionário informado para o setor.']
    };
  }

  const validatedEmployees = employees.map((emp, index) => {
    // 1. Grupo Domingo
    let grupoDomingo = (emp.grupo_domingo || '').trim().toUpperCase();
    if (!grupoDomingo || !['A', 'B', 'C'].includes(grupoDomingo)) {
      // Fallback determinístico por índice (A, B, C)
      const fallback = ['A', 'B', 'C'][index % 3];
      warnings.push(`Funcionário ${emp.primeiro_nome} (ID: ${emp.id || emp.matricula_aleatoria}) não possui grupo_domingo definido. Atribuído fallback: '${fallback}'.`);
      grupoDomingo = fallback;
    }

    // 2. Grupo Feriado
    let grupoFeriado = (emp.grupo_feriado || '').trim().toUpperCase();
    if (!grupoFeriado || !['A', 'B'].includes(grupoFeriado)) {
      // Fallback determinístico por índice (A, B)
      const fallback = ['A', 'B'][index % 2];
      warnings.push(`Funcionário ${emp.primeiro_nome} (ID: ${emp.id || emp.matricula_aleatoria}) não possui grupo_feriado definido. Atribuído fallback: '${fallback}'.`);
      grupoFeriado = fallback;
    }

    // 3. Grupo Folga Semanal (S1=Segunda, S2=Terça, S3=Quarta, S4=Quinta, S5=Sexta)
    let grupoFolga = (emp.grupo_folga_semanal || '').trim().toUpperCase();
    if (!grupoFolga || !WEEKLY_REST_GROUPS.includes(grupoFolga)) {
      // Se tiver emp.grupo antigo (A -> S1, B -> S2, etc.), converte
      if (emp.grupo === 'A') grupoFolga = 'S1';
      else if (emp.grupo === 'B') grupoFolga = 'S2';
      else {
        // Fallback determinístico por índice distribuído entre S1..S5
        const fallback = WEEKLY_REST_GROUPS[index % WEEKLY_REST_GROUPS.length];
        warnings.push(`Funcionário ${emp.primeiro_nome} (ID: ${emp.id || emp.matricula_aleatoria}) não possui grupo_folga_semanal definido. Atribuído fallback: '${fallback}'.`);
        grupoFolga = fallback;
      }
    }

    return {
      ...emp,
      grupo_domingo: grupoDomingo,
      grupo_feriado: grupoFeriado,
      grupo_folga_semanal: grupoFolga
    };
  });

  return {
    isValid: errors.length === 0,
    validatedEmployees,
    warnings,
    errors
  };
}
