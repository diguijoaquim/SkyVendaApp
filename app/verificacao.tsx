import React, { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, Alert, TextInput, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { postMultipart } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

type Step = 0 | 1 | 2 | 3; // 0=intro, 1=info pessoal, 2=localizacao, 3=documentos

export default function VerificacaoScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const firstName = useMemo(() => (user?.name || user?.username || ''), [user]);

  // Step 1 - dados pessoais
  const [dataNascimento, setDataNascimento] = useState('');
  const [nacionalidade, setNacionalidade] = useState('Moçambicana');
  const [sexo, setSexo] = useState('');

  // Step 2 - localização/contato
  const [provincia, setProvincia] = useState('');
  const [distrito, setDistrito] = useState('');
  const [bairro, setBairro] = useState('');
  const [contacto, setContacto] = useState('');

  // Step 3 - documentos
  const [fotoRetrato, setFotoRetrato] = useState<any>(null);
  const [fotoFrente, setFotoFrente] = useState<any>(null);
  const [fotoVerso, setFotoVerso] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Simple Select UI state
  const [selectOpen, setSelectOpen] = useState<{key: null | string}>({ key: null });

  // Options
  const sexoOptions = ['Masculino', 'Feminino', 'Outro'];
  const nacionalidades = ['Moçambicana', 'Sul-Africana', 'Zimbabuense', 'Malauiana', 'Outra'];
  const provincias = [
    'Maputo Cidade','Maputo','Gaza','Inhambane','Sofala','Manica','Tete','Zambézia','Nampula','Niassa','Cabo Delgado'
  ];
  const distritosPorProvincia: Record<string, string[]> = {
    'Maputo Cidade': ['KaMpfumo','Nlhamankulu','KaMaxaquene','KaMavota','KaTembe','KaNyaka'],
    'Maputo': ['Matola','Boane','Namaacha','Manhiça'],
    'Gaza': ['Xai-Xai','Chibuto','Bilene'],
    'Inhambane': ['Inhambane','Maxixe','Vilankulo'],
    'Sofala': ['Beira','Dondo','Nhamatanda'],
    'Manica': ['Chimoio','Gondola','Manica'],
    'Tete': ['Tete','Moatize','Angónia'],
    'Zambézia': ['Quelimane','Gurúè','Mocuba'],
    'Nampula': ['Nampula','Nacala','Monapo'],
    'Niassa': ['Lichinga','Cuamba'],
    'Cabo Delgado': ['Pemba','Montepuez']
  };

  // Date picker (YYYY-MM-DD) via three selects
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => String(currentYear - 13 - i)); // assume 13+ years
  const months = [
    { label: '01', value: '01' }, { label: '02', value: '02' }, { label: '03', value: '03' }, { label: '04', value: '04' },
    { label: '05', value: '05' }, { label: '06', value: '06' }, { label: '07', value: '07' }, { label: '08', value: '08' },
    { label: '09', value: '09' }, { label: '10', value: '10' }, { label: '11', value: '11' }, { label: '12', value: '12' }
  ];
  const [birthYear, setBirthYear] = useState<string>('');
  const [birthMonth, setBirthMonth] = useState<string>('');
  const [birthDay, setBirthDay] = useState<string>('');

  const days = useMemo(() => {
    const y = parseInt(birthYear || '2000', 10);
    const m = parseInt(birthMonth || '1', 10);
    const lastDay = new Date(y, m, 0).getDate();
    return Array.from({ length: lastDay }, (_, i) => String(i + 1).padStart(2, '0'));
  }, [birthYear, birthMonth]);

  const applyBirthDate = () => {
    if (birthYear && birthMonth && birthDay) {
      setDataNascimento(`${birthYear}-${birthMonth}-${birthDay}`);
    }
  };

  // Debug: print current revisao status
  React.useEffect(() => {
    console.log('[VerificacaoScreen] revisao:', user?.revisao);
  }, [user?.revisao]);

  const next = () => setStep((s) => (Math.min(3, (s + 1)) as Step));
  const prev = () => setStep((s) => (Math.max(0, (s - 1)) as Step));

  const pickImage = async (setter: (v: any) => void) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setter(result.assets[0]);
    }
  };

  const validateStep = (current: Step) => {
    if (current === 0) {
      if (!acceptedTerms) {
        Alert.alert('Aceite os termos', 'Precisa aceitar os termos e condições para continuar.');
        return false;
      }
    }
    if (current === 1) {
      if (!dataNascimento || !nacionalidade || !sexo) {
        Alert.alert('Campos obrigatórios', 'Preencha data de nascimento, nacionalidade e sexo.');
        return false;
      }
    }
    if (current === 2) {
      if (!provincia || !distrito || !bairro || !contacto) {
        Alert.alert('Campos obrigatórios', 'Preencha província, distrito, bairro e contacto.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) next();
  };

  const handleSubmit = async () => {
    if (!fotoRetrato || !fotoFrente || !fotoVerso) {
      Alert.alert('Faltam documentos', 'Envie rosto, BI frente e BI verso.');
      return;
    }
    try {
      // Conectividade rápida antes de enviar
      try {
        await fetch('https://www.google.com', { method: 'HEAD' });
      } catch {
        Alert.alert('Sem conexão', 'Verifique a sua ligação à internet e tente novamente.');
        return;
      }

      setSubmitting(true);
      const formData = new FormData();
      formData.append('foto_retrato', {
        uri: fotoRetrato.uri,
        type: 'image/jpeg',
        name: 'retrato.jpg',
      } as any);
      formData.append('foto_bi_frente', {
        uri: fotoFrente.uri,
        type: 'image/jpeg',
        name: 'bi_frente.jpg',
      } as any);
      formData.append('foto_bi_verso', {
        uri: fotoVerso.uri,
        type: 'image/jpeg',
        name: 'bi_verso.jpg',
      } as any);

      formData.append('provincia', provincia);
      formData.append('distrito', distrito);
      formData.append('data_nascimento', dataNascimento);
      formData.append('sexo', sexo);
      formData.append('nacionalidade', nacionalidade);
      formData.append('bairro', bairro);

      await postMultipart('/info_usuario/', formData);
      Alert.alert('Enviado', 'Seus documentos foram enviados para revisão.');
      router.back();
    } catch (e: any) {
      if (e?.message === 'Network Error') {
        Alert.alert('Servidor indisponível', 'Sem conexão com o servidor. Tente novamente mais tarde.');
      } else {
        Alert.alert('Erro', e?.response?.data?.detail || 'Falha ao enviar documentos.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="border-b border-gray-200">
        <View className="flex-row items-center justify-between p-4">
          <TouchableOpacity onPress={() => (step === 0 ? router.back() : prev())}>
            <Ionicons name="arrow-back" size={22} color="#374151" />
          </TouchableOpacity>
          <Text className="font-semibold text-gray-900">Verificação</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} className="p-4">
        {/* Estado atual da revisão (debug/visível) */}
        <View className="mb-3">
          <Text className="text-xs text-gray-500">Estado da revisão: {user?.revisao || user?.revisado || 'desconhecido'}</Text>
        </View>
        {(user?.revisao === 'pendente' || user?.revisado === 'pendente') ? (
          <View className="gap-3">
            <Text className="text-xl font-semibold text-gray-900">Olá {firstName}</Text>
            <Text className="text-gray-700">
              A sua verificação está sendo revista. Você receberá uma notificação quando estiver concluída e sua conta for verificada.
            </Text>
            <View className="mt-2 bg-blue-50 p-3 rounded-md border border-blue-200">
              <Text className="text-blue-800">Obrigado por enviar os seus documentos. O processo pode levar algum tempo.</Text>
            </View>
            <TouchableOpacity onPress={() => router.back()} className="mt-4 bg-violet-600 px-4 py-3 rounded-md items-center">
              <Text className="text-white font-semibold">Voltar</Text>
            </TouchableOpacity>
          </View>
        ) : (
        <>
        {step === 0 && (
          <View className="gap-3">
            <Text className="text-xl font-semibold text-gray-900">Olá {firstName}</Text>
            <Text className="text-gray-700">
              Para ter mais experiências dos nossos serviços da SkyVenda e SkyWallet precisamos verificar a sua conta.
              Isto inclui o envio do documento de identidade (BI) e a sua foto real. Também vai nos informar o género e a idade.
            </Text>
            <View className="mt-2 bg-amber-50 p-3 rounded-md border border-amber-200">
              <Text className="text-amber-800 font-semibold">Vantagens da verificação</Text>
              <Text className="text-amber-800 mt-1">- Mais segurança nas transações</Text>
              <Text className="text-amber-800">- Limites ampliados na SkyWallet</Text>
              <Text className="text-amber-800">- Destaque e confiança no marketplace</Text>
            </View>
            <View className="mt-2 flex-row items-start gap-2">
              <TouchableOpacity onPress={() => setAcceptedTerms(!acceptedTerms)} className="w-5 h-5 rounded border border-gray-300 items-center justify-center">
                {acceptedTerms && <View className="w-3 h-3 bg-violet-600" />}
              </TouchableOpacity>
              <Text className="flex-1 text-gray-700">
                Aceito os termos e condições da SkyVenda MZ.
              </Text>
            </View>
            <TouchableOpacity onPress={handleNext} className="mt-4 bg-violet-600 px-4 py-3 rounded-md items-center">
              <Text className="text-white font-semibold">Começar</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 1 && (
          <View className="gap-3">
            <Text className="text-lg font-semibold text-gray-900">1. Dados pessoais</Text>
            <View>
              <Text className="text-gray-700 mb-1">Data de nascimento</Text>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  className="w-20 border border-gray-200 rounded-md px-3 py-2 items-center"
                  onPress={() => setSelectOpen({ key: 'day' })}
                >
                  <Text className="text-gray-800">{birthDay || 'Dia'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="w-20 border border-gray-200 rounded-md px-3 py-2 items-center"
                  onPress={() => setSelectOpen({ key: 'month' })}
                >
                  <Text className="text-gray-800">{birthMonth || 'Mês'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 border border-gray-200 rounded-md px-3 py-2"
                  onPress={() => setSelectOpen({ key: 'year' })}
                >
                  <Text className="text-gray-800">{birthYear || 'Ano'}</Text>
                </TouchableOpacity>
              </View>
              {!!dataNascimento && <Text className="text-xs text-gray-500 mt-1">Selecionado: {dataNascimento}</Text>}
            </View>

            <View>
              <Text className="text-gray-700 mb-1">Nacionalidade</Text>
              <TouchableOpacity className="border border-gray-200 rounded-md px-3 py-2" onPress={() => setSelectOpen({ key: 'nacionalidade' })}>
                <Text className="text-gray-800">{nacionalidade || 'Selecionar nacionalidade'}</Text>
              </TouchableOpacity>
            </View>

            <View>
              <Text className="text-gray-700 mb-1">Sexo</Text>
              <TouchableOpacity className="border border-gray-200 rounded-md px-3 py-2" onPress={() => setSelectOpen({ key: 'sexo' })}>
                <Text className="text-gray-800">{sexo || 'Selecionar sexo'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handleNext} className="mt-2 bg-violet-600 px-4 py-3 rounded-md items-center">
              <Text className="text-white font-semibold">Continuar</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View className="gap-3">
            <Text className="text-lg font-semibold text-gray-900">2. Localização e contacto</Text>
            <View>
              <Text className="text-gray-700 mb-1">Província</Text>
              <TouchableOpacity className="border border-gray-200 rounded-md px-3 py-2" onPress={() => setSelectOpen({ key: 'provincia' })}>
                <Text className="text-gray-800">{provincia || 'Selecionar província'}</Text>
              </TouchableOpacity>
            </View>
            <View>
              <Text className="text-gray-700 mb-1">Distrito</Text>
              <TouchableOpacity
                disabled={!provincia}
                className="border border-gray-200 rounded-md px-3 py-2"
                onPress={() => provincia && setSelectOpen({ key: 'distrito' })}
              >
                <Text className="text-gray-800">{distrito || 'Selecionar distrito'}</Text>
              </TouchableOpacity>
            </View>
            <TextInput placeholder="Bairro" value={bairro} onChangeText={setBairro} className="border border-gray-200 rounded-md px-3 py-2" />
            <TextInput placeholder="Contacto" value={contacto} onChangeText={setContacto} keyboardType="phone-pad" className="border border-gray-200 rounded-md px-3 py-2" />
            <TouchableOpacity onPress={handleNext} className="mt-2 bg-violet-600 px-4 py-3 rounded-md items-center">
              <Text className="text-white font-semibold">Continuar</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <View className="gap-3">
            <Text className="text-lg font-semibold text-gray-900">3. Documentos</Text>
            <TouchableOpacity className="bg-gray-100 p-4 rounded-md" onPress={() => pickImage(setFotoRetrato)}>
              <Text className="text-gray-800">Selecionar foto do rosto {fotoRetrato ? '✅' : ''}</Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-gray-100 p-4 rounded-md" onPress={() => pickImage(setFotoFrente)}>
              <Text className="text-gray-800">Selecionar BI (frente) {fotoFrente ? '✅' : ''}</Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-gray-100 p-4 rounded-md" onPress={() => pickImage(setFotoVerso)}>
              <Text className="text-gray-800">Selecionar BI (verso) {fotoVerso ? '✅' : ''}</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={submitting} className="mt-2 bg-amber-500 px-4 py-3 rounded-md items-center" onPress={handleSubmit}>
              <Text className="text-white font-semibold">{submitting ? 'Enviando…' : 'Enviar verificação'}</Text>
            </TouchableOpacity>
          </View>
        )}
        </>
        )}
      </ScrollView>

      {/* Simple Select Overlay */}
      {selectOpen.key && (
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <View className="absolute left-4 right-4 bottom-6 bg-white rounded-lg p-3 max-h-[60%]">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="font-semibold text-gray-900">Selecionar</Text>
              <TouchableOpacity onPress={() => setSelectOpen({ key: null })}>
                <Ionicons name="close" size={22} color="#374151" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {selectOpen.key === 'year' && years.map((y) => (
                <TouchableOpacity key={y} className="py-2" onPress={() => { setBirthYear(y); setSelectOpen({ key: null }); applyBirthDate(); }}>
                  <Text className="text-gray-800">{y}</Text>
                </TouchableOpacity>
              ))}
              {selectOpen.key === 'month' && months.map((m) => (
                <TouchableOpacity key={m.value} className="py-2" onPress={() => { setBirthMonth(m.value); setSelectOpen({ key: null }); applyBirthDate(); }}>
                  <Text className="text-gray-800">{m.label}</Text>
                </TouchableOpacity>
              ))}
              {selectOpen.key === 'day' && days.map((d) => (
                <TouchableOpacity key={d} className="py-2" onPress={() => { setBirthDay(d); setSelectOpen({ key: null }); applyBirthDate(); }}>
                  <Text className="text-gray-800">{d}</Text>
                </TouchableOpacity>
              ))}
              {selectOpen.key === 'nacionalidade' && nacionalidades.map((n) => (
                <TouchableOpacity key={n} className="py-2" onPress={() => { setNacionalidade(n); setSelectOpen({ key: null }); }}>
                  <Text className="text-gray-800">{n}</Text>
                </TouchableOpacity>
              ))}
              {selectOpen.key === 'sexo' && sexoOptions.map((s) => (
                <TouchableOpacity key={s} className="py-2" onPress={() => { setSexo(s); setSelectOpen({ key: null }); }}>
                  <Text className="text-gray-800">{s}</Text>
                </TouchableOpacity>
              ))}
              {selectOpen.key === 'provincia' && provincias.map((p) => (
                <TouchableOpacity key={p} className="py-2" onPress={() => { setProvincia(p); setDistrito(''); setSelectOpen({ key: null }); }}>
                  <Text className="text-gray-800">{p}</Text>
                </TouchableOpacity>
              ))}
              {selectOpen.key === 'distrito' && (distritosPorProvincia[provincia] || []).map((d) => (
                <TouchableOpacity key={d} className="py-2" onPress={() => { setDistrito(d); setSelectOpen({ key: null }); }}>
                  <Text className="text-gray-800">{d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}


