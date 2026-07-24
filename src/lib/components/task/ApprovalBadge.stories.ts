import type { Meta, StoryObj } from '@storybook/svelte';
import ApprovalBadge from './ApprovalBadge.svelte';

const meta = {
	title: 'Task/ApprovalBadge',
	component: ApprovalBadge,
	tags: ['autodocs'],
	argTypes: {
		status: {
			control: 'select',
			options: ['pending', 'approved', 'rejected']
		}
	}
} satisfies Meta<ApprovalBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pending: Story = {
	args: {
		status: 'pending'
	}
};

export const Approved: Story = {
	args: {
		status: 'approved'
	}
};

export const Rejected: Story = {
	args: {
		status: 'rejected'
	}
};
