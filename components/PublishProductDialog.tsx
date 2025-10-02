import { useAuth } from '@/contexts/AuthContext';
import { CATEGORIES, DISTRITOS, ESTADOS, PROVINCIAS, SUBCATEGORIES } from '@/data/consts';
import { postMultipart } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
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

interface ImageItem {
  id: string;
  uri: string;
}

interface PublishProductDialogProps {
  visible: boolean;
  onClose: () => void;
  onProductCreated?: () => void;
}

export default function PublishProductDialog({ visible, onClose, onProductCreated }: PublishProductDialogProps) {
  const { user, token, isAuthenticated } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<{title: string, data: string[], onSelect: (item: string) => void} | null>(null);

  // Form fields
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [stock, setStock] = useState('1');
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

  const openModal = (title: string, data: string[] | {[key: string]: string[]}, onSelect: (item: string) => void) => {
    let modalDataArray: string[] = [];
    
    if (Array.isArray(data)) {
      modalDataArray = data;
    } else {
      // Se for objeto, pegar todas as chaves ou valores baseado no contexto
      if (title === 'Distrito' && province) {
        modalDataArray = data[province] || [];
      } else if (title === 'Tipo' && category) {
        modalDataArray = data[category] || [];
      } else {
        modalDataArray = Object.keys(data);
      }
    }
    
    setModalData({ title, data: modalDataArray, onSelect });
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

  const handleSubmit = useCallback(async () => {
    if (!isAuthenticated) {
      Alert.alert('Atenção', 'Precisa fazer login para publicar produtos');
      return;
    }

    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      
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
      images.forEach((image, index) => {
        const imageFile = {
          uri: image.uri,
          type: 'image/jpeg',
          name: `image-${index}.jpg`,
        } as any;
        formData.append('fotos', imageFile);
      });

      await postMultipart('/produtos/publicar', formData);

      Alert.alert('Sucesso!', 'Seu produto foi publicado com sucesso.');
      
       // Reset form
       setProductName('');
       setPrice('');
       setCategory('');
       setSubcategory('');
       setStock('1');
       setEstado('');
       setProvince('');
       setDistrict('');
       setDescription('');
       setImages([]);
      onClose();
      
      // Notify parent component
      if (onProductCreated) {
        onProductCreated();
      }
    } catch (error: any) {
      console.error('Error creating product:', error);
      Alert.alert(
        'Erro ao publicar', 
        error?.response?.data?.detail || 'Não foi possível publicar o produto.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [isAuthenticated, productName, price, category, stock, estado, province, district, description, images, onClose, onProductCreated]);

  const handleClose = useCallback(() => {
    if ((productName.trim() || description.trim() || images.length > 0) && !isSubmitting) {
      Alert.alert(
        'Descartar produto',
        'Tem certeza que deseja descartar este produto?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Descartar', 
            style: 'destructive',
            onPress: () => {
              setProductName('');
              setPrice('');
              setCategory('');
              setSubcategory('');
               setStock('1');
              setEstado('');
              setProvince('');
              setDistrict('');
              setDescription('');
              setImages([]);
              onClose();
            }
          }
        ]
      );
    } else {
      setProductName('');
      setPrice('');
      setCategory('');
      setSubcategory('');
               setStock('1');
      setEstado('');
      setProvince('');
      setDistrict('');
      setDescription('');
      setImages([]);
      onClose();
    }
  }, [productName, description, images, isSubmitting, onClose]);

  const renderImageItem = ({ item }: { item: ImageItem }) => (
    <View style={styles.imageItem}>
      <Image source={{ uri: item.uri }} style={styles.imagePreview} />
      <TouchableOpacity 
        style={styles.removeImageButton}
        onPress={() => removeImage(item.id)}
      >
        <Ionicons name="close-circle" size={24} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );

  const renderModalItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.modalItem}
      onPress={() => {
        modalData?.onSelect(item);
        setShowModal(false);
      }}
    >
      <Text style={styles.modalItemText}>{item}</Text>
    </TouchableOpacity>
  );

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
          <Text style={styles.headerTitle}>Publicar Produto</Text>
          <TouchableOpacity 
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={[
              styles.publishButton,
              isSubmitting && styles.publishButtonDisabled
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
                <Ionicons name="storefront-outline" size={12} color="#6B7280" />
                <Text style={styles.privacyText}>Produto</Text>
              </View>
            </View>
          </View>

          {/* Product Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Nome do Produto *</Text>
            <TextInput
              value={productName}
              onChangeText={setProductName}
              placeholder="Digite o nome do produto"
              placeholderTextColor="#9CA3AF"
              style={styles.textInput}
              maxLength={100}
            />
          </View>

          {/* Price and Stock */}
          <View style={styles.rowContainer}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Preço (MZN) *</Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                style={styles.textInput}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Estoque *</Text>
               <TextInput
                 value={stock}
                 onChangeText={setStock}
                 placeholder="1"
                 placeholderTextColor="#9CA3AF"
                 style={styles.textInput}
                 keyboardType="numeric"
               />
            </View>
          </View>

          {/* Category and Subcategory */}
          <View style={styles.rowContainer}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Categoria *</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => openModal('Categoria', CATEGORIES, setCategory)}
              >
                <Text style={[styles.selectText, !category && styles.placeholderText]}>
                  {category || 'Selecionar'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Tipo</Text>
               <TouchableOpacity
                 style={styles.selectButton}
                 onPress={() => {
                   if (!category) {
                     Alert.alert('Aviso', 'Selecione primeiro uma categoria');
                     return;
                   }
                   openModal('Tipo', SUBCATEGORIES, setSubcategory);
                 }}
               >
                <Text style={[styles.selectText, !subcategory && styles.placeholderText]}>
                  {subcategory || 'Selecionar'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Location */}
          <View style={styles.rowContainer}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Província *</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => openModal('Província', PROVINCIAS, setProvince)}
              >
                <Text style={[styles.selectText, !province && styles.placeholderText]}>
                  {province || 'Selecionar'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Distrito</Text>
               <TouchableOpacity
                 style={styles.selectButton}
                 onPress={() => {
                   if (!province) {
                     Alert.alert('Aviso', 'Selecione primeiro uma província');
                     return;
                   }
                   openModal('Distrito', DISTRITOS, setDistrict);
                 }}
               >
                <Text style={[styles.selectText, !district && styles.placeholderText]}>
                  {district || 'Selecionar'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Estado */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Estado do Produto *</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => openModal('Estado', ESTADOS, setEstado)}
            >
              <Text style={[styles.selectText, !estado && styles.placeholderText]}>
                {estado || 'Selecionar'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Description */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Descrição *</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Descreva o seu produto..."
              placeholderTextColor="#9CA3AF"
              style={[styles.textInput, styles.textArea]}
              multiline
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.characterCount}>
              {description.length}/500
            </Text>
          </View>

          {/* Images */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Imagens * (Máximo {maxImages})</Text>
            <View style={styles.imagesContainer}>
              <FlatList
                data={images}
                renderItem={renderImageItem}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.imagesList}
              />
              {images.length < maxImages && (
                <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
                  <Ionicons name="camera-outline" size={24} color="#6B7280" />
                  <Text style={styles.addImageText}>Adicionar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Selection Modal */}
        <Modal
          visible={showModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{modalData?.title}</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={modalData?.data || []}
                renderItem={renderModalItem}
                keyExtractor={(item) => item}
                style={styles.modalList}
              />
            </View>
          </View>
        </Modal>
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
    marginBottom: 16,
  },
  rowContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  selectButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  selectText: {
    fontSize: 16,
    color: '#111827',
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  imagesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imagesList: {
    paddingRight: 8,
  },
  imageItem: {
    position: 'relative',
    marginRight: 8,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  addImageButton: {
    width: 80,
    height: 80,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  addImageText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: width * 0.8,
    maxHeight: height * 0.6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalList: {
    maxHeight: height * 0.4,
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalItemText: {
    fontSize: 16,
    color: '#374151',
  },
});
