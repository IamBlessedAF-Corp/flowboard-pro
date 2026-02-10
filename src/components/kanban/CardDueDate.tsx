import { format, isPast, differenceInHours } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface CardDueDateProps {
  dueDate: string | null;
  onDateChange: (date: Date | null) => void;
  mode: "display" | "edit";
}

function getDueDateColor(dateStr: string) {
  const date = new Date(dateStr);
  if (isPast(date)) return "bg-destructive text-destructive-foreground";
  if (differenceInHours(date, new Date()) <= 24) return "bg-yellow-500 text-white";
  return "bg-muted text-muted-foreground";
}

export function CardDueDate({ dueDate, onDateChange, mode }: CardDueDateProps) {
  if (mode === "display") {
    if (!dueDate) return null;
    return (
      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-normal", getDueDateColor(dueDate))}>
        {format(new Date(dueDate), "MMM d")}
      </Badge>
    );
  }

  // Edit mode
  const selected = dueDate ? new Date(dueDate) : undefined;

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">Due date</p>
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {dueDate ? format(new Date(dueDate), "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={selected} onSelect={(d) => onDateChange(d ?? null)} initialFocus className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>
        {dueDate && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDateChange(null)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
