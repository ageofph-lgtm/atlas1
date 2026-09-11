import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Briefcase, Truck, Crown, Shield, AlertCircle, Lock, Eye } from 'lucide-react';
import { User as UserEntity } from '@/entities/User';
import { motion } from 'framer-motion';
import ThemeSwitcher from '@/components/atlas/ThemeSwitcher';

const PROFILES = {
  comercial: {
    title: 'COMERCIAL',
    description: 'Reserva e propostas',
    icon: Briefcase,
    password: '1'
  },
  logistica: {
    title: 'LOGÍSTICA',
    description: 'Gestão de frota e entregas',
    icon: Truck,
    password: '1'
  },
  gestor_frota: {
    title: 'Gestor de Frota',
    description: 'Gestão STS/UTS e criação de O.S.',
    icon: Crown,
    password: '1'
  },
  administrador: {
    title: 'Administrador',
    description: 'Controlo total do sistema',
    icon: Shield,
    password: '1'
  },
  visitante: {
    title: 'VISITANTE',
    description: 'Observação apenas',
    icon: Eye,
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
        // no existing auth
      }
    };
    checkExistingAuth();
  }, [onLogin]);

  const validatePassword = (profile, enteredPassword) => {
    if (profile.passwords) return profile.passwords.includes(enteredPassword);
    return enteredPassword === profile.password;
  };

  const extractCommercialName = (password) => {
    if (password.startsWith('2')) return password.substring(1);
    return null;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!selectedProfile || !password) { setError('Selecione um perfil e digite a senha'); return; }
    const profile = PROFILES[selectedProfile];
    if (!validatePassword(profile, password)) { setError('Senha incorreta para este perfil'); return; }
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
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass border border-slate-700 rounded-lg p-6 sm:p-8 text-center">
          <div className="animate-spin w-10 h-10 sm:w-12 sm:h-12 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4 sm:mb-6"></div>
          <p className="text-slate-200 text-base sm:text-lg font-semibold">A entrar no sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto p-4 py-8 flex flex-col items-center justify-start">
      <div className="fixed top-4 right-4 z-10 hidden sm:block"><ThemeSwitcher /></div>
      <div className="flex justify-end w-full mb-2 sm:hidden"><ThemeSwitcher /></div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-5xl text-center"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mb-8 sm:mb-12"
        >
          <div className="flex items-center justify-center">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/dc340a4ed_LogoGeomtricoATLAScomOlhoCircular-Photoroom.png"
              alt="ATLAS"
              className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 object-contain drop-shadow-xl"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-6 mb-4 sm:mb-8"
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
                onClick={() => { setSelectedProfile(key); setPassword(''); setError(''); }}
                className={`glass border-2 rounded-lg p-3 sm:p-6 md:p-8 text-center min-h-[48px] transition-all hover:scale-[1.02] ${
                  isSelected ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <ProfileIcon className={`w-9 h-9 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto mb-2 sm:mb-6 ${isSelected ? 'text-amber-400' : 'text-slate-300'}`} />
                <h3 className={`font-bold text-sm sm:text-xl mb-1 sm:mb-3 ${isSelected ? 'text-amber-400' : 'text-slate-100'}`}>{profile.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400">{profile.description}</p>
              </motion.button>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-6 mb-6 sm:mb-12"
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
                onClick={() => { setSelectedProfile(key); setPassword(''); setError(''); }}
                className={`glass border-2 rounded-lg p-3 sm:p-6 md:p-8 text-center min-h-[48px] transition-all hover:scale-[1.02] ${
                  isSelected ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <ProfileIcon className={`w-9 h-9 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto mb-2 sm:mb-6 ${isSelected ? 'text-amber-400' : 'text-slate-300'}`} />
                <h3 className={`font-bold text-sm sm:text-xl mb-1 sm:mb-3 ${isSelected ? 'text-amber-400' : 'text-slate-100'}`}>{profile.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400">{profile.description}</p>
              </motion.button>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="max-w-md mx-auto"
        >
          <form onSubmit={handleLogin} className="glass border border-slate-700 rounded-lg p-4 sm:p-8 md:p-10">
            <div className="mb-4 sm:mb-8">
              <div className="flex items-center gap-3 mb-4 sm:mb-8 justify-center">
                <Lock className="w-6 h-6 text-slate-300" />
                <h3 className="text-xl font-bold text-slate-100">Autenticação</h3>
              </div>

              <div className="text-left mb-6">
                <label className="block text-sm font-semibold text-slate-200 mb-3">
                  Senha do perfil {PROFILES[selectedProfile]?.title}
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Digite a senha"
                  className="w-full h-12 text-base sm:text-lg bg-slate-900 border-slate-700 text-slate-100 focus:border-amber-500"
                  autoFocus
                />
              </div>

              {error && (
                <Alert variant="destructive" className="mb-6 bg-red-500/10 border-red-500/30 text-red-400">
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={!selectedProfile || !password || isLogging}
                className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-lg font-bold rounded-lg shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none"
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