import { NegoziVicini } from './features/negozi/NegoziVicini'
import { UpdatePrompt } from './pwa/UpdatePrompt'

export default function App() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4">
      <header className="flex items-baseline justify-between py-4">
        <h1 className="text-lg font-semibold">Spesa</h1>
      </header>

      <main className="flex flex-1 flex-col gap-6 pb-24">
        <NegoziVicini />
      </main>

      <UpdatePrompt />
    </div>
  )
}
