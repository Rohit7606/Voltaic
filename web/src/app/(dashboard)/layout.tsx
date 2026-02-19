import Navbar from "@/components/Navbar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative h-screen w-full bg-black overflow-hidden selection:bg-primary/30 selection:text-primary">
            {/* Top Floating Navigation */}
            <Navbar />

            {/* Main Content Area - Full Screen for Maps */}
            <main className="absolute inset-0 overflow-hidden">
                {children}
            </main>
        </div>
    );
}
