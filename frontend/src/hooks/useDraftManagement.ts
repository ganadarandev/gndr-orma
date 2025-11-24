import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { workDraftAPI } from '../services/api'
import { SheetData } from './useSheetManagement'

/**
 * useDraftManagement Hook
 *
 * 임시 저장 관리 로직
 */
export const useDraftManagement = () => {
  const navigate = useNavigate()

  // 작업 이탈 방지 관련 state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const isNavigatingRef = useRef(false)
  const initialLoadRef = useRef(true)

  /**
   * 중간 저장 함수
   */
  const saveDraft = useCallback(async (params: {
    sheets: SheetData[]
    selectedSheet: number
    rowColors: {[key: number]: string}
    rowTextColors: {[key: number]: string}
    duplicateProducts: {[key: number]: string}
    isOrderReceiptUploaded: boolean
    isReceiptSlipUploaded: boolean
    checkedRows: {[key: number]: boolean}
  }) => {
    try {
      await workDraftAPI.saveDraft({
        draft_type: 'spreadsheet',
        sheets_data: params.sheets,
        selected_sheet: params.selectedSheet,
        row_colors: params.rowColors,
        row_text_colors: params.rowTextColors,
        duplicate_products: params.duplicateProducts,
        is_order_receipt_uploaded: params.isOrderReceiptUploaded,
        is_receipt_slip_uploaded: params.isReceiptSlipUploaded,
        checked_rows: params.checkedRows,
        description: '작업 중간 저장',
        session_id: Date.now().toString()
      })

      toast.success('작업이 중간 저장되었습니다')
      setHasUnsavedChanges(false)
      return true
    } catch (error) {
      console.error('Error saving draft:', error)
      toast.error('중간 저장 중 오류가 발생했습니다')
      return false
    }
  }, [])

  /**
   * 임시 저장 데이터 불러오기
   */
  const loadDraft = useCallback(async (params: {
    onSuccess: (draftData: {
      sheets: SheetData[]
      selectedSheet: number
      rowColors: {[key: number]: string}
      rowTextColors: {[key: number]: string}
      duplicateProducts: {[key: number]: string}
      isOrderReceiptUploaded: boolean
      isReceiptSlipUploaded: boolean
      checkedRows: {[key: number]: boolean}
    }) => void
  }) => {
    try {
      const response = await workDraftAPI.loadDraft('spreadsheet')

      if (response.has_draft && response.draft) {
        const draft = response.draft

        params.onSuccess({
          sheets: draft.sheets_data || [],
          selectedSheet: draft.selected_sheet || 0,
          rowColors: draft.row_colors || {},
          rowTextColors: draft.row_text_colors || {},
          duplicateProducts: draft.duplicate_products || {},
          isOrderReceiptUploaded: draft.is_order_receipt_uploaded || false,
          isReceiptSlipUploaded: draft.is_receipt_slip_uploaded || false,
          checkedRows: draft.checked_rows || {}
        })

        toast.success('임시 저장된 작업을 불러왔습니다')
        return true
      }
      return false
    } catch (error) {
      console.error('Error loading draft:', error)
      return false
    }
  }, [])

  /**
   * 임시 저장된 데이터 확인 (초기 로드 시)
   */
  const checkForDraft = useCallback(async (params: {
    onLoad: (draftData: {
      sheets: SheetData[]
      selectedSheet: number
      rowColors: {[key: number]: string}
      rowTextColors: {[key: number]: string}
      duplicateProducts: {[key: number]: string}
      isOrderReceiptUploaded: boolean
      isReceiptSlipUploaded: boolean
      checkedRows: {[key: number]: boolean}
    }) => void
  }) => {
    try {
      const response = await workDraftAPI.loadDraft('spreadsheet')
      if (response.has_draft) {
        const shouldLoad = window.confirm(
          `${response.draft.updated_at}에 저장된 작업이 있습니다.\n불러오시겠습니까?`
        )
        if (shouldLoad) {
          await loadDraft({
            onSuccess: params.onLoad
          })
        }
      }
    } catch (error) {
      console.error('Error checking for draft:', error)
    }
  }, [loadDraft])

  /**
   * 중간 저장 모달 핸들러 (저장 후 이동)
   */
  const handleSaveDraftAndNavigate = async (params: {
    sheets: SheetData[]
    selectedSheet: number
    rowColors: {[key: number]: string}
    rowTextColors: {[key: number]: string}
    duplicateProducts: {[key: number]: string}
    isOrderReceiptUploaded: boolean
    isReceiptSlipUploaded: boolean
    checkedRows: {[key: number]: boolean}
  }) => {
    const success = await saveDraft(params)
    if (success) {
      setShowUnsavedModal(false)
      if (pendingNavigation) {
        isNavigatingRef.current = true
        navigate(pendingNavigation)
      }
    }
  }

  /**
   * 편집 계속하기
   */
  const handleContinueEditing = () => {
    setShowUnsavedModal(false)
    setPendingNavigation(null)
  }

  /**
   * 변경사항 폐기
   */
  const handleDiscardChanges = async () => {
    try {
      await workDraftAPI.deleteDraft('spreadsheet')
      setHasUnsavedChanges(false)
      setShowUnsavedModal(false)

      if (pendingNavigation) {
        isNavigatingRef.current = true
        navigate(pendingNavigation)
      } else {
        // 페이지 새로고침 또는 닫기
        window.location.reload()
      }
    } catch (error) {
      console.error('Error deleting draft:', error)
    }
  }

  /**
   * 로그아웃 핸들러
   */
  const handleLogout = (clearAuth: () => void) => {
    // 작업 중인 내용이 있으면 모달 표시
    if (hasUnsavedChanges) {
      setPendingNavigation('/login')
      setShowUnsavedModal(true)
    } else {
      // 작업 중인 내용이 없으면 바로 로그아웃
      clearAuth()
      toast.success('로그아웃 되었습니다.')
      navigate('/login')
    }
  }

  return {
    // 작업 이탈 방지 상태
    hasUnsavedChanges,
    setHasUnsavedChanges,
    showUnsavedModal,
    setShowUnsavedModal,
    pendingNavigation,
    setPendingNavigation,
    isNavigatingRef,
    initialLoadRef,

    // 임시 저장 핸들러
    saveDraft,
    loadDraft,
    checkForDraft,

    // 모달 핸들러
    handleSaveDraftAndNavigate,
    handleContinueEditing,
    handleDiscardChanges,
    handleLogout
  }
}
