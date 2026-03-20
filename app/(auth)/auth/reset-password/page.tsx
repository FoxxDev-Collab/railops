import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Reset Password</CardTitle>
      </CardHeader>
      <CardContent>
        <Suspense
          fallback={
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
