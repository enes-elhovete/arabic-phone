# arabic-phone

Normalize phone numbers **and Arabic text** the way people in Arabic-speaking regions
actually write them — trunk zeros, Arabic-Indic digits, and the invisible RTL marks that
WhatsApp quietly inserts.

تطبيع أرقام الجوال **والنصّ العربي** كما يكتبها الناس فعلاً: الصفر الوطني، والأرقام
العربية، والمحارف غير المرئية التي تحشرها واتساب بصمت.

```bash
npm install arabic-phone
```

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
| `DIAL_RULES` | `{ code, dial, min, max }` for 197 countries |

Nothing throws. Every function accepts `unknown` and refuses what it cannot use.

---

## Notes

- **No country names.** `DIAL_RULES` carries ISO-3166 codes only; naming is a UI concern,
  and leaving it out keeps the library neutral.
- **Zero dependencies**, ESM, TypeScript types included.
- `min`/`max` are the length of the **national** number — after the dial code and after the
  trunk zero.

## License

MIT
