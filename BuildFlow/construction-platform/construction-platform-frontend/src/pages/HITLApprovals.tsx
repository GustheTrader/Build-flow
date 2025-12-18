import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { aiAgents } from '../lib/api';

export default function HITLApprovals() {
  const [requests, setRequests] = useState<any[]>([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const loadRequests = async () => {
    try {
      const res = await aiAgents.getHITLRequests(filter === 'all' ? undefined : filter);
      setRequests(res.data || []);
    } catch (error) {
      console.error('Error loading HITL requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string, notes: string) => {
    try {
      await aiAgents.approveHITL(id, notes);
      loadRequests();
    } catch (error: any) {
      alert('Error approving request: ' + error.message);
    }
  };

  const handleReject = async (id: string, notes: string) => {
    try {
      await aiAgents.rejectHITL(id, notes);
      loadRequests();
    } catch (error: any) {
      alert('Error rejecting request: ' + error.message);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading approvals...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">HITL Approvals</h1>
        <p className="mt-2 text-gray-600">Review and approve AI agent recommendations</p>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['pending', 'approved', 'rejected', 'all'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                filter === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No {filter === 'all' ? '' : filter} requests found</p>
          </div>
        ) : (
          requests.map((request) => (
            <HITLRequestCard
              key={request.id}
              request={request}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))
        )}
      </div>
    </div>
  );
}

function HITLRequestCard({ request, onApprove, onReject }: any) {
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [notes, setNotes] = useState('');

  const { recommendation } = request;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.8) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = () => {
    switch (request.status) {
      case 'approved':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-6 w-6 text-red-600" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-orange-600" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          {getStatusIcon()}
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-gray-900">
              {recommendation.agentType.replace('_', ' ').toUpperCase()} Agent
            </h3>
            <p className="text-sm text-gray-500">
              {new Date(request.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">Confidence</div>
          <div className={`text-2xl font-bold ${getConfidenceColor(recommendation.confidence)}`}>
            {(recommendation.confidence * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-sm font-medium text-gray-700 mb-1">Recommendation</div>
          <div className="bg-gray-50 rounded p-3">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap">
              {JSON.stringify(recommendation.recommendation, null, 2)}
            </pre>
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-gray-700 mb-1">Reasoning</div>
          <div className="bg-blue-50 rounded p-3">
            <p className="text-sm text-gray-800">{recommendation.reasoning}</p>
          </div>
        </div>

        {recommendation.metadata && Object.keys(recommendation.metadata).length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Metadata</div>
            <div className="bg-gray-50 rounded p-3">
              <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                {JSON.stringify(recommendation.metadata, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {request.reviewerNotes && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Reviewer Notes</div>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-sm text-gray-800">{request.reviewerNotes}</p>
              <p className="text-xs text-gray-500 mt-2">
                Reviewed by {request.reviewerId} at {new Date(request.reviewedAt).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {request.status === 'pending' && (
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => setShowRejectDialog(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Reject
            </button>
            <button
              onClick={() => setShowApprovalDialog(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Approve
            </button>
          </div>
        )}
      </div>

      {/* Approval Dialog */}
      {showApprovalDialog && (
        <ApprovalDialog
          title="Approve Recommendation"
          onConfirm={() => {
            onApprove(request.id, notes);
            setShowApprovalDialog(false);
            setNotes('');
          }}
          onCancel={() => {
            setShowApprovalDialog(false);
            setNotes('');
          }}
          notes={notes}
          setNotes={setNotes}
        />
      )}

      {/* Reject Dialog */}
      {showRejectDialog && (
        <ApprovalDialog
          title="Reject Recommendation"
          onConfirm={() => {
            onReject(request.id, notes);
            setShowRejectDialog(false);
            setNotes('');
          }}
          onCancel={() => {
            setShowRejectDialog(false);
            setNotes('');
          }}
          notes={notes}
          setNotes={setNotes}
          isReject={true}
        />
      )}
    </div>
  );
}

function ApprovalDialog({ title, onConfirm, onCancel, notes, setNotes, isReject }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Add any notes about your decision..."
          />
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-lg ${
              isReject ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
