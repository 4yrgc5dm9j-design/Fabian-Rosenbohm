// Brutto-Netto-Rechner 2026 nach dem Programmablaufplan (PAP) für den
// maschinellen Lohnsteuerabzug und den Sozialversicherungswerten 2026.
//
// Vereinfachungen gegenüber dem vollständigen PAP: keine sonstigen Bezüge
// (Einmalzahlungen), kein Faktorverfahren, keine Versorgungsbezüge.

export const TAX_YEAR = 2026;

export const STATES = [
  { code: 'BW', name: 'Baden-Württemberg' },
  { code: 'BY', name: 'Bayern' },
  { code: 'BE', name: 'Berlin' },
  { code: 'BB', name: 'Brandenburg' },
  { code: 'HB', name: 'Bremen' },
  { code: 'HH', name: 'Hamburg' },
  { code: 'HE', name: 'Hessen' },
  { code: 'MV', name: 'Mecklenburg-Vorpommern' },
  { code: 'NI', name: 'Niedersachsen' },
  { code: 'NW', name: 'Nordrhein-Westfalen' },
  { code: 'RP', name: 'Rheinland-Pfalz' },
  { code: 'SL', name: 'Saarland' },
  { code: 'SN', name: 'Sachsen' },
  { code: 'ST', name: 'Sachsen-Anhalt' },
  { code: 'SH', name: 'Schleswig-Holstein' },
  { code: 'TH', name: 'Thüringen' },
] as const;

export type StateCode = (typeof STATES)[number]['code'];
export type TaxClass = 1 | 2 | 3 | 4 | 5 | 6;

/** Rechengrößen 2026 (Beträge in Euro, Sätze als Dezimalzahl). */
export const PARAMS_2026 = {
  grundfreibetrag: 12348,
  bbgRvAvMonth: 8450,
  bbgKvPvMonth: 5812.5,
  minijobLimit: 603,
  midijobLimit: 2000,
  rvRate: 0.186,
  avRate: 0.026,
  kvRate: 0.146,
  /** Ermäßigter KV-Satz (ohne Krankengeld) für die Vorsorgepauschale. */
  kvRateReduced: 0.14,
  pvRate: 0.036,
  pvChildlessSurcharge: 0.006,
  pvChildReduction: 0.0025,
  minijobRvEmployee: 0.036,
  avgZusatzbeitrag: 0.029,
  arbeitnehmerPauschbetrag: 1230,
  sonderausgabenPauschbetrag: 36,
  entlastungsbetragAlleinerziehende: 4260,
  /** Kinderfreibetrag inkl. BEA-Freibetrag je Kind und Elternteil. */
  kinderfreibetragHalf: 4878,
  vorsorgeHoechstbetragKvPvAv: 1900,
  soliFreigrenze: 20350,
  w1Stkl5: 14071,
  w2Stkl5: 34939,
  w3Stkl5: 222260,
};

export type NettoInput = {
  /** Bruttolohn pro Monat in Euro. */
  grossMonthly: number;
  taxClass: TaxClass;
  /** Zahl der Kinderfreibeträge laut Lohnsteuerabzugsmerkmalen (0, 0,5, 1, 1,5 …). */
  childAllowances: number;
  birthYear: number;
  state: StateCode;
  church: boolean;
  health: 'gesetzlich' | 'privat';
  /** Kassenindividueller Zusatzbeitrag als Dezimalzahl, z. B. 0.029. */
  zusatzbeitrag: number;
  /** Nur privat: Monatsbeitrag Kranken- + Pflegeversicherung (Basistarif-Anteil) in Euro. */
  privateMonthly: number;
  /** Anzahl Kinder insgesamt (für den Kinderlosenzuschlag in der Pflegeversicherung). */
  children: number;
  /** Davon unter 25 Jahren (für den Beitragsabschlag ab dem 2. Kind). */
  childrenUnder25: number;
  rvPflichtig: boolean;
  avPflichtig: boolean;
  /** Jährlicher Freibetrag laut Lohnsteuerabzugsmerkmalen in Euro. */
  annualAllowance: number;
};

export const DEFAULT_NETTO_INPUT: NettoInput = {
  grossMonthly: 3500,
  taxClass: 1,
  childAllowances: 0,
  birthYear: 1995,
  state: 'NW',
  church: false,
  health: 'gesetzlich',
  zusatzbeitrag: PARAMS_2026.avgZusatzbeitrag,
  privateMonthly: 0,
  children: 0,
  childrenUnder25: 0,
  rvPflichtig: true,
  avPflichtig: true,
  annualAllowance: 0,
};

export type NettoResult = {
  kind: 'minijob' | 'midijob' | 'regular';
  /** Alle Beträge pro Monat in Euro, auf Cent gerundet. */
  gross: number;
  lohnsteuer: number;
  soli: number;
  kirchensteuer: number;
  rv: number;
  av: number;
  kv: number;
  pv: number;
  net: number;
  employerCosts: number;
  /** Details für die Anzeige. */
  details: {
    zve: number;
    vorsorgepauschale: number;
    altersentlastung: number;
    pvRateEmployee: number;
    churchRate: number;
    age: number;
  };
};

