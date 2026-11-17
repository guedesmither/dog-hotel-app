'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Printer } from 'lucide-react'

type DocumentKind = 'DOCX' | 'PDF'

function responseFileName(contentDisposition: string | null): string {
  const encodedName = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (encodedName) {
    try {
      return decodeURIComponent(encodedName)
    } catch {
      return encodedName
    }
  }

  return contentDisposition?.match(/filename="?([^";]+)"?/i)?.[1] || 'Contrato.docx'
}

export default function ContractPrintPage({ params }: { params: { id: string } }) {
  const printContainer = useRef<HTMLDivElement>(null)
  const [kind, setKind] = useState<DocumentKind | null>(null)
  const [fileName, setFileName] = useState('Contrato.docx')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null
    const originalTitle = document.title

    async function loadDocument() {
      try {
        const res = await fetch(`/api/contracts/${params.id}/file?inline=1`)
        if (!res.ok) {
          const result = await res.json().catch(() => ({}))
          throw new Error(result.error || 'Não foi possível carregar o contrato')
        }

        const name = responseFileName(res.headers.get('Content-Disposition'))
        const contentType = res.headers.get('Content-Type') || ''
        const blob = await res.blob()
        if (cancelled) return

        setFileName(name)
        document.title = name.replace(/\.(docx|pdf)$/i, '')

        if (contentType.toLowerCase().includes('pdf') || name.toLowerCase().endsWith('.pdf')) {
          objectUrl = URL.createObjectURL(blob)
          setPdfUrl(objectUrl)
          setKind('PDF')
          return
        }

        const { renderAsync } = await import('docx-preview')
        if (cancelled || !printContainer.current) return
        await renderAsync(blob, printContainer.current, undefined, {
          inWrapper: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: true,
        })
        if (!cancelled) setKind('DOCX')
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Erro ao carregar o contrato')
        }
      }
    }

    void loadDocument()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      document.title = originalTitle
    }
  }, [params.id])

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="print-controls sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <h1 className="font-semibold text-gray-900">{fileName}</h1>
          {kind === 'DOCX' && (
            <p className="text-xs text-gray-500">Na janela de impressão escolha &apos;Salvar como PDF&apos;</p>
          )}
        </div>
        {kind === 'PDF' ? (
          <a
            href={`/api/contracts/${params.id}/file`}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Download className="h-4 w-4" /> Baixar PDF
          </a>
        ) : kind === 'DOCX' ? (
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Printer className="h-4 w-4" /> Baixar PDF
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="mx-auto max-w-2xl p-8 text-center text-red-700">{error}</div>
      ) : kind === 'PDF' && pdfUrl ? (
        <iframe
          title={fileName}
          src={pdfUrl}
          className="h-[calc(100vh-72px)] w-full bg-gray-200"
        />
      ) : (
        <div className="mx-auto min-h-[calc(100vh-72px)] overflow-auto bg-white p-4 sm:p-8">
          {kind !== 'DOCX' && <p className="py-8 text-center text-gray-500">Carregando contrato...</p>}
          <div id="contract-print" ref={printContainer} />
        </div>
      )}

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          html,
          body {
            background: #fff !important;
          }
          body * {
            visibility: hidden !important;
          }
          #contract-print,
          #contract-print * {
            visibility: visible !important;
          }
          #contract-print {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-controls {
            display: none !important;
          }
        }
      `}</style>
    </main>
  )
}
