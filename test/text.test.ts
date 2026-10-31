import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeArabicText, extractCode, mayCarryCode, DEFAULT_ALPHABET } from '../src/text.ts'

const OPTS = { prefix: 'SB', length: 6 }

test('invisible RTL marks are stripped so equal-looking text compares equal', () => {
  for (const mark of ['‏', '‎', '​', '⁦', '⁩', '﻿']) {
    assert.equal(normalizeArabicText(`${mark}مرحبا${mark}`), 'مرحبا', mark.charCodeAt(0).toString(16))
  }
  assert.equal(normalizeArabicText('مـــرحبا'), 'مرحبا', 'tatweel')
})

test('Arabic digits inside a sentence become Latin, letters untouched', () => {
  assert.equal(normalizeArabicText('الطلب رقم ٤٥٦'), 'الطلب رقم 456')
  assert.equal(normalizeArabicText('رقم ۷۸۹'), 'رقم 789')
})

test('a code is found in a real sentence, in Arabic', () => {
  assert.equal(extractCode('مرحبا، كودي SB-7F3K9Q شكرا', OPTS), 'SB-7F3K9Q')
  assert.equal(extractCode('SB-7F3K9Q هذا رمز التحقق', OPTS), 'SB-7F3K9Q')
})

test('separator, case and Arabic digits all work', () => {
  for (const t of ['sb-7f3k9q', 'SB 7F3K9Q', 'sb7f3k9q', 'SB_7F3K9Q', 'SB-٧F٣K٩Q', '‏SB-7F3K9Q']) {
    assert.equal(extractCode(t, OPTS), 'SB-7F3K9Q', t)
  }
})

test('reading a code that was not written is worse than reading none', () => {
  for (const t of ['SB-7F3K9QX', 'SB-7F3K9', 'ASB-7F3K9Q', '9SB-7F3K9Q', 'SB-7F3K9Q7', 'SB', 'SB-']) {
    assert.equal(extractCode(t, OPTS), null, t)
  }
})

test('look-alike characters are outside the default alphabet', () => {
  for (const ch of 'OIL01') assert.equal(DEFAULT_ALPHABET.includes(ch), false, ch)
  for (const bad of ['SB-7F3K9O', 'SB-7F3K90', 'SB-7F3K9I']) assert.equal(extractCode(bad, OPTS), null, bad)
})

test('the prefix, length and alphabet are the caller’s choice', () => {
  assert.equal(extractCode('ACME:1234', { prefix: 'ACME:', length: 4, alphabet: '0123456789' }), 'ACME:-1234')
  assert.equal(extractCode('XY-ABCDEFGH', { prefix: 'XY', length: 8 }), 'XY-ABCDEFGH')
  assert.equal(extractCode('SB-7F3K9Q', { prefix: 'ZZ', length: 6 }), null, 'a different prefix matches nothing')
})

test('bad options are refused rather than throwing', () => {
  for (const o of [{ prefix: '', length: 6 }, { prefix: 'SB', length: 0 }, { prefix: 'SB', length: 6, alphabet: '' }]) {
    assert.doesNotThrow(() => extractCode('SB-7F3K9Q', o))
    assert.equal(extractCode('SB-7F3K9Q', o), null, JSON.stringify(o))
  }
})

test('a prefix containing regex metacharacters is escaped, not interpreted', () => {
  assert.equal(extractCode('A.C-123456', { prefix: 'A.C', length: 6, alphabet: '0123456789' }), 'A.C-123456')
  assert.equal(extractCode('AXC-123456', { prefix: 'A.C', length: 6, alphabet: '0123456789' }), null, '. must not match any character')
})

test('ordinary messages never produce a code', () => {
  for (const t of ['السلام عليكم', 'كم سعر المنتج؟', '', 'sb', null, 42]) {
    assert.equal(extractCode(t, OPTS), null, String(t))
  }
})

test('the cheap gate never hides a real code', () => {
  for (const t of ['SB-7F3K9Q', 'sb7f3k9q', 'مرحبا SB-٧F٣K٩Q', '‏SB-7F3K9Q']) {
    assert.equal(mayCarryCode(t, 'SB'), true, t)
    assert.ok(extractCode(t, OPTS))
  }
  for (const t of ['كم السعر', '', 'مرحبا بك']) assert.equal(mayCarryCode(t, 'SB'), false, t)
})

test('malformed input never throws', () => {
  for (const v of [null, undefined, 42, {}, [], true]) {
    assert.doesNotThrow(() => normalizeArabicText(v))
    assert.equal(normalizeArabicText(v), '')
    assert.doesNotThrow(() => extractCode(v, OPTS))
  }
})
