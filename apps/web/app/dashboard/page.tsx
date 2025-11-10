'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase'
import { LogOut } from 'lucide-react'

interface User {
  id: string
  email?: string
  user_metadata?: Record<string, any>
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabaseClient.auth.getUser()

        if (error || !user) {
          router.push('/login')
          return
        }

        setUser(user as User)
      } catch (err) {
        console.error('Auth check error:', err)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const handleLogout = async () => {
    try {
      await supabaseClient.auth.signOut()
      router.push('/login')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <h2 className="text-xl font-semibold text-slate-900">Loading...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Careersie</h1>
            <p className="text-slate-600 text-sm">Dashboard</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome!</h2>
          <p className="text-slate-600 mb-6">
            You have successfully logged in to Careersie.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-blue-900 mb-2">Your Account</h3>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-blue-900">Email</dt>
                <dd className="text-blue-700">{user?.email || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-blue-900">User ID</dt>
                <dd className="text-blue-700 font-mono text-xs">{user?.id}</dd>
              </div>
            </dl>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-slate-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                🎯 Find Jobs
              </h3>
              <p className="text-slate-600 text-sm">
                Browse and apply to thousands of job opportunities from top companies.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                📋 My Applications
              </h3>
              <p className="text-slate-600 text-sm">
                Track your job applications and stay updated on their status.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                ⭐ Saved Jobs
              </h3>
              <p className="text-slate-600 text-sm">
                Save and revisit your favorite job postings anytime.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                👤 Profile
              </h3>
              <p className="text-slate-600 text-sm">
                Complete your profile to stand out to recruiters.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
