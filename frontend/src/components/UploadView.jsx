import { useCallback, useEffect, useRef, useState } from 'react';
import { extractInvoice } from '../api';
import WorkflowSteps, { STEPS } from './WorkflowSteps';
import ResultView from './ResultView';

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const STEP_INTERVAL_MS = 900;

function UploadView() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);
  const stepTimerRef = useRef(null);

  useEffect(() => {
    return () => clearInterval(stepTimerRef.current);
  }, []);

  const validateAndSetFile = (candidate) => {
    if (!candidate) return;
    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      setError('Please upload a PDF, JPEG, or PNG file.');
      return;
    }
    setError(null);
    setFile(candidate);
  };

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    setIsDragging(false);
    validateAndSetFile(event.dataTransfer.files?.[0]);
  }, []);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleFileInputChange = (event) => {
    validateAndSetFile(event.target.files?.[0]);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);
    setActiveStep(0);

    stepTimerRef.current = setInterval(() => {
      setActiveStep((current) => Math.min(current + 1, STEPS.length - 1));
    }, STEP_INTERVAL_MS);

    try {
      const data = await extractInvoice(file);
      clearInterval(stepTimerRef.current);
      setActiveStep(STEPS.length);
      setResult(data);
    } catch (err) {
      clearInterval(stepTimerRef.current);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setActiveStep(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (result) {
    return <ResultView data={result} onUploadAnother={handleReset} />;
  }

  return (
    <div className="upload-view">
      <div className="page-header">
        <h1>Upload Invoice</h1>
        <p>Upload an energy invoice and let AI extract, compare, and analyze it.</p>
      </div>

      <div
        className={`dropzone ${isDragging ? 'dropzone--active' : ''} ${file ? 'dropzone--has-file' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileInputChange}
          disabled={isProcessing}
          hidden
        />
        {file ? (
          <div className="dropzone__file">
            <span className="dropzone__file-icon">📄</span>
            <span className="dropzone__file-name">{file.name}</span>
          </div>
        ) : (
          <div className="dropzone__prompt">
            <span className="dropzone__icon">⬆</span>
            <p className="dropzone__title">Drop your energy invoice here</p>
            <p className="dropzone__hint">Supports PDF, JPG, PNG</p>
          </div>
        )}
      </div>

      {error && <p className="error-message">{error}</p>}

      <div className="upload-actions">
        <button
          className="btn btn--primary"
          onClick={handleUpload}
          disabled={!file || isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Analyze Invoice'}
        </button>
        {file && !isProcessing && (
          <button className="btn btn--secondary" onClick={handleReset}>
            Remove
          </button>
        )}
      </div>

      {isProcessing && (
        <div className="workflow-panel">
          <WorkflowSteps activeIndex={activeStep} failed={false} />
        </div>
      )}
    </div>
  );
}

export default UploadView;
