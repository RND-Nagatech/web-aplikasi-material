type TableFetchProgressProps = {
  loading: boolean;
};

export function TableFetchProgress({ loading }: TableFetchProgressProps) {
  return (
    <div className="h-0.5 w-full bg-transparent" aria-hidden="true">
      {loading ? <div className="h-full w-full animate-pulse bg-primary/60" /> : null}
    </div>
  );
}

