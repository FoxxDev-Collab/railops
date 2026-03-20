import { Suspense } from "react";
import { VerifyEmailResult } from "@/components/auth/verify-email-result";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Email Verification</CardTitle>
      </CardHeader>
      <CardContent>
        <Suspense
          fallback={
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <VerifyEmailResult />
        </Suspense>
      </CardContent>
    </Card>
  );
}
