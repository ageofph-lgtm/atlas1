import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Briefcase, Truck, Settings, Crown, Shield, AlertCircle, Lock, Eye } from 'lucide-react';
import { User as UserEntity } from '@/entities/User';
import { motion } from 'framer-motion';

const PROFILES = {
  oficina: {
    title: 'OFICINA',
    description: 'Gestão de ordens de serviço',
    icon: Settings,
    color: 'border-white/30',
    password: '1'
  },
  comercial: {
    title: 'COMERCIAL',
    description: 'Reserva e propostas',
    icon: Briefcase,
    color: 'border-red-400/50',
    password: '1'
  },
  logistica: {
    title: 'LOGÍSTICA',
    description: 'Gestão de frota e entregas',
    icon: Truck,
    color: 'border-white/30',
    password: '1'
  },
  gestor_frota: {
    title: 'Gestor de Frota',
    description: 'Gestão STS/UTS e criação de O.S.',
    icon: Crown,
    color: 'border-white/30',
    password: '1'
  },
  coordenador_comercial: {
    title: 'Coordenador Comercial',
    description: 'Gestão completa comercial',
    icon: User,
    color: 'border-white/30',
    password: '1'
  },
  administrador: {
    title: 'Administrador',
    description: 'Controlo total do sistema',
    icon: Shield,
    color: 'border-white/30',
    password: '1'
  },
  visitante: {
    title: 'VISITANTE',
    description: 'Observação apenas',
    icon: Eye,
    color: 'border-white/30',
    password: '1'
  }
};

export default function ProfileSelector({ onLogin }) {
  const [selectedProfile, setSelectedProfile] = useState('comercial');
  const [password, setPassword] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const user = await UserEntity.me();
        if (user && user.perfil && PROFILES[user.perfil]) {
          onLogin(user);
        }
      } catch (error) {
        console.log("No existing authentication found");
      }
    };
    checkExistingAuth();
  }, [onLogin]);

  const validatePassword = (profile, enteredPassword) => {
    if (profile.passwords) {
      return profile.passwords.includes(enteredPassword);
    }
    return enteredPassword === profile.password;
  };

  const extractCommercialName = (password) => {
    if (password.startsWith('2')) {
      return password.substring(1);
    }
    return null;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!selectedProfile || !password) {
      setError('Selecione um perfil e digite a senha');
      return;
    }

    const profile = PROFILES[selectedProfile];
    if (!validatePassword(profile, password)) {
      setError('Senha incorreta para este perfil');
      return;
    }

    setIsLogging(true);
    setError('');

    try {
      const commercialName = extractCommercialName(password);
      const displayName = commercialName || profile.title;
      
      await UserEntity.updateMyUserData({
        perfil: selectedProfile,
        departamento: profile.title,
        nome_comercial: commercialName,
        ultimo_acesso: new Date().toISOString(),
        ativo: true,
        full_name: displayName,
        email: `${selectedProfile}@atlas.local`
      });
      
      const updatedUser = await UserEntity.me();
      onLogin(updatedUser);
      
    } catch (err) {
      console.error('Login error:', err);
      setError('Erro ao fazer login. Tente novamente.');
      setIsLogging(false);
    }
  };

  if (isLogging) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center bg-white/70 backdrop-blur-xl border border-gray-200 angled-clip p-8 shadow-2xl">
          <div className="animate-spin w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full mx-auto mb-6"></div>
          <p className="text-gray-800 text-lg font-semibold">A entrar no sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <style>
        {`
          .angled-clip {
            clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%);
          }
          
          .profile-card {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(10px);
            border: 2px solid rgba(156, 163, 175, 0.3);
            transition: all 0.3s ease;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          }
          
          .profile-card:hover {
            transform: translateY(-4px);
            background: rgba(255, 255, 255, 0.9);
            border-color: rgba(156, 163, 175, 0.5);
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
          }
          
          .profile-card-selected {
            background: rgba(239, 68, 68, 0.1) !important;
            border-color: rgba(239, 68, 68, 0.5) !important;
            box-shadow: 0 0 30px rgba(239, 68, 68, 0.2) !important;
            transform: translateY(-4px);
          }

          .login-form {
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(10px);
            border: 2px solid rgba(156, 163, 175, 0.3);
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
          }
        `}
      </style>
      
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-6xl text-center"
      >
        {/* Logo Only */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mb-16"
        >
          <div className="flex items-center justify-center">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/dc340a4ed_LogoGeomtricoATLAScomOlhoCircular-Photoroom.png"
              alt="ATLAS"
              className="w-32 h-32 object-contain drop-shadow-xl"
            />
          </div>
        </motion.div>

        {/* Profile Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12"
        >
          {Object.entries(PROFILES).slice(0, 3).map(([key, profile], index) => {
            const ProfileIcon = profile.icon;
            const isSelected = selectedProfile === key;
            
            return (
              <motion.button
                key={key}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1, duration: 0.6 }}
                onClick={() => {setSelectedProfile(key); setPassword(''); setError('');}}
                className={`profile-card angled-clip p-8 text-center ${
                  isSelected ? 'profile-card-selected' : ''
                }`}
              >
                <ProfileIcon className={`w-16 h-16 mx-auto mb-6 ${
                  isSelected ? 'text-red-600' : 'text-gray-700'
                }`} />
                <h3 className={`font-bold text-xl mb-3 ${
                  isSelected ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {profile.title}
                </h3>
                <p className="text-sm text-gray-600">{profile.description}</p>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Additional Profiles */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16"
        >
          {Object.entries(PROFILES).slice(3).map(([key, profile], index) => {
            const ProfileIcon = profile.icon;
            const isSelected = selectedProfile === key;
            
            return (
              <motion.button
                key={key}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + index * 0.1, duration: 0.6 }}
                onClick={() => {setSelectedProfile(key); setPassword(''); setError('');}}
                className={`profile-card angled-clip p-8 text-center ${
                  isSelected ? 'profile-card-selected' : ''
                }`}
              >
                <ProfileIcon className={`w-16 h-16 mx-auto mb-6 ${
                  isSelected ? 'text-red-600' : 'text-gray-700'
                }`} />
                <h3 className={`font-bold text-xl mb-3 ${
                  isSelected ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {profile.title}
                </h3>
                <p className="text-sm text-gray-600">{profile.description}</p>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Login Form */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="max-w-md mx-auto"
        >
          <form onSubmit={handleLogin} className="login-form angled-clip p-10">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-8 justify-center">
                <Lock className="w-6 h-6 text-gray-700" />
                <h3 className="text-xl font-bold text-gray-900">Autenticação</h3>
              </div>
              
              <div className="text-left mb-6">
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  Senha do perfil {PROFILES[selectedProfile]?.title}
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => {setPassword(e.target.value); setError('');}}
                  placeholder="Digite a senha"
                  className="w-full h-12 text-lg bg-white/80 border-gray-300 focus:border-red-500 focus:ring-red-500/20"
                  autoFocus
                />
              </div>

              {error && (
                <Alert variant="destructive" className="mb-6 bg-red-50 border-red-300 text-red-800">
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <Button
                type="submit"
                disabled={!selectedProfile || !password || isLogging}
                className="w-full h-14 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white text-lg font-bold angled-clip shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
              >
                {isLogging ? (
                  <div className="flex items-center gap-3">
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                    A entrar...
                  </div>
                ) : 'Entrar no Sistema'}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}