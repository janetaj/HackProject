import { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { toast } from 'sonner';
import { TestCase } from '@/types/test-case.types';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { FileCheck2, Edit, CheckCircle, XCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { useTestCases, useApproveTestCase, useRejectTestCase, useUpdateTestCase } from '@/queries/useTestCases';
import { TestCaseEditModal } from './components/TestCaseEditModal';

export function TestCasesPage() {
  const [page] = useState(1);
  const pageSize = 10;
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const { data, isLoading, isError, error } = useTestCases({ page, pageSize });
  const { mutate: approveTestCase, isPending: isApproving } = useApproveTestCase();
  const { mutate: rejectTestCase, isPending: isRejecting } = useRejectTestCase();
  const { mutate: updateTestCase, isPending: isUpdating } = useUpdateTestCase();

  const handleEdit = (testCase: TestCase) => {
    setSelectedTestCase(testCase);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (id: string, updateData: Partial<TestCase>) => {
    updateTestCase({ id, data: updateData }, {
      onSuccess: () => {
        toast.success('Test case updated successfully');
        setIsEditModalOpen(false);
      },
      onError: () => toast.error('Failed to update test case'),
    });
  };

  const handleApprove = (id: string) => {
    approveTestCase(id, {
      onSuccess: () => toast.success('Test case approved successfully'),
      onError: () => toast.error('Failed to approve test case'),
    });
  };

  const handleReject = (id: string) => {
    const reason = window.prompt('Please enter a reason for rejection:');
    if (reason) {
      rejectTestCase({ id, reason }, {
        onSuccess: () => toast.success('Test case rejected'),
        onError: () => toast.error('Failed to reject test case'),
      });
    }
  };

  const columns: ColumnDef<TestCase>[] = [
    {
      accessorKey: 'ticket_key',
      header: 'Ticket Link',
      cell: ({ row }) => <span className="font-medium text-primary hover:underline cursor-pointer">{row.getValue('ticket_key')}</span>,
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => <div className="max-w-[300px] truncate" title={row.getValue('title')}>{row.getValue('title')}</div>,
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => <PriorityBadge priority={row.getValue('priority')} />,
    },
    {
      accessorKey: 'status',
      header: 'Review Status',
      cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const id = row.original.id;
        const status = row.original.status;
        const isProcessable = status === 'pending_review';

        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" title="Edit/Review" onClick={() => handleEdit(row.original)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-green-600 hover:text-green-700 disabled:opacity-30" 
              title="Approve"
              onClick={() => handleApprove(id)}
              disabled={isApproving || isRejecting || isUpdating || !isProcessable}
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-red-600 hover:text-red-700 disabled:opacity-30" 
              title="Reject"
              onClick={() => handleReject(id)}
              disabled={isApproving || isRejecting || isUpdating || !isProcessable}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <PageContainer 
      title="Test Cases Repository" 
      description="Review, modify, and export AI-generated test scenarios."
    >
      {isLoading ? (
        <LoadingSpinner label="Loading test cases..." />
      ) : isError ? (
        <div className="p-4 text-center text-destructive">Error loading test cases: {(error as Error).message}</div>
      ) : !data?.data?.length ? (
        <EmptyState 
          icon={FileCheck2} 
          title="No Test Cases Available" 
          description="Test cases will appear here once generated from Jira tickets."
        />
      ) : (
        <DataTable columns={columns} data={data.data} />
      )}

      <TestCaseEditModal 
        isOpen={isEditModalOpen}
        testCase={selectedTestCase}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEdit}
        isSaving={isUpdating}
      />
    </PageContainer>
  );
}
