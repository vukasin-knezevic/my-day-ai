import { Card, PageTitle } from '../components/ui'

export default function Placeholder({ title, phase }: { title: string; phase: string }) {
  return (
    <>
      <PageTitle>{title}</PageTitle>
      <Card>
        <p className="text-sm text-slate-600 dark:text-slate-400">Ovaj ekran stiže u {phase}.</p>
      </Card>
    </>
  )
}
