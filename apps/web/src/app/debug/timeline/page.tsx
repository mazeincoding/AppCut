"use client";

import { TimelineDebugTest } from "@/components/debug/timeline-debug-test";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Timeline } from "@/components/editor/timeline";
import { useTimelineStore } from "@/stores/timeline-store";

export default function TimelineDebugPage() {
  const { tracks } = useTimelineStore();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">
            Timeline Shrinking Bug Debug
          </h1>
          <p className="text-muted-foreground">
            Investigation and testing tools for timeline layout issues
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Container Width Reference Issue
                <Badge variant="outline">Assumption 1</Badge>
              </CardTitle>
              <CardDescription>
                Testing if timelineRef.current?.clientWidth fallback causes
                timeline shrinking during view transitions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TimelineDebugTest />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Timeline Review
                <Badge variant="outline">{tracks.length} tracks</Badge>
              </CardTitle>
              <CardDescription>
                Live timeline view showing uploaded media and testing timeline
                behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg bg-muted/20 h-96 w-full">
                <Timeline />
              </div>
              <div className="mt-4 p-3 bg-muted/30 rounded text-xs">
                <div className="font-medium mb-1">Debug Info:</div>
                <div>Tracks: {tracks.length}</div>
                <div>
                  Check browser console for detailed timeline width calculations
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Open browser console to see debug logs</li>
                <li>
                  <strong>Upload media files</strong> (images, videos, or audio)
                  to test with real content
                </li>
                <li>
                  <strong>Review uploaded media</strong> in the Timeline Review
                  section above
                </li>
                <li>
                  Click "Toggle Container Width" to simulate container resize
                </li>
                <li>
                  Watch for fallback usage (red entries indicate fallback is
                  used)
                </li>
                <li>
                  Check if dynamic width changes unexpectedly when media is
                  added
                </li>
                <li>
                  Test different zoom levels and duration changes with media
                  content
                </li>
                <li>
                  Observe timeline behavior when switching between different
                  view modes
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Video Thumbnail Settings now available in header menu */}
    </div>
  );
}
