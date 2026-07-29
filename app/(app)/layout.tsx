import Sidebar from '@/components/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-amber-50 justify-center">
      <Sidebar />
      <main className="flex-1 min-w-0 w-full max-w-[1200px] p-4 md:p-6 pt-16 md:pt-6">
        {children}
      </main>
    </div>
  )
}
