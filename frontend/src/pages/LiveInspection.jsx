import React, { useRef, useEffect, useState } from 'react';
import { Activity, Camera, AlertTriangle, MonitorPlay, Server, Image as ImageIcon, Upload } from 'lucide-react';

export default function LiveInspection() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);      
  const hiddenCanvasRef = useRef(null); 
  
  const [inputMode, setInputMode] = useState('live'); 
  const [uploadedImage, setUploadedImage] = useState(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [telemetry, setTelemetry] = useState({
    fps: 0,
    inferenceMs: 0,
    status: 'INITIALIZING',
    confidenceTrend: [],
  });
  const [systemAlert, setSystemAlert] = useState(null);
  
  const framesThisSecond = useRef(0);
  const lastFpsTime = useRef(performance.now());
  const streamRef = useRef(null);
  const isProcessingRef = useRef(false);

  const inspectFrame = async (blob) => {
    try {
      const formData = new FormData();
      formData.append('file', blob, 'frame.jpg');
      
      const start = performance.now();
      const res = await fetch('http://localhost:8000/api/v1/inspect', {
        method: 'POST',
        body: formData
      });
      const end = performance.now();
      
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      
      setTelemetry(prev => {
        const newTrend = [...prev.confidenceTrend, data.confidence * 100].slice(-20);
        return {
          ...prev, 
          inferenceMs: Math.round(data.latency_ms || (end - start)),
          status: 'ONLINE',
          confidenceTrend: newTrend
        };
      });
      
      return data;
    } catch(e) {
      setTelemetry(prev => ({ ...prev, status: 'OFFLINE' }));
      return null;
    }
  };

  const drawOverlay = (ctx, data, srcWidth, srcHeight) => {
    ctx.clearRect(0, 0, srcWidth, srcHeight);
    if (!data) return;
    
    if (data.anomaly && data.bbox && data.bbox.length === 4) {
      const [x, y, w, h] = data.bbox;
      
      const scaleX = srcWidth / 256.0; 
      const scaleY = srcHeight / 256.0;

      const actX = x * scaleX;
      const actY = y * scaleY;
      const actW = w * scaleX;
      const actH = h * scaleY;

      ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      ctx.strokeRect(actX, actY, actW, actH);
      
      ctx.beginPath();
      ctx.moveTo(actX, actY + 20); ctx.lineTo(actX, actY); ctx.lineTo(actX + 20, actY);
      ctx.moveTo(actX + actW - 20, actY); ctx.lineTo(actX + actW, actY); ctx.lineTo(actX + actW, actY + 20);
      ctx.moveTo(actX, actY + actH - 20); ctx.lineTo(actX, actY + actH); ctx.lineTo(actX + 20, actY + actH);
      ctx.moveTo(actX + actW - 20, actY + actH); ctx.lineTo(actX + actW, actY + actH); ctx.lineTo(actX + actW, actY + actH - 20);
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.fillRect(actX, actY - 24, 180, 24);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`DEFECT CONF: ${(data.confidence*100).toFixed(1)}%`, actX + 6, actY - 8);
      
      setSystemAlert({ type: 'danger', msg: 'Surface Anomaly Detected', conf: data.confidence });
    } else {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
      ctx.fillRect(10, 10, 100, 24);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`NOMINAL`, 16, 26);
      
      setSystemAlert(null);
    }
  };

  const processFrame = async () => {
    if (inputMode === 'live') {
      if (!videoRef.current || !hiddenCanvasRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        framesThisSecond.current++;
        const now = performance.now();
        if (now - lastFpsTime.current >= 1000) {
          setTelemetry(prev => ({ ...prev, fps: framesThisSecond.current }));
          framesThisSecond.current = 0;
          lastFpsTime.current = now;
        }

        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        const hCtx = hiddenCanvasRef.current.getContext('2d');
        hCtx.drawImage(video, 0, 0, 256, 256);
        
        hiddenCanvasRef.current.toBlob(async (blob) => {
          if (blob) {
            const result = await inspectFrame(blob);
            const oCtx = canvasRef.current.getContext('2d');
            drawOverlay(oCtx, result, 256, 256);
          }
          isProcessingRef.current = false;
        }, 'image/jpeg', 0.9);
      }
    }
  };

  useEffect(() => {
    let intervalId;
    if (inputMode === 'live' && isStreaming) {
      intervalId = setInterval(() => {
        processFrame();
      }, 1000 / 15);
    }
    return () => clearInterval(intervalId);
  }, [isStreaming, inputMode]);

  const startWebcam = async () => {
    try {
      setTelemetry(t => ({...t, status: 'CONNECTING...'}));
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setIsStreaming(true);
        };
      }
      streamRef.current = stream;
    } catch (err) {
      console.error(err);
      setTelemetry(t => ({...t, status: 'CAMERA ERROR'}));
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsStreaming(false);
  };

  useEffect(() => {
    if (inputMode === 'live') {
      startWebcam();
    } else {
      stopWebcam();
      setTelemetry(t => ({...t, status: 'STANDING BY', fps: 0}));
    }
    return stopWebcam;
  }, [inputMode]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setTelemetry(t => ({...t, status: 'CONNECTING...'}));
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        setUploadedImage(img.src);
        
        const hCtx = hiddenCanvasRef.current.getContext('2d');
        hCtx.clearRect(0, 0, 256, 256);
        hCtx.drawImage(img, 0, 0, 256, 256);
        
        hiddenCanvasRef.current.toBlob(async (blob) => {
          if (blob) {
            const result = await inspectFrame(blob);
            const oCtx = canvasRef.current.getContext('2d');
            drawOverlay(oCtx, result, 256, 256);
          }
        }, 'image/jpeg', 0.9);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="h-full flex flex-col xl:flex-row gap-6 font-sans text-gray-200">
      
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-100 tracking-tight">Surface Inspection</h1>
            <p className="text-sm text-gray-500 mt-1 focus:outline-none">Real-time deep learning inference feed.</p>
          </div>
          <div className="flex items-center space-x-4 bg-industrial-800 border border-industrial-700 rounded-lg p-1">
             <button 
               onClick={() => setInputMode('live')}
               className={`flex items-center px-4 py-2 rounded-md text-xs font-mono transition-colors ${inputMode === 'live' ? 'bg-accent-500 text-white' : 'text-gray-400 hover:bg-industrial-700'}`}
             >
               <Camera className="w-4 h-4 mr-2" /> LIVE VIDEO
             </button>
             <button 
               onClick={() => setInputMode('image')}
               className={`flex items-center px-4 py-2 rounded-md text-xs font-mono transition-colors ${inputMode === 'image' ? 'bg-accent-500 text-white' : 'text-gray-400 hover:bg-industrial-700'}`}
             >
               <ImageIcon className="w-4 h-4 mr-2" /> UPLOAD IMAGE
             </button>
          </div>
        </div>

        <div className="relative flex-1 bg-industrial-950 border border-industrial-800 rounded-xl shadow-2xl flex flex-col items-center justify-center p-4 overflow-hidden">
          {inputMode === 'live' ? (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-contain z-10"></video>
              <canvas ref={canvasRef} width={256} height={256} className="absolute z-20 w-full h-full object-contain pointer-events-none"></canvas>
              {!isStreaming && (
                <div className="absolute z-30 flex flex-col items-center">
                  <MonitorPlay className="w-12 h-12 text-gray-600 mb-4 animate-pulse" />
                  <p className="text-gray-400 font-mono text-sm tracking-widest">INITIALIZING SENSORS...</p>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full relative flex items-center justify-center">
              {uploadedImage ? (
                <>
                  <img src={uploadedImage} alt="Uploaded Surface" className="absolute inset-0 w-full h-full object-contain z-10" />
                  <canvas ref={canvasRef} width={256} height={256} className="absolute z-20 w-full h-full object-contain pointer-events-none"></canvas>
                  
                  <label className="absolute bottom-4 right-4 z-30 bg-industrial-800 border border-industrial-700 px-4 py-2 rounded-lg cursor-pointer hover:bg-industrial-700 text-sm font-mono flex items-center shadow-xl">
                    <Upload className="w-4 h-4 mr-2" /> SCAN NEW IMAGE
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </label>
                </>
              ) : (
                <label className="flex flex-col items-center justify-center w-full max-w-lg h-64 border-2 border-dashed border-industrial-700 rounded-xl cursor-pointer hover:border-accent-500 transition-colors bg-industrial-900/50">
                  <Upload className="w-12 h-12 text-industrial-600 mb-4" />
                  <span className="text-gray-400 font-mono text-sm">CLICK TO UPLOAD TENSOR IMAGE</span>
                  <span className="text-gray-600 text-xs mt-2">Upload any JPEG/PNG for static analysis</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
              )}
            </div>
          )}

          <canvas ref={hiddenCanvasRef} width={256} height={256} className="hidden"></canvas>
        </div>
      </div>

      <div className="w-full xl:w-80 flex flex-col shrink-0 gap-6">
        <div className={`p-5 rounded-xl border flex flex-col shadow-lg transition-all duration-300 ${systemAlert ? 'bg-danger-900/20 border-danger-500/50' : 'bg-industrial-800/50 border-industrial-700'}`}>
           <div className="flex items-start">
             {systemAlert ? <AlertTriangle className="w-6 h-6 text-danger-500 mr-3 shrink-0" /> : <div className="w-6 h-6 rounded-full bg-success-500/20 border border-success-500/50 flex items-center justify-center mr-3 shrink-0"><div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div></div>}
             <div>
                <h3 className={`font-semibold ${systemAlert ? 'text-danger-400' : 'text-success-400'}`}>
                  {systemAlert ? 'CRITICAL ALERT' : 'SYSTEM NOMINAL'}
                </h3>
                <p className="text-sm text-gray-400 mt-1">{systemAlert ? systemAlert.msg : 'No anomalies detected in the current feed.'}</p>
             </div>
           </div>
           {systemAlert && (
             <div className="mt-4 flex items-center space-x-3">
               <span className="text-xs font-mono text-danger-400 uppercase">Confidence</span>
               <div className="flex-1 h-1.5 bg-danger-900/50 rounded-full overflow-hidden">
                 <div className="h-full bg-danger-500" style={{ width: `${systemAlert.conf * 100}%` }}></div>
               </div>
               <span className="text-xs text-danger-400 font-mono">{(systemAlert.conf * 100).toFixed(0)}%</span>
             </div>
           )}
        </div>

        <div className="bg-industrial-800/50 border border-industrial-700 rounded-xl p-5 shadow-lg backdrop-blur-sm">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center">
            <Activity className="w-3 h-3 mr-2" /> Live Telemetry
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-end">
               <div>
                  <div className="text-gray-500 text-xs mb-1">Inference Latency</div>
                  <div className="text-2xl font-mono text-gray-200">
                    {telemetry.inferenceMs} <span className="text-sm text-gray-500">ms</span>
                  </div>
               </div>
               <div className="w-20 h-8 flex items-end space-x-1">
                 {[45, 60, 48, 52, 110, 49, 45].map((h, i) => (
                   <div key={i} className="flex-1 bg-accent-500/30 rounded-t" style={{height: `${Math.min(100, (h/150)*100)}%`}}></div>
                 ))}
               </div>
            </div>
            <div className="h-px w-full bg-industrial-700/50"></div>
            <div className="flex justify-between items-end">
               <div>
                  <div className="text-gray-500 text-xs mb-1">Capture Framerate</div>
                  <div className="text-xl font-mono text-gray-200">
                    {telemetry.fps} <span className="text-sm text-gray-500">FPS</span>
                  </div>
               </div>
            </div>
            <div className="h-px w-full bg-industrial-700/50"></div>
            <div>
               <div className="text-gray-500 text-xs mb-1">Backend Connection</div>
               <div className="flex items-center text-sm font-mono mt-1">
                 <Server className="w-3 h-3 mr-2 text-gray-400" />
                 <span className={telemetry.status === 'ONLINE' ? 'text-success-400' : 'text-danger-400'}>
                   {telemetry.status}
                 </span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
