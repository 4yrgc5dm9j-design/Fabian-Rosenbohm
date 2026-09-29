// Regelbasierte Empfehlungen aus den eigenen Zahlen.

import {
  formatCents,
  formatMonth,
  summarize,
  totalsByCategory,
  WANTS_CATEGORIES,
  type Entry,
  type FreeIncome,
} from './budget.ts';

export type InsightTone = 'good' | 'warning' | 'info';

export type Insight = { id: string; tone: InsightTone; title: string; text: string };

type Input = {
  month: string;
  previousMonth: string;
  current: Entry[];
  previous: Entry[];
  free: FreeIncome;
  /** Tag im Monat (1–31), nur für den laufenden Monat gesetzt. */
  dayOfMonth: number | null;
  daysInMonth: number;
};

const pct = (x: number) => `${Math.round(x * 100)} %`;

export function buildInsights(input: Input): Insight[] {
  const { current, previous, free } = input;
  const insights: Insight[] = [];
  const summary = summarize(current);

  if (current.length === 0) {
    return [
      {
        id: 'empty',
        tone: 'info',
        title: 'Los geht’s',
        text: 'Trage dein Einkommen und deine Fixkosten (Miete, Verträge) als Fixposten ein. Dann siehst du sofort, wie viel frei verfügbar ist.',
      },
    ];
  }

  if (summary.incomeCents === 0) {
    insights.push({
      id: 'no-income',
      tone: 'info',
      title: 'Einkommen fehlt',
      text: 'Lege dein Gehalt als Fixposten an. Dann kann die App dein frei verfügbares Einkommen berechnen.',
    });
  }

  // Prognose bis Monatsende im laufenden Monat.
  if (input.dayOfMonth && input.dayOfMonth >= 5 && free.incomeCents > 0) {
    const projected = Math.round(
      (free.variableExpenseCents / input.dayOfMonth) * input.daysInMonth,
    );
    const overshoot = projected - free.freeCents;
    if (overshoot > 0) {
      insights.push({
        id: 'projection',
        tone: 'warning',
        title: 'Achtung, Budget wird knapp',
        text: `Bei deinem aktuellen Tempo gibst du bis Monatsende ca. ${formatCents(projected)} variabel aus, also ${formatCents(overshoot)} mehr als frei verfügbar. Versuche, pro Tag höchstens ${formatCents(free.perDayCents ?? 0)} auszugeben.`,
      });
    } else {
      insights.push({
        id: 'projection',
        tone: 'good',
        title: 'Du liegst im Plan',
        text: `Hochgerechnet bleiben am Monatsende ca. ${formatCents(-overshoot)} übrig. Die könntest du direkt sparen.`,
      });
    }
  } else if (free.remainingCents < 0 && free.incomeCents > 0) {
    insights.push({
      id: 'over',
      tone: 'warning',
      title: 'Mehr ausgegeben als verfügbar',
      text: `In ${formatMonth(input.month)} wurden ${formatCents(-free.remainingCents)} mehr ausgegeben als frei verfügbar war.`,
    });
  }

  // Fixkostenquote.
  if (free.incomeCents > 0) {
    const fixedShare = free.fixedExpenseCents / free.incomeCents;
    if (fixedShare > 0.6) {
      insights.push({
        id: 'fixed-share',
        tone: 'warning',
        title: 'Hohe Fixkosten',
        text: `Deine Fixkosten machen ${pct(fixedShare)} deines Einkommens aus. Empfohlen sind höchstens 50–60 %. Prüfe Handy-, Strom- und Versicherungsverträge auf günstigere Tarife.`,
      });
    }

    // 50/30/20-Regel: Wünsche höchstens 30 %.
    const wants = current
      .filter((e) => e.type === 'expense' && WANTS_CATEGORIES.includes(e.category))
      .reduce((s, e) => s + e.amountCents, 0);
    if (wants / free.incomeCents > 0.3) {
      insights.push({
        id: 'wants',
        tone: 'warning',
        title: 'Viel für Freizeit & Co.',
        text: `${pct(wants / free.incomeCents)} deines Einkommens gehen in Freizeit, Restaurant und Kleidung. Nach der 50/30/20-Regel sollten es höchstens 30 % sein.`,
      });
    }

    // Sparquote.
    const saved =
      summary.balanceCents +
      current
        .filter((e) => e.type === 'expense' && e.category === 'Sparen')
        .reduce((s, e) => s + e.amountCents, 0);
    const rate = saved / free.incomeCents;
    if (!input.dayOfMonth) {
      if (rate >= 0.2) {
        insights.push({
          id: 'savings',
          tone: 'good',
          title: 'Starke Sparquote',
          text: `Du hast ${pct(rate)} deines Einkommens gespart. Das ist über den empfohlenen 20 %.`,
        });
      } else if (rate < 0.1) {
        insights.push({
          id: 'savings',
          tone: 'info',
          title: 'Sparen automatisieren',
          text: `Deine Sparquote lag bei ${pct(Math.max(rate, 0))}. Ein Dauerauftrag direkt nach dem Gehaltseingang (z. B. 10 %) hilft, ohne dass man darüber nachdenken muss.`,
        });
      }
    }
  }

  // Kategorien, die deutlich über dem Vormonat liegen.
  if (previous.length > 0) {
    const before = new Map(totalsByCategory(previous, 'expense').map((t) => [t.category, t.cents]));
    const rises = totalsByCategory(current, 'expense')
      .map((t) => ({ ...t, before: before.get(t.category) ?? 0 }))
      .filter((t) => t.before > 0 && t.cents - t.before >= 2000 && t.cents / t.before >= 1.2)
      .sort((a, b) => b.cents - b.before - (a.cents - a.before))
      .slice(0, 2);
    for (const r of rises) {
      insights.push({
        id: `rise-${r.category}`,
        tone: 'warning',
        title: `${r.category}: +${pct(r.cents / r.before - 1)}`,
        text: `Du hast ${formatCents(r.cents - r.before)} mehr für ${r.category} ausgegeben als im ${formatMonth(input.previousMonth).split(' ')[0]}.`,
      });
    }
    const prevExpense = summarize(previous).expenseCents;
    if (!input.dayOfMonth && prevExpense > 0 && summary.expenseCents < prevExpense * 0.9) {
      insights.push({
        id: 'less',
        tone: 'good',
        title: 'Weniger ausgegeben',
        text: `Du hast ${formatCents(prevExpense - summary.expenseCents)} weniger ausgegeben als im Vormonat.`,
      });
    }
  }

  // Häufige kleine Einkäufe im selben Laden.
  const visits = new Map<string, { count: number; cents: number }>();
  for (const e of current) {
    if (e.type !== 'expense' || !e.note || e.fixedId) continue;
    const v = visits.get(e.note) ?? { count: 0, cents: 0 };
    visits.set(e.note, { count: v.count + 1, cents: v.cents + e.amountCents });
  }
  const frequent = [...visits].filter(([, v]) => v.count >= 8).sort((a, b) => b[1].count - a[1].count)[0];
  if (frequent) {
    const [shop, v] = frequent;
    insights.push({
      id: 'frequent',
      tone: 'info',
      title: `${v.count}× ${shop}`,
      text: `Im Schnitt ${formatCents(Math.round(v.cents / v.count))} pro Einkauf. Seltener, dafür mit Einkaufsliste einkaufen spart meist spontane Extras.`,
    });
  }

  const tone = { warning: 0, info: 1, good: 2 };
  return insights.sort((a, b) => tone[a.tone] - tone[b.tone]);
}
