import { useAuth } from '@/contexts/AuthContext';
import { postJson } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface NewPostDialogProps {
  visible: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
}

export default function NewPostDialog({ visible, onClose, onPostCreated }: NewPostDialogProps) {
  const { user, token, isAuthenticated } = useAuth();
  const [publicationText, setPublicationText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Gradient styles array (similar to web)
  const gradientStyles = [
    'bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600',
    'bg-gradient-to-r from-green-500 via-teal-500 to-blue-500',
    'bg-gradient-to-r from-orange-500 via-red-500 to-pink-500',
    'bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500',
    'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500'
  ];

  // Function to get random gradient style
  const getRandomGradient = () => {
    const randomIndex = Math.floor(Math.random() * gradientStyles.length);
    return gradientStyles[randomIndex];
  };

  const handleSubmit = useCallback(async () => {
    if (!isAuthenticated) {
      Alert.alert('Atenção', 'Precisa fazer login para publicar');
      return;
    }

    if (!publicationText.trim()) {
      Alert.alert('Campo vazio', 'Por favor, escreva algo para publicar.');
      return;
    }

    if (publicationText.trim().split(' ').length > 10) {
      Alert.alert('Texto muito longo', 'A publicação não pode ter mais de 10 palavras.');
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new URLSearchParams();
      formData.append('conteudo', publicationText.trim());
      formData.append('gradient_style', getRandomGradient());

      await postJson('/publicacoes/form', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      Alert.alert('Sucesso!', 'Sua publicação foi criada com sucesso.');
      
      // Reset form
      setPublicationText('');
      onClose();
      
      // Notify parent component
      if (onPostCreated) {
        onPostCreated();
      }
    } catch (error: any) {
      console.error('Error creating publication:', error);
      Alert.alert(
        'Erro ao publicar', 
        error?.response?.data?.detail || 'Não foi possível criar a publicação.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [isAuthenticated, publicationText, token, onClose, onPostCreated]);

  const handleClose = useCallback(() => {
    if (publicationText.trim() && !isSubmitting) {
      Alert.alert(
        'Descartar publicação',
        'Tem certeza que deseja descartar esta publicação?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Descartar', 
            style: 'destructive',
            onPress: () => {
              setPublicationText('');
              onClose();
            }
          }
        ]
      );
    } else {
      setPublicationText('');
      onClose();
    }
  }, [publicationText, isSubmitting, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Criar publicação</Text>
          <TouchableOpacity 
            onPress={handleSubmit}
            disabled={isSubmitting || !publicationText.trim()}
            style={[
              styles.publishButton,
              (!publicationText.trim() || isSubmitting) && styles.publishButtonDisabled
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.publishButtonText}>Publicar</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* User info */}
          <View style={styles.userInfo}>
            <Image
              source={{ 
                uri: user?.perfil || user?.avatar || 'https://via.placeholder.com/40x40?text=U' 
              }}
              style={styles.avatar}
            />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user?.name || user?.username || 'Usuário'}</Text>
              <View style={styles.privacyBadge}>
                <Ionicons name="globe-outline" size={12} color="#6B7280" />
                <Text style={styles.privacyText}>Público</Text>
              </View>
            </View>
          </View>

          {/* Text input */}
          <View style={styles.inputContainer}>
            <TextInput
              value={publicationText}
              onChangeText={setPublicationText}
              placeholder="Em que estás a pensar?"
              placeholderTextColor="#9CA3AF"
              style={styles.textInput}
              multiline
              textAlignVertical="top"
              maxLength={100}
              autoFocus
            />
            <Text style={styles.characterCount}>
              {publicationText.length}/100
            </Text>
          </View>

          {/* Features */}
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>Adicionar à sua publicação</Text>
            
            <TouchableOpacity style={styles.featureButton}>
              <Ionicons name="camera-outline" size={20} color="#6B7280" />
              <Text style={styles.featureText}>Foto</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.featureButton}>
              <Ionicons name="videocam-outline" size={20} color="#6B7280" />
              <Text style={styles.featureText}>Vídeo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.featureButton}>
              <Ionicons name="location-outline" size={20} color="#6B7280" />
              <Text style={styles.featureText}>Localização</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.featureButton}>
              <Ionicons name="happy-outline" size={20} color="#6B7280" />
              <Text style={styles.featureText}>Sentimento</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  publishButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  publishButtonDisabled: {
    backgroundColor: '#C4B5FD',
  },
  publishButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  privacyText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  inputContainer: {
    marginBottom: 24,
  },
  textInput: {
    fontSize: 18,
    color: '#111827',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 8,
  },
  featuresContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  featureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 12,
  },
});
