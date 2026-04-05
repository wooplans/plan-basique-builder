import { create } from 'zustand';

const useProjectStore = create((set, get) => ({
  currentStep: 0,
  setStep: (step) => set({ currentStep: step }),

  files: {
    logo: null,
    renders: [],
    plan2d: null,
    devisPdf: null,
  },

  setFile: (type, file) => set((state) => ({
    files: { ...state.files, [type]: file }
  })),

  addRender: (file) => set((state) => {
    if (state.files.renders.length >= 6) return state;
    return { files: { ...state.files, renders: [...state.files.renders, file] } };
  }),

  removeRender: (index) => set((state) => ({
    files: {
      ...state.files,
      renders: state.files.renders.filter((_, i) => i !== index)
    }
  })),

  planData: {
    codePlan: '',
    type: 'Villa',
    surface: '',
    chambres: 0,
    pieces: 0,
    composition: [],
    description: '',
  },

  setPlanData: (data) => set((state) => ({
    planData: { ...state.planData, ...data }
  })),

  devisData: {
    lignes: [],
    totalHT: 0,
    tva: 0,
    totalTTC: 0,
    dateDevis: '',
  },

  setDevisData: (data) => set((state) => ({
    devisData: { ...state.devisData, ...data }
  })),

  clientData: {
    nom: '',
    email: '',
    telephone: '',
  },

  setClientData: (data) => set((state) => ({
    clientData: { ...state.clientData, ...data }
  })),

  pdfOptions: {
    format: 'portrait',
    includeLogo: true,
    watermark: false,
  },

  setPdfOptions: (options) => set((state) => ({
    pdfOptions: { ...state.pdfOptions, ...options }
  })),

  isAnalyzing: false,
  analysisError: null,
  setAnalyzing: (status) => set({ isAnalyzing: status, analysisError: null }),
  setAnalysisError: (error) => set({ analysisError: error }),

  isGenerating: false,
  setGenerating: (status) => set({ isGenerating: status }),

  reset: () => set({
    currentStep: 0,
    files: { logo: null, renders: [], plan2d: null, devisPdf: null },
    planData: { codePlan: '', type: 'Villa', surface: '', chambres: 0, pieces: 0, composition: [], description: '' },
    devisData: { lignes: [], totalHT: 0, tva: 0, totalTTC: 0, dateDevis: '' },
    clientData: { nom: '', email: '', telephone: '' },
    pdfOptions: { format: 'portrait', includeLogo: true, watermark: false },
    isAnalyzing: false,
    analysisError: null,
    isGenerating: false,
  }),
}));

export default useProjectStore;