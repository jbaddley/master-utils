export default function SwimLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="swim-app">
      <main className="swim-main">{children}</main>
    </div>
  );
}
