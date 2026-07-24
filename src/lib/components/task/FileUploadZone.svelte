<script lang="ts">
	import type { MatrixClient } from 'matrix-js-sdk';
	import { upload, validate, type UploadResult } from '$lib/file-service';
	import { t } from '$lib/i18n';
	import { Button } from '$lib/components/ui/button';
	import { Upload, X, FileIcon } from '@lucide/svelte';

	interface Props {
		/** Matrix client for uploading */
		client: MatrixClient;
		/** Whether upload is disabled */
		disabled?: boolean;
		/** Custom max file size (default 50MB) */
		maxFileSize?: number;
		/** Callback when all files finish uploading */
		onupload: (results: UploadResult[]) => void;
		/** Callback on upload error */
		onerror?: (error: string) => void;
	}

	let { client, disabled = false, maxFileSize, onupload, onerror }: Props = $props();

	let isDragging = $state(false);
	let isUploading = $state(false);
	let uploadProgress = $state(0);
	let uploadError = $state<string | null>(null);
	let pendingFiles = $state<File[]>([]);

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		if (!disabled && !isUploading) {
			isDragging = true;
		}
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		if (disabled || isUploading) return;

		const files = e.dataTransfer?.files;
		if (files && files.length > 0) {
			processFiles(Array.from(files));
		}
	}

	function handleFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			processFiles(Array.from(input.files));
			input.value = '';
		}
	}

	async function processFiles(files: File[]) {
		// Validate all files first
		const validFiles: File[] = [];
		for (const file of files) {
			const result = validate(file, undefined, maxFileSize);
			if (!result.valid) {
				uploadError = result.error ?? t('attachments.validation_failed');
				onerror?.(result.error ?? t('attachments.validation_failed'));
				return;
			}
			validFiles.push(file);
		}

		pendingFiles = validFiles;
		uploadError = null;
		isUploading = true;
		uploadProgress = 0;

		try {
			const results: UploadResult[] = [];
			for (let i = 0; i < validFiles.length; i++) {
				const result = await upload(client, validFiles[i], {
					maxSize: maxFileSize,
					onProgress: (sent, total) => {
						uploadProgress = Math.round(((i + sent / total) / validFiles.length) * 100);
					}
				});
				results.push(result);
			}
			uploadProgress = 100;
			onupload(results);
		} catch (e) {
			const msg = e instanceof Error ? e.message : t('attachments.upload_failed');
			uploadError = msg;
			onerror?.(msg);
		} finally {
			isUploading = false;
			pendingFiles = [];
			uploadProgress = 0;
		}
	}

	function clearError() {
		uploadError = null;
	}
</script>

<div class="space-y-2">
	<!-- Drop zone -->
	<div
		class="relative rounded-lg border-2 border-dashed transition-colors {isDragging
			? 'border-primary bg-primary/5'
			: 'border-border hover:border-muted-foreground/50'} {isUploading
			? 'pointer-events-none opacity-60'
			: ''}"
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
		role="button"
		tabindex={0}
	>
		<label class="flex flex-col items-center justify-center gap-2 py-6 px-4 cursor-pointer">
			<Upload class="h-8 w-8 text-muted-foreground" />
			<span class="text-sm text-muted-foreground">
				{#if isUploading}
					{t('attachments.uploading', { progress: uploadProgress })}
				{:else}
					{t('attachments.upload_hint')}
				{/if}
			</span>
			<input type="file" multiple class="hidden" onchange={handleFileInput} {disabled} />
		</label>

		<!-- Progress bar -->
		{#if isUploading}
			<div class="absolute bottom-0 left-0 right-0 h-1 bg-muted">
				<div
					class="h-full bg-primary transition-all duration-300"
					style="width: {uploadProgress}%"
				></div>
			</div>
		{/if}
	</div>

	<!-- Pending files list -->
	{#if pendingFiles.length > 0 && isUploading}
		<div class="space-y-1">
			{#each pendingFiles as file}
				<div class="flex items-center gap-2 text-xs text-muted-foreground">
					<FileIcon class="h-3 w-3 shrink-0" />
					<span class="truncate">{file.name}</span>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Error -->
	{#if uploadError}
		<div class="flex items-center gap-2 text-sm text-destructive">
			<span class="flex-1">{uploadError}</span>
			<Button variant="ghost" size="sm" onclick={clearError}>
				<X class="h-3 w-3" />
			</Button>
		</div>
	{/if}
</div>
