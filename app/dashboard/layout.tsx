"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Upload, 
  Images, 
  CheckCircle, 
  LogOut, 
  Shield, 
  User,
  Menu,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { checkAdminStatusAction } from "@/app/actions/admin"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const isUserAdmin = await checkAdminStatusAction()
        setIsAdmin(isUserAdmin)
      } catch (error) {
        console.error("Error checking admin status:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAdminStatus()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      name: "Upload",
      href: "/dashboard/upload",
      icon: <Upload className="h-5 w-5" />,
    },
    {
      name: "My Images",
      href: "/dashboard/images",
      icon: <Images className="h-5 w-5" />,
    },
    {
      name: "Verify",
      href: "/dashboard/verify",
      icon: <CheckCircle className="h-5 w-5" />,
    },
  ]

  // Admin-only navigation items
  const adminItems = [
    {
      name: "Admin",
      href: "/dashboard/admin",
      icon: <Shield className="h-5 w-5" />,
    },
  ]

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleMobileMenu}
          className="rounded-full"
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Sidebar for desktop */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-y-auto">
          <div className="flex items-center h-16 flex-shrink-0 px-4 border-b border-slate-200 dark:border-slate-800">
            <Link href="/dashboard" className="flex items-center">
              <Shield className="h-6 w-6 text-blue-600 dark:text-blue-500 mr-2" />
              <span className="text-lg font-semibold">SecureImage</span>
            </Link>
          </div>
          <div className="flex-grow flex flex-col justify-between">
            <nav className="flex-1 px-2 py-4 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? "bg-blue-100 text-blue-900 dark:bg-blue-900/20 dark:text-blue-100"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className={`mr-3 ${isActive ? "text-blue-600 dark:text-blue-500" : ""}`}>
                      {item.icon}
                    </span>
                    {item.name}
                  </Link>
                )
              })}

              {/* Admin section - only shown to admin users */}
              {isAdmin && (
                <>
                  <div className="pt-4 pb-2">
                    <div className="px-4">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Admin
                      </h3>
                      <div className="mt-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                    </div>
                  </div>
                  {adminItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                          isActive
                            ? "bg-purple-100 text-purple-900 dark:bg-purple-900/20 dark:text-purple-100"
                            : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span className={`mr-3 ${isActive ? "text-purple-600 dark:text-purple-500" : ""}`}>
                          {item.icon}
                        </span>
                        {item.name}
                      </Link>
                    )
                  })}
                </>
              )}
            </nav>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="outline"
                className="w-full justify-start text-slate-700 dark:text-slate-300"
                onClick={handleSignOut}
              >
                <LogOut className="h-5 w-5 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={toggleMobileMenu}
          ></div>
          
          {/* Sidebar */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-slate-950">
            <div className="flex items-center h-16 flex-shrink-0 px-4 border-b border-slate-200 dark:border-slate-800">
              <Link href="/dashboard" className="flex items-center" onClick={toggleMobileMenu}>
                <Shield className="h-6 w-6 text-blue-600 dark:text-blue-500 mr-2" />
                <span className="text-lg font-semibold">SecureImage</span>
              </Link>
            </div>
            <div className="flex-grow flex flex-col justify-between overflow-y-auto">
              <nav className="flex-1 px-2 py-4 space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                        isActive
                          ? "bg-blue-100 text-blue-900 dark:bg-blue-900/20 dark:text-blue-100"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                      onClick={toggleMobileMenu}
                    >
                      <span className={`mr-3 ${isActive ? "text-blue-600 dark:text-blue-500" : ""}`}>
                        {item.icon}
                      </span>
                      {item.name}
                    </Link>
                  )
                })}

                {/* Admin section - only shown to admin users */}
                {isAdmin && (
                  <>
                    <div className="pt-4 pb-2">
                      <div className="px-4">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Admin
                        </h3>
                        <div className="mt-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                      </div>
                    </div>
                    {adminItems.map((item) => {
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                            isActive
                              ? "bg-purple-100 text-purple-900 dark:bg-purple-900/20 dark:text-purple-100"
                              : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                          }`}
                          onClick={toggleMobileMenu}
                        >
                          <span className={`mr-3 ${isActive ? "text-purple-600 dark:text-purple-500" : ""}`}>
                            {item.icon}
                          </span>
                          {item.name}
                        </Link>
                      )
                    })}
                  </>
                )}
              </nav>
              <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                <Button
                  variant="outline"
                  className="w-full justify-start text-slate-700 dark:text-slate-300"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        <main className="flex-1 pb-8">
          {children}
        </main>
      </div>
    </div>
  )
}
