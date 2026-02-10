import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PresenceUser {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface BoardPresenceProps {
  onlineUsers: PresenceUser[];
}

export function BoardPresence({ onlineUsers }: BoardPresenceProps) {
  if (onlineUsers.length === 0) return null;

  const initials = (name: string | null) => (name ?? "?").slice(0, 2).toUpperCase();

  return (
    <TooltipProvider>
      <div className="flex items-center -space-x-2">
        {onlineUsers.slice(0, 5).map((u) => (
          <Tooltip key={u.user_id}>
            <TooltipTrigger asChild>
              <Avatar className="h-7 w-7 border-2 border-background">
                <AvatarImage src={u.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                  {initials(u.display_name)}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {u.display_name ?? "User"} <span className="text-green-500">● online</span>
            </TooltipContent>
          </Tooltip>
        ))}
        {onlineUsers.length > 5 && (
          <Avatar className="h-7 w-7 border-2 border-background">
            <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
              +{onlineUsers.length - 5}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </TooltipProvider>
  );
}
