
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Download, Upload, Database, AlertCircle, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { FrotaACP } from '@/entities/all';

const BackupManager = ({ onBackupComplete }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Generate CSV content from machines data
  const generateCSV = (machines) => {
    const headers = [
      'ID',
      'Origem',
      'Modelo',
      'Serie',
      'Ano',
      'Estado',
      'Categoria',
      'Reserva_Cliente',
      'Reserva_Data',
      'Mastro',
      'Vias_Mastro',
      'Cor_Pneus',
      'Joystick',
      'Acessorio',
      'Data_Criacao',
      'Data_Atualizacao'
    ];

    const rows = machines.map(machine => [
      machine.id || '',
      machine.origem || '',
      machine.modelo || '',
      machine.serie || '',
      machine.ano || '',
      machine.estado || '',
      machine.categoria || '',
      machine.reserva?.cliente || '',
      machine.reserva?.data || '',
      machine.caracteristicas?.mastro || '',
      machine.caracteristicas?.viasMastro || '',
      machine.caracteristicas?.corPneus || '',
      machine.caracteristicas?.joystick || '',
      machine.caracteristicas?.acessorio || '',
      machine.created_date || '',
      machine.updated_date || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return csvContent;
  };

  // Download CSV file
  const downloadCSV = (csvContent) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `atlas_frota_backup_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export backup
  const handleExportBackup = async () => {
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      setExportProgress(25);
      const machines = await FrotaACP.list();
      
      setExportProgress(50);
      const csvContent = generateCSV(machines);
      
      setExportProgress(75);
      downloadCSV(csvContent);
      
      setExportProgress(100);
      
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        if (onBackupComplete) onBackupComplete(`Backup criado com ${machines.length} máquinas`);
      }, 1000);
      
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      setIsExporting(false);
      alert('Erro ao criar backup. Tente novamente.');
    }
  };

  // Parse CSV content
  const parseCSV = (csvContent) => {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) throw new Error('Arquivo CSV inválido');
    
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const expectedHeaders = ['ID', 'Origem', 'Modelo', 'Serie', 'Ano', 'Estado', 'Categoria'];
    
    if (!expectedHeaders.every(h => headers.includes(h))) {
      throw new Error('Formato de backup inválido');
    }
    
    const machines = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
      if (values.length !== headers.length) continue;
      
      const machine = {};
      headers.forEach((header, index) => {
        const value = values[index];
        
        switch (header) {
          case 'ID':
            // Skip ID for new imports
            break;
          case 'Origem':
            machine.origem = value;
            break;
          case 'Modelo':
            machine.modelo = value;
            break;
          case 'Serie':
            machine.serie = value;
            break;
          case 'Ano':
            machine.ano = value ? parseInt(value) : null;
            break;
          case 'Estado':
            machine.estado = value || 'Disponível';
            break;
          case 'Categoria':
            machine.categoria = value;
            break;
          case 'Reserva_Cliente':
            if (value) {
              if (!machine.reserva) machine.reserva = {};
              machine.reserva.cliente = value;
            }
            break;
          case 'Reserva_Data':
            if (value) {
              if (!machine.reserva) machine.reserva = {};
              machine.reserva.data = value;
            }
            break;
          case 'Mastro':
          case 'Vias_Mastro':
          case 'Cor_Pneus':
          case 'Joystick':
          case 'Acessorio':
            if (value) {
              if (!machine.caracteristicas) machine.caracteristicas = {};
              const key = header.toLowerCase().replace('_', '');
              if (key === 'viasmastro') {
                machine.caracteristicas.viasMastro = parseInt(value);
              } else if (key === 'corpneus') {
                machine.caracteristicas.corPneus = value;
              } else {
                machine.caracteristicas[key] = value;
              }
            }
            break;
        }
      });
      
      if (machine.modelo && machine.serie) {
        machines.push(machine);
      }
    }
    
    return machines;
  };

  // Import backup
  const handleImportBackup = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setIsImporting(true);
    setImportProgress(0);
    setImportResults(null);
    
    try {
      setImportProgress(10);
      
      const csvContent = await file.text();
      setImportProgress(25);
      
      const machines = parseCSV(csvContent);
      setImportProgress(50);
      
      let imported = 0;
      let skipped = 0;
      
      for (let i = 0; i < machines.length; i++) {
        try {
          await FrotaACP.create(machines[i]);
          imported++;
        } catch (error) {
          console.log(`Máquina ${machines[i].serie} pulada:`, error);
          skipped++;
        }
        
        setImportProgress(50 + ((i + 1) / machines.length) * 40);
      }
      
      setImportProgress(100);
      setImportResults({ imported, skipped, total: machines.length });
      
      if (onBackupComplete) {
        onBackupComplete(`Restauro completo: ${imported} máquinas importadas, ${skipped} puladas`);
      }
      
    } catch (error) {
      console.error('Erro ao restaurar backup:', error);
      alert(`Erro ao restaurar backup: ${error.message}`);
    }
    
    setIsImporting(false);
    
    // Reset file input
    event.target.value = '';
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline"
          className="px-6 py-2 angled-clip bg-white/60 backdrop-blur-md border border-white/40 text-orange-600 hover:bg-white/80 font-medium transition-colors"
        >
          <Database className="w-4 h-4 mr-2" />
          Backup & Restore
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl bg-white/80 backdrop-blur-xl border border-white/40">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Gestão de Backup da Frota
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Export Section */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-600" />
              Criar Backup
            </h3>
            <p className="text-sm text-gray-600">
              Exporta todas as máquinas da frota para uma planilha CSV com todas as características técnicas.
            </p>
            
            {isExporting && (
              <div className="space-y-2">
                <Progress value={exportProgress} className="w-full" />
                <p className="text-sm text-gray-500">Criando backup... {exportProgress}%</p>
              </div>
            )}
            
            <Button 
              onClick={handleExportBackup} 
              disabled={isExporting}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              {isExporting ? 'Criando Backup...' : 'Criar Backup da Frota'}
            </Button>
          </div>
          
          <div className="border-t pt-6">
            {/* Import Section */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Upload className="w-5 h-5 text-green-600" />
                Restaurar Backup
              </h3>
              <p className="text-sm text-gray-600">
                Importa máquinas de um arquivo CSV de backup. <strong>Atenção:</strong> Isso irá adicionar as máquinas à frota existente.
              </p>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Certifique-se de que o arquivo é um backup válido criado pelo sistema ATLAS.
                </AlertDescription>
              </Alert>
              
              {isImporting && (
                <div className="space-y-2">
                  <Progress value={importProgress} className="w-full" />
                  <p className="text-sm text-gray-500">Restaurando backup... {importProgress}%</p>
                </div>
              )}
              
              {importResults && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Restauro concluído: {importResults.imported} máquinas importadas, {importResults.skipped} puladas de {importResults.total} total.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-4 text-gray-500" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Clique para restaurar</span> ou arraste o arquivo
                    </p>
                    <p className="text-xs text-gray-500">CSV (MAX. 50MB)</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".csv"
                    onChange={handleImportBackup}
                    disabled={isImporting}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BackupManager;
