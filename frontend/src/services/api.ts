import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
})

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth()
      // Don't redirect here - let components handle it
      // window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: async (username: string, password: string) => {
    // Send as URL-encoded form data (matching FastAPI's OAuth2PasswordRequestForm)
    const params = new URLSearchParams()
    params.append('username', username)
    params.append('password', password)

    const response = await api.post('/token', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    return response.data
  },

  getCurrentUser: async () => {
    const response = await api.get('/users/me')
    return response.data
  },
}

export const excelAPI = {
  checkExistingFile: async () => {
    const response = await api.get('/excel/check')
    return response.data
  },

  loadExcel: async () => {
    const response = await api.get('/excel/load')
    return response.data
  },

  uploadExcel: async (file: File) => {
    // Try base64 encoding for Gen2 Cloud Functions compatibility
    try {
      // Convert file to base64
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1]
          resolve(base64)
        }
        reader.onerror = reject
      })
      reader.readAsDataURL(file)

      const base64Data = await base64Promise

      // Send as JSON with base64 encoded file
      const response = await api.post('/excel/upload', {
        file: base64Data,
        filename: file.name
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      return response.data
    } catch (error) {
      console.log('Base64 upload failed, trying multipart...')

      // Fallback to multipart upload
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post('/excel/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    }
  },

  updateExcel: async (sheetData: any) => {
    const response = await api.put('/excel/update', sheetData)
    return response.data
  },

  uploadOrderReceipt: async (file: File) => {
    // Try base64 encoding for Gen2 Cloud Functions compatibility
    try {
      // Convert file to base64
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1]
          resolve(base64)
        }
        reader.onerror = reject
      })
      reader.readAsDataURL(file)

      const base64Data = await base64Promise

      // Send as JSON with base64 encoded file
      const response = await api.post('/excel/upload-order-receipt', {
        file: base64Data,
        filename: file.name
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      return response.data
    } catch (error) {
      console.log('Base64 upload failed, trying multipart...')

      // Fallback to multipart upload
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post('/excel/upload-order-receipt', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    }
  },

  uploadReceiptSlip: async (file: File) => {
    // Try base64 encoding for Gen2 Cloud Functions compatibility
    try {
      // Convert file to base64
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1]
          resolve(base64)
        }
        reader.onerror = reject
      })
      reader.readAsDataURL(file)

      const base64Data = await base64Promise

      // Send as JSON with base64 encoded file
      const response = await api.post('/excel/upload-receipt-slip', {
        file: base64Data,
        filename: file.name
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      return response.data
    } catch (error) {
      console.log('Base64 upload failed, trying multipart...')

      // Fallback to multipart upload
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post('/excel/upload-receipt-slip', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    }
  },

  saveDailyOrder: async (orderData: {
    date: string
    order_type: string
    sheet_name: string
    data: any[][]
    columns: string[]
    notes?: string
  }) => {
    const response = await api.post('/daily-orders/save', orderData)
    return response.data
  },

  exportExcel: async (exportData: {
    data: any[][]
    file_name: string
    sheet_name: string
    columns?: string[]
  }) => {
    // Cloud Function ignores columns, but FastAPI backend expects them
    const { data, file_name, sheet_name, columns } = exportData
    const payload = columns ? { data, file_name, sheet_name, columns } : { data, file_name, sheet_name }
    const response = await api.post('/excel/export', payload, {
      responseType: 'blob',
    })
    return response.data
  },
}

export const workDraftAPI = {
  saveDraft: async (draftData: {
    draft_type: string
    sheets_data: any[]
    selected_sheet: number
    row_colors: { [key: number]: string }
    row_text_colors: { [key: number]: string }
    duplicate_products: { [key: number]: string }
    is_order_receipt_uploaded: boolean
    is_receipt_slip_uploaded: boolean
    checked_rows?: { [key: number]: boolean }
    hide_checked?: boolean
    description?: string
    session_id?: string
  }) => {
    const response = await api.post('/work-drafts/save', draftData)
    return response.data
  },

  loadDraft: async (draftType: string) => {
    const response = await api.get(`/work-drafts/load?draft_type=${draftType}`)
    return response.data
  },

  deleteDraft: async (draftType: string) => {
    const response = await api.delete(`/work-drafts/delete?draft_type=${draftType}`)
    return response.data
  },

  cleanupExpired: async () => {
    const response = await api.post('/work-drafts/cleanup-expired')
    return response.data
  },
}

export const paymentAPI = {
  savePaymentData: async (paymentData: {
    payment_date: string
    data: any[][]
    created_by?: string
  }) => {
    const response = await api.post('/payments/save', paymentData)
    return response.data
  },

  getPaymentsByDate: async (paymentDate: string) => {
    const response = await api.get(`/payments/date/${paymentDate}`)
    return response.data
  },

  getPaymentsByDateRange: async (startDate: string, endDate: string) => {
    const response = await api.get(`/payments/range?start=${startDate}&end=${endDate}`)
    return response.data
  },

  deletePaymentRecords: async (paymentIds: number[]) => {
    const response = await api.delete('/payments/delete', { data: paymentIds })
    return response.data
  },
}

export const savedFilesAPI = {
  saveThreeFiles: async (filesData: {
    date: string  // MMDD 형식
    matched_data: {
      data: any[][]
      columns: string[]
      row_colors: { [key: number]: string }
      row_text_colors: { [key: number]: string }
    }
    normal_data: {
      data: any[][]
      columns: string[]
      row_colors: { [key: number]: string }
      row_text_colors: { [key: number]: string }
    }
    error_data: {
      data: any[][]
      columns: string[]
      row_colors: { [key: number]: string }
      row_text_colors: { [key: number]: string }
    }
    created_by: string
  }) => {
    const response = await api.post('/files/save-three-files', filesData)
    return response.data
  },

  listFiles: async () => {
    const response = await api.get('/files/list')
    return response.data
  },

  viewFile: async (fileId: number) => {
    const response = await api.get(`/files/view/${fileId}`)
    return response.data
  },

  downloadFile: async (fileId: number, fileName: string) => {
    const response = await api.get(`/files/download/${fileId}`, {
      responseType: 'blob'
    })

    // 다운로드 처리
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    return { success: true }
  }
}

// Order Management API
export const ordersAPI = {
  saveOrders: async (orderData: {
    order_date: string
    company_name: string
    order_type: string
    items: any[]
  }) => {
    const response = await api.post('/orders/save', orderData)
    return response.data
  },

  listOrders: async () => {
    const response = await api.get('/orders/list')
    return response.data
  },

  getOrdersByDate: async (date: string) => {
    const response = await api.get(`/orders/date/${date}`)
    return response.data
  }
}

// Client Management API
export const clientsAPI = {
  uploadClients: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post('/clients/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  listClients: async (search?: string, includeDisabled: boolean = false) => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    params.append('include_disabled', includeDisabled.toString())

    const response = await api.get(`/clients/list?${params.toString()}`)
    return response.data
  },

  getClient: async (clientId: number) => {
    const response = await api.get(`/clients/${clientId}`)
    return response.data
  },

  updateClient: async (clientId: number, clientData: any) => {
    const response = await api.put(`/clients/${clientId}`, clientData)
    return response.data
  },

  deleteClient: async (clientId: number) => {
    const response = await api.delete(`/clients/${clientId}`)
    return response.data
  }
}

export default api
