"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Pencil, Play, CheckCircle, XCircle } from "lucide-react";
import { SessionStatus } from "@prisma/client";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/shared/delete-button";
import { deleteSession, updateSessionStatus } from "@/app/actions/sessions";

interface SessionTrain {
  train: { id: string; trainNumber: string; trainName: string | null };
}

interface OperatingSession {
  id: string;
  name: string;
  date: Date;
  notes: string | null;
  status: SessionStatus;
  sessionTrains: SessionTrain[];
}

interface SessionCardListProps {
  sessions: OperatingSession[];
  layoutId: string;
}

const statusConfig: Record<
  SessionStatus,
  { variant: "default" | "secondary" | "outline" | "destructive"; label: string; pulse?: boolean }
> = {
  PLANNED: { variant: "secondary", label: "Planned" },
  IN_PROGRESS: { variant: "default", label: "In Progress", pulse: true },
  COMPLETED: { variant: "outline", label: "Completed" },
  CANCELLED: { variant: "destructive", label: "Cancelled" },
};

function StatusActionButtons({
  session,
  layoutId,
}: {
  session: OperatingSession;
  layoutId: string;
}) {
  const [isLoading, setIsLoading] = useState<SessionStatus | null>(null);
  const router = useRouter();

  async function handleStatus(status: SessionStatus) {
    setIsLoading(status);
    const result = await updateSessionStatus(session.id, layoutId, status);
    if (result.error) {
      toast.error(result.error);
    } else {
      const labels: Record<SessionStatus, string> = {
        IN_PROGRESS: "Session started",
        COMPLETED: "Session completed",
        CANCELLED: "Session cancelled",
        PLANNED: "Session reset to planned",
      };
      toast.success(labels[status]);
      router.refresh();
    }
    setIsLoading(null);
  }

  if (session.status === "PLANNED") {
    return (
      <Button
        size="sm"
        variant="default"
        className="h-7 px-2.5 text-xs gap-1.5 transition-all duration-150 hover:shadow-md"
        onClick={() => handleStatus("IN_PROGRESS")}
        disabled={!!isLoading}
      >
        <Play className="h-3 w-3" />
        Start
      </Button>
    );
  }

  if (session.status === "IN_PROGRESS") {
    return (
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="default"
          className="h-7 px-2.5 text-xs gap-1.5 transition-all duration-150 hover:shadow-md"
          onClick={() => handleStatus("COMPLETED")}
          disabled={!!isLoading}
        >
          <CheckCircle className="h-3 w-3" />
          Complete
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2.5 text-xs gap-1.5 text-destructive hover:text-destructive hover:border-destructive/50 transition-all duration-150"
          onClick={() => handleStatus("CANCELLED")}
          disabled={!!isLoading}
        >
          <XCircle className="h-3 w-3" />
          Cancel
        </Button>
      </div>
    );
  }

  return null;
}

export function SessionCardList({ sessions, layoutId }: SessionCardListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sessions.map((session, i) => {
        const config = statusConfig[session.status];

        return (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.25, ease: "easeOut" }}
          >
            <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/20">
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate">{session.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {new Date(session.date).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      asChild
                    >
                      <Link href={`/dashboard/railroad/${layoutId}/sessions/${session.id}/edit`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <DeleteButton
                      itemName={session.name}
                      itemType="operating session"
                      onDelete={() => deleteSession(session.id, layoutId)}
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0 space-y-3">
                {/* Status badge */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant={config.variant}
                    className="text-[10px] px-1.5 py-0 h-4 font-normal gap-1.5"
                  >
                    {config.pulse && (
                      <span className="relative flex h-1.5 w-1.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                      </span>
                    )}
                    {config.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {session.sessionTrains.length} train
                    {session.sessionTrains.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Train number badges */}
                {session.sessionTrains.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {session.sessionTrains.map(({ train }) => (
                      <Badge
                        key={train.id}
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-4 font-mono tracking-wider"
                      >
                        {train.trainNumber}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Status action buttons */}
                {(session.status === "PLANNED" || session.status === "IN_PROGRESS") && (
                  <div className="pt-1 border-t border-border/30">
                    <StatusActionButtons session={session} layoutId={layoutId} />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
