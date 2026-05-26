import { Sparkles } from "lucide-react";
import type { DashboardActivity } from "@/services/dashboard.service";

type ActivityFeedProps = {
  activities: DashboardActivity[];
};

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div key={activity.id} className="flex gap-3 rounded-2xl border border-border bg-background/80 p-3">
          <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-secondary text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="font-semibold text-foreground">{activity.title}</p>
              <span className="text-xs text-muted-foreground">{activity.time}</span>
            </div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{activity.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
