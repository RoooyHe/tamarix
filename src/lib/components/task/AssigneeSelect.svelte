<script lang="ts">
  import type { MatrixClient } from "matrix-js-sdk";
  import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
  } from "$lib/components/ui/command";
  import {
    Popover,
    PopoverContent,
    PopoverTrigger
  } from "$lib/components/ui/popover";
  import { Avatar, AvatarFallback } from "$lib/components/ui/avatar";
  import { t } from "$lib/i18n";
  import { Check, ChevronsUpDown, X } from "@lucide/svelte";

  interface Props {
    client: MatrixClient;
    projectRoomId: string;
    value?: string;
    onValueChange?: (userId: string | undefined) => void;
    disabled?: boolean;
  }

  let {
    client,
    projectRoomId,
    value = $bindable<string | undefined>(undefined),
    onValueChange,
    disabled = false
  }: Props = $props();

  let open = $state(false);

  /** Get project room members */
  let members = $derived.by(() => {
    const room = client.getRoom(projectRoomId);
    if (!room) return [];
    return room.getJoinedMembers().map(m => ({
      userId: m.userId,
      name: m.name || m.userId,
      avatarUrl: m.user?.avatarUrl ?? undefined
    }));
  });

  /** Format a Matrix user ID for display: @user:domain -> user */
  function formatUserId(userId: string): string {
    const match = userId.match(/^@([^:]+):/);
    return match ? match[1] : userId;
  }

  /** Get initials from user ID */
  function getInitials(userId: string): string {
    return formatUserId(userId).slice(0, 2).toUpperCase();
  }

  function handleSelect(userId: string) {
    const newValue = userId === value ? undefined : userId;
    value = newValue;
    onValueChange?.(newValue);
    open = false;
  }

  function handleClear(e: MouseEvent) {
    e.stopPropagation();
    value = undefined;
    onValueChange?.(undefined);
  }
</script>

<Popover bind:open>
  <PopoverTrigger>
    <button
      class="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      role="combobox"
      aria-expanded={open}
    >
      {#if value}
        <Avatar class="h-4 w-4 text-[7px]">
          <AvatarFallback>{getInitials(value)}</AvatarFallback>
        </Avatar>
        <span>{formatUserId(value)}</span>
        <button
          class="ml-1 rounded-sm opacity-70 hover:opacity-100"
          onclick={handleClear}
          tabindex={-1}
        >
          <X class="h-3 w-3" />
        </button>
      {:else}
        <span class="text-muted-foreground">{t("task.assignee")}</span>
      {/if}
      <ChevronsUpDown class="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
    </button>
  </PopoverTrigger>
  <PopoverContent class="w-[220px] p-0" align="start">
    <Command>
      <CommandInput placeholder={t("search.search_tasks")} />
      <CommandList>
        <CommandEmpty>{t("common.no_results")}</CommandEmpty>
        <CommandGroup>
          {#each members as member (member.userId)}
            <CommandItem
              value={member.userId}
              onSelect={() => handleSelect(member.userId)}
            >
              <Check
                class="mr-2 h-4 w-4 {value === member.userId ? 'opacity-100' : 'opacity-0'}"
              />
              <Avatar class="mr-2 h-5 w-5 text-[8px]">
                <AvatarFallback>{getInitials(member.userId)}</AvatarFallback>
              </Avatar>
              <span class="truncate">{member.name}</span>
            </CommandItem>
          {/each}
        </CommandGroup>
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