const cents = (x: number) => Math.round(x * 100) / 100;
const floorCents = (x: number) => Math.floor(x * 100 + 1e-7) / 100;

/** Einkommensteuertarif 2026 (§ 32a EStG) für ein zu versteuerndes Einkommen in Euro. */
export function incomeTax2026(zve: number): number {
  const x = Math.floor(zve);
  let tax: number;
  if (x <= 12348) tax = 0;
  else if (x <= 17799) {
    const y = (x - 12348) / 10000;
    tax = (914.51 * y + 1400) * y;
  } else if (x <= 69878) {
    const z = (x - 17799) / 10000;
    tax = (173.1 * z + 2397) * z + 1034.87;
  } else if (x <= 277825) tax = 0.42 * x - 11135.63;
  else tax = 0.45 * x - 19470.38;
  return Math.floor(tax);
}

/** Lohnsteuer der Steuerklassen V und VI (§ 39b Abs. 2 Satz 7 EStG, PAP MST5_6). */
function taxClass5or6(zve: number): number {
  const { w1Stkl5: w1, w2Stkl5: w2, w3Stkl5: w3 } = PARAMS_2026;
  const up = (zx: number) => {
    const diff = (incomeTax2026(zx * 1.25) - incomeTax2026(zx * 0.75)) * 2;
    const min = Math.floor(zx * 0.14);
    return Math.max(diff, min);
  };
  const x = Math.floor(zve);
  if (x > w2) {
    let st = up(w2);
    if (x > w3) st += (w3 - w2) * 0.42 + (x - w3) * 0.45;
    else st += (x - w2) * 0.42;
    return Math.floor(st);
  }
  const st = up(x);
  if (x > w1) {
    const high = up(w1) + (x - w1) * 0.42;
    return Math.floor(Math.min(st, high));
  }
  return st;
}

function tariff(zve: number, taxClass: TaxClass): number {
  if (taxClass === 3) return 2 * incomeTax2026(Math.floor(zve / 2));
  if (taxClass >= 5) return taxClass5or6(zve);
  return incomeTax2026(zve);
}

/** Altersentlastungsbetrag (§ 24a EStG) nach dem Jahr, das auf den 64. Geburtstag folgt. */
export function altersentlastung(birthYear: number, annualWage: number, year = TAX_YEAR): number {
  const cohort = birthYear + 65;
  if (cohort > year) return 0;
  let rate: number;
  let max: number;
  if (cohort <= 2005) [rate, max] = [0.4, 1900];
  else if (cohort <= 2020) [rate, max] = [0.4 - 0.016 * (cohort - 2005), 1900 - 76 * (cohort - 2005)];
  else if (cohort === 2021) [rate, max] = [0.152, 722];
  else if (cohort === 2022) [rate, max] = [0.144, 684];
  else [rate, max] = [Math.max(0, 0.14 - 0.004 * (cohort - 2023)), Math.max(0, 665 - 19 * (cohort - 2023))];
  return Math.min(Math.ceil(annualWage * rate), max);
}

export function churchRate(state: StateCode): number {
  return state === 'BY' || state === 'BW' ? 0.08 : 0.09;
}

/** Arbeitnehmeranteil zur Pflegeversicherung. */
export function pvRateEmployee(input: NettoInput, year = TAX_YEAR): number {
  const p = PARAMS_2026;
  let rate = p.pvRate / 2 + (input.state === 'SN' ? 0.005 : 0);
  const age = year - input.birthYear;
  if (input.children === 0 && age >= 23) rate += p.pvChildlessSurcharge;
  if (input.childrenUnder25 >= 2) rate -= p.pvChildReduction * (Math.min(input.childrenUnder25, 5) - 1);
  return Math.round(rate * 100000) / 100000;
}

