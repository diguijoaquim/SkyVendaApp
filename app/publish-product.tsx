import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  KeyboardAvoidingView,
  StyleSheet,
  Modal,
  StatusBar,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { postMultipart, BASE_URL } from '../services/api';
import { CATEGORIES, SUBCATEGORIES, PROVINCIAS, DISTRITOS, ESTADOS } from '../data/consts';
import { useAuth } from '../contexts/AuthContext';

interface ImageItem {
  id: string;
  uri: string;
}

export default function PublishProductScreen() {
  const { token, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<{title: string, data: string[], onSelect: (item: string) => void} | null>(null);

  // Form fields
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [stock, setStock] = useState('');
  const [estado, setEstado] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [description, setDescription] = useState('');

  const maxImages = 5;

  const pickImage = async () => {
    if (images.length >= maxImages) {
      Alert.alert('Limite atingido', `Máximo de ${maxImages} imagens`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const newImage: ImageItem = {
        id: Date.now().toString(),
        uri: result.assets[0].uri,
      };
      setImages([...images, newImage]);
    }
  };

  const removeImage = (id: string) => {
    setImages(images.filter(img => img.id !== id));
  };

  const openModal = (title: string, data: string[], onSelect: (item: string) => void) => {
    setModalData({ title, data, onSelect });
    setShowModal(true);
  };

  const validateForm = () => {
    if (!productName.trim()) {
      Alert.alert('Erro', 'Nome do produto é obrigatório');
      return false;
    }
    if (!price || parseFloat(price) <= 0) {
      Alert.alert('Erro', 'Preço deve ser maior que zero');
      return false;
    }
    if (!category) {
      Alert.alert('Erro', 'Categoria é obrigatória');
      return false;
    }
    if (!stock || parseInt(stock) < 0) {
      Alert.alert('Erro', 'Quantidade em estoque é obrigatória');
      return false;
    }
    if (!estado) {
      Alert.alert('Erro', 'Estado do produto é obrigatório');
      return false;
    }
    if (!province) {
      Alert.alert('Erro', 'Província é obrigatória');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Erro', 'Descrição é obrigatória');
      return false;
    }
    if (images.length === 0) {
      Alert.alert('Erro', 'Pelo menos uma imagem é obrigatória');
      return false;
    }
    return true;
  };

  const publishProduct = async () => {
    if (!validateForm()) return;

    // Verificar autenticação primeiro
    if (!isAuthenticated || !token) {
      console.log('🔐 Usuário não está logado');
      Alert.alert('Login Necessário', 'Você precisa fazer login para publicar produtos.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Fazer Login', onPress: () => router.push('/login') }
      ]);
      return;
    }

    console.log('🔑 Usuário autenticado, token presente');
    setLoading(true);
    
    // Teste simples da API primeiro
    try {
      console.log('🧪 Testando conectividade com a API...');
      const testResponse = await fetch('https://skyvendas-production.up.railway.app/');
      console.log('✅ API está acessível, status:', testResponse.status);
    } catch (testError) {
      console.log('❌ API não está acessível:', testError);
    }
    
    try {
      console.log('🚀 Iniciando publicação do produto...');
      console.log('📝 Dados do produto:', {
        nome: productName.trim(),
        preco: parseFloat(price),
        categoria: category,
        quantidade_estoque: parseInt(stock),
        estado: estado,
        provincia: province,
        distrito: district || '',
        tipo: subcategory || '',
        descricao: description.trim(),
        imagens: images.length
      });

      const formData = new FormData();
      formData.append('nome', productName.trim());
      formData.append('preco', parseFloat(price).toString());
      formData.append('categoria', category);
      formData.append('quantidade_estoque', parseInt(stock).toString());
      formData.append('estado', estado);
      formData.append('provincia', province);
      formData.append('distrito', district || '');
      formData.append('tipo', subcategory || '');
      formData.append('descricao', description.trim());
      formData.append('detalhes', '');
      formData.append('localizacao', 'string');
      formData.append('disponiblidade', 'string');
      formData.append('revisao', 'string');

      // Add images
      console.log('📸 Adicionando imagens ao FormData...');
      images.forEach((image, index) => {
        console.log(`📷 Imagem ${index + 1}:`, image.uri);
        const imageFile = {
          uri: image.uri,
          type: 'image/jpeg',
          name: `image-${index}.jpg`,
        } as any;
        formData.append('fotos', imageFile);
      });

      console.log('🌐 Fazendo requisição para API...');
      console.log('🔗 URL completa:', `${BASE_URL}/produtos/publicar`);
      console.log('📦 FormData entries:');
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value);
      }
      
      // Tentar com URL completa primeiro
      let response;
      try {
        response = await postMultipart('/produtos/publicar', formData);
        console.log('✅ Resposta da API:', response);
      } catch (directError) {
        console.log('❌ Erro com URL relativa, tentando URL completa...');
        console.log('Erro direto:', directError);
        
        // Tentar com fetch direto como fallback
        const fullUrl = 'https://skyvendas-production.up.railway.app/produtos/publicar';
        console.log('🔄 Tentando com fetch direto...');
        
        const fetchResponse = await fetch(fullUrl, {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!fetchResponse.ok) {
          throw new Error(`HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`);
        }
        
        response = await fetchResponse.json();
        console.log('✅ Resposta com fetch:', response);
      }
      
      Alert.alert('Sucesso!', 'Produto publicado com sucesso! 🚀', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('❌ Erro detalhado:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
      
      let errorMessage = 'Erro ao publicar produto. Tente novamente.';
      
      if (error.message === 'Network Error') {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
        console.log('🌐 Problema de rede detectado');
      } else if (error.response?.status === 401 || error.message?.includes('401')) {
        errorMessage = 'Você precisa fazer login para publicar produtos.';
        console.log('🔐 Erro de autenticação - Redirecionando para login...');
        Alert.alert('Login Necessário', 'Você precisa fazer login para publicar produtos.', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Fazer Login', onPress: () => router.push('/login') }
        ]);
        return; // Não mostrar o alerta de erro padrão
      } else if (error.response?.status === 402) {
        errorMessage = 'Saldo insuficiente para publicar produto.';
        console.log('💰 Saldo insuficiente');
      } else if (error.response?.status === 422) {
        errorMessage = 'Dados inválidos. Verifique as informações.';
        console.log('📝 Dados inválidos:', error.response?.data);
      } else if (error.response?.status === 500) {
        errorMessage = 'Erro no servidor. Tente novamente mais tarde.';
        console.log('🖥️ Erro do servidor');
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Tempo limite excedido. Tente novamente.';
        console.log('⏰ Timeout da requisição');
      }
      
      console.log('📱 Mostrando alerta para o usuário:', errorMessage);
      Alert.alert('Erro', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#8B5CF6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Novo Produto</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Image Upload */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Imagens do Produto</Text>
          <Text style={styles.sectionSubtitle}>{images.length}/{maxImages} imagens</Text>

          {images.length > 0 && (
            <View style={styles.imageGrid}>
              {images.map((image) => (
                <View key={image.id} style={styles.imageContainer}>
                  <Image source={{ uri: image.uri }} style={styles.image} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(image.id)}
                  >
                    <Feather name="x" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {images.length < maxImages && (
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
              <Feather name="camera" size={32} color="#8B5CF6" />
              <Text style={styles.uploadButtonText}>Adicionar Imagem</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações do Produto</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome do Produto *</Text>
            <TextInput
              style={styles.input}
              value={productName}
              onChangeText={setProductName}
              placeholder="Ex: iPhone 14 Pro"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Preço (MT) *</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="0.00"
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Categoria *</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => openModal('Selecione a Categoria', CATEGORIES, setCategory)}
            >
              <Text style={[styles.selectButtonText, !category && styles.placeholderText]}>
                {category || 'Selecione uma categoria'}
              </Text>
              <Feather name="chevron-down" size={20} color="#8B5CF6" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Subcategoria</Text>
            <TouchableOpacity
              style={[styles.selectButton, !category && styles.selectButtonDisabled]}
              onPress={() => category && openModal('Selecione a Subcategoria', SUBCATEGORIES[category] || [], setSubcategory)}
              disabled={!category}
            >
              <Text style={[styles.selectButtonText, !subcategory && styles.placeholderText]}>
                {subcategory || 'Selecione uma subcategoria'}
              </Text>
              <Feather name="chevron-down" size={20} color="#8B5CF6" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Quantidade em Estoque *</Text>
            <TextInput
              style={styles.input}
              value={stock}
              onChangeText={setStock}
              placeholder="0"
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Estado do Produto *</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => openModal('Selecione o Estado', ESTADOS, setEstado)}
            >
              <Text style={[styles.selectButtonText, !estado && styles.placeholderText]}>
                {estado || 'Selecione o estado'}
              </Text>
              <Feather name="chevron-down" size={20} color="#8B5CF6" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Localização</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Província *</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => openModal('Selecione a Província', PROVINCIAS, setProvince)}
            >
              <Text style={[styles.selectButtonText, !province && styles.placeholderText]}>
                {province || 'Selecione uma província'}
              </Text>
              <Feather name="chevron-down" size={20} color="#8B5CF6" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Distrito</Text>
            <TouchableOpacity
              style={[styles.selectButton, !province && styles.selectButtonDisabled]}
              onPress={() => province && openModal('Selecione o Distrito', DISTRITOS[province] || [], setDistrict)}
              disabled={!province}
            >
              <Text style={[styles.selectButtonText, !district && styles.placeholderText]}>
                {district || 'Selecione um distrito'}
              </Text>
              <Feather name="chevron-down" size={20} color="#8B5CF6" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descrição</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descrição do Produto *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Descreva seu produto..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Publish Button */}
        <View style={styles.publishSection}>
          <TouchableOpacity
            style={[styles.publishButton, loading && styles.publishButtonDisabled]}
            onPress={publishProduct}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Feather name="upload" size={20} color="#FFFFFF" />
            )}
            <Text style={styles.publishButtonText}>
              {loading ? 'Publicando...' : 'Publicar Produto'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalData?.title}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeButton}>
                <Feather name="x" size={24} color="#8B5CF6" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={modalData?.data || []}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    modalData?.onSelect(item);
                    setShowModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
    width: '48%',
    aspectRatio: 1,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#8B5CF6',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  uploadButtonText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  selectButtonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  selectButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  publishSection: {
    marginTop: 32,
    marginBottom: 32,
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  publishButtonDisabled: {
    backgroundColor: '#A78BFA',
  },
  publishButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  modalItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  modalItemText: {
    fontSize: 16,
    color: '#374151',
  },
});
