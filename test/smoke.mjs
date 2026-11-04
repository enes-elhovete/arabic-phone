// Does the PUBLISHED package work on the oldest node we advertise?
//
// package.json claims `engines: node >=20`, and nothing checked it. The real
// test suite cannot: it is written in TypeScript and run through node's type
// stripping, which does not exist on 20. So this file is plain JavaScript and
// imports dist/ exactly as a consumer does — the compiler output is the only
// thing a consumer ever runs, and it is the only thing that has to work there.

import assert from 'node:assert/strict'
import * as lib from '../dist/index.js'

const EXPECTED = [
  'DEFAULT_ALPHABET', 'DIAL_RULES', 'e164OrEmpty', 'extractCode', 'mayCarryCode',
  'normalizeArabicText', 'normalizeE164', 'samePhone', 'toLatinDigits',
]

// A missing export is a broken package even if every remaining call succeeds.
assert.deepEqual(Object.keys(lib).sort(), EXPECTED, 'the public surface changed')

// The two things the library exists for, on the oldest supported runtime.
assert.equal(lib.normalizeE164('+966 055 123 4567').phone, '966551234567', 'trunk zero')
assert.equal(lib.normalizeE164('٩٦٦٥٥١٢٣٤٥٦٧').phone, '966551234567', 'Arabic-Indic digits')
assert.equal(lib.extractCode('كودي SB-7F3K9Q', { prefix: 'SB', length: 6 }), 'SB-7F3K9Q')

// Refusals must still be told apart, not collapsed into one failure.
assert.equal(lib.normalizeE164('0551234567').reason, 'no_country_code')
assert.equal(lib.normalizeE164('96655').reason, 'bad_length')

// Syntax the compiler emits that an old runtime could choke on: `??=` caches the
// sorted table on the second call, and `?.` runs inside extractCode.
assert.equal(lib.samePhone('٩٦٦٥٥١٢٣٤٥٦٧', '+966-55-123-4567'), true, 'second call')
assert.equal(lib.mayCarryCode('مرحبا', 'SB'), false)
assert.equal(lib.extractCode('SB-7F3K9Q', { prefix: '', length: 6 }), null, 'optional chain')

assert.ok(lib.DIAL_RULES.length > 150)
assert.doesNotThrow(() => lib.normalizeE164(null))

console.log(`dist/ works on node ${process.version}: ${EXPECTED.length} exports, 10 assertions`)
