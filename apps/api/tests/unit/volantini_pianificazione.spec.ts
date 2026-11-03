import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { controlloDovuto } from '#services/volantini/pianificazione'

const ora = DateTime.fromISO('2026-11-10T09:00:00', { zone: 'Europe/Rome' })
const fa = (giorni: number) => ora.minus({ days: giorni })

test.group('controlloDovuto', () => {
  test('il primo controllo è subito', ({ assert }) => {
    assert.isTrue(controlloDovuto(null, ora))
  })

  test('dopo un controllo riuscito si aspetta una settimana', ({ assert }) => {
    assert.isFalse(controlloDovuto({ iniziatoIl: fa(6.9), esito: 'ok' }, ora))
    assert.isTrue(controlloDovuto({ iniziatoIl: fa(7), esito: 'ok' }, ora))
  })

  test('dopo un controllo fallito si riprova il giorno dopo', ({ assert }) => {
    assert.isFalse(controlloDovuto({ iniziatoIl: fa(0.5), esito: 'errore' }, ora))
    assert.isTrue(controlloDovuto({ iniziatoIl: fa(1), esito: 'errore' }, ora))
  })

  test('un controllo rimasto in corso (server spento a metà) si rifà dopo un giorno', ({
    assert,
  }) => {
    assert.isFalse(controlloDovuto({ iniziatoIl: fa(0.1), esito: 'in_corso' }, ora))
    assert.isTrue(controlloDovuto({ iniziatoIl: fa(1), esito: 'in_corso' }, ora))
  })
})
