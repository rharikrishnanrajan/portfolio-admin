export default function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <p className="eyebrow mb-2">Coming next</p>
      <h1 className="text-4xl font-bold tracking-tight mb-4">{title}</h1>
      <p className="text-muted">This page is built in a later step.</p>
    </div>
  )
}
