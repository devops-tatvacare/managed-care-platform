export function getStatusBadgeClass(status: string): string {
  const s = (status || '').toLowerCase()
  if (/(approved|reimbursed|active)/.test(s)) {
    return 'bg-green-100 text-green-800 border border-green-200'
  }
  if (/(rejected|inactive)/.test(s)) {
    return 'bg-red-100 text-red-700 border border-red-200'
  }
  if (/(pending|waiting)/.test(s)) {
    return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
  }
  if (/(under review|submitted|in progress|review)/.test(s)) {
    return 'bg-blue-100 text-blue-800 border border-blue-200'
  }
  return 'bg-gray-100 text-gray-700 border border-gray-200'
}

