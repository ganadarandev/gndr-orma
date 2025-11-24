import { useEffect, useState } from 'react'
import { LogOut, Upload, ZoomIn, ZoomOut, FileSpreadsheet, RefreshCw, Save } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import SpreadsheetView from '../components/SpreadsheetView'
import FileManagement from '../components/FileManagement'
import PaymentManagement from './PaymentManagement'
import OrderManagement from './OrderManagement'
import ClientManagement from './ClientManagement'
import UnsavedChangesModal from '../components/UnsavedChangesModal'

// Custom Hooks
import { useSheetManagement } from '../hooks/useSheetManagement'
import { useExcelOperations } from '../hooks/useExcelOperations'
import { usePaymentOperations } from '../hooks/usePaymentOperations'
import { useOrderOperations } from '../hooks/useOrderOperations'
import { useDraftManagement } from '../hooks/useDraftManagement'

// Modal Components
import { PaymentDateModal } from '../components/modals/PaymentDateModal'
import { OrderDateModal } from '../components/modals/OrderDateModal'

function Dashboard() {
  const navigate = useNavigate()
  const { username, clearAuth } = useAuthStore()

  // UI State
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState(100)
  const [activeTab, setActiveTab] = useState<'spreadsheet' | 'fileManagement' | 'paymentManagement' | 'orderManagement' | 'clientManagement'>('spreadsheet')

  // 저장 모달 state
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveFileName, setSaveFileName] = useState('')

  // 거래처 정보 모달 state
  const [showClientInfoModal, setShowClientInfoModal] = useState(false)
  const [selectedClientInfo, setSelectedClientInfo] = useState<any>(null)
  const [loadingClientInfo, setLoadingClientInfo] = useState(false)

  // 되돌리기용 백업 state
  const [backupBeforeDelete, setBackupBeforeDelete] = useState<{
    data: any[][],
    checkedRows: { [key: number]: boolean },
    rowColors: { [key: number]: string },
    rowTextColors: { [key: number]: string }
  } | null>(null)

  // Sheet Management Hook
  const {
    sheets,
    setSheets,
    selectedSheet,
    setSelectedSheet,
    rowColors,
    setRowColors,
    rowTextColors,
    setRowTextColors,
    duplicateProducts,
    setDuplicateProducts,
    checkedRows,
    setCheckedRows,
    editingSheet,
    setEditingSheet,
    editingName,
    setEditingName,
    handleStartEditingSheetName,
    handleSaveSheetName,
    handleCancelEditingSheetName,
    updateCurrentSheetData,
    addSheet,
    removeSheet,
    getCurrentSheetData,
    handleCheckRow
  } = useSheetManagement()

  // Excel Operations Hook
  const {
    isOrderReceiptUploaded,
    setIsOrderReceiptUploaded,
    isReceiptSlipUploaded,
    setIsReceiptSlipUploaded,
    handleFileUpload,
    handleOrderReceiptUpload,
    handleReceiptSlipUpload,
    handleSaveToWeb,
    handleDownloadExcel,
    getFilteredData
  } = useExcelOperations({
    sheets,
    setSheets,
    selectedSheet,
    setRowColors,
    setRowTextColors,
    setDuplicateProducts,
    updateCurrentSheetData
  })

  // Debug logging
  useEffect(() => {
    console.log('Dashboard Rendered. SelectedSheet:', selectedSheet)
    console.log('Sheets:', sheets.length)
    if (sheets[selectedSheet]) {
      console.log('Current Sheet Data Length:', sheets[selectedSheet].data.length)
      console.log('Current Sheet RowColors:', Object.keys(sheets[selectedSheet].rowColors || {}).length)
    }
  }, [sheets, selectedSheet])

  // Payment Operations Hook
  const {
    showPaymentDateModal,
    setShowPaymentDateModal,
    selectedPaymentDate,
    setSelectedPaymentDate,
    moveCheckedToPayment,
    confirmPaymentDate
  } = usePaymentOperations({
    getCurrentSheetData,
    checkedRows,
    updateCurrentSheetData,
    setCheckedRows,
    sheets,
    selectedSheet,
    rowColors,
    rowTextColors,
    setRowColors,
    setRowTextColors,
    setBackupBeforeDelete
  })

  // Order Operations Hook
  const {
    showOrderDateModal,
    setShowOrderDateModal,
    selectedOrderDate,
    setSelectedOrderDate,
    orderType,
    setOrderType,
    moveCheckedToOrder,
    confirmOrderDate
  } = useOrderOperations({
    getCurrentSheetData,
    checkedRows,
    updateCurrentSheetData,
    setCheckedRows,
    setRowColors,
    setRowTextColors,
    setDuplicateProducts,
    setBackupBeforeDelete,
    rowColors,
    rowTextColors
  })

  // Draft Management Hook
  const {
    hasUnsavedChanges,
    setHasUnsavedChanges,
    showUnsavedModal,
    setShowUnsavedModal,
    pendingNavigation,
    setPendingNavigation,
    isNavigatingRef,
    initialLoadRef,
    saveDraft,
    loadDraft,
    checkForDraft,
    handleSaveDraftAndNavigate,
    handleContinueEditing,
    handleDiscardChanges,
    handleLogout
  } = useDraftManagement()

  // 초기 로드 시 임시 저장 확인
  useEffect(() => {
    const init = async () => {
      if (initialLoadRef.current) {
        await checkForDraft({
          onLoad: (draftData) => {
            setSheets(draftData.sheets)
            setSelectedSheet(draftData.selectedSheet)
            setRowColors(draftData.rowColors)
            setRowTextColors(draftData.rowTextColors)
            setDuplicateProducts(draftData.duplicateProducts)
            setIsOrderReceiptUploaded(draftData.isOrderReceiptUploaded)
            setIsReceiptSlipUploaded(draftData.isReceiptSlipUploaded)
            setCheckedRows(draftData.checkedRows)
          }
        })
        initialLoadRef.current = false
      }
      setLoading(false)
    }
    init()
  }, [])

  // 데이터 변경 감지
  useEffect(() => {
    if (!initialLoadRef.current && sheets.length > 0) {
      setHasUnsavedChanges(true)
    }
  }, [sheets, selectedSheet, rowColors, rowTextColors, duplicateProducts, checkedRows])

  // 브라우저 닫기/새로고침 방지
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !isNavigatingRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // 페이지 이탈 방지 (react-router)
  useEffect(() => {
    const handleNavigation = (e: any) => {
      if (hasUnsavedChanges && !isNavigatingRef.current) {
        e.preventDefault()
        setPendingNavigation(e.currentTarget.location.pathname)
        setShowUnsavedModal(true)
      }
    }

    // Note: react-router-dom v6 doesn't have built-in blocking
    // This is a simplified version - you may need to use a library like history
    return () => { }
  }, [hasUnsavedChanges])

  // 중간 저장 핸들러
  const handleSaveDraftClick = async () => {
    await saveDraft({
      sheets,
      selectedSheet,
      rowColors,
      rowTextColors,
      duplicateProducts,
      isOrderReceiptUploaded,
      isReceiptSlipUploaded,
      checkedRows
    })
  }

  // 불러오기 핸들러
  const handleLoadDraftClick = async () => {
    await loadDraft({
      onSuccess: (draftData) => {
        setSheets(draftData.sheets)
        setSelectedSheet(draftData.selectedSheet)
        setRowColors(draftData.rowColors)
        setRowTextColors(draftData.rowTextColors)
        setDuplicateProducts(draftData.duplicateProducts)
        setIsOrderReceiptUploaded(draftData.isOrderReceiptUploaded)
        setIsReceiptSlipUploaded(draftData.isReceiptSlipUploaded)
        setCheckedRows(draftData.checkedRows)
      }
    })
  }

  // 저장 모달 핸들러
  const handleSaveFileClick = () => {
    setShowSaveModal(true)
    setSaveFileName(sheets[selectedSheet]?.sheet_name || '저장파일')
  }

  const handleSaveFileConfirm = async (mode: 'web' | 'excel') => {
    if (!saveFileName.trim()) {
      toast.error('파일 이름을 입력해주세요')
      return
    }

    const currentData = getCurrentSheetData()
    const filteredData = getFilteredData(currentData, checkedRows)
    const columns = sheets[selectedSheet]?.columns || []
    const checkedCount = Object.keys(checkedRows).filter(k => checkedRows[parseInt(k)]).length

    if (mode === 'web') {
      await handleSaveToWeb(
        saveFileName,
        filteredData,
        columns,
        checkedCount,
        () => {
          setShowSaveModal(false)
          setSaveFileName('')
        }
      )
    } else {
      await handleDownloadExcel(
        saveFileName,
        filteredData,
        sheets[selectedSheet]?.sheet_name || 'Sheet1',
        columns,
        () => {
          setShowSaveModal(false)
          setSaveFileName('')
        }
      )
    }
  }

  const handleAddNewSheet = () => {
    const currentSheet = sheets[selectedSheet]
    const baseColumns = currentSheet?.columns || []
    const columnCount = currentSheet?.cols || baseColumns.length || currentSheet?.data?.[0]?.length || 0
    const fallbackCols = columnCount || baseColumns.length || 23
    const columnsToUse = baseColumns.length ? baseColumns : new Array(fallbackCols).fill('')
    const MIN_DATA_ROWS = 500

    // 헤더 4행만 복사하고 합계 행(3번째, index 2)은 초기화
    const headerRows = currentSheet?.data?.length
      ? currentSheet.data.slice(0, 4).map((row, idx) => {
        const rowCopy = [...row]
        if (idx === 2) {
          return new Array(fallbackCols || rowCopy.length).fill('')
        }
        if (fallbackCols && rowCopy.length < fallbackCols) {
          rowCopy.length = fallbackCols
        }
        return rowCopy
      })
      : []

    const targetHeaderRows = 4
    while (headerRows.length < targetHeaderRows) {
      headerRows.push(new Array(fallbackCols).fill(''))
    }

    // 데이터 입력용 빈 행 500개 추가
    const totalRows = targetHeaderRows + MIN_DATA_ROWS
    while (headerRows.length < totalRows) {
      headerRows.push(new Array(fallbackCols).fill(''))
    }

    const newSheetName = `새 시트 ${sheets.length + 1}`

    addSheet({
      sheet_name: newSheetName,
      sheet_type: '편집용',
      data: headerRows,
      columns: columnsToUse,
      rows: headerRows.length,
      cols: fallbackCols,
      rowColors: {},
      rowTextColors: {},
      duplicateProducts: {},
      checkedRows: {}
    })
  }

  // 거래처 정보 조회 (구현 필요 시)
  const handleViewClientInfo = async (rowIndex: number) => {
    // 거래처 정보 조회 로직
    // 필요 시 구현
  }

  // 체크된 행 삭제
  const handleDeleteChecked = () => {
    const currentData = getCurrentSheetData()
    if (!currentData || currentData.length === 0) {
      toast.error('시트 데이터가 없습니다')
      return
    }

    const checkedCount = Object.keys(checkedRows).filter(k => checkedRows[parseInt(k)]).length
    if (checkedCount === 0) {
      toast.error('삭제할 항목을 선택해주세요')
      return
    }

    // 백업 생성
    setBackupBeforeDelete({
      data: JSON.parse(JSON.stringify(currentData)),
      checkedRows: JSON.parse(JSON.stringify(checkedRows)),
      rowColors: JSON.parse(JSON.stringify(rowColors)),
      rowTextColors: JSON.parse(JSON.stringify(rowTextColors))
    })

    // 체크되지 않은 행만 필터링
    const newData = currentData.filter((_, index) => !checkedRows[index])

    // 상태 업데이트
    updateCurrentSheetData(newData)
    setCheckedRows({})

    // rowColors, rowTextColors 재계산
    const newRowColors: { [key: number]: string } = {}
    const newRowTextColors: { [key: number]: string } = {}
    let oldIndex = 0
    let newIndex = 0

    for (let i = 0; i < currentData.length; i++) {
      if (!checkedRows[i]) {
        if (rowColors[i]) newRowColors[newIndex] = rowColors[i]
        if (rowTextColors[i]) newRowTextColors[newIndex] = rowTextColors[i]
        newIndex++
      }
    }

    setRowColors(newRowColors)
    setRowTextColors(newRowTextColors)

    toast.success(`${checkedCount}개 항목이 삭제되었습니다`)
  }

  // 삭제 되돌리기
  const handleUndoDelete = () => {
    if (!backupBeforeDelete) {
      toast.error('되돌릴 작업이 없습니다')
      return
    }

    updateCurrentSheetData(backupBeforeDelete.data)
    setCheckedRows(backupBeforeDelete.checkedRows)
    setRowColors(backupBeforeDelete.rowColors)
    setRowTextColors(backupBeforeDelete.rowTextColors)
    setBackupBeforeDelete(null)

    toast.success('삭제가 취소되었습니다')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-800">GNDR ORMA 시스템</h1>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">v1.2 (Test)</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{username}님</span>
              <button
                onClick={() => handleLogout(clearAuth)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('spreadsheet')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'spreadsheet'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
            >
              스프레드시트
            </button>
            <button
              onClick={() => setActiveTab('fileManagement')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'fileManagement'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
            >
              파일 관리
            </button>
            <button
              onClick={() => setActiveTab('paymentManagement')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'paymentManagement'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
            >
              입금 관리
            </button>
            <button
              onClick={() => setActiveTab('orderManagement')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'orderManagement'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
            >
              발주 관리
            </button>
            <button
              onClick={() => setActiveTab('clientManagement')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'clientManagement'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
            >
              거래처 관리
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'spreadsheet' && (
          <div className="h-full flex flex-col">
            {/* Toolbar */}
            <div className="bg-white border-b border-gray-200 px-4 py-3">
              <div className="flex items-center gap-3 flex-wrap">
                {/* File Upload */}
                <label className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  주문서 업로드
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload(e.target.files[0])
                    }}
                  />
                </label>

                {/* Order Receipt Upload - Visible only after Order Upload (Stage 1+) */}
                {sheets.length > 0 && (
                  <label className={`flex items-center gap-2 px-4 py-2 rounded-md cursor-pointer ${isOrderReceiptUploaded
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-purple-500 text-white hover:bg-purple-600'
                    }`}>
                    <FileSpreadsheet className="w-4 h-4" />
                    {isOrderReceiptUploaded ? '주문입고 업로드됨' : '주문입고 업로드'}
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleOrderReceiptUpload(e.target.files[0])
                      }}
                    />
                  </label>
                )}

                {/* Receipt Slip Upload - Visible only after Order Receipt Upload (Stage 2+) */}
                {isOrderReceiptUploaded && (
                  <label className={`flex items-center gap-2 px-4 py-2 rounded-md cursor-pointer ${isReceiptSlipUploaded
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-indigo-500 text-white hover:bg-indigo-600'
                    }`}>
                    <FileSpreadsheet className="w-4 h-4" />
                    {isReceiptSlipUploaded ? '입고전표 업로드됨' : '입고전표 업로드'}
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleReceiptSlipUpload(
                            e.target.files[0],
                            getCurrentSheetData(),
                            (result) => {
                              updateCurrentSheetData(result.sortedData)
                              setRowColors(result.colors)
                              setRowTextColors(result.textColors)
                              setDuplicateProducts(result.duplicates)
                              setCheckedRows(result.autoChecked)
                            }
                          )
                        }
                      }}
                    />
                  </label>
                )}

                {/* Divider */}
                <div className="w-px h-6 bg-gray-300"></div>

                {/* Save Draft - Visible after Order Upload */}
                {sheets.length > 0 && (
                  <button
                    onClick={handleSaveDraftClick}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                  >
                    <Save className="w-4 h-4" />
                    중간 저장
                  </button>
                )}

                {/* Load Draft */}
                <button
                  onClick={handleLoadDraftClick}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  <RefreshCw className="w-4 h-4" />
                  새로고침
                </button>

                {/* Web Save & Download - Hidden in initial stages as per request, 
                    but kept here if needed or moved to Stage 3 action bar */}

                {/* Zoom Controls */}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => setZoom(Math.max(50, zoom - 10))}
                    className="p-2 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium">{zoom}%</span>
                  <button
                    onClick={() => setZoom(Math.min(200, zoom + 10))}
                    className="p-2 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Stage 3 Action Bar */}
            {isReceiptSlipUploaded && (
              <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => moveCheckedToPayment()}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600"
                  disabled={Object.keys(checkedRows).filter(k => checkedRows[parseInt(k)]).length === 0}
                >
                  입금 관리로 보내기
                </button>
                {/* Delete Checked - Visible after Order Upload */}
                {sheets.length > 0 && (
                  <button
                    onClick={handleDeleteChecked}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                    disabled={Object.keys(checkedRows).filter(k => checkedRows[parseInt(k)]).length === 0}
                  >
                    체크된 행 삭제
                  </button>
                )}

                {/* Undo Delete */}
                {backupBeforeDelete && (
                  <button
                    onClick={handleUndoDelete}
                    className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
                  >
                    되돌리기
                  </button>
                )}

                <button
                  onClick={() => moveCheckedToOrder()}
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                  disabled={Object.keys(checkedRows).filter(k => checkedRows[parseInt(k)]).length === 0}
                >
                  발주 관리로 보내기
                </button>

                <button
                  onClick={handleSaveFileClick}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <Save className="w-4 h-4" />
                  저장하기
                </button>
              </div>
            )}

            {/* Sheet Tabs */}
            {sheets.length > 0 && (
              <div className="bg-gray-100 border-b border-gray-300 px-4 py-2">
                <div className="flex gap-2 overflow-x-auto">
                  <button
                    onClick={handleAddNewSheet}
                    className="px-3 py-2 rounded-md text-sm font-semibold bg-green-500 text-white hover:bg-green-600"
                  >
                    +
                  </button>
                  {sheets.map((sheet, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {editingSheet === index ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveSheetName(index)
                              if (e.key === 'Escape') handleCancelEditingSheetName()
                            }}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                            autoFocus
                          />
                          <button
                            onClick={() => editingSheet !== null && handleSaveSheetName(editingSheet)}
                            className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                          >
                            저장
                          </button>
                          <button
                            onClick={handleCancelEditingSheetName}
                            className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedSheet(index)}
                          onDoubleClick={() => handleStartEditingSheetName(index)}
                          className={`px-4 py-2 rounded-t-md text-sm font-medium transition-colors ${selectedSheet === index
                            ? 'bg-white text-blue-600 border-t-2 border-blue-500'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                          {sheet.sheet_name}
                        </button>
                      )}
                      {sheets.length > 1 && (
                        <button
                          onClick={() => removeSheet(index)}
                          className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Spreadsheet View */}
            <div className="flex-1 overflow-hidden">
              {sheets.length > 0 ? (
                <SpreadsheetView
                  data={getCurrentSheetData()}
                  columns={sheets[selectedSheet]?.columns || []}
                  sheetName={sheets[selectedSheet]?.sheet_name || ''}
                  zoom={zoom}
                  rowColors={rowColors}
                  rowTextColors={rowTextColors}
                  duplicateProducts={duplicateProducts}
                  checkedRows={checkedRows}
                  onCheckRow={handleCheckRow}
                  onSave={(updatedData) => updateCurrentSheetData(updatedData)}
                  onDataChange={(rowIndex, colIndex, value) => {
                    const newData = [...getCurrentSheetData()]
                    newData[rowIndex][colIndex] = value
                    updateCurrentSheetData(newData)
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">엑셀 파일을 업로드해주세요</p>
                </div>
              )}
            </div>
          </div>
        )
        }

        {activeTab === 'fileManagement' && <FileManagement />}
        {activeTab === 'paymentManagement' && <PaymentManagement />}
        {activeTab === 'orderManagement' && <OrderManagement />}
        {activeTab === 'clientManagement' && <ClientManagement />}

        {/* Modals */}
        < PaymentDateModal
          isOpen={showPaymentDateModal}
          checkedCount={Object.keys(checkedRows).filter(k => checkedRows[parseInt(k)]).length}
          selectedDate={selectedPaymentDate}
          onDateChange={setSelectedPaymentDate}
          onConfirm={() => confirmPaymentDate()}
          onCancel={() => setShowPaymentDateModal(false)}
        />

        < OrderDateModal
          isOpen={showOrderDateModal}
          checkedCount={Object.keys(checkedRows).filter(k => checkedRows[parseInt(k)]).length}
          selectedDate={selectedOrderDate}
          orderType={orderType}
          onDateChange={setSelectedOrderDate}
          onTypeChange={(type) => setOrderType(type as '교환' | '미송' | '기타')}
          onConfirm={() => confirmOrderDate()}
          onCancel={() => setShowOrderDateModal(false)}
        />

        {/* Save File Modal */}
        {
          showSaveModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">파일 저장</h2>
                  <span className="text-sm text-gray-500">방법을 선택하세요</span>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    파일 이름
                  </label>
                  <input
                    type="text"
                    value={saveFileName}
                    onChange={(e) => setSaveFileName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="파일 이름을 입력하세요"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowSaveModal(false)
                      setSaveFileName('')
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => handleSaveFileConfirm('web')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    웹에 저장
                  </button>
                  <button
                    onClick={() => handleSaveFileConfirm('excel')}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    엑셀로 저장
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {/* Unsaved Changes Modal */}
        <UnsavedChangesModal
          isOpen={showUnsavedModal}
          onSaveDraft={() => handleSaveDraftAndNavigate({
            sheets,
            selectedSheet,
            rowColors,
            rowTextColors,
            duplicateProducts,
            isOrderReceiptUploaded,
            isReceiptSlipUploaded,
            checkedRows
          })}
          onDiscard={handleDiscardChanges}
          onContinueWork={handleContinueEditing}
        />
      </div >
    </div >
  )
}

export default Dashboard
