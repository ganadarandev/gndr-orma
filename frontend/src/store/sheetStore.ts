import { create } from 'zustand'

interface Sheet {
  sheet_name: string
  sheet_type?: string
  data: any[][]
  columns: string[]
  rows: number
  cols: number
  file_path?: string
  loaded_at?: string
}

interface SheetState {
  sheets: Sheet[]
  currentSheet: number
  loadedFiles: Record<string, Sheet[]>
  editableData: any[][]
  hasChanges: boolean

  setSheets: (sheets: Sheet[]) => void
  setCurrentSheet: (index: number) => void
  addLoadedFile: (fileName: string, sheets: Sheet[]) => void
  updateEditableData: (data: any[][]) => void
  setHasChanges: (hasChanges: boolean) => void
  getSheetByType: (type: string) => Sheet | undefined
  clearSheets: () => void
}

export const useSheetStore = create<SheetState>((set, get) => ({
  sheets: [],
  currentSheet: 0,
  loadedFiles: {},
  editableData: [],
  hasChanges: false,

  setSheets: (sheets) => set({ sheets, currentSheet: 0, editableData: sheets[0]?.data || [] }),

  setCurrentSheet: (index) => {
    const sheets = get().sheets
    if (sheets[index]) {
      set({ currentSheet: index, editableData: sheets[index].data })
    }
  },

  addLoadedFile: (fileName, sheets) => {
    const loadedFiles = { ...get().loadedFiles }
    loadedFiles[fileName] = sheets
    set({ loadedFiles })
  },

  updateEditableData: (data) => set({ editableData: data, hasChanges: true }),

  setHasChanges: (hasChanges) => set({ hasChanges }),

  getSheetByType: (type) => {
    return get().sheets.find(sheet => sheet.sheet_type === type)
  },

  clearSheets: () => set({ sheets: [], currentSheet: 0, editableData: [], hasChanges: false })
}))