import { CheckEmailForm } from "@/components/auth/check-email-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function CheckEmailPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Check Your Email</CardTitle>
        <CardDescription>
          We sent a verification link to your email address. Click the link to
          activate your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CheckEmailForm />
      </CardContent>
    </Card>
  );
}
