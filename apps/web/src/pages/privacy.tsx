import Head from "next/head";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <Head>
        <title>Privacy Policy - OpenCut</title>
        <meta
          name="description"
          content="Privacy Policy for OpenCut - Privacy-first video editing in your browser"
        />
      </Head>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        <div className="prose prose-lg max-w-none">
          <p className="text-muted-foreground mb-6">
            Last updated: {new Date().toLocaleDateString()}
          </p>
          
          <h2 className="text-2xl font-semibold mb-4">Privacy-First Design</h2>
          <p className="mb-4">
            OpenCut is designed with privacy as a core principle. All video editing and processing 
            happens entirely in your browser - your videos never leave your device.
          </p>
          
          <h2 className="text-2xl font-semibold mb-4">Data Collection</h2>
          <p className="mb-4">
            We collect minimal data necessary for the application to function:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Account information (email, name) if you choose to create an account</li>
            <li>Project metadata stored locally in your browser</li>
            <li>Basic analytics for improving the application</li>
          </ul>
          
          <h2 className="text-2xl font-semibold mb-4">Video Processing</h2>
          <p className="mb-4">
            All video processing is performed locally in your browser using WebAssembly. 
            Your video files are never uploaded to our servers.
          </p>
          
          <h2 className="text-2xl font-semibold mb-4">Contact</h2>
          <p>
            For privacy questions, please contact us at privacy@opencut.app
          </p>
        </div>
      </div>
    </div>
  );
}