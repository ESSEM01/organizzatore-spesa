import { configApp } from '@adonisjs/eslint-config'

// database/schema.ts è generato da `node ace migration:run`: non va riformattato a mano.
export default configApp({ ignores: ['database/schema.ts'] })
