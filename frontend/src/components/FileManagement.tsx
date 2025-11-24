import React, { useState, useEffect } from 'react'
import { Download, Eye } from 'lucide-react'
import { savedFilesAPI } from '../services/api'
import SpreadsheetView from './SpreadsheetView'
import toast from 'react-hot-toast'

interface SavedFile {
  id: number
  file_name: string
  file_path: string
  total_rows: number
  created_at: string
}

interface DateGroup {
  date: string
  files: {
    matched?: SavedFile
    normal?: SavedFile
    error?: SavedFile
  }
}

interface ViewFileData {
  file_name: string
  date: string
  file_type: string
  sheet_data: any[][]
  columns: string[]
  row_colors: {[key: number]: string}
  row_text_colors: {[key: number]: string}
  total_rows: number
  created_at: string
}

const FileManagement: React.FC = () => {
  const [dateGroups, setDateGroups] = useState<DateGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [viewingFile, setViewingFile] = useState<ViewFileData | null>(null)

  // 파일 목록 불러오기
  const fetchFiles = async () => {
    setLoading(true)
    try {
      const response = await savedFilesAPI.listFiles()
      if (response.success) {
        setDateGroups(response.data)
      }
    } catch (error: any) {
      console.error('Failed to fetch files:', error)
      toast.error('파일 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  // 파일 보기
  const handleViewFile = async (fileId: number) => {
    try {
      const response = await savedFilesAPI.viewFile(fileId)
      if (response.success) {
        setViewingFile(response.data)
      }
    } catch (error: any) {
      console.error('Failed to view file:', error)
      toast.error('파일을 불러오는데 실패했습니다')
    }
  }

  // 파일 다운로드
  const handleDownloadFile = async (fileId: number, fileName: string) => {
    try {
      await savedFilesAPI.downloadFile(fileId, fileName)
      toast.success('다운로드가 시작되었습니다')
    } catch (error: any) {
      console.error('Failed to download file:', error)
      toast.error('다운로드에 실패했습니다')
    }
  }

  // 파일 타입 라벨
  const getFileTypeLabel = (type: string) => {
    switch (type) {
      case 'matched': return '매칭'
      case 'normal': return '정상'
      case 'error': return '오류'
      default: return type
    }
  }

  // 파일 타입 색상
  const getFileTypeColor = (type: string) => {
    switch (type) {
      case 'matched': return { bg: '#e3f2fd', border: '#90caf9', color: '#1976d2' }
      case 'normal': return { bg: '#e8f5e9', border: '#a5d6a7', color: '#388e3c' }
      case 'error': return { bg: '#fff3e0', border: '#ffcc80', color: '#f57c00' }
      default: return { bg: '#f5f5f5', border: '#ddd', color: '#666' }
    }
  }

  // 스프레드시트 뷰어 닫기
  const handleCloseViewer = () => {
    setViewingFile(null)
  }

  if (viewingFile) {
    return (
      <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>{viewingFile.file_name}</h2>
          <button
            onClick={handleCloseViewer}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            닫기
          </button>
        </div>

        <SpreadsheetView
          data={viewingFile.sheet_data}
          columns={viewingFile.columns}
          zoom={100}
          sheetName={viewingFile.file_name}
          rowColors={viewingFile.row_colors}
          rowTextColors={viewingFile.row_text_colors}
        />
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>파일 관리</h2>
        <button
          onClick={fetchFiles}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          새로고침
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#666' }}>불러오는 중...</p>
      ) : dateGroups.length === 0 ? (
        <p style={{ color: '#666' }}>저장된 파일이 없습니다.</p>
      ) : (
        <div>
          {dateGroups.map((group) => (
            <div key={group.date} style={{ marginBottom: '30px' }}>
              <h4 style={{
                backgroundColor: '#e0e0e0',
                padding: '10px',
                margin: '0 0 15px 0',
                borderRadius: '5px',
                fontSize: '18px',
                fontWeight: 'bold'
              }}>
                {group.date}
              </h4>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '20px'
              }}>
                {/* 매칭 파일 */}
                <div style={{
                  backgroundColor: getFileTypeColor('matched').bg,
                  padding: '15px',
                  borderRadius: '8px',
                  border: `1px solid ${getFileTypeColor('matched').border}`
                }}>
                  <h5 style={{
                    marginTop: 0,
                    marginBottom: '15px',
                    color: getFileTypeColor('matched').color,
                    textAlign: 'center'
                  }}>
                    📋 {group.date}주문입고-매칭.xlsx
                  </h5>
                  {!group.files.matched ? (
                    <p style={{ color: '#999', textAlign: 'center', fontSize: '14px' }}>
                      등록된 파일이 없습니다
                    </p>
                  ) : (
                    <div style={{
                      backgroundColor: 'white',
                      padding: '12px',
                      borderRadius: '5px',
                      border: '1px solid #e0e0e0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          총 행 수: {group.files.matched.total_rows}
                        </div>
                        <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                          {new Date(group.files.matched.created_at).toLocaleString('ko-KR')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                          onClick={() => handleViewFile(group.files.matched!.id)}
                          style={{
                            flex: 1,
                            padding: '5px',
                            fontSize: '12px',
                            backgroundColor: '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px'
                          }}
                        >
                          <Eye size={14} />
                          보기
                        </button>
                        <button
                          onClick={() => handleDownloadFile(group.files.matched!.id, group.files.matched!.file_name)}
                          style={{
                            flex: 1,
                            padding: '5px',
                            fontSize: '12px',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px'
                          }}
                        >
                          <Download size={14} />
                          다운로드
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 정상 파일 */}
                <div style={{
                  backgroundColor: getFileTypeColor('normal').bg,
                  padding: '15px',
                  borderRadius: '8px',
                  border: `1px solid ${getFileTypeColor('normal').border}`
                }}>
                  <h5 style={{
                    marginTop: 0,
                    marginBottom: '15px',
                    color: getFileTypeColor('normal').color,
                    textAlign: 'center'
                  }}>
                    ✅ {group.date}주문입고-정상.xlsx
                  </h5>
                  {!group.files.normal ? (
                    <p style={{ color: '#999', textAlign: 'center', fontSize: '14px' }}>
                      등록된 파일이 없습니다
                    </p>
                  ) : (
                    <div style={{
                      backgroundColor: 'white',
                      padding: '12px',
                      borderRadius: '5px',
                      border: '1px solid #e0e0e0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          총 행 수: {group.files.normal.total_rows}
                        </div>
                        <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                          {new Date(group.files.normal.created_at).toLocaleString('ko-KR')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                          onClick={() => handleViewFile(group.files.normal!.id)}
                          style={{
                            flex: 1,
                            padding: '5px',
                            fontSize: '12px',
                            backgroundColor: '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px'
                          }}
                        >
                          <Eye size={14} />
                          보기
                        </button>
                        <button
                          onClick={() => handleDownloadFile(group.files.normal!.id, group.files.normal!.file_name)}
                          style={{
                            flex: 1,
                            padding: '5px',
                            fontSize: '12px',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px'
                          }}
                        >
                          <Download size={14} />
                          다운로드
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 오류 파일 */}
                <div style={{
                  backgroundColor: getFileTypeColor('error').bg,
                  padding: '15px',
                  borderRadius: '8px',
                  border: `1px solid ${getFileTypeColor('error').border}`
                }}>
                  <h5 style={{
                    marginTop: 0,
                    marginBottom: '15px',
                    color: getFileTypeColor('error').color,
                    textAlign: 'center'
                  }}>
                    ⚠️ {group.date}주문입고-오류.xlsx
                  </h5>
                  {!group.files.error ? (
                    <p style={{ color: '#999', textAlign: 'center', fontSize: '14px' }}>
                      등록된 파일이 없습니다
                    </p>
                  ) : (
                    <div style={{
                      backgroundColor: 'white',
                      padding: '12px',
                      borderRadius: '5px',
                      border: '1px solid #e0e0e0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          총 행 수: {group.files.error.total_rows}
                        </div>
                        <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                          {new Date(group.files.error.created_at).toLocaleString('ko-KR')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                          onClick={() => handleViewFile(group.files.error!.id)}
                          style={{
                            flex: 1,
                            padding: '5px',
                            fontSize: '12px',
                            backgroundColor: '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px'
                          }}
                        >
                          <Eye size={14} />
                          보기
                        </button>
                        <button
                          onClick={() => handleDownloadFile(group.files.error!.id, group.files.error!.file_name)}
                          style={{
                            flex: 1,
                            padding: '5px',
                            fontSize: '12px',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px'
                          }}
                        >
                          <Download size={14} />
                          다운로드
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default FileManagement
