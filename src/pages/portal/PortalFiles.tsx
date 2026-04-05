import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { FileRecord } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function PortalFiles() {
  const { user } = useAuth()
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('files')
      .select('*')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setFiles(data ?? [])
        setLoading(false)
      })
  }, [user])

  if (loading) {
    return <div className="flex justify-center p-12 text-muted-foreground">Loading files...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Shared Files</h1>

      {files.length === 0 ? (
        <p className="text-muted-foreground">No files shared yet.</p>
      ) : (
        <div className="space-y-3">
          {files.map(file => (
            <Card key={file.id}>
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{file.file_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{formatFileSize(file.file_size)}</span>
                    {file.label && <Badge variant="outline" className="text-xs">{file.label}</Badge>}
                    <span className="text-xs text-muted-foreground">
                      {new Date(file.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {file.notes && <p className="text-sm text-muted-foreground mt-1">{file.notes}</p>}
                </div>
                <Button variant="outline" size="sm" onClick={async () => {
                  const { data } = await supabase.storage.from('shared-files').createSignedUrl(file.file_path, 3600)
                  if (data?.signedUrl) window.open(data.signedUrl, '_blank')
                }}>
                  Download
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
