import { useState } from 'react';
import useProjectStore from './store/useProjectStore';
import FileUploader from './components/FileUploader';
import RenderUploader from './components/RenderUploader';
import Button from './components/ui/Button';
import Card from './components/ui/Card';
import Input from './components/ui/Input';
import { analyzePlanImage, analyzeDevisPdf, fileToBase64 } from './services/claudeService';
import { parseDevisPdf } from './services/pdfParser';
import { generatePdf, downloadPdf } from './services/pdfBuilder';

function UploadStep() {
  const { files, setFile, addRender, removeRender } = useProjectStore();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <Card title="Logo (PNG)">
          <FileUploader
            onFileSelect={(f) => setFile('logo', f)}
            accept="image/png"
            label=""
            file={files.logo}
          />
        </Card>
        <Card title="Rendu 3D Principal">
          <FileUploader
            onFileSelect={(f) => {
              if (files.renders.length === 0) {
                addRender(f);
              } else {
                setFile('renders', [f, ...files.renders.slice(1)]);
              }
            }}
            accept="image/*"
            label=""
            file={files.renders[0]}
          />
        </Card>
      </div>

      <Card title="Autres Rendus 3D (max 6)">
        <RenderUploader
          files={files.renders}
          onAdd={addRender}
          onRemove={removeRender}
          maxFiles={6}
        />
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <Card title="Plan de Distribution 2D">
          <FileUploader
            onFileSelect={(f) => setFile('plan2d', f)}
            accept="image/*"
            label=""
            file={files.plan2d}
          />
        </Card>
        <Card title="PDF Référence (Devis)">
          <FileUploader
            onFileSelect={(f) => setFile('devisPdf', f)}
            accept="application/pdf"
            label=""
            file={files.devisPdf}
          />
        </Card>
      </div>
    </div>
  );
}

