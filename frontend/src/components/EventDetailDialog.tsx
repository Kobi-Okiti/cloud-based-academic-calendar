"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

type EventDetail = {
  title: string;
  description: string | null;
  category: string;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  location: string | null;
  audience_scope: string;
  audience_level: number | null;
  is_urgent: boolean;
};

type EventDetailDialogProps = {
  event: EventDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleString() : "—";

export default function EventDetailDialog({
  event,
  open,
  onOpenChange
}: EventDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle>{event?.title || "Event details"}</DialogTitle>
              <DialogDescription className="mt-1">
                {event?.category ? event.category.replace(/_/g, " ") : "Event"}
              </DialogDescription>
            </div>
            {event?.is_urgent ? (
              <span className="badge-urgent">Urgent</span>
            ) : null}
          </div>
        </DialogHeader>
        <div className="space-y-3 text-sm text-slate-700">
          <div>
            <p className="text-xs uppercase text-slate-500">Date & time</p>
            <p>{formatDate(event?.start_at || null)}</p>
            {event?.end_at ? <p>Ends: {formatDate(event.end_at)}</p> : null}
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Audience</p>
            <p>
              {event?.audience_scope || "—"}
              {event?.audience_level ? ` • Level ${event.audience_level}` : ""}
            </p>
          </div>
          {event?.location ? (
            <div>
              <p className="text-xs uppercase text-slate-500">Location</p>
              <p>{event.location}</p>
            </div>
          ) : null}
          {event?.description ? (
            <div>
              <p className="text-xs uppercase text-slate-500">Details</p>
              <p>{event.description}</p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
