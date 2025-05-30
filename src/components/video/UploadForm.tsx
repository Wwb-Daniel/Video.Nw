import React, { useState, useRef } from 'react';
import { useVideoStore } from '../../store/videoStore';
import { useNavigate } from 'react-router-dom';
import { Upload, X, PlayCircle } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';

const UploadForm: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadVideo, loading, error } = useVideoStore();
  const navigate = useNavigate();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setVideoPreview(objectUrl);
    }
  };
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setVideoPreview(objectUrl);
    }
  };
  
  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile || !title.trim()) return;
    
    await uploadVideo(selectedFile, title, description);
    if (!error) {
      navigate('/');
    }
  };
  
  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Upload a video</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {!selectedFile ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center ${
              dragActive ? 'border-blue-500 bg-blue-50 bg-opacity-10' : 'border-gray-700'
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg mb-1">Drag and drop your video here</p>
            <p className="text-sm text-gray-500 mb-4">
              Or click to select a file
            </p>
            <Button type="button" variant="outline" size="sm">
              Select Video
            </Button>
          </div>
        ) : (
          <div className="relative bg-gray-900 rounded-lg overflow-hidden">
            <video
              src={videoPreview || undefined}
              className="w-full h-64 object-contain"
              controls
            />
            <button
              type="button"
              onClick={clearSelectedFile}
              className="absolute top-2 right-2 bg-black bg-opacity-70 rounded-full p-1 text-white"
            >
              <X size={20} />
            </button>
            <div className="p-3 bg-gray-800">
              <p className="text-sm truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-400">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>
        )}
        
        <Input
          label="Title"
          placeholder="Add a title for your video"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          required
        />
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Describe your video (optional)"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        
        {error && <p className="text-red-500 text-sm">{error}</p>}
        
        <div className="flex space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/')}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={loading}
            disabled={!selectedFile || !title.trim()}
            className="flex-1"
          >
            Upload Video
          </Button>
        </div>
      </form>
    </div>
  );
};

export default UploadForm;