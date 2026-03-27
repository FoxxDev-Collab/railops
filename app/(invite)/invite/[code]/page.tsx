import { auth } from "@/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getInviteLinkInfo } from "@/app/actions/invite-links";
import { AcceptInviteButton } from "@/components/crew/accept-invite-button";

export default async function InviteLinkPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const info = await getInviteLinkInfo(code);

  if (!info) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Invalid Invite Link</h1>
        <p className="text-muted-foreground">This invite link is invalid or has been revoked.</p>
        <Button asChild><Link href="/auth/login">Go to Login</Link></Button>
      </div>
    );
  }

  if (info.paused || info.expired || info.maxedOut) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Invite Unavailable</h1>
        <p className="text-muted-foreground">
          {info.paused && "This invite link is currently paused."}
          {info.expired && "This invite link has expired."}
          {info.maxedOut && "This invite link has reached its maximum uses."}
        </p>
      </div>
    );
  }

  const session = await auth();

  if (!session) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Join {info.railroadName}</h1>
        <p className="text-muted-foreground">
          You&apos;ve been invited to join as a <strong>{info.roleName}</strong>.
        </p>
        <p className="text-sm text-muted-foreground">Log in or create an account to accept.</p>
        <div className="flex flex-col gap-2">
          <Button asChild><Link href={`/auth/login?callbackUrl=/invite/${code}`}>Log In</Link></Button>
          <Button variant="outline" asChild><Link href={`/auth/register?callbackUrl=/invite/${code}`}>Create Account</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4">
      <h1 className="text-2xl font-bold">Join {info.railroadName}</h1>
      <p className="text-muted-foreground">
        You&apos;ve been invited to join as a <strong>{info.roleName}</strong>.
      </p>
      {info.creatorName && (
        <p className="text-sm text-muted-foreground">Invited by {info.creatorName}</p>
      )}
      <AcceptInviteButton type="link" code={code} />
    </div>
  );
}
