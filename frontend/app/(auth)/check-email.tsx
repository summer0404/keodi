import AlertScreen from '@/components/ui/AlertScreen';
import { useRouter } from 'expo-router';

export default function CheckEmailScreen() {
  const router = useRouter();
  return (
    <AlertScreen
      heading="auth.checkYourEmail"
      description="auth.verificationEmail"
      primaryButtonText="auth.backToLogin"
      primaryButtonAction={() => router.replace('/login')}
      secondaryButtonText="auth.resendEmail"
      secondaryButtonAction={() => router.replace('/login')}
    />
  );
}
