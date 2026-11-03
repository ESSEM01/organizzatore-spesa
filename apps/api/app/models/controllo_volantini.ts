import { ControlliVolantiniSchema } from '#database/schema'

/** Un controllo settimanale dei volantini pubblicati (D15). */
export default class ControlloVolantini extends ControlliVolantiniSchema {
  static table = 'controlli_volantini'
}
