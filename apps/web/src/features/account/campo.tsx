import type { InputHTMLAttributes } from 'react'

/** Campo di un modulo con etichetta e messaggio d'errore collegato (per i lettori di schermo). */
export function Campo({
  id,
  etichetta,
  errore,
  ...props
}: { id: string; etichetta: string; errore?: string | undefined } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {etichetta}
      </label>
      <input
        id={id}
        aria-invalid={errore ? true : undefined}
        aria-describedby={errore ? `${id}-errore` : undefined}
        className="min-h-11 rounded-lg border border-bordo bg-superficie px-3 text-base aria-invalid:border-sforamento"
        {...props}
      />
      {errore && (
        <p id={`${id}-errore`} className="text-sm text-sforamento">
          {errore}
        </p>
      )}
    </div>
  )
}

export const classePulsante = 'min-h-12 rounded-lg bg-marca px-4 font-medium text-white disabled:opacity-60'
