import React, { useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

interface UploadSectionProps {
  onFileUpload: (file: File) => Promise<(() => void) | undefined>;
  isLoading: boolean;
  error: string | null;
}

const UploadSection: React.FC<UploadSectionProps> = ({ onFileUpload, isLoading, error }) => {
  const cleanupRef = useRef<(() => void) | undefined>();

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const cleanup = await onFileUpload(acceptedFiles[0]);
      cleanupRef.current = cleanup;
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false
  });

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        p: 4
      }}
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2, width: '100%', maxWidth: 600 }}>
          {error}
        </Alert>
      )}
      
      <Box
        {...getRootProps()}
        sx={{
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          borderRadius: 2,
          p: 6,
          textAlign: 'center',
          cursor: 'pointer',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover'
          },
          width: '100%',
          maxWidth: 600
        }}
      >
        <input {...getInputProps()} />
        {isLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CircularProgress />
            <Typography variant="body1" color="text.secondary">
              Processing your file...
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main' }} />
            <Typography variant="h6" component="h2">
              {isDragActive ? 'Drop your CSV file here' : 'Drag & drop your CSV file here'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              or click to select a file
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
              Only CSV files are accepted
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default UploadSection;