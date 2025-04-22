import Link from "next/link"
import { Button } from "@/components/ui/button"

export function DashboardHeader() {
    return (
        <header className="border-b bg-white dark:bg-gray-950">
            <div className="container flex h-16 items-center justify-between px-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-semibold">FacturApp</h1>
                    <nav className="hidden md:flex gap-6">
                        <Link href="#" className="text-sm font-medium transition-colors hover:text-primary">
                            Personas Físicas
                        </Link>
                        <Link href="#" className="text-sm font-medium transition-colors hover:text-primary">
                            Personas Morales
                        </Link>
                    </nav>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/">Volver al inicio</Link>
                    </Button>
                </div>
            </div>
        </header>
    )
}