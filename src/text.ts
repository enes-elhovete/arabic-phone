// تطبيع النصّ العربي للمطابقة، واستخراج رمز قصير منه.
// Arabic text normalization for matching, and short-code extraction.
//
// المشكلة / The problem:
//   تحشر واتساب وأنظمة RTL محارف **غير مرئية** داخل النصّ العربي (علامات الاتجاه،
//   المسافة الصفرية)، وتُدخل لوحات المفاتيح العربية التطويل `ـ` بين الحروف، وتُخرِج
//   أرقاماً عربية `٠-٩`. فنصٌّ يبدو مطابقاً تماماً للعين **لا يطابق** بالمقارنة.
//
//   WhatsApp and RTL stacks insert invisible marks into Arabic text, Arabic keyboards
//   add tatweel between letters and emit Arabic-Indic digits. Text that looks identical
//   to the eye does not compare equal.

import { toLatinDigits } from './index.ts'

// علامات الاتجاه والمسافة الصفرية وعلامة ترتيب البايتات، والتطويل العربي.
// Bidi marks, zero-width characters, BOM, and the Arabic tatweel.
const INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF\u0640]/g

/**
 * يُزيل المحارف غير المرئية ويحوّل الأرقام العربية والفارسية إلى لاتينية.
 * Strips invisible characters and converts Arabic-Indic digits to Latin.
 *
 * لا يُغيّر الحالة ولا يحذف التشكيل: المطابقة شأن المستدعي.
 * Case and diacritics are left alone — that is the caller's decision.
 */
export function normalizeArabicText(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  const stripped = raw.replace(INVISIBLE, '')
  // نُطبّع الأرقام داخل النصّ بلا حذف الحروف (toLatinDigits يحذف كل ما ليس رقماً).
  return stripped.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (d) => toLatinDigits(d))
}

export interface ExtractOptions {
  /** بادئة الرمز، مثل `SB`. The code prefix. */
  prefix: string
  /** عدد محارف الرمز بعد البادئة. Number of characters after the prefix. */
  length: number
  /**
   * الأبجدية المسموحة. يُنصح باستبعاد `O 0 I 1 L` لأن الرمز يُنقَل بالعين.
   * The allowed alphabet; excluding look-alikes is recommended.
   */
  alphabet?: string
}

export const DEFAULT_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

// فواصل مقبولة بين البادئة والرمز. Separators accepted between prefix and body.
const SEPARATOR = '[\\s\\-\\u2010-\\u2015\\u2212_]+'

/**
 * يستخرج أول رمز صالح في نصّ، أو null.
 * Extracts the first valid code in a text, or null.
 *
 * يقبل الفاصل أو غيابه، والحالة الصغيرة، والأرقام العربية، والمحارف غير المرئية.
 * ويرفض ما لا يطابق الطول بالضبط، أو ما التصقت بادئتُه بحرف أو رقم قبله أو بعده —
 * فقراءة رمزٍ لم يُكتب أخطر من عدم قراءة شيء.
 *
 * @example
 * extractCode('كودي SB-7F3K9Q شكرا', { prefix: 'SB', length: 6 })  // 'SB-7F3K9Q'
 * extractCode('SB-٧F٣K٩Q',          { prefix: 'SB', length: 6 })  // 'SB-7F3K9Q'
 * extractCode('SB-7F3K9QX',         { prefix: 'SB', length: 6 })  // null
 */
export function extractCode(raw: unknown, options: ExtractOptions): string | null {
  const { prefix, length } = options
  const alphabet = options.alphabet ?? DEFAULT_ALPHABET
  if (!prefix || !(length > 0) || !alphabet) return null
  const text = normalizeArabicText(raw).toUpperCase()
  if (!text) return null
  const re = new RegExp(
    `(?<![A-Z0-9])${escapeRe(prefix.toUpperCase())}(?:${SEPARATOR})?([${escapeRe(alphabet)}]{${length}})(?![A-Z0-9])`,
    'u',
  )
  const m = re.exec(text)
  return m ? `${prefix.toUpperCase()}-${m[1]}` : null
}

/** هل قد يحمل النصّ رمزاً بهذه البادئة؟ فحصٌ رخيص قبل أي عمل أثقل. */
export function mayCarryCode(raw: unknown, prefix: string): boolean {
  if (typeof raw !== 'string') return false
  const first = prefix?.[0]
  if (!first) return false
  // اختبارٌ بلا تخصيص ذاكرة أولاً: التطبيع لا **يُنشئ** حرفاً ليس في النصّ.
  if (!new RegExp(escapeRe(first), 'iu').test(raw)) return false
  return normalizeArabicText(raw).toUpperCase().includes(prefix.toUpperCase())
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\\-]/g, '\\$&')
}
