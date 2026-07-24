<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { t } from '$lib/i18n';
	import type { ApprovalStatus } from '$lib/matrix/types';

	interface Props {
		status: ApprovalStatus;
		currentApprovals?: number;
		requiredApprovals?: number;
		size?: 'sm' | 'md';
	}

	let { status, currentApprovals, requiredApprovals, size = 'sm' }: Props = $props();

	const variantMap: Record<ApprovalStatus, 'default' | 'destructive' | 'outline'> = {
		approved: 'default',
		rejected: 'destructive',
		pending: 'outline'
	};

	const labelMap: Record<ApprovalStatus, string> = {
		pending: t('approval.status.pending'),
		approved: t('approval.status.approved'),
		rejected: t('approval.status.rejected')
	};
</script>

<Badge variant={variantMap[status]} class={size === 'sm' ? 'text-[10px]' : 'text-xs'}>
	{labelMap[status]}
	{#if currentApprovals !== undefined && requiredApprovals !== undefined}
		<span class="ml-1 opacity-70">{currentApprovals}/{requiredApprovals}</span>
	{/if}
</Badge>
