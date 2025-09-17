import { Redirect } from 'expo-router';

export default function ChatIndex() {
  // Redirect to the chat list screen
  return <Redirect href="/(chat)" />;
}
