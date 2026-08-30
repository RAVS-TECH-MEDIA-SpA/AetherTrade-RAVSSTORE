// src/app/loading.tsx
export default function GlobalLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-white">
      <div className="flex flex-col items-center space-y-4">
        {/* Spinner animado usando Tailwind puro */}
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
        <p className="text-sm font-medium text-gray-500 animate-pulse">
          Cargando ...
        </p>
      </div>
    </div>
  );
}