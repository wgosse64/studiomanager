import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { FileRecord, Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FilesPage() {
  const [files, setFiles] = useState<(FileRecord & { uploader?: Profile })[]>([])
  const [clients, setClients] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [filterClient, setFilterClient] = useState<string>('all')
  const [filterLabel, setFilterLabel] = useState<string>('all')

  const [form, setForm] = useState({
    client_id: '',
    label: '',
    notes: '',
  })

  async function loadFiles() {
    const { data } = await supabase
      .from('files')
      .select('*, uploader:profiles!files_uploaded_by_fkey(*)')
      .order('created_at', { ascending: false })

    setFiles(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadFiles()
    supabase
      .from('profiles')
      .select('*')
      .eq('role', 'client')
      .eq('is_active', true)
      .order('last_name')
      .then(({ data }) => setClients(data ?? []))
  }, [])

  const labels = [...new Set(files.map(f => f.label).filter(Boolean))]

  const filtered = files.filter(f => {
    if (filterClient !== 'all' && f.client_id !== filterClient) return false
    if (filterLabel !== 'all' && f.label !== filterLabel) return false
    return true
  })

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const file = formData.get('file') as File
    if (!file || !form.client_id) return

    setUploading(true)

    const filePath = `${form.client_id}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('shared-files')
      .upload(filePath, file)

    if (uploadError) {
      alert(`Upload failed: ${uploadError.message}`)
      setUploading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('files').insert({
      uploaded_by: user!.id,
      client_id: form.client_id,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      file_type: file.type,
      label: form.label || null,
      notes: form.notes || null,
    })

    setUploading(false)
    setDialogOpen(false)
    setForm({ client_id: '', label: '', notes: '' })
    loadFiles()
  }

  if (loading) {
    return <div className="flex justify-center p-12 text-muted-foreground">Loading files...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Files</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>Upload File</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload File</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client">Client</Label>
                <Select value={form.client_id} onValueChange={v => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.first_name} {c.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="file">File</Label>
                <Input id="file" name="file" type="file" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  value={form.label}
                  onChange={e => setForm({ ...form, label: e.target.value })}
                  placeholder="e.g. rough mix, stems, final master"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={uploading || !form.client_id}>
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 mb-6">
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All clients" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterLabel} onValueChange={setFilterLabel}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All labels" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Labels</SelectItem>
            {labels.map(l => (
              <SelectItem key={l} value={l!}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground">No files found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(file => (
            <Card key={file.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex-1">
                  <p className="font-medium">{file.file_name}</p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <span>{formatFileSize(file.file_size)}</span>
                    {file.label && <Badge variant="outline">{file.label}</Badge>}
                    <span>Uploaded {new Date(file.created_at).toLocaleDateString()}</span>
                  </div>
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
