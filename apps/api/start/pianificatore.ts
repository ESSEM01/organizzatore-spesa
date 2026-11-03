/*
|--------------------------------------------------------------------------
| Controllo settimanale dei volantini (D15)
|--------------------------------------------------------------------------
|
| Solo nel server web e solo con CONTROLLO_VOLANTINI=true: ogni ora si guarda l'ultimo controllo
| registrato nel database e, se è passata una settimana, se ne lancia uno. Il registro sta nel
| database, quindi riavviare il server non fa ripartire il controllo (né la spesa per il modello).
|
*/

import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import env from '#start/env'
import {
  controlloDovuto,
  eseguiControllo,
  ultimoControllo,
} from '#services/volantini/pianificazione'

const OGNI_ORA = 60 * 60 * 1000
const chiave = env.get('ANTHROPIC_API_KEY')?.release()

if (env.get('CONTROLLO_VOLANTINI') && !chiave) {
  logger.warn(
    'CONTROLLO_VOLANTINI attivo ma manca ANTHROPIC_API_KEY: controllo dei volantini spento'
  )
} else if (env.get('CONTROLLO_VOLANTINI') && chiave) {
  let inCorso = false

  const verifica = async () => {
    if (inCorso) return
    inCorso = true
    try {
      const ultimo = await ultimoControllo()
      if (!controlloDovuto(ultimo, DateTime.now())) return
      logger.info('Controllo settimanale dei volantini: inizio')
      const esito = await eseguiControllo(chiave, app.makePath('../..'), (m) => logger.warn(m))
      logger.info(
        `Controllo dei volantini finito: ${esito.nuovi} nuovi, ${esito.letti} letti, ${esito.offerte} offerte`
      )
      for (const errore of esito.errori) logger.warn(`Controllo dei volantini: ${errore}`)
    } catch (e) {
      logger.error({ err: e }, 'Controllo dei volantini fallito')
    } finally {
      inCorso = false
    }
  }

  // Il primo sguardo un minuto dopo l'avvio, poi ogni ora; i timer non tengono acceso il processo.
  setTimeout(verifica, 60_000).unref()
  setInterval(verifica, OGNI_ORA).unref()
}
