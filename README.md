# arabic-phone

[![npm version](https://img.shields.io/npm/v/arabic-phone?logo=npm&color=CB3837)](https://www.npmjs.com/package/arabic-phone)
[![npm downloads](https://img.shields.io/npm/dm/arabic-phone?color=CB3837)](https://www.npmjs.com/package/arabic-phone)
[![install size](https://img.shields.io/npm/unpacked-size/arabic-phone?label=install%20size&color=success)](https://www.npmjs.com/package/arabic-phone)
[![CI](https://github.com/enes-elhovete/arabic-phone/actions/workflows/ci.yml/badge.svg)](https://github.com/enes-elhovete/arabic-phone/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](./tsconfig.json)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-success)](./package.json)
[![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](./package.json)

**Phone number normalization and validation for Arabic-speaking users** — Saudi Arabia,
the Gulf, Egypt, the Levant and beyond. Converts any way a number is written into one
E.164 string: leading/trunk zeros, Arabic-Indic digits (`٠٥٥`), the `00` international
prefix, spaces and dashes. Also normalizes Arabic **text** for matching by stripping the
invisible RTL marks that WhatsApp inserts.

**تطبيع أرقام الجوال العربية والتحقّق منها** — السعودية والخليج ومصر والشام وغيرها.
يحوّل كل صيغة يُكتب بها الرقم إلى صيغة E.164 واحدة: الصفر الوطني، والأرقام العربية
`٠٥٥`، وبادئة `00`، والمسافات والشرطات. ويُطبّع **النصّ العربي** للمطابقة بإزالة
المحارف غير المرئية التي تحشرها واتساب.

```bash
npm install arabic-phone
```

**197 countries · zero dependencies · ESM · TypeScript types · nothing throws**

---

## The problem

A user types their number the way they always do:

```
0551234567
```

Your WhatsApp or SMS provider reports the sender as:

```
966551234567
```

**The two never match.** Verification fails on a *correct* number, and nothing in your logs
explains why. Add an Arabic keyboard (`٠٥٥١٢٣٤٥٦٧`) or a paste with spaces, and you have
four spellings of one line.

A bare `String(raw).replace(/\D/g, '')` makes it worse: it **deletes Arabic-Indic digits
entirely**, turning a valid number into an empty string.

### المشكلة

يكتب المستخدم رقمه بالصفر الوطني `0551234567`، ويصلك من المزوّد `966551234567` —
**فلا يتطابقان أبداً**، ويفشل التحقق على الرقم **الصحيح** بلا رسالة تشرح السبب. وأضف إليه
الأرقام العربية `٠٥٥١٢٣٤٥٦٧` فتصير للخطّ الواحد أربع صيغ. و`replace(/\D/g,'')` لا يحلّها
بل يزيدها: **يحذف الأرقام العربية كلّها** فيُحوّل رقماً صحيحاً إلى نصّ فارغ.

---

## Phone numbers

```ts
import { normalizeE164, samePhone } from 'arabic-phone'

normalizeE164('+966 055 123 4567')
// { ok: true, phone: '966551234567', national: '551234567', country: { code: 'SA', … } }

normalizeE164('٩٦٦٥٥١٢٣٤٥٦٧')   // { ok: true, phone: '966551234567' }
normalizeE164('00966551234567')  // { ok: true, phone: '966551234567' }
normalizeE164('9660551234567')   // { ok: true, phone: '966551234567' }  ← trunk zero dropped

normalizeE164('0551234567')      // { ok: false, reason: 'no_country_code' }
normalizeE164('96655')           // { ok: false, reason: 'bad_length' }

samePhone('+966 055 123 4567', '966551234567')  // true
```

Every spelling above collapses to one string, so a number stored at sign-up matches the
number a provider reports later.

### Why a number is refused, and why that matters

| `reason` | Meaning | What to tell the user |
| --- | --- | --- |
| `empty` | nothing usable | ask for a number |
| `no_country_code` | a bare local number | ask for the country code |
| `bad_length` | a known dial, wrong length | the number is mistyped |

A bare local number is **never guessed** into a country. Guessing binds an account to a
real line belonging to someone else in another country.

### Shadowed dial codes

`+1242` (Bahamas) sits under `+1` (US/Canada), and an 11-digit number is valid for **both**.
Dial codes are matched longest-first, so the specific country wins:

```ts
normalizeE164('12425555555').country.code   // 'BS', not 'US'
```

### Restricting accepted countries

```ts
import { normalizeE164, DIAL_RULES } from 'arabic-phone'

const gulf = DIAL_RULES.filter((c) => ['SA', 'AE', 'KW', 'QA', 'BH', 'OM'].includes(c.code))
normalizeE164(input, { rules: gulf })
```

---

## Arabic text

```ts
import { normalizeArabicText, extractCode } from 'arabic-phone'

normalizeArabicText('‏مـــرحبا ٤٥٦')   // 'مرحبا 456'   ← bidi mark + tatweel + digits

extractCode('مرحبا، كودي SB-7F3K9Q شكرا', { prefix: 'SB', length: 6 })  // 'SB-7F3K9Q'
extractCode('SB-٧F٣K٩Q',                  { prefix: 'SB', length: 6 })  // 'SB-7F3K9Q'
extractCode('SB-7F3K9QX',                 { prefix: 'SB', length: 6 })  // null
```

`extractCode` is deliberately strict: a run longer or shorter than `length`, or a prefix
glued to a letter or digit, returns `null`. **Reading a code that was never written is worse
than reading none** — it verifies someone who never asked.

The default alphabet excludes `O 0 I 1 L`, because short codes get copied by eye.

```ts
extractCode(text, { prefix: 'ACME', length: 8, alphabet: '0123456789ABCDEF' })
```

---

## API

| Export | Returns |
| --- | --- |
| `normalizeE164(raw, options?)` | `{ ok: true, phone, national, country }` or `{ ok: false, reason }` |
| `e164OrEmpty(raw, options?)` | the normalized string, or `''` |
| `samePhone(a, b, options?)` | `boolean` — same line after normalizing |
| `toLatinDigits(raw)` | digits only, Arabic-Indic converted |
| `normalizeArabicText(raw)` | text without invisible marks, Arabic digits converted |
| `extractCode(raw, options)` | the canonical code, or `null` |
| `mayCarryCode(raw, prefix)` | cheap pre-check before heavier work |
| `DEFAULT_ALPHABET` | the look-alike-free alphabet `extractCode` uses by default |
| `DIAL_RULES` | `{ code, dial, min, max }` for 197 countries |

Nothing throws. Every function accepts `unknown` and refuses what it cannot use.

---

## Why not libphonenumber?

[libphonenumber](https://github.com/google/libphonenumber) is the complete answer to phone
numbers: carriers, number types, formatting, every edge case on earth. If you need that,
use it — this library does not replace it.

`arabic-phone` solves a narrower problem that the big libraries do not center:

| | `arabic-phone` | general-purpose libraries |
| --- | --- | --- |
| Arabic-Indic digits (`٠٥٥١٢٣٤٥٦٧`) | converted | usually stripped as non-digits |
| Invisible RTL marks in text | removed | out of scope |
| Install size | one small file, no deps | hundreds of KB of metadata |
| Answer when it refuses | `no_country_code` vs `bad_length` | often a single boolean |

Use both if it helps: normalize with `arabic-phone`, then hand the clean E.164 string to
whatever needs it.

## Notes

- **Published from CI, with provenance.** No publish token exists for this package —
  the registry trusts one GitHub Actions workflow in this repository over OIDC, and
  attaches a signed statement tying the tarball to the commit it was built from.
  Check it yourself: `npm audit signatures`.
- **No country names.** `DIAL_RULES` carries ISO-3166 codes only; naming is a UI concern,
  and leaving it out keeps the library neutral.
- **Zero dependencies**, ESM, TypeScript types included.
- `min`/`max` are the length of the **national** number — after the dial code and after the
  trunk zero.

## License

MIT
