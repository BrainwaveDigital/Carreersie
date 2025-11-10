import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-8">
      <h1 className="text-4xl font-bold mb-8">Welcome to Careersie Platform</h1>

      <div className="space-x-4">
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          Primary Button
        </Button>
        <Button className="bg-gray-200 hover:bg-gray-300 text-gray-800">
          Secondary Button
        </Button>
      </div>

      <p className="mt-8 text-lg text-muted-foreground">
        Tailwind + Shadcn UI are now working!
      </p>
    </main>
  );
}
