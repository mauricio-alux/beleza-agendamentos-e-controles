import { Bell } from "lucide-react";
import type { DashboardNotification } from "@/services/dashboard.service";
import { EmptyState } from "@/components/dashboard/EmptyState";

type NotificationsCenterProps = {
  notifications: DashboardNotification[];
};

export function NotificationsCenter({ notifications }: NotificationsCenterProps) {
  if (!notifications.length) {
    return (
      <EmptyState
        icon={Bell}
        title="Tudo em ordem"
        description="Alertas operacionais, lembretes e avisos importantes aparecem aqui."
      />
    );
  }

  return (
    <div className="space-y-3">
      {notifications.map((notification) => (
        <div key={notification.id} className="rounded-2xl border border-border bg-background/80 p-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <p className="min-w-0 break-words font-bold text-foreground">{notification.title}</p>
            <span className="flex-none text-xs text-muted-foreground">{notification.time}</span>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{notification.description}</p>
        </div>
      ))}
    </div>
  );
}
