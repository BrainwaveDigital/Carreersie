import Link from 'next/link'

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
// ProfileLinkClient is a client component (uses "use client") so we can
// import it directly here; avoid using next/dynamic with ssr:false inside a
// Server Component (Next.js disallows that). Importing a client component is
// a valid client boundary and it will render on the client.
import ProfileLinkClient from './ProfileLinkClient'

export const metadata = {
  title: 'Create Profile — Careersie',
}

export default function ProfileChoosePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">How would you like to create your profile?</h1>
          <p className="text-slate-600 mt-2">Choose the method that works best for you</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <CardHeader>
              <CardTitle>View Profile</CardTitle>
              <CardDescription className="mt-2">
                See your existing profile and edit it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">Open your saved profile page to view or update details.</p>
            </CardContent>
            <CardFooter className="justify-start">
              {/* ProfileLinkClient will link to the latest parsed CV if available (client-side) */}
              <ProfileLinkClient />
            </CardFooter>
          </Card>
          <Card className="p-6">
            <CardHeader>
              <CardTitle>Upload Your CV</CardTitle>
              <CardDescription className="mt-2">
                Quick and easy! Upload your existing CV and we'll extract the key information using AI.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc ml-5 text-sm text-slate-600 space-y-1">
                <li>Supports PDF, DOC, DOCX</li>
                <li>AI-powered information extraction</li>
                <li>Review and edit before saving</li>
              </ul>
            </CardContent>
            <CardFooter className="justify-start">
              <Link href="/profile/upload">
                <Button variant="default">Upload CV</Button>
              </Link>
            </CardFooter>
          </Card>

          <Card className="p-6">
            <CardHeader>
              <CardTitle>Build Profile Manually</CardTitle>
              <CardDescription className="mt-2">
                Create your profile from scratch with our guided form.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc ml-5 text-sm text-slate-600 space-y-1">
                <li>Step-by-step guidance</li>
                <li>Complete control over content</li>
                <li>Takes about 5-10 minutes</li>
              </ul>
            </CardContent>
            <CardFooter className="justify-start">
              <Link href="/profile/manual">
                <Button variant="secondary">Build Manually</Button>
              </Link>
            </CardFooter>
          </Card>
        </div>

        <div className="mt-6 text-center text-sm">
          <Link href="/dashboard" className="text-slate-600 hover:text-slate-800">← Back</Link>
        </div>
      </div>
    </div>
  )
}
