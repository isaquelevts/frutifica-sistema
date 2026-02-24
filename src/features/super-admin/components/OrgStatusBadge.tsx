import React from 'react';

type Status = 'active' | 'past_due' | 'canceled' | 'trialing' | 'suspended' | string;

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: 'Ativa', className: 'bg-green-100 text-green-700 border border-green-200' },
  trialing: { label: 'Trial', className: 'bg-blue-100 text-blue-700 border border-blue-200' },
  past_due: { label: 'Inadimplente', className: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
  canceled: { label: 'Cancelada', className: 'bg-slate-100 text-slate-600 border border-slate-200' },
  suspended: { label: 'Suspensa', className: 'bg-red-100 text-red-700 border border-red-200' },
};

interface OrgStatusBadgeProps {
  status?: Status;
}

const OrgStatusBadge: React.FC<OrgStatusBadgeProps> = ({ status = 'active' }) => {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-slate-100 text-slate-600 border border-slate-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
};

export default OrgStatusBadge;
