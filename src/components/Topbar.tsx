type TopbarProps = {
  title: string;
};

export function Topbar({ title }: TopbarProps) {
  return (
    <header className="flex items-center justify-between gap-5 border-b border-[color:var(--outline)] bg-[color:var(--bg)] px-5">
      <div className="flex items-center gap-6">
        <h2 className="m-0 text-base font-bold tracking-tight">{title}</h2>
      </div>
    </header>
  );
}
