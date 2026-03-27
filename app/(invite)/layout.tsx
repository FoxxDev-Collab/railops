export default function InviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-content bg-background">
      <div className="w-full max-w-md mx-auto p-8">{children}</div>
    </div>
  );
}