export function calculateNetto(input: NettoInput): NettoResult {
  const p = PARAMS_2026;
  const gross = Math.max(0, input.grossMonthly);
  const annual = gross * 12;
  const pvRate = pvRateEmployee(input);
  const kvRateEmployee = p.kvRate / 2 + input.zusatzbeitrag / 2;
  const kind = gross <= p.minijobLimit ? 'minijob' : gross <= p.midijobLimit ? 'midijob' : 'regular';

  // --- Sozialversicherung (monatlich) ---
  let rv = 0;
  let av = 0;
  let kv = 0;
  let pv = 0;
  let employerSv = 0;
  if (kind === 'minijob') {
    rv = input.rvPflichtig ? cents(gross * p.minijobRvEmployee) : 0;
    // Pauschalbeiträge des Arbeitgebers: 15 % RV, 13 % KV (bei GKV), 2 % Pauschsteuer.
    employerSv = cents(gross * (0.15 + (input.health === 'gesetzlich' ? 0.13 : 0) + 0.02));
  } else {
    // Im Übergangsbereich (Midijob) zahlen Beschäftigte nur auf eine reduzierte Bemessungsgrundlage.
    const baseRvAv =
      kind === 'midijob'
        ? (p.midijobLimit / (p.midijobLimit - p.minijobLimit)) * (gross - p.minijobLimit)
        : Math.min(gross, p.bbgRvAvMonth);
    const baseKvPv = kind === 'midijob' ? baseRvAv : Math.min(gross, p.bbgKvPvMonth);
    rv = input.rvPflichtig ? cents(baseRvAv * (p.rvRate / 2)) : 0;
    av = input.avPflichtig ? cents(baseRvAv * (p.avRate / 2)) : 0;
    const employerPvRate = p.pvRate / 2 - (input.state === 'SN' ? 0.005 : 0);
    if (input.health === 'gesetzlich') {
      kv = cents(baseKvPv * kvRateEmployee);
      pv = cents(baseKvPv * pvRate);
      employerSv += Math.min(gross, p.bbgKvPvMonth) * (kvRateEmployee + employerPvRate);
    } else {
      const maxSubsidy =
        p.bbgKvPvMonth * (p.kvRate / 2 + p.avgZusatzbeitrag / 2) + p.bbgKvPvMonth * employerPvRate;
      const subsidy = Math.min(input.privateMonthly / 2, maxSubsidy);
      kv = cents(Math.max(0, input.privateMonthly - subsidy));
      employerSv += subsidy;
    }
    const cappedRvAv = Math.min(gross, p.bbgRvAvMonth);
    employerSv += cappedRvAv * ((input.rvPflichtig ? p.rvRate / 2 : 0) + (input.avPflichtig ? p.avRate / 2 : 0));
    employerSv = cents(employerSv);
  }

  // --- Lohnsteuer (Jahresberechnung, dann /12) ---
  let lohnsteuer = 0;
  let soli = 0;
  let kirchensteuer = 0;
  let zve = 0;
  let vsp = 0;
  const alte = altersentlastung(input.birthYear, annual);
  const church = input.church ? churchRate(input.state) : 0;

  // Minijobs werden in der Regel pauschal vom Arbeitgeber versteuert.
  if (kind !== 'minijob') {
    const tc = input.taxClass;
    const zre4 = Math.max(0, annual - alte - input.annualAllowance);
    const anp = tc === 6 ? 0 : Math.min(p.arbeitnehmerPauschbetrag, zre4);
    const sap = tc === 6 ? 0 : p.sonderausgabenPauschbetrag;
    const efa = tc === 2 ? p.entlastungsbetragAlleinerziehende : 0;

    // Vorsorgepauschale (§ 39b Abs. 2 Satz 5 Nr. 3 EStG, Fassung ab 2026).
    const rvBase = Math.min(annual, p.bbgRvAvMonth * 12);
    const kvBase = Math.min(annual, p.bbgKvPvMonth * 12);
    const vspRv = input.rvPflichtig ? rvBase * (p.rvRate / 2) : 0;
    let vspKvPv: number;
    if (input.health === 'gesetzlich') {
      vspKvPv = kvBase * (p.kvRateReduced / 2 + input.zusatzbeitrag / 2) + kvBase * pvRate;
    } else {
      vspKvPv = kv * 12;
    }
    const vspAv =
      input.avPflichtig && tc <= 5
        ? Math.min(rvBase * (p.avRate / 2), Math.max(0, p.vorsorgeHoechstbetragKvPvAv - vspKvPv))
        : 0;
    vsp = Math.ceil(vspRv + vspKvPv + vspAv);

    zve = Math.max(0, Math.floor(zre4 - anp - sap - efa - vsp));
    const lstAnnual = tariff(zve, tc);

    // Für Soli und Kirchensteuer werden Kinderfreibeträge berücksichtigt.
    const kfb = tc <= 4 ? input.childAllowances * p.kinderfreibetragHalf * (tc === 4 ? 1 : 2) : 0;
    const jbmg = input.childAllowances > 0 ? tariff(Math.max(0, zve - kfb), tc) : lstAnnual;
    const freigrenze = tc === 3 ? p.soliFreigrenze * 2 : p.soliFreigrenze;
    const soliAnnual =
      jbmg > freigrenze ? Math.min(jbmg * 0.055, (jbmg - freigrenze) * 0.119) : 0;

    lohnsteuer = floorCents(lstAnnual / 12);
    soli = floorCents(soliAnnual / 12);
    kirchensteuer = floorCents((jbmg * church) / 12);
  }

  const net = cents(gross - lohnsteuer - soli - kirchensteuer - rv - av - kv - pv);
  return {
    kind,
    gross: cents(gross),
    lohnsteuer,
    soli,
    kirchensteuer,
    rv,
    av,
    kv,
    pv,
    net,
    employerCosts: cents(gross + employerSv),
    details: {
      zve,
      vorsorgepauschale: vsp,
      altersentlastung: alte,
      pvRateEmployee: pvRate,
      churchRate: church,
      age: TAX_YEAR - input.birthYear,
    },
  };
}
