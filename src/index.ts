// arabic-phone — تطبيع أرقام الجوال كما يكتبها الناس في المنطقة العربية.
// Normalize phone numbers the way people in Arabic-speaking regions actually write them.
//
// المشكلة التي تحلّها / The problem:
//   يكتب المستخدم رقمه `0551234567` بالصفر الوطني، أو `٠٥٥١٢٣٤٥٦٧` بلوحة مفاتيح عربية،
//   أو `+966 55 123 4567` بمسافات. وتصل من المزوّدات (WhatsApp، SMS gateways) بصيغة
//   `966551234567` وحدها. فيُخزَّن الرقم بصيغة ويصل بأخرى، ولا يتطابقان أبداً — ويفشل
//   التحقق على الرقم **الصحيح** بلا أي رسالة تشرح السبب.
//
//   A user types a trunk zero, or Arabic-Indic digits, or spaces and dashes. Providers
//   report E.164 digits. The two never match, and verification fails on a correct number
//   with nothing to explain why.

export { DIAL_RULES, type DialRule } from './dialRules.ts'
import { DIAL_RULES, type DialRule } from './dialRules.ts'

export type PhoneReason = 'empty' | 'no_country_code' | 'bad_length'

export type PhoneResult =
  | { ok: true; phone: string; country: DialRule; national: string }
  | { ok: false; reason: PhoneReason }

export interface NormalizeOptions {
  /** جدول بديل للاختبار أو لتقييد الدول المقبولة. Override the dial table. */
  rules?: readonly DialRule[]
}

// الأرقام العربية-الهندية ٠-٩ والفارسية ۰-۹. `\D` **تحذفها**، فيضيع الرقم كاملاً.
// Arabic-Indic and Eastern-Arabic digits. A bare `\D` strip deletes them entirely.
const ARABIC_INDIC = /[٠-٩]/g
const EASTERN_ARABIC = /[۰-۹]/g

/** أرقام لاتينية فقط. Latin digits only. */
export function toLatinDigits(raw: unknown): string {
  if (typeof raw !== 'string' && typeof raw !== 'number') return ''
  return String(raw)
    .replace(ARABIC_INDIC, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(EASTERN_ARABIC, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\D/g, '')
}

const byDialLength = (rules: readonly DialRule[]) =>
  [...rules].sort((a, b) => b.dial.length - a.dial.length)

let defaultSorted: readonly DialRule[] | null = null

/**
 * يُرجِع الرقم بصيغة E.164 (أرقام بلا `+`) أو سبب الرفض.
 * Returns E.164 digits (no leading plus) or the reason it was rejected.
 *
 * @example
 * normalizeE164('0551234567')        // { ok: false, reason: 'no_country_code' }
 * normalizeE164('+966 055 123 4567') // { ok: true,  phone: '966551234567' }
 * normalizeE164('٩٦٦٥٥١٢٣٤٥٦٧')      // { ok: true,  phone: '966551234567' }
 * normalizeE164('00966551234567')    // { ok: true,  phone: '966551234567' }
 */
export function normalizeE164(raw: unknown, options: NormalizeOptions = {}): PhoneResult {
  let digits = toLatinDigits(raw)
  if (!digits) return { ok: false, reason: 'empty' }
  // بادئة الاتصال الدولي `00` = `+`. International call prefix.
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (!digits) return { ok: false, reason: 'empty' }

  let rules: readonly DialRule[]
  if (options.rules) rules = byDialLength(options.rules)
  else rules = defaultSorted ??= byDialLength(DIAL_RULES)

  let sawDial = false
  for (const c of rules) {
    if (!digits.startsWith(c.dial)) continue
    sawDial = true
    // الصفر الوطني بعد المفتاح ليس جزءاً من الرقم الدولي — حذفُه هو جوهر المكتبة.
    // The national trunk zero is not part of the international number.
    const national = digits.slice(c.dial.length).replace(/^0+/, '')
    if (national.length >= c.min && national.length <= c.max) {
      return { ok: true, phone: `${c.dial}${national}`, country: c, national }
    }
  }
  // مفتاحٌ معروف بطولٍ خاطئ ≠ لا مفتاح إطلاقاً — رسالتان مختلفتان للمستخدم.
  // A known dial with a wrong length is a different message from no dial at all.
  return { ok: false, reason: sawDial ? 'bad_length' : 'no_country_code' }
}

/** الرقم المُطبَّع أو ''. The normalized number, or an empty string. */
export function e164OrEmpty(raw: unknown, options?: NormalizeOptions): string {
  const r = normalizeE164(raw, options)
  return r.ok ? r.phone : ''
}

/** هل الرقمان لنفس الخطّ بعد التطبيع؟ Do both inputs denote the same line? */
export function samePhone(a: unknown, b: unknown, options?: NormalizeOptions): boolean {
  const x = e164OrEmpty(a, options)
  return !!x && x === e164OrEmpty(b, options)
}

export { normalizeArabicText, extractCode, type ExtractOptions } from './text.ts'
