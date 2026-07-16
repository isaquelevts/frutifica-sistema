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
 * Converte o índice do JS (0 = domingo) para a semana de segunda a domingo
 * (0 = segunda, 6 = domingo), convenção já usada no gráfico de frequência.
 */
function toMondayFirst(jsDayIndex: number): number {
  return (jsDayIndex + 6) % 7;
}

export interface WeekRange {
  start: Date;
  end: Date;
}

/**
 * Semana calendário de segunda a domingo, com deslocamento em semanas
 * (0 = semana atual, -1 = semana passada).
 *
 * Existe porque o filtro de período do topo do Dashboard usa janela CORRIDA
 * ("últimos 7 dias"), que não responde "a célula reportou nesta semana?".
 * Numa quinta-feira a janela corrida ainda alcança o sábado anterior, e o
 * Status de Preenchimento marcava como preenchida uma célula de sábado que
 * só volta a se reunir dali a dois dias.
 */
export function getWeekRange(offset = 0, today: Date = new Date()): WeekRange {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - toMondayFirst(start.getDay()) + offset * 7);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Verifica se o dia semanal da célula já ocorreu dentro da semana observada
 * (hoje conta como "já ocorreu"). Usado para diferenciar, entre as células
 * pendentes, quais ainda não chegaram no dia da reunião das que já
 * passaram do dia e ainda não enviaram o relatório.
 *
 * Em semanas passadas (offset < 0) a semana inteira já acabou, então qualquer
 * pendência é atraso — nunca "aguardando dia".
 */
export function hasCellDayPassed(
  dayOfWeek: string | undefined | null,
  weekOffset = 0,
  today: Date = new Date()
): boolean {
  if (weekOffset < 0) return true;
  if (!dayOfWeek) return true; // sem dia cadastrado: trata como atrasada, não dá pra saber quando é
  const cellDayIndex = getDayNumber(dayOfWeek);
  if (cellDayIndex === null) return true;
  // Comparação em segunda-primeiro: com o índice cru do JS, uma célula de
  // domingo (0) ficaria <= qualquer dia e apareceria como atrasada já na segunda.
  return toMondayFirst(cellDayIndex) <= toMondayFirst(today.getDay());
}
