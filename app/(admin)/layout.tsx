import AdminSidebar from '@/app/components/AdminSidebar';
import AIChatPanel from '@/app/components/AIChatPanelLazy';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#080808]">
      <AdminSidebar />
      <main className="flex-1 lg:ml-64 min-h-screen pt-14 lg:pt-0">
        {children}
      </main>
      <AIChatPanel />
    </div>
  );
}
