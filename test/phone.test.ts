import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeE164, e164OrEmpty, samePhone, toLatinDigits, DIAL_RULES } from '../src/index.ts'

const ok = (raw: unknown) => {
  const r = normalizeE164(raw)
  assert.equal(r.ok, true, `rejected: ${String(raw)}`)
  return (r as { phone: string }).phone
}

test('the trunk zero is dropped — the whole reason this exists', () => {
  assert.equal(ok('9660551234567'), '966551234567')
  assert.equal(ok('+966 055 123 4567'), '966551234567')
  assert.equal(ok('00966 0551234567'), '966551234567')
})

test('every way one number gets written collapses to one string', () => {
  const forms = ['966551234567', '+966551234567', '00966551234567', '+966 55 123 4567',
    '966-55-123-4567', ' 966 551234567 ', '(966) 55 123 4567', '9660551234567']
  assert.equal(new Set(forms.map(ok)).size, 1)
})

test('Arabic-Indic and Eastern-Arabic digits survive', () => {
  assert.equal(ok('٩٦٦٥٥١٢٣٤٥٦٧'), '966551234567')
  assert.equal(ok('۹۶۶۵۵۱۲۳۴۵۶۷'), '966551234567')
  assert.equal(ok('+٩٦٦ ٠٥٥ ١٢٣ ٤٥٦٧'), '966551234567')
  assert.equal(toLatinDigits('٠١٢٣٤٥٦٧٨٩'), '0123456789')
  assert.equal(toLatinDigits('۰۱۲۳۴۵۶۷۸۹'), '0123456789')
})

test('a longer dial wins over a shorter one that shadows it', () => {
  // +1242 sits under +1, and an 11-digit number is valid for both.
  const r = normalizeE164('12425555555')
  assert.equal(r.ok, true)
  assert.equal((r as { country: { code: string } }).country.code, 'BS')
})

test('every shadowed dial keeps its own identity', () => {
  let checked = 0
  for (const c of DIAL_RULES) {
    for (const p of DIAL_RULES.filter((x) => x.dial !== c.dial && c.dial.startsWith(x.dial))) {
      const total = p.dial.length + p.min
      const childLocal = total - c.dial.length
      if (childLocal < c.min || childLocal > c.max) continue
      const r = normalizeE164(c.dial + '5'.repeat(childLocal))
      assert.equal(r.ok, true, c.code)
      assert.equal((r as { country: { dial: string } }).country.dial, c.dial, `${c.code} read as +${(r as { country: { dial: string } }).country.dial}`)
      checked++
    }
  }
  assert.ok(checked > 0, 'the table contains a discriminating shadowed pair')
})

test('a bare local number is refused, never guessed into a country', () => {
  const r = normalizeE164('0551234567')
  assert.deepEqual([r.ok, (r as { reason: string }).reason], [false, 'no_country_code'])
})

test('a known dial with the wrong length is told apart from no dial', () => {
  assert.equal((normalizeE164('96655') as { reason: string }).reason, 'bad_length')
  assert.equal((normalizeE164('0551234567') as { reason: string }).reason, 'no_country_code')
})

test('malformed input never throws', () => {
  for (const v of [null, undefined, '', '   ', '+', 'abc', {}, [], true, NaN, 0]) {
    assert.doesNotThrow(() => normalizeE164(v))
    assert.equal(normalizeE164(v).ok, false)
  }
})

test('normalizing twice changes nothing', () => {
  for (const raw of ['9660551234567', '+90 0551 688 6755', '٩٦٦٥٥١٢٣٤٥٦٧', '00967771234567']) {
    const once = ok(raw)
    assert.equal(ok(once), once, raw)
  }
})

test('every country in the table can produce a valid number', () => {
  const broken = DIAL_RULES.filter((c) => !normalizeE164(c.dial + '5'.repeat(c.min)).ok).map((c) => c.code)
  assert.deepEqual(broken, [])
})

test('the table itself is sane and free of duplicates', () => {
  const codes = new Set<string>()
  for (const c of DIAL_RULES) {
    assert.equal(codes.has(c.code), false, `duplicate ${c.code}`)
    codes.add(c.code)
    assert.match(c.dial, /^[0-9]{1,4}$/, c.code)
    assert.ok(c.min >= 4 && c.min <= c.max && c.max <= 15, `${c.code} ${c.min}..${c.max}`)
  }
  assert.ok(codes.size > 150, 'a world-sized table')
})

test('a caller can restrict the accepted countries', () => {
  const only = DIAL_RULES.filter((c) => c.code === 'SA')
  assert.equal(normalizeE164('966551234567', { rules: only }).ok, true)
  assert.equal(normalizeE164('905516886755', { rules: only }).ok, false)
})

test('e164OrEmpty and samePhone', () => {
  assert.equal(e164OrEmpty('+966 055 123 4567'), '966551234567')
  assert.equal(e164OrEmpty('0551234567'), '')
  assert.equal(samePhone('+966 055 123 4567', '966551234567'), true)
  assert.equal(samePhone('٩٦٦٥٥١٢٣٤٥٦٧', '+966-55-123-4567'), true)
  assert.equal(samePhone('966551234567', '966551234568'), false)
  assert.equal(samePhone('bad', 'bad'), false, 'two invalid inputs are not "the same line"')
})
