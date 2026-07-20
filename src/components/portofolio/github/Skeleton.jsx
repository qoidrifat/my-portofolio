export function SkeletonLine({ width = '100%', height = '14px', className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-white/[0.04] ${className}`}
      style={{ width, height }}
    />
  );
}

export function RepoSkeleton() {
  return (
    <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
      <div className="flex items-center gap-2.5 mb-3">
        <SkeletonLine width="16px" height="16px" />
        <SkeletonLine width="50%" height="16px" />
      </div>
      <SkeletonLine width="100%" height="32px" className="mb-4" />
      <div className="flex items-center gap-4 mb-3">
        <SkeletonLine width="60px" height="12px" />
        <SkeletonLine width="40px" height="12px" />
        <SkeletonLine width="40px" height="12px" />
      </div>
      <div className="flex gap-1.5">
        <SkeletonLine width="50px" height="20px" />
        <SkeletonLine width="60px" height="20px" />
      </div>
    </div>
  );
}
