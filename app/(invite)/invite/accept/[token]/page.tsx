import { auth } from "@/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getInviteInfo } from "@/app/actions/crew";
import { AcceptInviteButton } from "@/components/crew/accept-invite-button";

export default async function AcceptEmailInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const info = await getInviteInfo(token);

  if (!info) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Invalid Invitation</h1>
        <p className="text-muted-foreground">This invitation is invalid or has expired.</p>
        <Button asChild><Link href="/auth/login">Go to Login</Link></Button>
      </div>
    );
  }

  if (info.alreadyAccepted) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Already Accepted</h1>
        <p className="text-muted-foreground">You&apos;ve already accepted this invitation.</p>
        <Button asChild><Link href="/dashboard">Go to Dashboard</Link></Button>
      </div>
    );
  }

  const session = await auth();

  if (!session) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Join {info.railroadName}</h1>
        <p className="text-muted-foreground">
          {info.inviterName || "Someone"} invited you to join as a <strong>{info.roleName}</strong>.
        </p>
        <div className="flex flex-col gap-2">
          <Button asChild><Link href={`/auth/login?callbackUrl=/invite/accept/${token}`}>Log In</Link></Button>
          <Button variant="outline" asChild><Link href={`/auth/register?callbackUrl=/invite/accept/${token}`}>Create Account</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4">
      <h1 className="text-2xl font-bold">Join {info.railroadName}</h1>
      <p className="text-muted-foreground">
        {info.inviterName || "Someone"} invited you to join as a <strong>{info.roleName}</strong>.
      </p>
      <AcceptInviteButton type="email" token={token} />
    </div>
  );
}