function AnalyzeStep() {
  const { files, planData, setPlanData, devisData, setDevisData, isAnalyzing, setAnalyzing, setAnalysisError, analysisError, apiKey, setApiKey } = useProjectStore();
  const [manualEdit, setManualEdit] = useState(false);

  const handleAnalyze = async () => {
    if (!apiKey) {
      setAnalysisError('Veuillez entrer votre clé API Anthropic');
      return;
    }
    
    setAnalyzing(true);
    setAnalysisError(null);

    try {
      if (files.plan2d) {
        const planBase64 = await fileToBase64(files.plan2d);
        const result = await analyzePlanImage(planBase64, apiKey);
        setPlanData(result);
      }

      if (files.devisPdf) {
        try {
          const devisResult = await parseDevisPdf(files.devisPdf);
          setDevisData(devisResult);
        } catch (e) {
          console.error('PDF parsing failed, using AI:', e);
          const devisBase64 = await fileToBase64(files.devisPdf);
          const aiResult = await analyzeDevisPdf(devisBase64, apiKey);
          setDevisData(aiResult);
        }
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisError(error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const updateComposition = (index, field, value) => {
    const newComposition = [...planData.composition];
    newComposition[index] = { ...newComposition[index], [field]: value };
    setPlanData({ composition: newComposition });
  };

  const addCompositionLine = () => {
    setPlanData({
      composition: [...planData.composition, { nom: '', surface: 0 }]
    });
  };

  return (
    <div className="space-y-6">
      <Card title="Analyse Automatique">
        <div className="mb-4">
          <Input
            label="Clé API Anthropic"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-api03-..."
            type="password"
          />
          <p className="text-xs text-brown opacity-70 mt-1">
            Votre clé API est stockée localement dans votre navigateur.
          </p>
        </div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-brown">
            L'IA va analyser le plan 2D et le PDF devis pour extraire les données.
          </p>
          <Button onClick={handleAnalyze} disabled={isAnalyzing || (!files.plan2d && !files.devisPdf) || !apiKey}>
            {isAnalyzing ? 'Analyse en cours...' : '🔍 Analyser avec IA'}
          </Button>
        </div>
        {analysisError && (
          <div className="p-3 bg-red-100 border border-red-500 rounded-lg text-red-700 text-sm">
            Erreur: {analysisError}
          </div>
        )}
      </Card>

      <Card title="Données du Plan">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Input
            label="Code Plan"
            value={planData.codePlan}
            onChange={(e) => setPlanData({ codePlan: e.target.value })}
            placeholder="Ex: V6-002"
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-brown">Type</label>
            <select
              value={planData.type}
              onChange={(e) => setPlanData({ type: e.target.value })}
              className="px-4 py-2 border-2 border-brown rounded-lg bg-white focus:outline-none focus:border-gold"
            >
              <option value="Villa">Villa</option>
              <option value="Duplex">Duplex</option>
            </select>
          </div>
          <Input
            label="Surface (m²)"
            value={planData.surface}
            onChange={(e) => setPlanData({ surface: e.target.value })}
            placeholder="Ex: 125"
          />
          <Input
            label="Chambres"
            value={planData.chambres}
            onChange={(e) => setPlanData({ chambres: parseInt(e.target.value) || 0 })}
            type="number"
          />
          <Input
            label="Pièces"
            value={planData.pieces}
            onChange={(e) => setPlanData({ pieces: parseInt(e.target.value) || 0 })}
            type="number"
          />
        </div>

        <div className="mb-4">
          <label className="text-sm font-semibold text-brown block mb-2">Description</label>
          <textarea
            value={planData.description}
            onChange={(e) => setPlanData({ description: e.target.value })}
            className="w-full px-4 py-2 border-2 border-brown rounded-lg bg-white focus:outline-none focus:border-gold h-24"
            placeholder="Description générée par IA ou saisie manuelle..."
          />
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-brown">Composition</label>
            <button onClick={addCompositionLine} className="text-sm text-gold hover:text-brown">+ Ajouter</button>
          </div>
          <div className="space-y-2">
            {planData.composition?.map((item, i) => (
              <div key={i} className="grid grid-cols-3 gap-2">
                <input
                  value={item.nom}
                  onChange={(e) => updateComposition(i, 'nom', e.target.value)}
                  placeholder="Pièce"
                  className="px-3 py-1 border border-brown rounded text-sm"
                />
                <input
                  value={item.surface}
                  onChange={(e) => updateComposition(i, 'surface', e.target.value)}
                  placeholder="Surface"
                  type="number"
                  className="px-3 py-1 border border-brown rounded text-sm"
                />
                <span className="flex items-center text-sm text-brown">m²</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card title="Données du Devis">
        <div className="grid grid-cols-4 gap-4 mb-4">
          <Input
            label="Total HT"
            value={devisData.totalHT}
            onChange={(e) => setDevisData({ totalHT: parseFloat(e.target.value) || 0 })}
            type="number"
          />
          <Input
            label="TVA (20%)"
            value={devisData.tva}
            onChange={(e) => setDevisData({ tva: parseFloat(e.target.value) || 0 })}
            type="number"
          />
          <Input
            label="Total TTC"
            value={devisData.totalTTC}
            onChange={(e) => setDevisData({ totalTTC: parseFloat(e.target.value) || 0 })}
            type="number"
          />
          <Input
            label="Date Devis"
            value={devisData.dateDevis}
            onChange={(e) => setDevisData({ dateDevis: e.target.value })}
            placeholder="15/04/2025"
          />
        </div>

        <div className="mb-2">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-brown">Lignes du devis</label>
            <button
              onClick={() => setDevisData({ lignes: [...devisData.lignes, { numero: devisData.lignes.length + 1, designation: '', quantite: 1, prixUnitaire: 0, total: 0 }] })}
              className="text-sm text-gold hover:text-brown"
            >
              + Ajouter ligne
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto border border-brown rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-brown text-white">
                <tr>
                  <th className="p-2 text-left">N°</th>
                  <th className="p-2 text-left">Désignation</th>
                  <th className="p-2 text-right">Qté</th>
                  <th className="p-2 text-right">Prix U.</th>
                  <th className="p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {devisData.lignes?.map((ligne, i) => (
                  <tr key={i} className="border-t border-brown">
                    <td className="p-2">{ligne.numero || i + 1}</td>
                    <td className="p-2">
                      <input
                        value={ligne.designation}
                        onChange={(e) => {
                          const newLignes = [...devisData.lignes];
                          newLignes[i] = { ...newLignes[i], designation: e.target.value };
                          setDevisData({ lignes: newLignes });
                        }}
                        className="w-full bg-transparent border-none focus:outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={ligne.quantite}
                        onChange={(e) => {
                          const newLignes = [...devisData.lignes];
                          newLignes[i] = { ...newLignes[i], quantite: parseInt(e.target.value) || 1 };
                          setDevisData({ lignes: newLignes });
                        }}
                        className="w-full bg-transparent border-none text-right focus:outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={ligne.prixUnitaire}
                        onChange={(e) => {
                          const newLignes = [...devisData.lignes];
                          newLignes[i] = { ...newLignes[i], prixUnitaire: parseFloat(e.target.value) || 0 };
                          setDevisData({ lignes: newLignes });
                        }}
                        className="w-full bg-transparent border-none text-right focus:outline-none"
                      />
                    </td>
                    <td className="p-2 text-right">{ligne.total?.toLocaleString() || 0} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}

function CustomizeStep() {
  const { clientData, setClientData, pdfOptions, setPdfOptions } = useProjectStore();

  return (
    <div className="space-y-6">
      <Card title="Informations Client">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nom complet"
            value={clientData.nom}
            onChange={(e) => setClientData({ nom: e.target.value })}
            placeholder="Dupont Jean"
          />
          <Input
            label="Email"
            value={clientData.email}
            onChange={(e) => setClientData({ email: e.target.value })}
            placeholder="jean.dupont@email.com"
            type="email"
          />
          <Input
            label="Téléphone"
            value={clientData.telephone}
            onChange={(e) => setClientData({ telephone: e.target.value })}
            placeholder="+33 6 12 34 56 78"
            type="tel"
          />
        </div>
      </Card>

      <Card title="Options PDF">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-brown block mb-2">Format de page</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="portrait"
                  checked={pdfOptions.format === 'portrait'}
                  onChange={() => setPdfOptions({ format: 'portrait' })}
                  className="w-4 h-4 accent-brown"
                />
                <span>📄 Portrait</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="landscape"
                  checked={pdfOptions.format === 'landscape'}
                  onChange={() => setPdfOptions({ format: 'landscape' })}
                  className="w-4 h-4 accent-brown"
                />
                <span>📄 Paysage</span>
              </label>
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={pdfOptions.includeLogo}
                onChange={(e) => setPdfOptions({ includeLogo: e.target.checked })}
                className="w-4 h-4 accent-brown"
              />
              <span>Inclure le logo</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={pdfOptions.watermark}
                onChange={(e) => setPdfOptions({ watermark: e.target.checked })}
                className="w-4 h-4 accent-brown"
              />
              <span>Filigrane avec nom client</span>
            </label>
          </div>
        </div>
      </Card>
    </div>
  );
}

function GenerateStep() {
  const { files, planData, devisData, clientData, pdfOptions, isGenerating, setGenerating } = useProjectStore();
  const [error, setError] = useState(null);

  const filename = `PLAN-BASIQUE-${planData.codePlan || 'XXXX'}-${clientData.nom ? clientData.nom.toUpperCase().replace(/\s+/g, '-') : 'CLIENT'}.pdf`;

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      let planImageData = null;
      if (files.renders[0]) {
        planImageData = await fileToBase64(files.renders[0]);
      }

      const pdfBytes = await generatePdf({
        files,
        planData: { ...planData, imageData: planImageData },
        devisData,
        clientData,
        pdfOptions,
      });

      downloadPdf(pdfBytes, filename);
    } catch (err) {
      console.error('PDF generation error:', err);
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card title="Récapitulatif">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="font-bold text-brown mb-2">Plan</h4>
            <ul className="text-sm space-y-1">
              <li>Code: <span className="font-semibold">{planData.codePlan || '—'}</span></li>
              <li>Type: <span className="font-semibold">{planData.type}</span></li>
              <li>Surface: <span className="font-semibold">{planData.surface || '—'} m²</span></li>
              <li>Chambres: <span className="font-semibold">{planData.chambres || 0}</span></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-brown mb-2">Client</h4>
            <ul className="text-sm space-y-1">
              <li>Nom: <span className="font-semibold">{clientData.nom || '—'}</span></li>
              <li>Email: <span className="font-semibold">{clientData.email || '—'}</span></li>
              <li>Tél: <span className="font-semibold">{clientData.telephone || '—'}</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-brown">
          <h4 className="font-bold text-brown mb-2">Contenu du PDF</h4>
          <ul className="text-sm grid grid-cols-2 gap-1">
            <li>✓ Page de couverture</li>
            <li>✓ Description + Composition</li>
            <li>✓ Plan de distribution</li>
            <li>✓ {files.renders.length} Rendu(s) 3D</li>
            <li>✓ Devis ({devisData.lignes.length} lignes)</li>
            <li>✓ Format: {pdfOptions.format}</li>
          </ul>
        </div>
      </Card>

      <Card title="Génération">
        <div className="text-center">
          <p className="text-sm text-brown mb-4">
            Fichier: <span className="font-semibold">{filename}</span>
          </p>
          {error && (
            <div className="p-3 bg-red-100 border border-red-500 rounded-lg text-red-700 text-sm mb-4">
              Erreur: {error}
            </div>
          )}
          <Button onClick={handleGenerate} disabled={isGenerating} className="text-lg px-8 py-4">
            {isGenerating ? '⏳ Génération en cours...' : '📄 Générer et Télécharger le PDF'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function StepIndicator({ currentStep, steps }) {
  return (
    <div className="flex justify-center mb-8">
      <div className="flex items-center gap-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all
                ${i === currentStep ? 'bg-brown text-white scale-110' :
                  i < currentStep ? 'bg-gold text-white' : 'bg-cream border-2 border-brown text-brown'}`}
            >
              {i < currentStep ? '✓' : i + 1}
            </div>
            <span className={`ml-2 text-sm font-semibold ${i === currentStep ? 'text-brown' : 'text-brown opacity-60'}`}>
              {step}
            </span>
            {i < steps.length - 1 && <div className="w-8 h-0.5 bg-brown mx-2 opacity-30" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function App() {
  const { currentStep, setStep, files, reset } = useProjectStore();
  const steps = ['Upload', 'Analyser', 'Personnaliser', 'Générer'];

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return files.plan2d;
      case 1:
        return true;
      case 2:
        return true;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-cream py-8 px-4">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-brown mb-2">PLAN BASIQUE + DEVIS</h1>
        <p className="text-gold font-semibold">wooplans</p>
      </header>

      <StepIndicator currentStep={currentStep} steps={steps} />

      <main className="max-w-4xl mx-auto">
        <div className="mb-6">
          {currentStep === 0 && <UploadStep />}
          {currentStep === 1 && <AnalyzeStep />}
          {currentStep === 2 && <CustomizeStep />}
          {currentStep === 3 && <GenerateStep />}
        </div>

        <div className="flex justify-between">
          <Button variant="secondary" onClick={handlePrev} disabled={currentStep === 0}>
            ← Précédent
          </Button>
          {currentStep < steps.length - 1 && (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Suivant →
            </Button>
          )}
        </div>

        <div className="mt-8 text-center">
          <button onClick={reset} className="text-sm text-brown opacity-60 hover:opacity-100 underline">
            Réinitialiser tout
          </button>
        </div>
      </main>

      <footer className="text-center mt-12 text-sm text-brown opacity-60">
        © 2025 wooplans · Tous droits réservés
      </footer>
    </div>
  );
}

export default App;