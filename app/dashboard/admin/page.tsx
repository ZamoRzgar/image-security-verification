"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Users, UserCog, Shield, Search, RefreshCw, UserX, UserCheck } from "lucide-react"
import { getAllUsersAction, updateUserRoleAction } from "@/app/actions/admin"
import { getCurrentUser } from "@/lib/supabase-utils"
import { formatDate } from "@/lib/crypto-utils"

// Define user role types
type UserRole = "user" | "admin"

interface UserData {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  role: UserRole
  verified_images_count?: number
  total_images_count?: number
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [users, setUsers] = useState<UserData[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null)

  // Check if current user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const user = await getCurrentUser()
        if (!user) {
          toast({
            title: "Authentication Required",
            description: "You must be logged in to access this page.",
            variant: "destructive",
          })
          router.push("/login")
          return
        }

        // Get user role from profile
        const { data: profile } = await fetch(`/api/users/${user.id}/profile`).then(res => res.json())
        
        if (profile?.role !== "admin") {
          toast({
            title: "Access Denied",
            description: "You don't have permission to access the admin dashboard.",
            variant: "destructive",
          })
          router.push("/dashboard")
          return
        }
        
        setIsAdmin(true)
        fetchUsers()
      } catch (error) {
        console.error("Error checking admin status:", error)
        toast({
          title: "Error",
          description: "Failed to verify admin privileges.",
          variant: "destructive",
        })
        router.push("/dashboard")
      }
    }
    
    checkAdminStatus()
  }, [router, toast])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const userData = await getAllUsersAction()
      setUsers(userData)
      setFilteredUsers(userData)
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        title: "Error",
        description: "Failed to fetch users.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase()
    setSearchQuery(query)
    
    if (!query.trim()) {
      setFilteredUsers(users)
      return
    }
    
    const filtered = users.filter(user => 
      user.email.toLowerCase().includes(query) || 
      user.id.toLowerCase().includes(query)
    )
    setFilteredUsers(filtered)
  }

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    setIsUpdatingRole(userId)
    try {
      const success = await updateUserRoleAction(userId, newRole)
      if (success) {
        // Update local state
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === userId ? { ...user, role: newRole } : user
          )
        )
        setFilteredUsers(prevFiltered => 
          prevFiltered.map(user => 
            user.id === userId ? { ...user, role: newRole } : user
          )
        )
        
        toast({
          title: "Role Updated",
          description: `User role has been updated to ${newRole}.`,
        })
      } else {
        throw new Error("Failed to update user role")
      }
    } catch (error) {
      console.error("Error updating user role:", error)
      toast({
        title: "Error",
        description: "Failed to update user role.",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingRole(null)
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Checking Permissions</CardTitle>
            <CardDescription className="text-center">
              Verifying your admin privileges...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <RefreshCw className="h-10 w-10 animate-spin text-blue-500" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center">
            <Shield className="mr-2 h-8 w-8 text-blue-500" />
            Admin Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Manage users and system settings
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <Button 
            variant="outline" 
            onClick={fetchUsers}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500 mr-3" />
              <span className="text-3xl font-bold">{users.length}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Admin Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <UserCog className="h-8 w-8 text-purple-500 mr-3" />
              <span className="text-3xl font-bold">
                {users.filter(user => user.role === "admin").length}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Regular Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-green-500 mr-3" />
              <span className="text-3xl font-bold">
                {users.filter(user => user.role === "user").length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            View and manage all users in the system
          </CardDescription>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search users by email or ID..."
              className="pl-10"
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Email</th>
                  <th className="text-left py-3 px-4 hidden md:table-cell">User ID</th>
                  <th className="text-left py-3 px-4 hidden md:table-cell">Created</th>
                  <th className="text-left py-3 px-4 hidden md:table-cell">Last Login</th>
                  <th className="text-left py-3 px-4">Role</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-500" />
                      <p className="mt-2 text-slate-500">Loading users...</p>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8">
                      <UserX className="h-6 w-6 mx-auto text-slate-400" />
                      <p className="mt-2 text-slate-500">
                        {searchQuery ? "No users match your search" : "No users found"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4">{user.email}</td>
                      <td className="py-3 px-4 hidden md:table-cell text-sm text-slate-500 font-mono">
                        {user.id.substring(0, 8)}...
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : "Never"}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === "admin" 
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" 
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {user.role === "admin" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateRole(user.id, "user")}
                            disabled={isUpdatingRole === user.id}
                          >
                            {isUpdatingRole === user.id ? (
                              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            ) : null}
                            Make User
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateRole(user.id, "admin")}
                            disabled={isUpdatingRole === user.id}
                          >
                            {isUpdatingRole === user.id ? (
                              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            ) : null}
                            Make Admin
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t px-6 py-4">
          <div className="text-sm text-slate-500">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
