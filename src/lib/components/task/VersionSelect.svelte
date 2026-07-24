<script lang="ts">
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import type { VersionInfo } from '$lib/matrix/types';

	interface Props {
		versions: VersionInfo[];
		value?: string | null;
		onValueChange?: (versionKey: string | null) => void;
	}

	let { versions, value, onValueChange }: Props = $props();

	function handleChange(val: string) {
		if (val === '__none__') {
			onValueChange?.(null);
		} else {
			onValueChange?.(val);
		}
	}
</script>

<Select type="single" value={value ?? '__none__'} onValueChange={handleChange}>
	<SelectTrigger class="h-7 text-xs w-[160px]">
		<span
			>{versions.find((v) => v.name === (value ?? '__none__'))?.name ??
				t('version.unversioned')}</span
		>
	</SelectTrigger>
	<SelectContent>
		<SelectItem value="__none__">{t('version.unversioned')}</SelectItem>
		{#each versions as v}
			<SelectItem value={v.name}>{v.name}</SelectItem>
		{/each}
	</SelectContent>
</Select>
