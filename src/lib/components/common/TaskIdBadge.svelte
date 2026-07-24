<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';

	interface Props {
		ticketId: string;
	}

	let { ticketId }: Props = $props();
</script>

<Badge variant="outline" class="font-mono text-xs">{ticketId}</Badge>
