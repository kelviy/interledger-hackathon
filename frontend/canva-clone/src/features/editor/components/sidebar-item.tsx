import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSessionEditor } from "./SessionContext";
interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  isPremiumFeature: boolean;
  onClick: () => void;
};

export const SidebarItem = ({
  icon: Icon,
  label,
  isActive,
  onClick,
  isPremiumFeature,
}: SidebarItemProps) => {

  const {isPremium} = useSessionEditor()

  return (
    !isPremiumFeature 
    ? <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        "w-full h-full aspect-video p-3 py-4 flex flex-col rounded-none",
        isActive && "bg-muted text-primary"
      )}
    >
      <Icon className="size-5 stroke-2 shrink-0" />
      <span className="mt-2 text-xs">
        {label}
      </span>
    </Button>
    
    : <Button
      disabled={!isPremium}
      variant="ghost"
      onClick={onClick}
      className={cn(
        "w-full h-full aspect-video p-3 py-4 flex flex-col rounded-none",
        isActive && "bg-muted text-primary"
      )}
    >
      <Icon className="size-5 stroke-2 shrink-0" />
      <span className="mt-2 text-xs">
        {label}
      </span>
    </Button>
  );
};
