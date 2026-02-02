"use client";

import { useState, useCallback } from "react";
import {
  GitBranchIcon,
  CaretDownIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  SpinnerGapIcon,
  MonitorIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface BranchStatus {
  branch: string | null;
  uncommittedCount: number;
  commitsBehind: number;
  commitsAhead: number;
  hasRemote: boolean;
}

interface BranchSwitcherProps {
  projectId: string;
  branchStatus: BranchStatus;
  onRefreshStatus: () => void;
  onNeedsCommit: (targetBranch: string) => void;
}

interface BranchData {
  current: string | null;
  local: string[];
  remote: { name: string; tracking: string }[];
}

export function BranchSwitcher({
  projectId,
  branchStatus,
  onRefreshStatus,
  onNeedsCommit,
}: BranchSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<BranchData | null>(null);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [search, setSearch] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const loadBranches = useCallback(async () => {
    setLoadingBranches(true);
    try {
      const response = await fetch(
        `/api/git/branches?projectId=${projectId}`
      );
      if (response.ok) {
        const data = await response.json();
        setBranches(data);
      } else {
        toast.error("Failed to load branches");
      }
    } catch {
      toast.error("Failed to load branches");
    } finally {
      setLoadingBranches(false);
    }
  }, [projectId]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setSearch("");
      setNewBranchName("");
      loadBranches();
    }
  };

  const handleCheckout = async (branch: string, isRemote?: boolean) => {
    if (isCheckingOut) return;

    // Guard: uncommitted changes
    if (branchStatus.uncommittedCount > 0) {
      setOpen(false);
      onNeedsCommit(isRemote && branch.includes("/")
        ? branch.slice(branch.indexOf("/") + 1)
        : branch);
      return;
    }

    setIsCheckingOut(true);
    try {
      const response = await fetch("/api/git/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, branch, isRemote }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Switched to ${data.branch}`);
        setOpen(false);
        onRefreshStatus();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to switch branch");
      }
    } catch {
      toast.error("Failed to switch branch");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleCreateBranch = async () => {
    if (isCreating || !newBranchName.trim()) return;

    // Guard: uncommitted changes
    if (branchStatus.uncommittedCount > 0) {
      setOpen(false);
      onNeedsCommit(newBranchName.trim());
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/git/create-branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, branchName: newBranchName.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Created and switched to ${data.branch}`);
        setOpen(false);
        setNewBranchName("");
        onRefreshStatus();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create branch");
      }
    } catch {
      toast.error("Failed to create branch");
    } finally {
      setIsCreating(false);
    }
  };

  const filteredLocal =
    branches?.local.filter((b) =>
      b.toLowerCase().includes(search.toLowerCase())
    ) ?? [];
  const filteredRemote =
    branches?.remote.filter((b) =>
      b.name.toLowerCase().includes(search.toLowerCase())
    ) ?? [];

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-3 h-9">
          <GitBranchIcon weight="bold" className="size-4" />
          <span className="font-mono text-sm max-w-[150px] truncate">
            {branchStatus.branch || "detached"}
          </span>
          {isCheckingOut ? (
            <SpinnerGapIcon
              weight="bold"
              className="size-3 animate-spin"
            />
          ) : (
            <CaretDownIcon weight="bold" className="size-3" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px]">
        {/* Search input */}
        <div className="px-2 py-1.5">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-foreground/40" />
            <input
              type="text"
              placeholder="Filter branches..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              className="w-full h-7 pl-8 pr-3 bg-muted/50 border border-foreground/15 rounded-sm text-xs font-mono placeholder:text-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/30 focus:border-foreground/30 transition-colors"
            />
          </div>
        </div>

        {loadingBranches ? (
          <div className="px-2 py-3 text-sm text-muted-foreground font-mono text-center">
            Loading...
          </div>
        ) : (
          <>
            {/* Local branches */}
            {filteredLocal.length > 0 && (
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-mono text-xs uppercase tracking-wider">
                  Local
                </DropdownMenuLabel>
                {filteredLocal.map((branch) => (
                  <DropdownMenuItem
                    key={branch}
                    onClick={() => handleCheckout(branch)}
                    disabled={
                      branch === branchStatus.branch || isCheckingOut
                    }
                    className="gap-2 cursor-pointer"
                  >
                    {branch === branchStatus.branch ? (
                      <CheckIcon weight="bold" className="size-4" />
                    ) : (
                      <span className="size-4" />
                    )}
                    <span className="font-mono text-sm truncate">
                      {branch}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            )}

            {/* Remote branches */}
            {filteredRemote.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-mono text-xs uppercase tracking-wider">
                    Remote
                  </DropdownMenuLabel>
                  {filteredRemote.map((branch) => (
                    <DropdownMenuItem
                      key={branch.tracking}
                      onClick={() =>
                        handleCheckout(branch.tracking, true)
                      }
                      disabled={isCheckingOut}
                      className="gap-2 cursor-pointer"
                    >
                      <MonitorIcon
                        weight="bold"
                        className="size-4 text-muted-foreground"
                      />
                      <span className="font-mono text-sm truncate text-muted-foreground">
                        {branch.name}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </>
            )}

            {filteredLocal.length === 0 &&
              filteredRemote.length === 0 && (
                <div className="px-2 py-3 text-sm text-muted-foreground font-mono text-center">
                  No branches found
                </div>
              )}
          </>
        )}

        {/* Create branch */}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <DropdownMenuLabel className="font-mono text-xs uppercase tracking-wider px-0 mb-1">
            Create Branch
          </DropdownMenuLabel>
          <div className="flex gap-1">
            <input
              type="text"
              placeholder="new-branch-name"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") handleCreateBranch();
              }}
              className="flex-1 h-7 px-2 bg-muted/50 border border-foreground/15 rounded-sm text-xs font-mono placeholder:text-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/30 transition-colors"
            />
            <Button
              size="icon-sm"
              variant="secondary"
              onClick={(e) => {
                e.preventDefault();
                handleCreateBranch();
              }}
              disabled={isCreating || !newBranchName.trim()}
              className="h-7 w-7 shrink-0"
            >
              {isCreating ? (
                <SpinnerGapIcon weight="bold" className="size-3 animate-spin" />
              ) : (
                <PlusIcon weight="bold" className="size-3" />
              )}
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
