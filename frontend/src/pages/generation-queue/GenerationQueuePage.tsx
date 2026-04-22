
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useGenerationQueue } from '@/queries/useGenerationQueue';
import { GenerationJob } from '@/types/generation.types';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { ListTodo, RefreshCw, XCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';

export const queueColumns: ColumnDef<GenerationJob>[] = [
  {
    accessorKey: 'ticket_key',
    header: 'Ticket',
    cell: ({ row }) => <span className="font-semibold">{row.getValue('ticket_key')}</span>,
  },
  {
    accessorKey: 'stage',
    header: 'Stage',
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('stage') || 'Waiting...'}</span>,
  },
  {
    accessorKey: 'progress',
    header: 'Progress',
    cell: ({ row }) => {
      const p = row.getValue('progress') as number;
      return (
        <div className="flex items-center gap-2">
          <div className="w-full bg-secondary rounded-full h-2">
            <div className="bg-primary h-2 rounded-full transition-all duration-500 ease-in-out" style={{ width: `${p}%` }} />
          </div>
          <span className="text-xs">{p}%</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return (
        <div className="flex items-center gap-2">
          {status === 'failed' && (
            <Button variant="outline" size="sm" onClick={() => console.log('retry', row.original.id)}>
              <RefreshCw className="mr-2 h-3 w-3" /> Retry
            </Button>
          )}
          {status === 'in_progress' && (
            <Button variant="ghost" size="sm" className="text-destructive h-8 px-2" onClick={() => console.log('cancel', row.original.id)}>
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      );
    }
  }
];

export function GenerationQueuePage() {
  const { data, isLoading, isError, error } = useGenerationQueue();

  return (
    <PageContainer 
      title="Generation Queue" 
      description="Monitor the real-time progress of autonomous test case generation."
    >
      {isLoading ? (
        <LoadingSpinner label="Validating queue..." />
      ) : isError ? (
        <div className="p-4 text-center text-destructive">Error loading queue: {(error as Error).message}</div>
      ) : !data?.data?.length ? (
        <EmptyState 
          icon={ListTodo} 
          title="Queue is empty" 
          description="There are currently no active or pending generation jobs."
        />
      ) : (
        <DataTable columns={queueColumns} data={data.data} />
      )}
    </PageContainer>
  );
}
