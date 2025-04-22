export function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 border-b">
              <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="p-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="mb-2">
                  <div className="h-3 w-1/4 mb-1 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
