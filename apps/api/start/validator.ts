/*
|--------------------------------------------------------------------------
| Validator file
|--------------------------------------------------------------------------
|
| The validator file is used for configuring global transforms for VineJS.
| The transform below converts all VineJS date outputs from JavaScript
| Date objects to Luxon DateTime instances, so that validated dates are
| ready to use with Lucid models and other parts of the app that expect
| Luxon DateTime.
|
*/

import { DateTime } from 'luxon'
import vine, { SimpleMessagesProvider, VineDate } from '@vinejs/vine'

/**
 * Messaggi di validazione in italiano per tutta l'API: la PWA li mostra così come arrivano.
 * Chiavi `campo.regola` per i casi in cui il messaggio generico non basta.
 */
vine.messagesProvider = new SimpleMessagesProvider(
  {
    'required': 'Il campo {{ field }} è obbligatorio',
    'string': 'Il campo {{ field }} deve essere un testo',
    'number': 'Il campo {{ field }} deve essere un numero',
    'email': 'Inserisci un indirizzo email valido',
    'minLength': 'Il campo {{ field }} deve avere almeno {{ min }} caratteri',
    'maxLength': 'Il campo {{ field }} può avere al massimo {{ max }} caratteri',
    'min': 'Il campo {{ field }} deve essere almeno {{ min }}',
    'max': 'Il campo {{ field }} può essere al massimo {{ max }}',
    'regex': 'Il campo {{ field }} non ha il formato atteso',
    'sameAs': 'Il campo {{ field }} deve coincidere con {{ otherField }}',
    'database.unique': 'Il valore del campo {{ field }} è già usato',
    'email.database.unique': 'Esiste già un account con questa email',
    'passwordConfirmation.sameAs': 'Le due password non coincidono',
  },
  {
    fullName: 'nome',
    passwordConfirmation: 'conferma password',
    osmId: 'identificativo OpenStreetMap',
    lat: 'latitudine',
    lon: 'longitudine',
  }
)

declare module '@vinejs/vine/types' {
  interface VineGlobalTransforms {
    date: DateTime
  }
}

VineDate.transform((value) => DateTime.fromJSDate(value))
