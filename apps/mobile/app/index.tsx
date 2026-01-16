import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/auth';

export default function WelcomeScreen() {
  const router = useRouter();
  const { isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.logo}>Hopefull</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>Hopefull</Text>
        <Text style={styles.tagline}>Your mental wellness journey starts here</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Connect with licensed therapists</Text>
        <Text style={styles.subtitle}>
          Book sessions, video calls, and get the support you need — anytime, anywhere.
        </Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.button, styles.userButton]}
          onPress={() => router.push('/auth/register?role=USER')}
        >
          <Text style={styles.buttonText}>I'm looking for a therapist</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.therapistButton]}
          onPress={() => router.push('/auth/register?role=THERAPIST')}
        >
          <Text style={[styles.buttonText, styles.therapistButtonText]}>
            I'm a therapist
          </Text>
        </TouchableOpacity>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <Link href="/auth/login" asChild>
            <TouchableOpacity>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttons: {
    gap: 16,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  userButton: {
    backgroundColor: '#4F46E5',
  },
  therapistButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4F46E5',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  therapistButtonText: {
    color: '#4F46E5',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginText: {
    fontSize: 14,
    color: '#6B7280',
  },
  loginLink: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
  },
});
