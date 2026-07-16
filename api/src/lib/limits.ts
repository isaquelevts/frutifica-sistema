import prisma from './prisma';

export interface QuotaResult {
  ok: boolean;
  message?: string;
  current?: number;
  max?: number;
}

/**
 * Valida o limite de células do plano antes de criar mais uma.
 *
 * `maxCells` existia no banco e era editável pelo superadmin, mas nunca era
 * conferido em lugar nenhum — plano free tinha células ilimitadas na prática.
 *
 * `maxCells: null` = sem limite (planos pagos).
 */
export async function checkCellQuota(organizationId: string, adding = 1): Promise<QuotaResult> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { maxCells: true, plan: true },
  });

  if (!org) return { ok: false, message: 'Organização não encontrada' };
  if (org.maxCells == null) return { ok: true };

  const current = await prisma.cell.count({ where: { organizationId } });

  if (current + adding > org.maxCells) {
    return {
      ok: false,
      current,
      max: org.maxCells,
      message:
        adding === 1
          ? `Seu plano (${org.plan}) permite até ${org.maxCells} células e você já tem ${current}. Faça upgrade para adicionar mais.`
          : `Seu plano (${org.plan}) permite até ${org.maxCells} células. Você tem ${current} e tentou adicionar ${adding}.`,
    };
  }

  return { ok: true, current, max: org.maxCells };
}
