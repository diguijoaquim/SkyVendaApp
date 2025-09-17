import { Redirect } from 'expo-router';

export default function MensagensScreen() {
  // Redirect to the chat list screen
  return <Redirect href="/chat" />;
}