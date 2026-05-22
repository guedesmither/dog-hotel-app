import Sidebar from '@/components/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-amber-50">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-6 pt-16 md:pt-6">
        {children}
      </main>
    </div>
  )
}
