import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as pkg from '../src/index.ts'

// 🔴 الحارس الحقيقي: الREADME عقدٌ مع المستخدم. دالةٌ موثَّقة وغير مُصدَّرة تعطي
// `undefined` عند أول استيراد — ولا اختبارٌ يكشفها لأن الاختبارات تستورد من الملف
// الداخلي مباشرةً. فنقرأ الجدول من الREADME ونطالب المدخل بما وعد به.
test('every function the README documents is actually exported from the entry point', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8')
  const table = readme.slice(readme.indexOf('| Export |'))
  const documented = [...table.matchAll(/^\| `([A-Za-z_][A-Za-z0-9_]*)[^`]*` \|/gm)].map((m) => m[1])

  assert.ok(documented.length >= 6, `the API table should list the exports, found ${documented.length}`)
  const missing = documented.filter((name) => !(name in pkg))
  assert.deepEqual(missing, [], `documented but not exported: ${missing.join(', ')}`)
})

test('the entry point exports nothing it does not document', () => {
  // الاتجاه الآخر: سطحٌ عامّ غير موثَّق يصير التزاماً لا ينتبه له أحد.
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8')
  const undocumented = Object.keys(pkg).filter((name) => !readme.includes(name))
  assert.deepEqual(undocumented, [], `exported but not documented: ${undocumented.join(', ')}`)
})
