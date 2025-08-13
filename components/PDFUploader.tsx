'use client';

import { useState } from 'react';

export default function PDFUploader() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (selectedFile) => {
    if (selectedFile && selectedFile.type === 'application/pdf') {
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size too large. Maximum 10MB allowed.');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    } else {
      setError('Please select a valid PDF file');
      setFile(null);
    }
  };

  const handleInputChange = (e) => {
    const selectedFile = e.target.files[0];
    handleFileChange(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const selectedFile = e.dataTransfer.files[0];
    handleFileChange(selectedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleUpload = async (useAlternative = false) => {
    if (!file) {
      setError('Please select a PDF file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const endpoint = useAlternative ? '/api/upload-pdf-alt' : '/api/upload-pdf';
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to parse PDF');
      }
    } catch (err) {
      setError('Upload failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(result.text);
      // You could add a toast notification here
      alert('Text copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">PDF Text Extractor</h1>
      
      <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        {/* Drop Zone */}
        <div 
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-blue-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            type="file"
            accept=".pdf"
            onChange={handleInputChange}
            className="hidden"
            id="pdf-upload"
          />
          <label 
            htmlFor="pdf-upload"
            className="cursor-pointer block"
          >
            <div className="text-6xl mb-4">
              {dragOver ? '📥' : '📄'}
            </div>
            <div className="text-lg font-medium text-gray-700 mb-2">
              {file ? file.name : dragOver ? 'Drop PDF here' : 'Click to upload PDF or drag and drop'}
            </div>
            <div className="text-sm text-gray-500">
              {file ? formatFileSize(file.size) : 'Maximum file size: 10MB'}
            </div>
          </label>
        </div>

        {/* Upload Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => handleUpload(false)}
            disabled={!file || loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Parsing PDF...
              </>
            ) : (
              'Extract Text (Method 1)'
            )}
          </button>

          <button
            onClick={() => handleUpload(true)}
            disabled={!file || loading}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Parsing PDF...
              </>
            ) : (
              'Extract Text (Method 2)'
            )}
          </button>
        </div>

        <div className="text-sm text-gray-600 text-center">
          Try Method 2 if Method 1 fails due to library issues
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="font-medium">Error:</div>
            <div>{error}</div>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              <div className="font-medium">✅ PDF parsed successfully!</div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 text-gray-800">Document Information</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>File:</strong> {result.fileName}</div>
                  <div><strong>Size:</strong> {formatFileSize(result.fileSize)}</div>
                  <div><strong>Pages:</strong> {result.numPages}</div>
                  {result.info?.Title && <div><strong>Title:</strong> {result.info.Title}</div>}
                  {result.info?.Author && <div><strong>Author:</strong> {result.info.Author}</div>}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 text-gray-800">Text Statistics</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Characters:</strong> {result.characterCount?.toLocaleString() || 'N/A'}</div>
                  <div><strong>Words:</strong> {result.wordCount?.toLocaleString() || 'N/A'}</div>
                  <div><strong>Lines:</strong> {result.text?.split('\n').length.toLocaleString() || 'N/A'}</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-800">Extracted Text</h3>
                <button
                  onClick={copyToClipboard}
                  className="bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium py-2 px-4 rounded transition-colors"
                >
                  📋 Copy to Clipboard
                </button>
              </div>
              <div className="bg-white border rounded p-4 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                  {result.text || 'No text content found in PDF'}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}