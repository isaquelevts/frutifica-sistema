const DAY_MAP: Record<string, number> = {
  domingo: 0,
  segunda: 1, 'segunda-feira': 1,
  terca: 2, 'terça': 2, 'terca-feira': 2, 'terça-feira': 2,
  quarta: 3, 'quarta-feira': 3,
  quinta: 4, 'quinta-feira': 4,
  sexta: 5, 'sexta-feira': 5,
  sabado: 6, 'sábado': 6,
};

export function getDayNumber(dayOfWeek: string): number | null {
  const normalized = dayOfWeek.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const [key, value] of Object.entries(DAY_MAP)) {
    const normalizedKey = key.normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (normalizedKey === normalized) return value;
  }
  return null;
}

/**
 * Verifica se o dia semanal da célula já ocorreu nessa semana corrente
 * (hoje conta como "já ocorreu"). Usado para diferenciar, entre as células
 * pendentes, quais ainda não chegaram no dia da reunião das que já
 * passaram do dia e ainda não enviaram o relatório.
 */
export function hasCellDayPassedThisWeek(dayOfWeek: string | undefined | null, today: Date = new Date()): boolean {
  if (!dayOfWeek) return true; // sem dia cadastrado: trata como atrasada, não dá pra saber quando é
  const cellDayIndex = getDayNumber(dayOfWeek);
  if (cellDayIndex === null) return true;
  return cellDayIndex <= today.getDay();
}
