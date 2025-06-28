"use client";

import { useState } from "react";
import { useSessionEditor } from "./SessionContext";
import { CiFileOn } from "react-icons/ci";
import { BsCloudCheck, BsCloudSlash } from "react-icons/bs";
import { useFilePicker } from "use-file-picker";
import { useMutationState } from "@tanstack/react-query";
import { 
  ChevronDown, 
  Download, 
  Loader, 
  MousePointerClick, 
  Redo2, 
  Undo2,
  DollarSign
} from "lucide-react";

import { UserButton } from "@/features/auth/components/user-button";

import { ActiveTool, Editor } from "@/features/editor/types";
import { Logo } from "@/features/editor/components/logo";

import { cn } from "@/lib/utils";
import { Hint } from "@/components/hint";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
  id: string;
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
};

export const Navbar = ({
  id,
  editor,
  activeTool,
  onChangeActiveTool,
}: NavbarProps) => {
  const data = useMutationState({
    filters: {
      mutationKey: ["project", { id }],
      exact: true,
    },
    select: (mutation) => mutation.state.status,
  });

  const currentStatus = data[data.length - 1];

  const isError = currentStatus === "error";
  const isPending = currentStatus === "pending";

  // Budget state
  const [amount, setAmount] = useState(1);
  const [editing, setEditing] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showBudgetOverlay, setShowBudgetOverlay] = useState(false);
  const [budgetAmountAvailable, setBudgetAmountAvailable] = useState(1);

  const toggleEdit = () => setEditing((prev) => !prev);
  const increment = () => setAmount((prev) => prev + 1);
  const decrement = () => setAmount((prev) => (prev > 1 ? prev - 1 : 1));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1) setAmount(value);
  };

  const handleCloseDropdown = () => {
    setBudgetAmountAvailable(amount);
    setEditing(false);
    setDropdownOpen(false);
  };

  const handleIncreaseBudget = () => {
    setShowBudgetOverlay(true);
  };

  const handleCloseBudgetOverlay = () => {
    setBudgetAmountAvailable(amount);
    setEditing(false);
    setShowBudgetOverlay(false);
  };

  const handleConfirmBudgetFromOverlay = () => {
    setBudgetAmountAvailable(amount);
    setEditing(false);
    setShowBudgetOverlay(false);
  };

  const { openFilePicker } = useFilePicker({
    accept: ".json",
    onFilesSuccessfullySelected: ({ plainFiles }: any) => {
      if (plainFiles && plainFiles.length > 0) {
        const file = plainFiles[0];
        const reader = new FileReader();
        reader.readAsText(file, "UTF-8");
        reader.onload = () => {
          editor?.loadJson(reader.result as string);
        };
      }
    },
  });

  return (
    <>
      <nav className="w-full flex items-center p-4 h-[68px] gap-x-8 border-b lg:pl-[34px]">
        <Logo />
        <div className="w-full flex items-center gap-x-1 h-full">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost">
                File
                <ChevronDown className="size-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-60">
              <DropdownMenuItem
                onClick={() => openFilePicker()}
                className="flex items-center gap-x-2"
              >
                <CiFileOn className="size-8" />
                <div>
                  <p>Open</p>
                  <p className="text-xs text-muted-foreground">
                    Open a JSON file
                  </p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Separator orientation="vertical" className="mx-2" />
          <Hint label="Select" side="bottom" sideOffset={10}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onChangeActiveTool("select")}
              className={cn(activeTool === "select" && "bg-gray-100")}
            >
              <MousePointerClick className="size-4" />
            </Button>
          </Hint>
          <Hint label="Undo" side="bottom" sideOffset={10}>
            <Button
              disabled={!editor?.canUndo()}
              variant="ghost"
              size="icon"
              onClick={() => editor?.onUndo()}
            >
              <Undo2 className="size-4" />
            </Button>
          </Hint>
          <Hint label="Redo" side="bottom" sideOffset={10}>
            <Button
              disabled={!editor?.canRedo()}
              variant="ghost"
              size="icon"
              onClick={() => editor?.onRedo()}
            >
              <Redo2 className="size-4" />
            </Button>
          </Hint>
          <Separator orientation="vertical" className="mx-2" />
          {isPending && ( 
            <div className="flex items-center gap-x-2">
              <Loader className="size-4 animate-spin text-muted-foreground" />
              <div className="text-xs text-muted-foreground">
                Saving...
              </div>
            </div>
          )}
          {!isPending && isError && ( 
            <div className="flex items-center gap-x-2">
              <BsCloudSlash className="size-[20px] text-muted-foreground" />
              <div className="text-xs text-muted-foreground">
                Failed to save
              </div>
            </div>
          )}
          {!isPending && !isError && ( 
            <div className="flex items-center gap-x-2">
              <BsCloudCheck className="size-[20px] text-muted-foreground" />
              <div className="text-xs text-muted-foreground">
              </div>
            </div>
          )}
          <div className="ml-auto flex items-center gap-x-4">
            {/* Budget Display */}
            <div className="flex items-center gap-x-2 text-sm text-muted-foreground">
              <div className="text-xs text-muted-foreground font-bold">
                Balance:
              </div>
              <span className="font-medium">${budgetAmountAvailable}</span>
            </div>
            
            {/* Budget Dropdown */}
            <DropdownMenu modal={true} open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost">
                  <DollarSign className="size-4 mr-2" />
                  Set Budget
                  <ChevronDown className="size-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-80 p-4" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Set Budget</h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleCloseDropdown}
                      className="h-6 w-6 p-0"
                    >
                      ×
                    </Button>
                  </div>
                  
                  <div className="flex justify-center">
                    {editing ? (
                      <Input
                        type="number"
                        value={amount}
                        onChange={handleInputChange}
                        autoFocus
                        className="w-32 text-center text-2xl font-bold"
                        min={1}
                      />
                    ) : (
                      <div className="text-4xl font-bold text-center">${amount}</div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={decrement} variant="outline" size="sm" className="flex-1">
                      -$1
                    </Button>
                    <Button onClick={increment} variant="outline" size="sm" className="flex-1">
                      +$1
                    </Button>
                  </div>
                  
                  <Button 
                    onClick={editing ? handleCloseDropdown : toggleEdit} 
                    className="w-full"
                    size="sm"
                  >
                    {editing ? "Confirm" : "Edit"}
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost">
                  Export
                  <Download className="size-4 ml-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-60">
                <DropdownMenuItem
                  className="flex items-center gap-x-2"
                  onClick={() => editor?.saveJson()}
                >
                  <CiFileOn className="size-8" />
                  <div>
                    <p>JSON</p>
                    <p className="text-xs text-muted-foreground">
                      Save for later editing
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex items-center gap-x-2"
                  onClick={() => editor?.savePng()}
                >
                  <CiFileOn className="size-8" />
                  <div>
                    <p>PNG</p>
                    <p className="text-xs text-muted-foreground">
                      Best for sharing on the web
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex items-center gap-x-2"
                  onClick={() => editor?.saveJpg()}
                >
                  <CiFileOn className="size-8" />
                  <div>
                    <p>JPG</p>
                    <p className="text-xs text-muted-foreground">
                      Best for printing
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex items-center gap-x-2"
                  onClick={() => editor?.saveSvg()}
                >
                  <CiFileOn className="size-8" />
                  <div>
                    <p>SVG</p>
                    <p className="text-xs text-muted-foreground">
                      Best for editing in vector software
                    </p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Demo button to test budget depletion - moved to navbar */}
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => setBudgetAmountAvailable(0)}
            >
              Test Budget Depletion
            </Button>

            <UserButton />
          </div>
        </div>
      </nav>

      {/* Budget Depleted Overlay */}
      {budgetAmountAvailable === 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-sm w-full mx-4 flex flex-col items-center p-6 text-center">
            <CardHeader>
              <h2 className="text-xl font-bold mb-2">Budget Depleted</h2>
              <CardTitle className="text-6xl font-bold mb-4">$0</CardTitle>
              <p className="text-sm text-muted-foreground mb-6">
                Please add funds or continue with the free version.
              </p>
            </CardHeader>

            <CardContent className="w-full flex flex-col gap-4">
              <Button onClick={handleIncreaseBudget} className="w-full">
                Increase Budget
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setBudgetAmountAvailable(1)} // Set to 1 to remove overlay
              >
                Continue Free Version
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Set Budget Overlay */}
      {showBudgetOverlay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-sm w-full mx-4 flex flex-col items-center p-6">
            <CardHeader className="w-full">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold">Set Budget</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleCloseBudgetOverlay}
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>
            </CardHeader>

            <CardContent className="w-full">
              <div className="flex justify-center mb-4">
                {editing ? (
                  <Input
                    type="number"
                    value={amount}
                    onChange={handleInputChange}
                    autoFocus
                    className="w-32 text-center text-4xl font-bold"
                    min={1}
                  />
                ) : (
                  <div className="text-6xl font-bold text-center">${amount}</div>
                )}
              </div>
              
              <div className="flex gap-4 mb-4">
                <Button onClick={decrement} variant="outline" className="w-1/2">
                  -$1
                </Button>
                <Button onClick={increment} variant="outline" className="w-1/2">
                  +$1
                </Button>
              </div>
            </CardContent>

            <CardFooter className="w-full">
              <Button 
                onClick={editing ? handleConfirmBudgetFromOverlay : toggleEdit} 
                className="w-full"
              >
                {editing ? "Confirm" : "Edit"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  );
};