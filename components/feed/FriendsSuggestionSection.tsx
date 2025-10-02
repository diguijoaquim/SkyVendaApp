import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import FriendSuggestionCard from './items/FriendSuggestionCard';

interface FriendSuggestion {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
  cover: string | null;
  is_pro: boolean;
  time_joined: string;
  following: boolean;
  followers: number;
}

interface FriendsSuggestionSectionProps {
  friends: FriendSuggestion[];
  onFollow?: (friendId: number) => void;
  onViewProfile?: (friendId: number) => void;
  onSeeAll?: () => void;
}

export default function FriendsSuggestionSection({ 
  friends, 
  onFollow, 
  onViewProfile, 
  onSeeAll 
}: FriendsSuggestionSectionProps) {
  if (!friends || friends.length === 0) {
    return null;
  }

  const renderFriend = ({ item }: { item: FriendSuggestion }) => (
    <FriendSuggestionCard
      friend={item}
      onFollow={onFollow}
      onViewProfile={onViewProfile}
    />
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="people" size={20} color="#8B5CF6" />
          <Text style={styles.title}>Sugestões para você</Text>
        </View>
        <Text style={styles.subtitle}>
          {friends.length} pessoas para conhecer
        </Text>
      </View>

      {/* Friends List */}
      <FlatList
        data={friends}
        renderItem={renderFriend}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ItemSeparatorComponent={() => <View style={{ width: 0 }} />}
      />

      {/* See All Button */}
      <View style={styles.footer}>
        <Text style={styles.seeAllText} onPress={onSeeAll}>
          Ver todas as sugestões
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginVertical: 8,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 28,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  footer: {
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
    textDecorationLine: 'underline',
  },
});
