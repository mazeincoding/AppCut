import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GithubIcon } from "@/components/icons";
import Link from "next/link";
import { Footer } from "@/components/footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-muted/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-tr from-muted/10 to-transparent rounded-full blur-3xl" />
        </div>
        <div className="relative container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <Link href="https://github.com/OpenCut-app/OpenCut" target="_blank">
                <Badge variant="secondary" className="gap-2 mb-6">
                  <GithubIcon className="h-3 w-3" />
                  Open Source
                </Badge>
              </Link>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">Privacy Policy</h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                Learn how we handle your data and privacy. Contact us if you have any questions.
              </p>
            </div>
            <Card className="bg-background/80 backdrop-blur-sm border-2 border-muted/30">
              <CardContent className="p-8 text-base leading-relaxed">
                <p className="mb-4">This is a placeholder Privacy Policy page for OpenCut.</p>
                <p className="mb-4">We value your privacy. Please contact us if you have any questions about our privacy practices.</p>
                <p className="text-sm text-muted-foreground mt-8">Last updated: July 14, 2025</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 