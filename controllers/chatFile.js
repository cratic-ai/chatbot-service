// components/FileManager.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Upload, File, X, Trash2, FileText, Image as ImageIcon,
  Film, Music, Archive, RefreshCw, Search, Filter, Plus,
  FolderOpen, AlertCircle, CheckCircle, Clock, Database,
  CloudUpload, Sparkles, Star, TrendingUp, Package
} from 'lucide-react';
import apiService from '../services/api.service';
import { Document, Store } from '../types/document.types';

interface UploadProgress {
  name: string;
  progress: number;
  status?: 'success' | 'error';
}

interface UploadProgressMap {
  [key: string]: UploadProgress;
}

export default function FileManager(): JSX.Element {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [showCreateStore, setShowCreateStore] = useState<boolean>(false);
  const [newStoreName, setNewStoreName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressMap>({});
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fetchStores = useCallback(async (): Promise<void> => {
    try {
      const data = await apiService.listStores();
      setStores(data.stores || []);
    } catch (err) {
      console.error('Failed to fetch stores:', err);
      setError('Failed to load RAG stores');
    }
  }, []);

  const fetchDocuments = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const data = selectedStore === 'all'
        ? await apiService.listAllDocuments()
        : await apiService.listDocumentsInStore(selectedStore);

      setDocuments(data.documents || []);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [selectedStore]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const createStore = async (): Promise<void> => {
    if (!newStoreName.trim()) {
      setError('Store name cannot be empty');
      return;
    }

    try {
      await apiService.createStore(newStoreName);
      setNewStoreName('');
      setShowCreateStore(false);
      await fetchStores();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create store');
    }
  };

  const handleFileUpload = async (file: File, storeName: string): Promise<void> => {
    const fileId = `${storeName}_${Date.now()}`;
    setUploadProgress(prev => ({ ...prev, [fileId]: { name: file.name, progress: 0 } }));

    try {
      await apiService.uploadToRagStore(storeName, file, (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(prev => ({
          ...prev,
          [fileId]: { name: file.name, progress: percentCompleted }
        }));
      });

      setUploadProgress(prev => ({
        ...prev,
        [fileId]: { name: file.name, progress: 100, status: 'success' }
      }));

      setTimeout(() => {
        fetchDocuments();
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
      }, 2000);

    } catch (err: any) {
      setUploadProgress(prev => ({
        ...prev,
        [fileId]: { name: file.name, progress: 0, status: 'error' }
      }));
      const errorMessage = err.response?.data?.message || err.message || 'Unknown error';
      setError('Upload failed: ' + errorMessage);
    }
  };

  const deleteDocument = async (documentName: string): Promise<void> => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      await apiService.deleteDocument(documentName);
      await fetchDocuments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete document');
    }
  };

  const deleteStore = async (storeName: string): Promise<void> => {
    if (!window.confirm('Are you sure you want to delete this entire store?')) return;

    try {
      await apiService.deleteStore(storeName);
      await fetchStores();
      if (selectedStore === storeName) {
        setSelectedStore('all');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete store');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, storeName: string): Promise<void> => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      await handleFileUpload(file, storeName);
    }
  };

  const getFileIcon = (fileName: string): JSX.Element => {
    const ext = fileName?.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
      return <ImageIcon className="w-6 h-6" />;
    } else if (['mp4', 'avi', 'mov', 'mkv'].includes(ext)) {
      return <Film className="w-6 h-6" />;
    } else if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
      return <Music className="w-6 h-6" />;
    } else if (['zip', 'rar', '7z', 'tar'].includes(ext)) {
      return <Archive className="w-6 h-6" />;
    }
    return <FileText className="w-6 h-6" />;
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'N/A';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const filteredDocuments = documents.filter(doc =>
    doc.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>, storeName: string): Promise<void> => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    for (const file of files) {
      await handleFileUpload(file, storeName);
    }
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header with Gradient */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <CloudUpload className="w-8 h-8" />
                </div>
                <h1 className="text-4xl font-bold">Document Cloud Manager</h1>
              </div>
              <p className="text-violet-100 text-lg">
                Organize, upload, and manage your files with AI-powered search capabilities
              </p>
            </div>
            <button
              onClick={() => setShowCreateStore(true)}
              className="px-6 py-3 bg-white text-violet-600 hover:bg-violet-50 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Plus className="w-5 h-5" />
              New Store
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Create Store Modal */}
        {showCreateStore && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-violet-100 rounded-xl">
                  <FolderOpen className="w-6 h-6 text-violet-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Create New Store</h3>
              </div>
              <input
                type="text"
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                placeholder="Enter store name (e.g., Marketing Files)"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-violet-500 mb-6 text-gray-800"
                onKeyPress={(e) => e.key === 'Enter' && createStore()}
              />
              <div className="flex gap-3">
                <button
                  onClick={createStore}
                  className="flex-1 px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold transition-colors"
                >
                  Create Store
                </button>
                <button
                  onClick={() => {
                    setShowCreateStore(false);
                    setNewStoreName('');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-violet-100 rounded-xl">
                <Database className="w-8 h-8 text-violet-600" />
              </div>
              <div>
                <div className="text-gray-500 text-sm font-medium">Total Stores</div>
                <div className="text-3xl font-bold text-gray-800">{stores.length}</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-purple-100 rounded-xl">
                <File className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <div className="text-gray-500 text-sm font-medium">Total Documents</div>
                <div className="text-3xl font-bold text-gray-800">{documents.length}</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-amber-100 rounded-xl">
                <TrendingUp className="w-8 h-8 text-amber-600" />
              </div>
              <div>
                <div className="text-gray-500 text-sm font-medium">Active Uploads</div>
                <div className="text-3xl font-bold text-gray-800">{Object.keys(uploadProgress).length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Progress */}
        {Object.keys(uploadProgress).length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-violet-600" />
              Uploading Files
            </h3>
            <div className="space-y-3">
              {Object.entries(uploadProgress).map(([id, file]) => (
                <div key={id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-700 font-medium text-sm">{file.name}</span>
                    {file.status === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : file.status === 'error' ? (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <Clock className="w-5 h-5 text-violet-600 animate-spin" />
                    )}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        file.status === 'success' ? 'bg-green-500' :
                        file.status === 'error' ? 'bg-red-500' :
                        'bg-violet-600'
                      }`}
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search your documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-violet-500 text-gray-700"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="pl-12 pr-8 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-violet-500 appearance-none cursor-pointer text-gray-700 bg-white min-w-[200px]"
              >
                <option value="all">All Stores</option>
                {stores.map(store => (
                  <option key={store.name} value={store.name}>
                    {store.displayName}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                fetchStores();
                fetchDocuments();
              }}
              className="px-6 py-3 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-xl font-semibold transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stores Grid */}
        {stores.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-violet-600" />
              Your Storage Spaces
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stores.map((store, index) => {
                const storeColors = [
                  'from-violet-500 to-purple-600',
                  'from-blue-500 to-indigo-600',
                  'from-pink-500 to-rose-600',
                  'from-emerald-500 to-teal-600',
                  'from-amber-500 to-orange-600',
                  'from-cyan-500 to-sky-600',
                ];
                const colorClass = storeColors[index % storeColors.length];

                return (
                  <div
                    key={store.name}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, store.name)}
                    className={`bg-white rounded-2xl shadow-lg border-2 hover:shadow-2xl transition-all overflow-hidden ${
                      isDragging ? 'border-violet-500 scale-105' : 'border-gray-100'
                    }`}
                  >
                    <div className={`bg-gradient-to-br ${colorClass} p-6 text-white`}>
                      <div className="flex items-center justify-between mb-3">
                        <FolderOpen className="w-10 h-10 opacity-90" />
                        <button
                          onClick={() => deleteStore(store.name)}
                          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <h3 className="text-xl font-bold mb-1">{store.displayName}</h3>
                      <p className="text-white/80 text-xs truncate">{store.name}</p>
                    </div>

                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <File className="w-4 h-4" />
                          {documents.filter(d => d.storeName === store.name).length} files
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-amber-500" />
                          Active
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <label className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all cursor-pointer text-center text-sm shadow-md hover:shadow-lg">
                          <Upload className="w-4 h-4 inline mr-2" />
                          Upload
                          <input
                            type="file"
                            multiple
                            onChange={(e) => handleFileInputChange(e, store.name)}
                            className="hidden"
                          />
                        </label>
                        <button
                          onClick={() => setSelectedStore(store.name)}
                          className="px-4 py-2.5 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-xl font-semibold transition-colors text-sm"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State for Stores */}
        {stores.length === 0 && !loading && (
          <div className="bg-white rounded-2xl p-12 shadow-lg border border-gray-100 text-center mb-8">
            <div className="max-w-md mx-auto">
              <div className="p-6 bg-violet-100 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <Package className="w-12 h-12 text-violet-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">No Stores Yet</h3>
              <p className="text-gray-600 mb-6">
                Create your first storage space to start organizing your documents with AI-powered search
              </p>
              <button
                onClick={() => setShowCreateStore(true)}
                className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                <Plus className="w-5 h-5 inline mr-2" />
                Create Your First Store
              </button>
            </div>
          </div>
        )}

        {/* Documents List */}
        {filteredDocuments.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <File className="w-6 h-6 text-violet-600" />
              All Documents ({filteredDocuments.length})
            </h2>

            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-12 h-12 text-violet-600 animate-spin mx-auto mb-3" />
                <p className="text-gray-600">Loading documents...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.name}
                    className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-violet-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white rounded-lg border border-gray-200 text-violet-600">
                        {getFileIcon(doc.displayName)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-gray-800 font-semibold truncate mb-1">
                          {doc.displayName || doc.name}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="px-2 py-1 bg-violet-100 text-violet-700 rounded-md text-xs font-medium">
                            {doc.storeDisplayName}
                          </span>
                          <span>{formatFileSize(doc.sizeBytes)}</span>
                          {doc.createTime && (
                            <span>{new Date(doc.createTime).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => deleteDocument(doc.name)}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State for Documents */}
        {filteredDocuments.length === 0 && !loading && stores.length > 0 && (
          <div className="bg-white rounded-2xl p-12 shadow-lg border border-gray-100 text-center">
            <div className="max-w-md mx-auto">
              <div className="p-6 bg-purple-100 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <CloudUpload className="w-12 h-12 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">No Documents Yet</h3>
              <p className="text-gray-600">
                Upload your first document to get started with AI-powered document search
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}