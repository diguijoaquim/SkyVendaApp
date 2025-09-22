import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getJson, postJson, postFormUrlEncoded, postMultipart, setToken as setApiToken } from '@/services/api';

interface User {
  id: number;
  id_unico?: string;
  name: string;
  username: string;
  email: string;
  avatar?: string;
  perfil?: string;
  tipo?: string;
  pro?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  signup: (name: string, email: string, username: string, password: string) => Promise<void>;
  token: string | null;
  setUser: (user: User | null) => void;
  getToken: (username: string, password: string) => Promise<void>;
  setToken: (token: string | null) => void;
  isAuthenticated: boolean;
  activatePro: () => Promise<User | null>;
  loginWithGoogle: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const router = useRouter();

  // Initialize token from AsyncStorage and handle deep linking
  useEffect(() => {
    const initToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('auth_token');
        if (storedToken) {
          setToken(storedToken);
        }
      } catch (error) {
        console.error('Error loading token:', error);
      }
    };
    initToken();

    // Listener para quando o app retornar do navegador
    const handleUrl = async (url: string) => {
      console.log('🔗 URL recebida:', url);
      
      // Verificar se é a URL de retorno do Google Auth (web ou deep link)
      if (url.includes('skyvenda.com/auth/success') || url.includes('skyvendaapp://success')) {
        try {
          let token: string | null = null;
          let userId: string | null = null;

          if (url.includes('skyvendaapp://success')) {
            // Processar deep link customizado
            const urlParts = url.split('?');
            if (urlParts.length > 1) {
              const params = new URLSearchParams(urlParts[1]);
              token = params.get('token');
              userId = params.get('id');
            }
          } else {
            // Processar URL web tradicional
            const urlObj = new URL(url);
            token = urlObj.searchParams.get('token');
            userId = urlObj.searchParams.get('id');
          }
          
          if (token) {
            console.log('🔑 Token recebido via deep link:', token.substring(0, 20) + '...');
            
            // Salvar token
            await AsyncStorage.setItem('auth_token', token);
            if (userId) {
              await AsyncStorage.setItem('user_id', userId);
            }
            
            // Atualizar estado
            setToken(token);
            
            // Redirecionar primeiro para a tela de loading
            router.push('/logining');
            
            // Buscar dados do usuário em background
            try {
              const userResponse: any = await getJson('/usuario/user', {
                headers: { Authorization: `Bearer ${token}` }
              });
              setUser(userResponse as User);
              setIsAuthenticated(true);
              console.log('✅ Login realizado com sucesso via deep link!');
            } catch (error) {
              console.error('❌ Erro ao buscar usuário:', error);
            }
          }
        } catch (error) {
          console.error('❌ Erro ao processar URL:', error);
        }
      }
    };

    // Adicionar listener para deep linking
    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    // Verificar URL inicial (quando o app é aberto via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl(url);
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // Keep Axios Authorization header in sync with the current token
  useEffect(() => {
    setApiToken(token);
  }, [token]);

  // Função para obter o token
  const getToken = async (username: string, password: string) => {
    try {
      // Use x-www-form-urlencoded format as required by the API
      const params = new URLSearchParams();
      params.append('grant_type', 'password');
      params.append('username', username);
      params.append('password', password);
      params.append('scope', '');
      params.append('client_id', 'string');
      params.append('client_secret', 'string');
      
      const response: any = await postFormUrlEncoded('/usuario/token', params);
      const accessToken = response.access_token;
      
      await AsyncStorage.setItem('auth_token', accessToken);
      await AsyncStorage.setItem('user_id', response.id.toString());
      
      setToken(accessToken);
      const userResponse: any = await getJson('/usuario/user', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setUser(userResponse as User);
      setIsAuthenticated(true);
    } catch (error: any) {
      // Handle all errors
      if (error.message === "Network Error") {
        console.error("Verifique a sua ligação");
      } else if (error.message === "Request failed with status code 401") {
        console.error("Username ou palavra-passe incorreta");
      } else if (error.response && error.response.status === 422) {
        console.error("Dados inválidos. Verifique seu username e senha.");
      } else {
        console.error("Erro desconhecido:", error);
      }
      throw error;
    }
  };

  // Função de logout
  const logout = async () => {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user_id');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    router.replace('/login');
  };

  // Função de cadastro
  const signup = async (name: string, email: string, username: string, password: string) => {
    const formData = new FormData();
    formData.append('nome', name);
    formData.append('email', email);
    formData.append('username', username);
    formData.append('senha', password);
    formData.append('tipo', 'nhonguista');

    try {
      const res = await postMultipart('/usuario/cadastro', formData);

      if (res) {
        console.log("Cadastrado com sucesso");
        router.replace('/login');
      }
    } catch (error: any) {
      if (error.message === "Network Error") {
        console.error("Verifique a Ligação");
      } else {
        console.error("Falha no cadastro. Tente novamente.");
      }
      throw error;
    }
  };

  // Recupera o usuário
  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const response: any = await getJson("/usuario/user", {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(response as User);
          setIsAuthenticated(true);
        } catch (error: any) {
          if (error.message === "Network Error") {
            console.error("Verifique a sua ligação");
          } else if (error.status === 401) {
            logout();
          } else {
            console.error("Erro desconhecido");
          }
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, [token]);

  // Login com Google
  const loginWithGoogle = async () => {
    try {
      const baseUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
      const options = {
        client_id: '830630003244-nn0s7nkrf7ufa7670eigobjppdfesd7h.apps.googleusercontent.com',
        redirect_uri: `https://skyvenda.com/usuario/auth/callback`,
        response_type: 'code',
        scope: 'email profile',
        access_type: 'offline',
        prompt: 'consent',
      };

      const queryString = new URLSearchParams(options).toString();
      const googleAuthUrl = `${baseUrl}?${queryString}`;
      
      // Abrir no navegador
      const supported = await Linking.canOpenURL(googleAuthUrl);
      if (supported) {
        await Linking.openURL(googleAuthUrl);
      } else {
        console.error('Não é possível abrir o navegador');
      }
    } catch (error) {
      console.error('Erro ao abrir login Google:', error);
    }
  };

  // Ativar conta PRO
  const activatePro = async () => {
    if (!token) return null;
    try {
      const res: any = await postJson('/usuario/ativar_pro', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Tenta atualizar o usuário atual com a resposta ou refetch
      let updatedUser: any = res?.user || res || null;
      if (!updatedUser) {
        const userResponse: any = await getJson('/usuario/user', {
          headers: { Authorization: `Bearer ${token}` }
        });
        updatedUser = userResponse;
      }
      setUser(updatedUser as User);
      setIsAuthenticated(true);
      console.log('Conta PRO ativada!');
      return updatedUser;
    } catch (e) {
      console.error('Falha ao ativar PRO', e);
      throw e;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading,
      setLoading,  
      logout,
      signup, 
      token, 
      setUser,
      getToken, 
      setToken, 
      isAuthenticated,
      activatePro,
      loginWithGoogle
    }}>
      {children}
    </AuthContext.Provider>
  );
}; 