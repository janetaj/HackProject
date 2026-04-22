import { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useJiraTickets, useSyncJiraTickets } from '@/queries/useJiraTickets';
import { useQueueGeneration } from '@/queries/useGenerationQueue';
import { JiraTicket } from '@/types/jira.types';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { RefreshCw, Ticket, FileCode2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { toast } from 'sonner';

export function JiraTicketsPage() {
  const [page] = useState(1);
  const pageSize = 10;
  
  const { data, isLoading, isError, error } = useJiraTickets({ page, pageSize });
  const { mutate: syncTickets, isPending: isSyncing } = useSyncJiraTickets();
  const { mutate: queueJob, isPending: isQueuing } = useQueueGeneration();

  const handleGenerate = (ticketId: string) => {
    queueJob(ticketId, {
      onSuccess: () => toast.success('Generation job queued successfully'),
      onError: () => toast.error('Failed to queue generation job'),
    });
  };

  const columns: ColumnDef<JiraTicket>[] = [
    {
      accessorKey: 'jiraKey',
      header: 'Ticket Key',
      cell: ({ row }) => <span className="font-medium">{row.getValue('jiraKey')}</span>,
    },
    {
      accessorKey: 'summary',
      header: 'Summary',
      cell: ({ row }) => <div className="max-w-[400px] truncate" title={row.getValue('summary')}>{row.getValue('summary')}</div>,
    },
    {
      accessorKey: 'project',
      header: 'Project',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.getValue('status') as string} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => handleGenerate(row.original.id)} 
          disabled={isQueuing}
          className="text-primary hover:text-primary"
        >
          <FileCode2 className="mr-2 h-4 w-4" />
          Generate
        </Button>
      )
    }
  ];

  const handleSync = () => {
    syncTickets(undefined, {
      onSuccess: (res) => toast.success(res.message || 'Sync initiated'),
      onError: () => toast.error('Failed to sync Jira tickets')
    });
  };

  const actions = (
    <Button onClick={handleSync} disabled={isSyncing || isLoading} size="sm" variant="outline">
      <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
      Sync Tickets
    </Button>
  );

  return (
    <PageContainer 
      title="Jira Tickets" 
      description="Select ready tickets to generate test cases autonomously."
      actions={actions}
    >
      {isLoading ? (
        <LoadingSpinner label="Fetching tickets from backend..." />
      ) : isError ? (
        <div className="p-4 text-center text-destructive">Error loading tickets: {(error as Error).message}</div>
      ) : !data?.data?.length ? (
        <EmptyState 
          icon={Ticket} 
          title="No Jira tickets found" 
          description="We couldn't find any tickets matching your criteria or linked to your configured projects."
          action={<Button onClick={handleSync}>Sync from Jira</Button>}
        />
      ) : (
        <DataTable columns={columns} data={data.data} />
      )}
    </PageContainer>
  );
}
