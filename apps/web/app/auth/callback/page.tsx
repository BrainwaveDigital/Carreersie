'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Supabase handles the OAuth callback automatically
        // Just check if user is authenticated and redirect
        const { data: { user }, error } = await supabaseClient.auth.getUser()

        if (error || !user) {
          router.push('/login')
          return
        }

        // Redirect to dashboard on success
        router.push('/dashboard')
      } catch (err) {
        console.error('Auth callback error:', err)
        router.push('/login')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <h2 className="text-xl font-semibold text-slate-900">Signing you in...</h2>
        <p className="text-slate-600 mt-2">Please wait while we complete your authentication.</p>
      </div>
    </div>
  )
}
